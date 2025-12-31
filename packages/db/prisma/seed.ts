import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...');
  await prisma.checkInEvent.deleteMany();
  await prisma.resourceAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.bookingItem.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.hold.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.inventoryBucket.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.offering.deleteMany();
  await prisma.user.deleteMany();
  await prisma.domain.deleteMany();
  await prisma.instance.deleteMany();

  // Crear instancia de museo
  console.log('🏛️  Creando instancia de museo...');
  const museoInstance = await prisma.instance.create({
    data: {
      slug: 'museo-demo',
      name: 'Museo de Arte Moderno',
      primaryColor: '#E63946',
      secondaryColor: '#F1FAEE',
      timezone: 'Europe/Madrid',
      locale: 'es-ES',
      currency: 'EUR',
      active: true,
      featureFlags: {
        checkIn: true,
        promoCode: true,
        customFields: true,
      },
      domains: {
        create: [
          {
            domain: 'localhost',
            isPrimary: true,
          },
          {
            domain: 'museo.localhost',
            isPrimary: false,
          },
        ],
      },
      users: {
        create: [
          {
            email: 'admin@museo.com',
            passwordHash: 'temp-hash-admin123',
            name: 'Administrador Museo',
            role: 'admin',
            active: true,
          },
          {
            email: 'staff@museo.com',
            passwordHash: 'temp-hash-staff123',
            name: 'Personal Museo',
            role: 'staff',
            active: true,
          },
        ],
      },
    },
  });

  // Crear oferta de museo (CAPACITY)
  console.log('🎫 Creando oferta de museo...');
  const museoOffering = await prisma.offering.create({
    data: {
      tenantId: museoInstance.id,
      slug: 'entrada-general',
      name: 'Entrada General',
      description: 'Entrada general al museo con acceso a todas las exposiciones',
      type: 'CAPACITY',
      active: true,
      capacity: 50, // 50 personas por franja
      basePrice: 1200, // 12.00 EUR en centavos
      currency: 'EUR',
      priceVariants: [
        {
          name: 'Adulto',
          price: 1200,
          description: 'Entrada adulto (18-64 años)',
        },
        {
          name: 'Niño',
          price: 600,
          description: 'Entrada niño (4-17 años)',
        },
        {
          name: 'Senior',
          price: 900,
          description: 'Entrada senior (65+ años)',
        },
      ],
      customFieldsSchema: [
        {
          name: 'comentarios',
          type: 'textarea',
          label: 'Comentarios adicionales',
          required: false,
        },
      ],
      schedules: {
        create: {
          daysOfWeek: [1, 2, 3, 4, 5, 6], // Martes a Domingo (0=Lunes cerrado)
          startTime: '10:00',
          endTime: '18:00',
          slotDuration: 30, // franjas de 30 minutos
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2025-12-31'),
          minAdvanceMinutes: 60, // mínimo 1 hora de antelación
          maxAdvanceDays: 60, // máximo 60 días de antelación
          cutoffMinutes: 15, // cerrar reservas 15 minutos antes
          closedDates: [], // sin días cerrados específicos
          capacityOverrides: {},
          tenantId: museoInstance.id,
        },
      },
    },
  });

  // Crear instancia de parking
  console.log('🅿️  Creando instancia de parking...');
  const parkingInstance = await prisma.instance.create({
    data: {
      slug: 'parking-demo',
      name: 'Parking Centro Ciudad',
      primaryColor: '#457B9D',
      secondaryColor: '#A8DADC',
      timezone: 'Europe/Madrid',
      locale: 'es-ES',
      currency: 'EUR',
      active: true,
      featureFlags: {
        checkIn: true,
        promoCode: false,
        customFields: false,
      },
      domains: {
        create: [
          {
            domain: 'parking.localhost',
            isPrimary: true,
          },
        ],
      },
      users: {
        create: [
          {
            email: 'admin@parking.com',
            passwordHash: 'temp-hash-admin123',
            name: 'Administrador Parking',
            role: 'admin',
            active: true,
          },
        ],
      },
    },
  });

  // Crear oferta de parking (RESOURCE)
  console.log('🚗 Creando oferta de parking...');
  const parkingOffering = await prisma.offering.create({
    data: {
      tenantId: parkingInstance.id,
      slug: 'plaza-estandar',
      name: 'Plaza de Parking Estándar',
      description: 'Plaza de parking estándar en parking cubierto',
      type: 'RESOURCE',
      active: true,
      basePrice: 500, // 5.00 EUR por hora
      currency: 'EUR',
      priceVariants: [
        {
          name: 'Hora',
          price: 500,
          description: '1 hora de parking',
        },
        {
          name: 'Medio día',
          price: 2000,
          description: '4 horas de parking',
        },
        {
          name: 'Día completo',
          price: 3500,
          description: '24 horas de parking',
        },
      ],
      customFieldsSchema: [
        {
          name: 'matricula',
          type: 'text',
          label: 'Matrícula del vehículo',
          required: true,
        },
        {
          name: 'modelo',
          type: 'text',
          label: 'Modelo del vehículo',
          required: false,
        },
      ],
      schedules: {
        create: {
          daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Todos los días
          startTime: '00:00',
          endTime: '23:59',
          slotDuration: 60, // franjas de 1 hora
          validFrom: new Date('2024-01-01'),
          validTo: new Date('2025-12-31'),
          minAdvanceMinutes: 0, // sin antelación mínima
          maxAdvanceDays: 30,
          cutoffMinutes: 0,
          closedDates: [],
          capacityOverrides: {},
          tenantId: parkingInstance.id,
        },
      },
      resources: {
        create: [
          { code: 'A-01', name: 'Plaza A-01', active: true },
          { code: 'A-02', name: 'Plaza A-02', active: true },
          { code: 'A-03', name: 'Plaza A-03', active: true },
          { code: 'B-01', name: 'Plaza B-01', active: true },
          { code: 'B-02', name: 'Plaza B-02', active: true },
          { code: 'B-03', name: 'Plaza B-03', active: true },
          { code: 'C-01', name: 'Plaza C-01', active: true },
          { code: 'C-02', name: 'Plaza C-02', active: true },
          { code: 'C-03', name: 'Plaza C-03', active: true },
          { code: 'C-04', name: 'Plaza C-04', active: true },
        ],
      },
    },
  });

  console.log('✅ Seed completado exitosamente!');
  console.log('\n📊 Resumen:');
  console.log(`   - Instancias creadas: 2`);
  console.log(`   - Museo: ${museoInstance.name} (${museoInstance.slug})`);
  console.log(`   - Parking: ${parkingInstance.name} (${parkingInstance.slug})`);
  console.log(`   - Ofertas creadas: 2`);
  console.log(`   - Recursos de parking: 10 plazas`);
  console.log('\n🔐 Credenciales de prueba:');
  console.log('   Museo:');
  console.log('   - Admin: admin@museo.com / admin123');
  console.log('   - Staff: staff@museo.com / staff123');
  console.log('   Parking:');
  console.log('   - Admin: admin@parking.com / admin123');
  console.log('\n🌐 Para probar localmente, añade a /etc/hosts:');
  console.log('   127.0.0.1 localhost museo.localhost parking.localhost');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
