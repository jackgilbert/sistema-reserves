// Quick script to check database and create localhost domain if missing
const { PrismaClient } = require('./packages/db/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking database...');
  
  // Check domains
  const domains = await prisma.domain.findMany({
    include: { instance: true }
  });
  
  console.log(`Found ${domains.length} domains:`, domains.map(d => d.domain));
  
  // Check instances
  const instances = await prisma.instance.findMany();
  console.log(`Found ${instances.length} instances:`, instances.map(i => i.slug));
  
  if (instances.length === 0) {
    console.log('❌ No instances found! Run: cd packages/db && pnpm db:seed');
    await prisma.$disconnect();
    return;
  }
  
  // Check if localhost exists
  const localhost = domains.find(d => d.domain === 'localhost');
  
  if (!localhost && instances.length > 0) {
    console.log('⚠️  localhost domain missing, creating it...');
    await prisma.domain.create({
      data: {
        domain: 'localhost',
        isPrimary: true,
        instanceId: instances[0].id
      }
    });
    console.log('✅ localhost domain created!');
  } else {
    console.log('✅ localhost domain exists!');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
