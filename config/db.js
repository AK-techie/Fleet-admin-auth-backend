const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Validate that URI exists
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined in your .env file!');
    }

    console.log('🔄 Connecting to MongoDB...');

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // Timeout after 10s
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`\n❌ MongoDB Connection Error: ${error.message}`);

    // Helpful diagnostics
    if (error.message.includes('ECONNREFUSED') || error.message.includes('querySrv')) {
      console.error('\n🔍 Possible causes:');
      console.error('   1. Your IP is NOT whitelisted in MongoDB Atlas → Network Access → Add 0.0.0.0/0');
      console.error('   2. Your Atlas cluster is PAUSED (free tier auto-pauses) → Resume it in Atlas dashboard');
      console.error('   3. Wrong cluster URL in MONGO_URI');
      console.error('   4. Wrong DB username or password in MONGO_URI\n');
    }

    process.exit(1);
  }
};

module.exports = connectDB;
