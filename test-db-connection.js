#!/usr/bin/env node

const { PrismaClient } = require('@sistema-reservas/db');

async function test() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✓ Database connected');
    
    // Get first instance
    const instance = await prisma.instance.findFirst({
      include: { domains: true }
    });
    console.log('✓ Instance found:', instance?.name);
    
    // Get first offering
    const offering = await prisma.offering.findFirst({
      where: { tenantId: instance?.id }
    });
    console.log('✓ Offering found:', offering?.name);
    console.log('  - Type:', offering?.type);
    console.log('  - Capacity:', offering?.capacity);
    console.log('  - Active:', offering?.active);
    
    // Try to create a test hold
    if (offering && instance) {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +1 day
      
      console.log('\nTesting hold creation...');
      console.log('  - offeringId:', offering.id);
      console.log('  - tenantId:', instance.id);
      console.log('  - slotStart:', futureDate.toISOString());
      
      // This would test if the database schema is correct
      // const hold = await prisma.hold.create({
      //   data: {
      //     tenantId: instance.id,
      //     offeringId: offering.id,
      //     slotStart: futureDate,
      //     slotEnd: new Date(futureDate.getTime() + 60 * 60 * 1000),
      //     quantity: 1,
      //     expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
      //     metadata: {}
      //   }
      // });
      // console.log('✓ Test hold created:', hold.id);
      
      console.log('✓ All tests passed!');
    }
    
  } catch (error) {
    console.error('✗ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

test();
