import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
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
      const expiresAt = addMinutes(new Date(), 10);
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
  async getHold(holdId: string, tenant: TenantContext) {
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
   * Llamado por cron job cada 5 minutos
   */
  async releaseExpiredHolds() {
    const now = new Date();

    // Buscar holds expirados no liberados
    const expiredHolds = await this.prisma.hold.findMany({
      where: {
        released: false,
        expiresAt: {
          lt: now,
        },
      },
    });

    if (expiredHolds.length === 0) {
      return { released: 0 };
    }

    // Liberar en transacción
    await this.prisma.$transaction(async (tx) => {
      for (const hold of expiredHolds) {
        // Devolver capacidad al bucket
        await tx.inventoryBucket.update({
          where: {
            tenantId_offeringId_slotStart: {
              tenantId: hold.tenantId,
              offeringId: hold.offeringId,
              slotStart: hold.slotStart,
            },
          },
          data: {
            heldCapacity: {
              decrement: hold.quantity,
            },
          },
        });

        // Marcar hold como liberado
        await tx.hold.update({
          where: {
            id: hold.id,
          },
          data: {
            released: true,
          },
        });
      }
    });

    return { released: expiredHolds.length };
  }
}
