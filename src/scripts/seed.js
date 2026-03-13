/**
 * Seed Script — Create the initial admin user.
 *
 * Usage: node src/scripts/seed.js
 *
 * This creates a default admin user for managing the platform
 * from the admin dashboard. Change the credentials after first login.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

const ADMIN_DATA = {
  name: 'Safiox Admin',
  email: 'admin@safiox.com',
  phone: '+2340000000000',
  password: 'Admin@1234',
  role: 'admin',
  isEmailVerified: true,
};

const seed = async () => {
  try {
    console.log('🌱 Seeding database...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      console.log(`⚠️  Admin user already exists: ${existingAdmin.email}`);
      console.log('   Skipping seed. Delete the admin user if you want to re-seed.\n');
    } else {
      const admin = await User.create(ADMIN_DATA);
      console.log('✅ Admin user created:');
      console.log(`   Name:     ${admin.name}`);
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Password: Admin@1234`);
      console.log(`   Role:     ${admin.role}\n`);
      console.log('⚠️  IMPORTANT: Change the admin password after first login!\n');
    }

    await mongoose.disconnect();
    console.log('✅ Database connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
