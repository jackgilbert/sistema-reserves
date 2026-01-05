import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { addMinutes } from 'date-fns';
import { HOLD_EXPIRATION_MINUTES, HOLD_CLEANUP_BATCH_SIZE, HOLD_CLEANUP_MAX_WAIT_MS, HOLD_CLEANUP_TIMEOUT_MS } from '../common/constants';

@Injectable()
export class HoldsService {
  private readonly logger = new Logger(HoldsService.name);
  
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Crear un hold temporal (bloqueo de inventario por 10 minutos)
   */
  async createHold(
    offeringId: string,
    slotStart: Date,
    slotEnd: Date,
    quantity: number,
    customerData: { email?: string; name?: string; phone?: string },
    tenant: TenantContext,
  ) {
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
    const price = offering.basePrice;
    const totalPrice = price * quantity;

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
            totalCapacity: offering.type === 'CAPACITY' ? offering.capacity || 0 : 1,
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
      const available = bucket.totalCapacity - bucket.heldCapacity - bucket.soldCapacity;
      if (available < quantity) {
        throw new ConflictException(
          `No hay suficiente disponibilidad. Disponible: ${available}, Solicitado: ${quantity}`,
        );
      }

      // 3. Crear hold
      const expiresAt = addMinutes(new Date(), HOLD_EXPIRATION_MINUTES);
      const newHold = await tx.hold.create({
        data: {
          tenantId: tenant.tenantId,
          offeringId,
          slotStart,
          slotEnd,
          quantity,
          expiresAt,
          customerEmail: customerData.email || null,
          customerName: customerData.name || null,
          customerPhone: customerData.phone || null,
          metadata: {},
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
    const BATCH_SIZE = HOLD_CLEANUP_BATCH_SIZE;

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
      bucketUpdates.set(bucketKey, (bucketUpdates.get(bucketKey) || 0) + hold.quantity);
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
          maxWait: HOLD_CLEANUP_MAX_WAIT_MS,
          timeout: HOLD_CLEANUP_TIMEOUT_MS,
        },
      );

      return { released: expiredHolds.length };
    } catch (error) {
      // Log error but don't throw to allow cron to continue
      this.logger.error('Failed to release expired holds', error.stack || error);
      return { released: 0, error: error.message };
    }
  }
}
