const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Driver name is required'],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    license: {
      type: String,
      trim: true,
    },
    deviceId: {
      type: String,
      trim: true,
    },
    traccarDeviceId: {
      type: Number,
      default: null,
    },
    assignedVehicleId: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'on-ride'],
      default: 'offline',
    },
    deviceStatus: {
      type: String,
      enum: ['connected', 'disconnected'],
      default: 'disconnected',
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    currentSpeed: {
      type: Number,
      default: 0,
    },
    todayDistance: {
      type: Number,
      default: 0,
    },
    tripsToday: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);
