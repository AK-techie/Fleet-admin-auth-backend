/**
 * seed.js — Run this ONCE to create the admin user in MongoDB
 * Usage: npm run seed
 *        OR: node seed.js
 *
 * After seeding, delete or gitignore this file if you want.
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
const Admin = require('./models/Admin');

dotenv.config();

// Force Node.js to use Google DNS for SRV record resolution
dns.setServers(['8.8.8.8', '8.8.4.4']);

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    // Check if admin already exists
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existing) {
      console.log('⚠️  Admin already exists:', existing.email);
      process.exit(0);
    }

    // Create the admin
    const admin = await Admin.create({
      name: 'Super Admin',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'Admin@123',
      role: 'admin',
    });

    console.log('✅ Admin created successfully!');
    console.log(`   Name  : ${admin.name}`);
    console.log(`   Email : ${admin.email}`);
    console.log('   Password is hashed and stored securely in MongoDB.\n');
    console.log('🔐 Use the email & password from your .env to log in.\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
