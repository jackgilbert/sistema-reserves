import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@sistema-reservas/db';
import { TenantContext } from '@sistema-reservas/shared';
import * as bcrypt from 'bcryptjs';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterUserDto {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'STAFF';
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Login de usuario
   */
  async login(dto: LoginDto, tenant: TenantContext) {
    const { email, password } = dto;

    console.log('🔐 Login attempt:', { email, tenantId: tenant.tenantId });

    // Buscar usuario
    const user = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.tenantId,
          email,
        },
      },
    });

    console.log('👤 User found:', user ? `YES (${user.email})` : 'NO');

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar password
    console.log('🔑 Comparing password...');
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    console.log('✅ Password valid:', isPasswordValid);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Generar JWT
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  /**
   * Registrar nuevo usuario (admin only)
   */
  async register(dto: RegisterUserDto, tenant: TenantContext) {
    const { email, password, name, role } = dto;

    // Verificar si el email ya existe
    const existing = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.tenantId,
          email,
        },
      },
    });

    if (existing) {
      throw new UnauthorizedException('El email ya está registrado');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await this.prisma.user.create({
      data: {
        tenantId: tenant.tenantId,
        email,
        passwordHash,
        name,
        role,
      },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  /**
   * Validar JWT y retornar usuario
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId: payload.tenantId,
        id: payload.sub,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
    };
  }

  /**
   * Obtener perfil del usuario autenticado
   */
  async getProfile(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        tenantId,
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
