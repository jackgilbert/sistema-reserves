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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InstancesService } from './instances.service';
import { CreateInstanceDto } from './dto/create-instance.dto';
import { UpdateInstanceDto } from './dto/update-instance.dto';

@ApiTags('Instancias')
@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear nueva instancia' })
  create(@Body() createInstanceDto: CreateInstanceDto) {
    return this.instancesService.create(createInstanceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas las instancias' })
  findAll() {
    return this.instancesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener instancia por ID' })
  findOne(@Param('id') id: string) {
    return this.instancesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar instancia' })
  update(@Param('id') id: string, @Body() updateInstanceDto: UpdateInstanceDto) {
    return this.instancesService.update(id, updateInstanceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar instancia' })
  remove(@Param('id') id: string) {
    return this.instancesService.remove(id);
  }
}
