const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    plate: {
      type: String,
      required: [true, 'Vehicle plate number is required'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      default: 'Van',
      trim: true,
    },
    capacity: {
      type: String,
      default: '750 kg',
    },
    assignedDriverId: {
      type: String,
      default: null,
    },
    assignedDriverName: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['moving', 'stopped', 'idle', 'offline', 'en-route', 'available', 'active', 'in-use'],
      default: 'offline',
    },
    traccarDeviceId: {
      type: Number,
      default: null,
    },
    traccarUniqueId: {
      type: String,
      default: null,
      trim: true,
    },
    gpsEnabled: {
      type: Boolean,
      default: false,
    },
    lastLocation: {
      latitude: { type: Number, default: 6.9271 },
      longitude: { type: Number, default: 79.8612 },
      speed: { type: Number, default: 0 },
      course: { type: Number, default: 0 },
      altitude: { type: Number, default: 0 },
      address: { type: String, default: '' },
      accuracy: { type: Number, default: 0 },
      timestamp: { type: Date, default: Date.now },
    },
    todayDistance: {
      type: Number,
      default: 0,
    },
    tripsToday: {
      type: Number,
      default: 0,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Vehicle', vehicleSchema);
