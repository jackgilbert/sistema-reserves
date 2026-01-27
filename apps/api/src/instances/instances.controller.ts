import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstancesService } from './instances.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { Instance, Domain } from '@sistema-reservas/db';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Instancias')
@Controller('instances')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva instancia' })
  create(
    @Body() createInstanceDto: CreateInstanceDto,
  ): Promise<Instance & { domains: Domain[] }> {
    return this.instancesService.create(createInstanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las instancias' })
  findAll(): Promise<
    Array<
      Instance & {
        domains: Domain[];
        _count: { offerings: number; bookings: number; users: number };
      }
    >
  > {
    return this.instancesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener instancia por ID' })
  findOne(
    @Param('id') id: string,
  ): Promise<(Instance & { domains: Domain[] }) | null> {
    return this.instancesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar instancia' })
  update(
    @Param('id') id: string,
    @Body() updateInstanceDto: UpdateInstanceDto,
  ): Promise<Instance & { domains: Domain[] }> {
    return this.instancesService.update(id, updateInstanceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar instancia' })
  remove(@Param('id') id: string): Promise<Instance> {
    return this.instancesService.remove(id);
  }
}
