import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';
import { TenantService } from '../tenant/tenant.service';
import { PaymentsService } from './payments.service';

class CheckoutFromHoldDto {
  @IsString()
  holdId: string;

  @IsEmail()
  email: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  discountCode?: string;
}

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly tenantService: TenantService,
  ) {}

  @Post('checkout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar checkout desde un hold (público)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200 })
  async checkoutFromHold(
    @Body() dto: CheckoutFromHoldDto,
    @Headers('x-tenant-domain') domain: string,
    @Req() req: Request,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );

    const origin =
      (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-host']
        ? `${req.headers['x-forwarded-proto']}://${req.headers['x-forwarded-host']}`
        : undefined) ||
      (req.headers.origin as string | undefined) ||
      undefined;

    return this.paymentsService.checkoutFromHold(dto, tenant, origin);
  }

  // Redsys callbacks: Redsys envía application/x-www-form-urlencoded
  @Post('redsys/notify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Redsys notificación (merchantURL)' })
  @ApiResponse({ status: 200 })
  async redsysNotify(@Body() body: Record<string, any>) {
    await this.paymentsService.handleRedsysNotification(body);
    return { ok: true };
  }
}
