import { PrismaClient } from '@sistema-reservas/db';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function generateCode(existing: Set<string>) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (existing.has(code));
  existing.add(code);
  return code;
}

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

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
      siteTitle: 'Museo de Arte Moderno - Reserva tu visita',
      siteDescription: 'Descubre nuestra colección de arte moderno y contemporáneo. Reserva tu entrada online y evita colas.',
      contactEmail: 'info@museoarte.com',
      contactPhone: '+34 91 123 45 67',
      contactAddress: 'Calle del Arte, 123, 28001 Madrid, España',
      usefulInfo: [
        { title: 'Horarios', description: 'Martes a Domingo: 10:00 - 18:00. Lunes cerrado.' },
        { title: 'Cómo llegar', description: 'Metro: Línea 2 (Sol). Bus: 3, 5, 15, 20, 51, 52.' },
        { title: 'Normas', description: 'No se permite fumar, comer o beber en las salas. Fotografías sin flash.' },
        { title: 'Accesibilidad', description: 'Totalmente accesible para personas con movilidad reducida.' },
      ],
      featureFlags: {
        bookings: {
          enabled: true,
          allowPublicCancellation: true,
          requirePaymentOnBooking: true,
          maxAdvanceBookingDays: 90,
          minAdvanceBookingHours: 2,
        },
        checkIn: {
          enabled: true,
          requireQRCode: false,
          allowManualCheckIn: true,
        },
        payments: {
          enabled: true,
          provider: 'redsys',
          requireDeposit: false,
          depositPercentage: 0,
        },
        availability: {
          showRealTimeCapacity: true,
          bufferSlots: 2,
        },
        notifications: {
          enabled: true,
          emailEnabled: true,
          smsEnabled: false,
        },
        analytics: {
          enabled: true,
          trackingEnabled: true,
        },
        multiLanguage: {
          enabled: false,
          supportedLocales: ['es-ES'],
        },
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
            passwordHash: adminPasswordHash,
            name: 'Administrador Museo',
            role: 'ADMIN',
            active: true,
          },
          {
            email: 'staff@museo.com',
            passwordHash: staffPasswordHash,
            name: 'Personal Museo',
            role: 'STAFF',
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
          validTo: new Date('2027-12-31'),
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

  // Crear reservas demo para check-in rápido (hoy)
  console.log('🧪 Creando reservas demo...');
  const now = new Date();
  const slot1Start = new Date(now);
  slot1Start.setHours(10, 0, 0, 0);
  const slot1End = new Date(now);
  slot1End.setHours(10, 30, 0, 0);
  const slot2Start = new Date(now);
  slot2Start.setHours(11, 0, 0, 0);
  const slot2End = new Date(now);
  slot2End.setHours(11, 30, 0, 0);

  const usedAt = new Date();
  const codes = new Set<string>();

  const demoBookings = [
    {
      code: generateCode(codes),
      customerName: 'Laura García',
      customerEmail: 'laura@example.com',
      customerPhone: '+34 600 123 456',
      slotStart: slot1Start,
      slotEnd: slot1End,
      quantity: 2,
      status: 'CONFIRMED',
    },
    {
      code: generateCode(codes),
      customerName: 'David López',
      customerEmail: 'david@example.com',
      customerPhone: '+34 611 222 333',
      slotStart: slot1Start,
      slotEnd: slot1End,
      quantity: 3,
      status: 'CONFIRMED',
    },
    {
      code: generateCode(codes),
      customerName: 'Ana Ruiz',
      customerEmail: 'ana@example.com',
      customerPhone: '+34 622 555 666',
      slotStart: slot1Start,
      slotEnd: slot1End,
      quantity: 1,
      status: 'USED',
      usedAt,
    },
    {
      code: generateCode(codes),
      customerName: 'Carlos Pérez',
      customerEmail: 'carlos@example.com',
      customerPhone: '+34 633 777 888',
      slotStart: slot2Start,
      slotEnd: slot2End,
      quantity: 2,
      status: 'CONFIRMED',
    },
    {
      code: generateCode(codes),
      customerName: 'Marta Díaz',
      customerEmail: 'marta@example.com',
      customerPhone: '+34 644 111 222',
      slotStart: slot2Start,
      slotEnd: slot2End,
      quantity: 4,
      status: 'CONFIRMED',
    },
  ];

  await prisma.booking.createMany({
    data: demoBookings.map((booking) => ({
      tenantId: museoInstance.id,
      offeringId: museoOffering.id,
      code: booking.code,
      slotStart: booking.slotStart,
      slotEnd: booking.slotEnd,
      quantity: booking.quantity,
      status: booking.status,
      totalAmount: booking.quantity * 1200,
      currency: 'EUR',
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      usedAt: booking.usedAt ?? null,
    })),
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
      siteTitle: 'Parking Centro Ciudad - Reserva tu plaza 24/7',
      siteDescription: 'Parking cubierto en pleno centro de Madrid. Reserva online tu plaza con acceso 24 horas.',
      contactEmail: 'info@parkingcentro.com',
      contactPhone: '+34 91 987 65 43',
      contactAddress: 'Plaza Mayor, 1, 28012 Madrid, España',
      usefulInfo: [
        { title: 'Horario', description: 'Abierto 24 horas, todos los días del año.' },
        { title: 'Acceso', description: 'Presenta el código QR de tu reserva en la entrada automática.' },
        { title: 'Salida', description: 'Al salir, escanea tu código QR o introduce tu matrícula.' },
        { title: 'Seguridad', description: 'Vigilancia 24h y cámaras de seguridad en todas las plantas.' },
      ],
      featureFlags: {
        bookings: {
          enabled: true,
          allowPublicCancellation: false,
          requirePaymentOnBooking: true,
          maxAdvanceBookingDays: 30,
          minAdvanceBookingHours: 0,
        },
        checkIn: {
          enabled: true,
          requireQRCode: true,
          allowManualCheckIn: false,
        },
        payments: {
          enabled: true,
          provider: 'redsys',
          requireDeposit: true,
          depositPercentage: 100,
        },
        availability: {
          showRealTimeCapacity: true,
          bufferSlots: 0,
        },
        notifications: {
          enabled: true,
          emailEnabled: true,
          smsEnabled: true,
        },
        analytics: {
          enabled: false,
          trackingEnabled: false,
        },
        multiLanguage: {
          enabled: false,
          supportedLocales: ['es-ES'],
        },
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
            passwordHash: adminPasswordHash,
            name: 'Administrador Parking',
            role: 'ADMIN',
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
          validTo: new Date('2027-12-31'),
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
