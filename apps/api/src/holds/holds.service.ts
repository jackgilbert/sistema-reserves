import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { addMinutes } from 'date-fns';

@Injectable()
export class HoldsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Crear un hold temporal (bloqueo de inventario por 10 minutos)
   */
  async createHold(
    offeringId: string,
    slotStart: Date,
    slotEnd: Date,
    quantity: number,
    ticketQuantities:
      | {
          standard?: number;
          variants?: Record<string, number>;
        }
      | undefined,
    priceVariantName: string | undefined,
    customerData: { email?: string; name?: string; phone?: string },
    tenant: TenantContext,
  ) {
    try {
      // Verificar que la offering existe y está activa
      const offering = await this.prisma.offering.findFirst({
        where: {
          tenantId: tenant.tenantId,
          id: offeringId,
          active: true,
        },
      });

      if (!offering) {
        throw new NotFoundException('Offering no encontrada o inactiva');
      }

      // Calcular precio
      const variants = Array.isArray(offering.priceVariants)
        ? (offering.priceVariants as Array<{ name: string; price: number }>).filter(
            (v) => v && typeof v.name === 'string',
          )
        : [];

      const normalizeQty = (n: unknown): number => {
        if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
        return Math.max(0, Math.floor(n));
      };

      let resolvedTotalQty = Math.max(0, Math.floor(quantity));
      let ticketSelection:
        | { standard: number; variants: Record<string, number> }
        | undefined;

      if (ticketQuantities) {
        const standard = normalizeQty(ticketQuantities.standard);
        const variantsMap: Record<string, number> = {};

        const incomingVariants = ticketQuantities.variants || {};
        if (incomingVariants && typeof incomingVariants === 'object') {
          for (const [name, qty] of Object.entries(incomingVariants)) {
            if (!name) continue;
            const q = normalizeQty(qty);
            if (q > 0) variantsMap[name] = q;
          }
        }

        const sumVariants = Object.values(variantsMap).reduce((a, b) => a + b, 0);
        const computedTotal = standard + sumVariants;

        if (computedTotal < 1) {
          throw new BadRequestException('Selecciona al menos 1 entrada');
        }

        if (resolvedTotalQty !== computedTotal) {
          // Permitimos que el frontend envíe quantity como total; si no coincide, rechazamos.
          throw new BadRequestException('Cantidad total no coincide con el desglose de entradas');
        }

        ticketSelection = { standard, variants: variantsMap };
      } else {
        if (resolvedTotalQty < 1) {
          throw new BadRequestException('Cantidad inválida');
        }
      }

      let totalPrice = 0;
      if (ticketSelection) {
        totalPrice += ticketSelection.standard * offering.basePrice;
        for (const [name, qty] of Object.entries(ticketSelection.variants)) {
          const v = variants.find((x) => x.name === name);
          if (!v) {
            throw new BadRequestException(`Variante de precio no válida: ${name}`);
          }
          totalPrice += v.price * qty;
        }
      } else {
        const selectedVariant = priceVariantName
          ? variants.find((v) => v.name === priceVariantName)
          : undefined;
        const unitPrice = selectedVariant?.price ?? offering.basePrice;
        totalPrice = unitPrice * resolvedTotalQty;
      }

      // Usar transacción para garantizar consistencia
      const hold = await this.prisma.$transaction(async (tx) => {
        // 1. Buscar o crear inventory bucket
        let bucket = await tx.inventoryBucket.findUnique({
          where: {
            tenantId_offeringId_slotStart: {
              tenantId: tenant.tenantId,
              offeringId,
              slotStart,
            },
          },
        });

        // Si no existe, crear bucket con capacidad inicial
        if (!bucket) {
          bucket = await tx.inventoryBucket.create({
            data: {
              tenantId: tenant.tenantId,
              offeringId,
              slotStart,
              slotEnd,
              totalCapacity:
                offering.type === 'CAPACITY' ? offering.capacity || 0 : 1,
              heldCapacity: 0,
              soldCapacity: 0,
            },
          });

          // Re-fetch para tener datos actualizados
          bucket = await tx.inventoryBucket.findUnique({
            where: {
              tenantId_offeringId_slotStart: {
                tenantId: tenant.tenantId,
                offeringId,
                slotStart,
              },
            },
          });

          if (!bucket) {
            throw new Error('Error al crear inventory bucket');
          }
        }

        // 2. Verificar disponibilidad
        const available =
          bucket.totalCapacity - bucket.heldCapacity - bucket.soldCapacity;
        if (available < quantity) {
          throw new ConflictException(
            `No hay suficiente disponibilidad. Disponible: ${available}, Solicitado: ${quantity}`,
          );
        }

        // 3. Crear hold
        const expiresAt = addMinutes(new Date(), 10);
        const newHold = await tx.hold.create({
          data: {
            tenantId: tenant.tenantId,
            offeringId,
            slotStart,
            slotEnd,
            quantity: resolvedTotalQty,
            expiresAt,
            customerEmail: customerData.email || null,
            customerName: customerData.name || null,
            customerPhone: customerData.phone || null,
            metadata: {
              ...(priceVariantName ? { priceVariantName } : {}),
              ...(ticketSelection ? { ticketSelection } : {}),
            },
          },
        });

        // 4. Actualizar inventario (incrementar held)
        await tx.inventoryBucket.update({
          where: {
            tenantId_offeringId_slotStart: {
              tenantId: tenant.tenantId,
              offeringId,
              slotStart,
            },
          },
          data: {
            heldCapacity: bucket.heldCapacity + quantity,
          },
        });

        return newHold;
      });

      return {
        id: hold.id,
        offeringId: hold.offeringId,
        slotStart: hold.slotStart.toISOString(),
        slotEnd: hold.slotEnd.toISOString(),
        quantity: hold.quantity,
        expiresAt: hold.expiresAt.toISOString(),
        price: totalPrice,
      };
    } catch (error) {
      console.error('Error in createHold:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new Error(`Failed to create hold: ${error.message}`);
    }
  }

  /**
   * Obtener un hold por ID
   */
  async getHold(holdId: string, tenant: TenantContext): Promise<unknown> {
    const hold = await this.prisma.hold.findFirst({
      where: {
        tenantId: tenant.tenantId,
        id: holdId,
      },
      include: {
        offering: true,
      },
    });

    if (!hold) {
      throw new NotFoundException('Hold no encontrado');
    }

    return hold;
  }

  /**
   * Liberar holds expirados y devolver inventario
   * Llamado por cron job cada 15 minutos
   * Optimizado para procesar en lotes y evitar transacciones largas
   */
  async releaseExpiredHolds() {
    const now = new Date();
    const BATCH_SIZE = 50; // Procesar máximo 50 holds por ejecución

    // Buscar holds expirados no liberados (limitado)
    const expiredHolds = await this.prisma.hold.findMany({
      where: {
        released: false,
        expiresAt: {
          lt: now,
        },
      },
      take: BATCH_SIZE,
      orderBy: {
        expiresAt: 'asc', // Los más antiguos primero
      },
    });

    if (expiredHolds.length === 0) {
      return { released: 0 };
    }

    // Agrupar por bucket para actualizar en batch
    const bucketUpdates = new Map<string, number>();
    const holdIds: string[] = [];

    for (const hold of expiredHolds) {
      const bucketKey = `${hold.tenantId}:${hold.offeringId}:${hold.slotStart.toISOString()}`;
      bucketUpdates.set(
        bucketKey,
        (bucketUpdates.get(bucketKey) || 0) + hold.quantity,
      );
      holdIds.push(hold.id);
    }

    // Ejecutar en transacción optimizada
    try {
      await this.prisma.$transaction(
        async (tx) => {
          // Marcar todos los holds como liberados en una sola operación
          await tx.hold.updateMany({
            where: {
              id: {
                in: holdIds,
              },
            },
            data: {
              released: true,
            },
          });

          // Actualizar buckets de inventario
          for (const [bucketKey, totalQuantity] of bucketUpdates.entries()) {
            const [tenantId, offeringId, slotStartStr] = bucketKey.split(':');
            const slotStart = new Date(slotStartStr);

            await tx.inventoryBucket.update({
              where: {
                tenantId_offeringId_slotStart: {
                  tenantId,
                  offeringId,
                  slotStart,
                },
              },
              data: {
                heldCapacity: {
                  decrement: totalQuantity,
                },
              },
            });
          }
        },
        {
          maxWait: 5000, // Esperar máximo 5 segundos para adquirir el lock
          timeout: 10000, // Timeout de 10 segundos para la transacción
        },
      );

      return { released: expiredHolds.length };
    } catch (error) {
      // Si falla, no lanzar error para que el cron pueda continuar
      console.error('Error al liberar holds expirados:', error);
      return { released: 0, error: error.message };
    }
  }
}
