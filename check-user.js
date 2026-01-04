const { PrismaClient } = require('./packages/db/node_modules/@prisma/client');
const bcrypt = require('./packages/db/node_modules/bcryptjs');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    console.log('🔍 Checking for admin user...');
    
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        passwordHash: true,
      }
    });

    console.log(`\nFound ${users.length} users:\n`);
    users.forEach(user => {
      console.log('---');
      console.log(`Email: ${user.email}`);
      console.log(`Name: ${user.name}`);
      console.log(`Role: ${user.role}`);
      console.log(`TenantId: ${user.tenantId}`);
      console.log(`Password Hash: ${user.passwordHash.substring(0, 20)}...`);
    });

    // Test password comparison
    if (users.length > 0) {
      const testUser = users.find(u => u.email === 'admin@museo.com');
      if (testUser) {
        console.log('\n\n🔐 Testing password comparison for admin@museo.com...');
        const isValid = await bcrypt.compare('admin123', testUser.passwordHash);
        console.log(`Password "admin123" matches: ${isValid ? '✅ YES' : '❌ NO'}`);
      }
    }

    // Also check instances
    const instances = await prisma.instance.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
      }
    });

    console.log(`\n\nFound ${instances.length} instances:\n`);
    instances.forEach(instance => {
      console.log(`- ${instance.name} (${instance.slug}) [ID: ${instance.id}]`);
    });

    // Check domains
    const domains = await prisma.domain.findMany({
      select: {
        domain: true,
        isPrimary: true,
        instanceId: true,
      }
    });

    console.log(`\n\nFound ${domains.length} domains:\n`);
    domains.forEach(domain => {
      console.log(`- ${domain.domain} (${domain.isPrimary ? 'PRIMARY' : 'secondary'}) -> Instance: ${domain.instanceId}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
