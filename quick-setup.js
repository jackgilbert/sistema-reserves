#!/usr/bin/env node

/**
 * Quick setup script for demo
 * Run: node quick-setup.js
 */

const { execSync } = require('child_process');
const path = require('path');

function run(command, cwd = process.cwd()) {
  console.log(`\n💻 Running: ${command}`);
  console.log(`📁 In: ${cwd}`);
  try {
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' }
    });
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    throw error;
  }
}

async function main() {
  console.log('🚀 Quick Setup - Demo Data\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const root = path.resolve(__dirname);
  const dbPath = path.join(root, 'packages', 'db');

  try {
    // Step 1: Install dependencies
    console.log('\n📦 Step 1: Installing dependencies...');
    run('pnpm install', root);

    // Step 2: Apply SQL migration directly
    console.log('\n🗄️  Step 2: Applying database migration...');
    run('docker exec sistema-reservas-db psql -U reservas -d sistema_reservas -f /tmp/quick-migrate.sql || docker exec sistema-reservas-db psql -U reservas -d sistema_reservas -c "ALTER TABLE instances ADD COLUMN IF NOT EXISTS \\"extendedSettings\\" JSONB DEFAULT \'{}\';"', root);

    // Step 3: Generate Prisma client
    console.log('\n⚙️  Step 3: Generating Prisma client...');
    run('npx prisma generate', dbPath);

    // Step 4: Seed database
    console.log('\n🌱 Step 4: Seeding database...');
    run('pnpm db:seed', dbPath);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Setup Complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 DEMO CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   Email:    admin@museo.com');
    console.log('   Password: admin123\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🌐 ACCESS POINTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('   Admin: http://localhost:3000/admin/login');
    console.log('   Public: http://localhost:3000/\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANT: Restart your dev server!');
    console.log('   1. Press Ctrl+C to stop current server');
    console.log('   2. Run: pnpm dev\n');

  } catch (error) {
    console.error('\n❌ Setup failed!');
    console.error('\nTry running these commands manually:');
    console.error('  1. pnpm install');
    console.error('  2. cd packages/db');
    console.error('  3. npx prisma migrate dev --name add_extended_settings');
    console.error('  4. npx prisma generate');
    console.error('  5. pnpm db:seed');
    console.error('  6. cd ../..');
    console.error('  7. pnpm dev\n');
    process.exit(1);
  }
}

main();
