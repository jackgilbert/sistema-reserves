import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import { customAlphabet } from 'nanoid';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const nanoid = customAlphabet(CODE_ALPHABET, 10);

export type DiscountValidationResult = {
  id: string;
  code: string;
  percentOff: number;
  offeringId?: string | null;
  maxRedemptions?: number | null;
  redemptionCount?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
};

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaClient) {}

  async validate(
    codeRaw: string,
    tenant: TenantContext,
    offeringId?: string,
  ): Promise<DiscountValidationResult> {
    const prisma = this.prisma as any;
    const code = (codeRaw || '').trim().toUpperCase();
    if (!code) {
      throw new BadRequestException('Código de descuento inválido');
    }

    const discount = await prisma.discountCode.findFirst({
      where: {
        tenantId: tenant.tenantId,
        code,
      },
      select: {
        id: true,
        code: true,
        active: true,
        percentOff: true,
        offeringId: true,
        maxRedemptions: true,
        redemptionCount: true,
        startsAt: true,
        endsAt: true,
      },
    });

    if (!discount) {
      throw new NotFoundException('Código de descuento no encontrado');
    }

    if (!discount.active) {
      throw new BadRequestException('Código de descuento inactivo');
    }

    if (offeringId && discount.offeringId && discount.offeringId !== offeringId) {
      throw new BadRequestException('Código no válido para esta oferta');
    }

    const now = new Date();
    if (discount.startsAt && discount.startsAt > now) {
      throw new BadRequestException('Código de descuento aún no disponible');
    }

    if (discount.endsAt && discount.endsAt < now) {
      throw new BadRequestException('Código de descuento expirado');
    }

    if (
      typeof discount.maxRedemptions === 'number' &&
      discount.redemptionCount >= discount.maxRedemptions
    ) {
      throw new BadRequestException('Código de descuento agotado');
    }

    if (discount.percentOff < 0 || discount.percentOff > 100) {
      throw new BadRequestException('Descuento inválido');
    }

    return {
      id: discount.id,
      code: discount.code,
      percentOff: discount.percentOff,
      offeringId: discount.offeringId,
      maxRedemptions: discount.maxRedemptions,
      redemptionCount: discount.redemptionCount,
      startsAt: discount.startsAt,
      endsAt: discount.endsAt,
    };
  }

  async createBatch(
    tenant: TenantContext,
    dto: {
      count: number;
      percentOff: number;
      offeringId?: string;
      prefix?: string;
      startsAt?: string;
      endsAt?: string;
      maxRedemptions?: number;
      batchId?: string;
    },
  ) {
    const prisma = this.prisma as any;
    const count = Math.max(1, Math.min(500, Math.floor(dto.count || 0)));
    const percentOff = Math.floor(dto.percentOff);
    if (!Number.isFinite(percentOff) || percentOff < 0 || percentOff > 100) {
      throw new BadRequestException('percentOff debe estar entre 0 y 100');
    }

    const prefix = (dto.prefix || '').trim().toUpperCase();
    if (prefix && !/^[A-Z0-9_-]{1,12}$/.test(prefix)) {
      throw new BadRequestException('prefix inválido');
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : undefined;
    const endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (startsAt && Number.isNaN(startsAt.getTime())) {
      throw new BadRequestException('startsAt inválido');
    }
    if (endsAt && Number.isNaN(endsAt.getTime())) {
      throw new BadRequestException('endsAt inválido');
    }

    if (startsAt && endsAt && startsAt > endsAt) {
      throw new BadRequestException('startsAt no puede ser posterior a endsAt');
    }

    const maxRedemptions =
      typeof dto.maxRedemptions === 'number'
        ? Math.max(1, Math.floor(dto.maxRedemptions))
        : undefined;

    const batchId = (dto.batchId || '').trim() || undefined;

    const desiredCodes: string[] = [];
    const seen = new Set<string>();

    // Generate codes client-side-ish, then insert with retry on conflicts.
    // We'll generate a bit extra to mitigate collisions.
    const toGenerate = Math.ceil(count * 1.5);
    for (let i = 0; i < toGenerate && desiredCodes.length < count; i++) {
      const core = nanoid();
      const code = prefix ? `${prefix}-${core}` : core;
      if (seen.has(code)) continue;
      seen.add(code);
      desiredCodes.push(code);
    }

    if (desiredCodes.length < count) {
      throw new BadRequestException('No se pudieron generar suficientes códigos');
    }

    // Insert one by one to preserve returned codes reliably (small batches).
    // For larger batches, this can be optimized later.
    const created: Array<{ id: string; code: string }> = [];
    for (const code of desiredCodes) {
      try {
        const row = await prisma.discountCode.create({
          data: {
            tenantId: tenant.tenantId,
            code,
            percentOff,
            offeringId: dto.offeringId || null,
            startsAt: startsAt || null,
            endsAt: endsAt || null,
            maxRedemptions: maxRedemptions || null,
            batchId: batchId || null,
          },
          select: { id: true, code: true },
        });
        created.push(row);
      } catch {
        // ignore conflicts; continue
      }

      if (created.length >= count) break;
    }

    if (created.length < count) {
      throw new BadRequestException(
        `No se pudieron crear ${count} códigos (creados ${created.length}). Reintenta.`,
      );
    }

    return {
      count: created.length,
      percentOff,
      offeringId: dto.offeringId || null,
      batchId: batchId || null,
      codes: created.map((c) => c.code),
    };
  }

  async listByBatch(
    tenant: TenantContext,
    batchIdRaw: string,
  ): Promise<
    Array<{
      code: string;
      percentOff: number;
      offeringId: string | null;
      active: boolean;
      maxRedemptions: number | null;
      redemptionCount: number;
      startsAt: Date | null;
      endsAt: Date | null;
    }>
  > {
    const prisma = this.prisma as any;
    const batchId = (batchIdRaw || '').trim();
    if (!batchId) return [];

    return prisma.discountCode.findMany({
      where: { tenantId: tenant.tenantId, batchId },
      select: {
        code: true,
        percentOff: true,
        offeringId: true,
        active: true,
        maxRedemptions: true,
        redemptionCount: true,
        startsAt: true,
        endsAt: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });
  }

  async redeem(
    tenant: TenantContext,
    discountId: string,
  ): Promise<{ id: string; percentOff: number }>
  {
    const prisma = this.prisma as any;
    const updated = await prisma.discountCode.update({
      where: { id: discountId },
      data: {
        redemptionCount: { increment: 1 },
      },
      select: { id: true, percentOff: true, tenantId: true },
    });

    if (updated.tenantId !== tenant.tenantId) {
      // extremely defensive: should be impossible due to lookup patterns
      throw new BadRequestException('Discount code tenant mismatch');
    }

    return { id: updated.id, percentOff: updated.percentOff };
  }

  async deactivateBatch(tenant: TenantContext, batchIdRaw: string): Promise<number> {
    const prisma = this.prisma as any;
    const batchId = (batchIdRaw || '').trim();
    if (!batchId) return 0;

    const result = await prisma.discountCode.updateMany({
      where: {
        tenantId: tenant.tenantId,
        batchId,
        active: true,
      },
      data: {
        active: false,
      },
    });

    return result?.count ?? 0;
  }

  async setActiveByCode(
    tenant: TenantContext,
    codeRaw: string,
    active: boolean,
  ): Promise<number> {
    const prisma = this.prisma as any;
    const code = (codeRaw || '').trim().toUpperCase();
    if (!code) return 0;

    const result = await prisma.discountCode.updateMany({
      where: {
        tenantId: tenant.tenantId,
        code,
      },
      data: {
        active,
      },
    });

    const updated = result?.count ?? 0;
    if (updated === 0) {
      throw new NotFoundException('Código de descuento no encontrado');
    }
    return updated;
  }
}
