const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
const Admin = require('./models/Admin');
const Vehicle = require('./models/Vehicle');
const Driver = require('./models/Driver');

dotenv.config();

// Force Node.js to use Google DNS for SRV record resolution if needed
dns.setServers(['8.8.8.8', '8.8.4.4']);

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected for Seeding');

    // 1. Seed Admin
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL || 'admin@example.com' });
    if (!existingAdmin) {
      const admin = await Admin.create({
        name: 'Super Admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_PASSWORD || 'Admin@123',
        role: 'admin',
      });
      console.log('✅ Admin created:', admin.email);
    } else {
      console.log('ℹ️ Admin already exists:', existingAdmin.email);
    }

    // 2. Seed Initial Vehicles
    const vehicleCount = await Vehicle.countDocuments();
    if (vehicleCount === 0) {
      await Vehicle.insertMany([
        {
          plate: 'WP CAB-4521',
          type: 'Van',
          capacity: '750 kg',
          assignedDriverName: 'Kasun Perera',
          status: 'moving',
          traccarDeviceId: 1001,
          traccarUniqueId: 'TRC-001',
          gpsEnabled: true,
          lastLocation: { latitude: 6.9271, longitude: 79.8612, speed: 47, course: 90, timestamp: new Date() },
          todayDistance: 82.4,
          tripsToday: 6,
        },
        {
          plate: 'WP KL-8890',
          type: 'Motorbike',
          capacity: '20 kg',
          assignedDriverName: 'Nadeesha Fernando',
          status: 'idle',
          traccarDeviceId: 1002,
          traccarUniqueId: 'TRC-002',
          gpsEnabled: true,
          lastLocation: { latitude: 6.9147, longitude: 79.8731, speed: 0, course: 180, timestamp: new Date() },
          todayDistance: 34.8,
          tripsToday: 3,
        },
        {
          plate: 'WP QA-2210',
          type: 'Truck',
          capacity: '2500 kg',
          assignedDriverName: 'Unassigned',
          // ✅ Real Traccar hardware device linked to this vehicle
          status: 'offline',
          traccarDeviceId: 34376123,
          traccarUniqueId: '864726059054325',
          gpsEnabled: true,
          lastLocation: { latitude: 6.8905, longitude: 79.8565, speed: 0, course: 0, timestamp: new Date(Date.now() - 3600000) },
          todayDistance: 0,
          tripsToday: 0,
        },
        {
          plate: 'WP CAK-6674',
          type: 'Van',
          capacity: '750 kg',
          assignedDriverName: 'Ruwan Silva',
          status: 'moving',
          traccarDeviceId: 1004,
          traccarUniqueId: 'TRC-004',
          gpsEnabled: true,
          lastLocation: { latitude: 6.9497, longitude: 79.8607, speed: 39, course: 45, timestamp: new Date() },
          todayDistance: 61.2,
          tripsToday: 5,
        },
      ]);
      console.log('✅ Initial Vehicles seeded into MongoDB');
    }

    // 3. Seed Initial Drivers
    const driverCount = await Driver.countDocuments();
    if (driverCount === 0) {
      await Driver.insertMany([
        {
          name: 'Kasun Perera',
          phone: '077 123 4567',
          license: 'B1234567',
          deviceId: 'TRC-001',
          traccarDeviceId: 1001,
          status: 'online',
          deviceStatus: 'connected',
          currentSpeed: 48,
          todayDistance: 82.4,
          tripsToday: 6,
        },
        {
          name: 'Nadeesha Fernando',
          phone: '071 987 6543',
          license: 'B7654321',
          deviceId: 'TRC-002',
          traccarDeviceId: 1002,
          status: 'online',
          deviceStatus: 'connected',
          currentSpeed: 31,
          todayDistance: 54.2,
          tripsToday: 4,
        },
        {
          name: 'Ruwan Silva',
          phone: '076 555 2211',
          license: 'B4455667',
          deviceId: 'TRC-003',
          traccarDeviceId: 1003,
          status: 'offline',
          deviceStatus: 'disconnected',
          currentSpeed: 0,
          todayDistance: 0,
          tripsToday: 0,
        },
      ]);
      console.log('✅ Initial Drivers seeded into MongoDB');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
};

seedDatabase();
