import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const staffPasswordHash = await bcrypt.hash('staff123', 10);

  // Limpiar datos existentes
  console.log('🧹 Limpiando datos existentes...');
  // Tablas nuevas (parking/discounts/tickets/invoices)
  await prisma.gateEvent.deleteMany();
  await prisma.parkingSession.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.bookingInvoice.deleteMany();
  await prisma.discountCode.deleteMany();

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
      extendedSettings: {
        general: {
          businessType: 'museum',
          contactEmail: 'info@museoarte.com',
          contactPhone: '+34 91 123 45 67',
          address: 'Calle del Arte, 123, 28001 Madrid, España',
          description: 'Museo dedicado al arte moderno y contemporáneo con exposiciones permanentes y temporales.',
        },
        regional: {
          dateFormat: 'dd/MM/yyyy',
          timeFormat: '24h',
        },
        branding: {
          accentColor: '#457B9D',
          customCSS: '',
        },
        policies: {
          cancellationPolicy: 'Cancelación gratuita hasta 24 horas antes de la visita. Cancelaciones con menos de 24 horas de antelación no serán reembolsadas.',
          refundPolicy: 'Reembolso completo para cancelaciones elegibles realizadas con más de 24 horas de antelación.',
          termsAndConditions: 'Al realizar una reserva, acepta nuestros términos y condiciones de uso del museo.',
          privacyPolicy: 'Sus datos personales serán tratados conforme al RGPD y únicamente para gestionar su reserva.',
          minBookingNoticeHours: 2,
          maxBookingAdvanceDays: 90,
        },
        booking: {
          requireCustomerPhone: true,
          requireCustomerAddress: false,
          maxPartySize: 15,
          defaultSlotDuration: 30,
          bookingCodePrefix: 'MAM',
        },
        notifications: {
          sendBookingConfirmation: true,
          sendBookingReminder: true,
          reminderHoursBefore: 24,
          sendCancellationNotification: true,
          fromEmail: 'reservas@museoarte.com',
          fromName: 'Museo de Arte Moderno',
        },
        integrations: {
          stripePublicKey: 'pk_test_example',
          googleAnalyticsId: 'G-XXXXXXXXXX',
          customWebhookUrl: '',
        },
        tax: {
          businessLegalName: 'Museo de Arte Moderno S.L.',
          taxId: 'B12345678',
          taxIdType: 'CIF',
          taxRate: 21,
          includeTaxInPrice: true,
          invoicePrefix: 'MAM',
          invoiceNumberStart: 1001,
          invoiceFooter: 'Gracias por su visita. Conserve este ticket como justificante.',
          bankAccountName: 'Museo de Arte Moderno S.L.',
          bankAccountNumber: '',
          bankName: 'Banco Santander',
          swiftBic: 'BSCHESMM',
          iban: 'ES00 0000 0000 00 0000000000',
        },
        seo: {
          metaTitle: 'Museo de Arte Moderno - Reserva tu entrada online',
          metaDescription: 'Compra tus entradas al Museo de Arte Moderno. Exposiciones permanentes y temporales. Reserva online y evita colas.',
          ogImage: 'https://example.com/museo-og-image.jpg',
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
      extendedSettings: {
        general: {
          businessType: 'service',
          contactEmail: 'info@parkingcentro.com',
          contactPhone: '+34 91 987 65 43',
          address: 'Plaza Mayor, 1, 28012 Madrid, España',
          description: 'Parking cubierto 24 horas en el centro de la ciudad.',
        },
        regional: {
          dateFormat: 'dd/MM/yyyy',
          timeFormat: '24h',
        },
        branding: {
          accentColor: '#1D3557',
        },
        policies: {
          cancellationPolicy: 'No se permiten cancelaciones una vez realizada la reserva.',
          refundPolicy: 'No se realizan reembolsos.',
          minBookingNoticeHours: 0,
          maxBookingAdvanceDays: 30,
        },
        booking: {
          requireCustomerPhone: true,
          requireCustomerAddress: false,
          maxPartySize: 1,
          defaultSlotDuration: 60,
          bookingCodePrefix: 'PK',
        },
        notifications: {
          sendBookingConfirmation: true,
          sendBookingReminder: false,
          reminderHoursBefore: 0,
          sendCancellationNotification: false,
          fromEmail: 'reservas@parkingcentro.com',
          fromName: 'Parking Centro Ciudad',
        },
        integrations: {
          stripePublicKey: 'pk_test_example',
        },
        tax: {
          businessLegalName: 'Aparcamientos Centro S.L.',
          taxId: 'B87654321',
          taxIdType: 'CIF',
          taxRate: 21,
          includeTaxInPrice: true,
          invoicePrefix: 'PK',
          invoiceNumberStart: 2001,
          invoiceFooter: 'Parking Centro Ciudad - Gracias por su confianza',
          bankAccountName: 'Aparcamientos Centro S.L.',
          bankName: 'BBVA',
          swiftBic: 'BBVAESMM',
          iban: 'ES00 1111 2222 33 4444444444',
        },
        seo: {
          metaTitle: 'Parking Centro Ciudad - Reserva tu plaza',
          metaDescription: 'Reserva tu plaza de parking en el centro de Madrid. 24 horas, cubierto y seguro.',
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
