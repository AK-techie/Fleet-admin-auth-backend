const mongoose = require('mongoose');

const geofenceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    area: {
      type: String, // WKT polygon string e.g., POLYGON((lat lng, lat lng, ...)) or CIRCLE(lat, lng, radius)
      required: true,
    },
    traccarGeofenceId: {
      type: Number,
      default: null,
    },
    assignedVehicleIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Geofence', geofenceSchema);
