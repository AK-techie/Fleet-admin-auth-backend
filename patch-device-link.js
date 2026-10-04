/**
 * Patch script — link real Traccar device to WP QA-2210
 * Run once:  node patch-device-link.js
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');
const Vehicle = require('./models/Vehicle');

dotenv.config();
dns.setServers(['8.8.8.8', '8.8.4.4']);

async function patchDeviceLink() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const result = await Vehicle.findOneAndUpdate(
      { plate: 'WP QA-2210' },
      {
        $set: {
          traccarDeviceId: 34376123,
          traccarUniqueId: '864726059054325',
          gpsEnabled: true,
          status: 'offline',
        },
      },
      { new: true, upsert: false }
    );

    if (!result) {
      console.log('⚠️  Vehicle WP QA-2210 not found. Run seed first: npm run seed');
    } else {
      console.log('✅ WP QA-2210 patched successfully!');
      console.log('   traccarDeviceId :', result.traccarDeviceId);
      console.log('   traccarUniqueId :', result.traccarUniqueId);
      console.log('   gpsEnabled      :', result.gpsEnabled);
    }
  } catch (err) {
    console.error('❌ Patch failed:', err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

patchDeviceLink();
