import { PrismaClient } from '@prisma/client';

// Re-exportar tipos de Prisma
export * from '@prisma/client';

// Cliente Prisma singleton
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    // Deshabilitamos 'query' para evitar sobrecarga en la terminal
    // Si necesitas ver queries, usa: prisma.\$on('query', (e) => console.log(e))
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
