import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Headers,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { EmailService } from '../notifications/notifications.service';
import { TenantService } from '../tenant/tenant.service';
import { UpdateFeatureFlagsDto } from './dto/update-feature-flags.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import {
  ApplyTemplateDto,
  ImportSettingsDto,
  ValidateSettingsDto,
} from './dto/template-operations.dto';
import { FeatureFlags, TenantSettings } from './settings.types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly tenantService: TenantService,
    private readonly emailService: EmailService,
  ) {}

  // ============================================================================
  // FEATURE FLAGS ENDPOINTS
  // ============================================================================

  @Get('features')
  @ApiOperation({ summary: 'Obtener feature flags del tenant' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Feature flags obtenidos' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getFeatureFlags(
    @Headers('x-tenant-domain') domain: string,
  ): Promise<FeatureFlags> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.getFeatureFlags(tenant);
  }

  @Patch('features')
  @ApiOperation({ summary: 'Actualizar feature flags (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Feature flags actualizados' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateFeatureFlags(
    @Body() dto: UpdateFeatureFlagsDto,
    @Headers('x-tenant-domain') domain: string,
  ): Promise<FeatureFlags> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.updateFeatureFlags(dto, tenant);
  }

  @Patch('features/reset')
  @ApiOperation({
    summary: 'Resetear feature flags a valores por defecto (admin)',
  })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Feature flags reseteados' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async resetFeatureFlags(
    @Headers('x-tenant-domain') domain: string,
  ): Promise<FeatureFlags> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.resetFeatureFlags(tenant);
  }

  // ============================================================================
  // SETTINGS ENDPOINTS
  // ============================================================================

  @Get()
  @ApiOperation({
    summary: 'Obtener configuración completa del tenant (admin)',
  })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Configuración obtenida' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async getSettings(
    @Headers('x-tenant-domain') domain: string,
  ): Promise<TenantSettings> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.getSettings(tenant);
  }

  @Patch()
  @ApiOperation({ summary: 'Actualizar configuración del tenant (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Configuración actualizada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async updateSettings(
    @Body() dto: UpdateSettingsDto,
    @Headers('x-tenant-domain') domain: string,
  ): Promise<TenantSettings> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.updateSettings(dto, tenant);
  }

  @Post('notifications/test')
  @ApiOperation({ summary: 'Enviar email de prueba SMTP' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Email enviado' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async sendTestEmail(
    @Body()
    dto: {
      to: string;
      subject?: string;
      body?: string;
      html?: string;
    },
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.emailService.sendTestEmail(tenant.tenantId, dto);
  }

  @Get('public')
  @ApiOperation({
    summary: 'Obtener configuración pública (sin datos sensibles)',
  })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Configuración pública obtenida' })
  async getPublicSettings(
    @Headers('x-tenant-domain') domain: string,
  ): Promise<Partial<TenantSettings>> {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.getPublicSettings(tenant);
  }

  // ============================================================================
  // TEMPLATES ENDPOINTS
  // ============================================================================

  @Get('templates')
  @ApiOperation({ summary: 'Listar plantillas disponibles' })
  @ApiResponse({ status: 200, description: 'Lista de plantillas' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getTemplates() {
    return this.settingsService.getAvailableTemplates();
  }

  @Post('templates/apply')
  @ApiOperation({ summary: 'Aplicar plantilla pre-configurada (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Plantilla aplicada' })
  @ApiResponse({ status: 400, description: 'Plantilla inválida' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async applyTemplate(
    @Body() dto: ApplyTemplateDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.applyTemplate(
      dto.template,
      tenant,
      dto.overwrite,
    );
  }

  @Get('templates/compare')
  @ApiOperation({ summary: 'Comparar configuración actual con una plantilla' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Comparación realizada' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async compareWithTemplate(
    @Query('template') template: string,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.compareWithTemplate(template as any, tenant);
  }

  // ============================================================================
  // VALIDATION ENDPOINTS
  // ============================================================================

  @Post('validate')
  @ApiOperation({ summary: 'Validar configuración antes de aplicarla' })
  @ApiResponse({ status: 200, description: 'Validación realizada' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async validateSettings(@Body() dto: ValidateSettingsDto) {
    return this.settingsService.validateConfiguration(
      dto.featureFlags as any,
      dto.settings as any,
    );
  }

  // ============================================================================
  // IMPORT/EXPORT ENDPOINTS
  // ============================================================================

  @Get('export')
  @ApiOperation({ summary: 'Exportar configuración completa (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Configuración exportada' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async exportSettings(
    @Headers('x-tenant-domain') domain: string,
    @Query('includeFeatureFlags') includeFeatureFlags?: string,
    @Query('includeSettings') includeSettings?: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.exportConfiguration(
      tenant,
      includeFeatureFlags !== 'false',
      includeSettings !== 'false',
    );
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar configuración (admin)' })
  @ApiHeader({ name: 'x-tenant-domain', required: true })
  @ApiResponse({ status: 200, description: 'Configuración importada' })
  @ApiResponse({ status: 400, description: 'Configuración inválida' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  async importSettings(
    @Body() dto: ImportSettingsDto,
    @Headers('x-tenant-domain') domain: string,
  ) {
    const tenant = await this.tenantService.resolveTenantByDomain(
      domain || 'localhost',
    );
    return this.settingsService.importConfiguration(
      tenant,
      {
        featureFlags: dto.featureFlags as any,
        settings: dto.settings as any,
      },
      dto.validate !== false,
    );
  }
}
