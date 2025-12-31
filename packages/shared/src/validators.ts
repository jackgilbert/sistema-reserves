import { z } from 'zod';

// Validadores comunes usando Zod

export const emailSchema = z.string().email('Email inválido');

export const tenantIdSchema = z.string().uuid('TenantId debe ser un UUID válido');

export const dateSchema = z.string().datetime('Fecha debe estar en formato ISO 8601');

export const positiveIntSchema = z.number().int().positive('Debe ser un número entero positivo');

export const slugSchema = z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, 'Slug debe contener solo letras minúsculas, números y guiones');

export const urlSchema = z.string().url('URL inválida');

export const colorSchema = z.string().regex(/^#[0-9A-F]{6}$/i, 'Color debe estar en formato hexadecimal (#RRGGBB)');
