const mongoose = require('mongoose');

const gpsAlertSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      default: null,
    },
    vehiclePlate: {
      type: String,
      required: true,
    },
    traccarDeviceId: {
      type: Number,
      default: null,
    },
    type: {
      type: String,
      enum: ['overspeed', 'geofenceEnter', 'geofenceExit', 'deviceOffline', 'ignitionOn', 'ignitionOff', 'idle', 'custom'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['info', 'warning', 'critical'],
      default: 'warning',
    },
    message: {
      type: String,
      required: true,
    },
    speed: {
      type: Number,
      default: 0,
    },
    location: {
      latitude: Number,
      longitude: Number,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GpsAlert', gpsAlertSchema);
