const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getDevices,
  getDeviceById,
  getDevicePosition,
  getVehicles,
  createVehicle,
  linkDeviceToVehicle,
  getVehicleLocation,
  getVehicleHistory,
  getVehicleTrips,
  getVehicleEvents,
  getGeofences,
  createGeofence,
  deleteGeofence,
  getAlerts,
  simulateGpsUpdate,
  getGpsConfig,
} = require('../controllers/gpsController');

// All GPS routes require authentication
router.use(protect);

// Device endpoints
router.get('/devices', getDevices);
router.get('/devices/:deviceId', getDeviceById);
router.get('/devices/:deviceId/position', getDevicePosition);

// Vehicle endpoints
router.get('/vehicles', getVehicles);
router.post('/vehicles', createVehicle);
router.post('/vehicles/:vehicleId/link-device', linkDeviceToVehicle);
router.get('/vehicles/:vehicleId/location', getVehicleLocation);
router.get('/vehicles/:vehicleId/history', getVehicleHistory);
router.get('/vehicles/:vehicleId/trips', getVehicleTrips);
router.get('/vehicles/:vehicleId/events', getVehicleEvents);

// Geofence endpoints
router.get('/geofences', getGeofences);
router.post('/geofences', createGeofence);
router.delete('/geofences/:id', deleteGeofence);

// Alerts endpoints
router.get('/alerts', getAlerts);

// Testing / Simulation & Config
router.post('/simulate-update', simulateGpsUpdate);
router.get('/config', getGpsConfig);

module.exports = router;
