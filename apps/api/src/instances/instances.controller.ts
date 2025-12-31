import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InstancesService } from './instances.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';
import { Instance, Domain } from '@sistema-reservas/db';

@ApiTags('Instancias')
@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva instancia' })
  create(@Body() createInstanceDto: CreateInstanceDto): Promise<Instance & { domains: Domain[] }> {
    return this.instancesService.create(createInstanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las instancias' })
  findAll(): Promise<any[]> {
    return this.instancesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener instancia por ID' })
  findOne(@Param('id') id: string): Promise<(Instance & { domains: Domain[] }) | null> {
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
