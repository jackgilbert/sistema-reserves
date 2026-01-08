const { PrismaClient } = require('./packages/db/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🚗 Configurando demo de parking...\n');

  // 1. Buscar tenant parking-demo
  let tenant = await prisma.instance.findFirst({
    where: { slug: 'parking-demo' },
  });

  if (!tenant) {
    console.error('❌ Tenant parking-demo no encontrado. Ejecuta primero: bash setup-demo.sh');
    process.exit(1);
  }

  console.log(`✅ Tenant encontrado: ${tenant.name} (${tenant.slug})`);

  // 2. Crear oferta de parking si no existe
  let parkingOffering = await prisma.offering.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'Parking - Plaza de Garaje',
    },
  });

  if (!parkingOffering) {
    parkingOffering = await prisma.offering.create({
      data: {
        tenantId: tenant.id,
        slug: 'parking-plaza-garaje',
        name: 'Parking - Plaza de Garaje',
        description: 'Reserva de plaza de parking con pago por minutos. Tarifa: €0.20/minuto',
        type: 'CAPACITY',
        basePrice: 0, // Precio base 0, se cobra por minutos
        currency: 'EUR',
        capacity: 50,
        requiresApproval: false,
        active: true,
        metadata: {
          parking: {
            enabled: true,
            pricePerMinuteCents: 20, // €0.20 por minuto = 20 céntimos
            gateIdEntry: 'entrada-principal',
            gateIdExit: 'salida-principal',
          },
          requiresPlate: true, // Matrícula obligatoria en metadata del booking
        },
      },
    });
    console.log(`✅ Oferta de parking creada: ${parkingOffering.name}`);
  } else {
    console.log(`✅ Oferta de parking ya existe: ${parkingOffering.name}`);
  }

  // 3. Crear booking de ejemplo con matrícula
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const slotStart = new Date(today);
  slotStart.setHours(10, 0, 0, 0);
  
  const slotEnd = new Date(today);
  slotEnd.setHours(14, 0, 0, 0); // 4 horas de ventana para entrar

  let testBooking = await prisma.booking.findFirst({
    where: {
      tenantId: tenant.id,
      offeringId: parkingOffering.id,
      code: 'PARK-TEST-001',
    },
  });

  if (!testBooking) {
    testBooking = await prisma.booking.create({
      data: {
        tenantId: tenant.id,
        offeringId: parkingOffering.id,
        code: 'PARK-TEST-001',
        slotStart,
        slotEnd,
        quantity: 1,
        status: 'CONFIRMED',
        totalAmount: 0,
        currency: 'EUR',
        customerEmail: 'test@parking.com',
        customerName: 'Cliente Test Parking',
        customerPhone: '+34600000000',
        metadata: {
          plate: '1234ABC',
          paymentType: 'parking-by-minute',
        },
      },
    });
    console.log(`✅ Reserva de test creada: ${testBooking.code} (matrícula: 1234ABC)`);
  } else {
    console.log(`✅ Reserva de test ya existe: ${testBooking.code}`);
  }

  console.log('\n🎉 Configuración de parking completada!\n');
  console.log('📋 Endpoints disponibles:');
  console.log('  POST http://localhost:3001/parking/entry');
  console.log('    Body: { "bookingCode": "PARK-TEST-001", "plate": "1234ABC" }');
  console.log('');
  console.log('  POST http://localhost:3001/parking/exit/quote');
  console.log('    Body: { "bookingCode": "PARK-TEST-001", "plate": "1234ABC" }');
  console.log('');
  console.log('  POST http://localhost:3001/parking/exit/pay');
  console.log('    Body: { "sessionId": "<id-from-quote>" }');
  console.log('');
  console.log('💡 Tolerancia de matrícula: ±1 carácter (1234ABC ≈ 1234AB0)');
  console.log('💰 Tarifa: €0.20/minuto (con redondeo hacia arriba)');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
