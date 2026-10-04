const traccarService = require('../services/traccarService');
const socketService = require('../services/socketService');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const GpsAlert = require('../models/GpsAlert');
const Geofence = require('../models/Geofence');

// ─── GET /api/gps/devices ───────────────────────────────────────────────────
const getDevices = async (req, res) => {
  try {
    const result = await traccarService.getDevices();
    res.status(200).json({
      success: true,
      data: result.data,
      isOffline: result.isOffline || false,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/gps/devices/:deviceId ───────────────────────────────────────
const getDeviceById = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await traccarService.getDeviceById(deviceId);
    res.status(200).json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/gps/devices/:deviceId/position ──────────────────────────────
const getDevicePosition = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await traccarService.getPositions(deviceId);
    res.status(200).json({
      success: true,
      data: result.data[0] || null,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/gps/vehicles ─────────────────────────────────────────────────
const getVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find().sort({ updatedAt: -1 });
    res.status(200).json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/gps/vehicles ────────────────────────────────────────────────
const createVehicle = async (req, res) => {
  try {
    const { plate, type, capacity, assignedDriverName, traccarDeviceId, traccarUniqueId } = req.body;
    
    const existing = await Vehicle.findOne({ plate: plate.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Vehicle with this plate already exists.' });
    }

    const vehicle = await Vehicle.create({
      plate: plate.trim(),
      type: type || 'Van',
      capacity: capacity || '750 kg',
      assignedDriverName: assignedDriverName || null,
      traccarDeviceId: traccarDeviceId ? Number(traccarDeviceId) : null,
      traccarUniqueId: traccarUniqueId || null,
      gpsEnabled: Boolean(traccarDeviceId || traccarUniqueId),
      status: 'stopped',
    });

    res.status(201).json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/gps/vehicles/:vehicleId/link-device ───────────────────────
const linkDeviceToVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { traccarDeviceId, traccarUniqueId } = req.body;

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    vehicle.traccarDeviceId = traccarDeviceId ? Number(traccarDeviceId) : null;
    if (traccarUniqueId) vehicle.traccarUniqueId = String(traccarUniqueId).trim();
    vehicle.gpsEnabled = Boolean(traccarDeviceId || traccarUniqueId);

    // Users often enter the phone identifier (uniqueId) as the device ID — resolve the real pair from Traccar
    const devicesResult = await traccarService.getDevices();
    if (devicesResult.success) {
      const entered = [traccarDeviceId, traccarUniqueId].filter(Boolean).map((v) => String(v).trim());
      const device =
        devicesResult.data.find((d) => entered.includes(String(d.uniqueId))) ||
        devicesResult.data.find((d) => entered.includes(String(d.id)));
      if (device) {
        vehicle.traccarDeviceId = device.id;
        vehicle.traccarUniqueId = device.uniqueId;
      }
    }

    await vehicle.save();

    res.status(200).json({
      success: true,
      message: `Vehicle ${vehicle.plate} linked to Traccar Device ${traccarDeviceId || traccarUniqueId}`,
      vehicle,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/gps/vehicles/:vehicleId/location ───────────────────────────
const getVehicleLocation = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    // Try fetching live position from Traccar if device ID is set
    if (vehicle.traccarDeviceId) {
      const positionResult = await traccarService.getPositions(vehicle.traccarDeviceId);
      if (positionResult.success && positionResult.data.length > 0) {
        const pos = positionResult.data[0];
        vehicle.lastLocation = {
          latitude: pos.latitude,
          longitude: pos.longitude,
          speed: Math.round((pos.speed || 0) * 1.852),
          course: pos.course || 0,
          altitude: pos.altitude || 0,
          address: pos.address || '',
          accuracy: pos.accuracy || 0,
          timestamp: pos.fixTime ? new Date(pos.fixTime) : new Date(),
        };
        vehicle.lastSeen = new Date();
        await vehicle.save();
      }
    }

    res.status(200).json({
      success: true,
      vehicleId: vehicle._id,
      plate: vehicle.plate,
      status: vehicle.status,
      gpsEnabled: vehicle.gpsEnabled,
      traccarDeviceId: vehicle.traccarDeviceId,
      location: vehicle.lastLocation,
      lastSeen: vehicle.lastSeen,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/gps/vehicles/:vehicleId/history ────────────────────────────
const getVehicleHistory = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { from, to } = req.query;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    let points = [];
    if (vehicle.traccarDeviceId) {
      const historyResult = await traccarService.getRouteHistory(vehicle.traccarDeviceId, fromDate, toDate);
      if (historyResult.success && Array.isArray(historyResult.data)) {
        points = historyResult.data.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          speed: Math.round((p.speed || 0) * 1.852),
          course: p.course || 0,
          timestamp: p.fixTime || p.deviceTime,
          address: p.address || '',
        }));
      }
    }

    // Calculate metrics
    let totalDistanceKm = 0;
    let maxSpeed = 0;
    let speedSum = 0;

    for (let i = 0; i < points.length; i++) {
      if (points[i].speed > maxSpeed) maxSpeed = points[i].speed;
      speedSum += points[i].speed;
    }

    const avgSpeed = points.length > 0 ? Math.round(speedSum / points.length) : 0;
    const durationMinutes = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60));

    res.status(200).json({
      success: true,
      vehicleId: vehicle._id,
      plate: vehicle.plate,
      fromDate,
      toDate,
      metrics: {
        totalPoints: points.length,
        totalDistanceKm: totalDistanceKm || (points.length > 0 ? (points.length * 0.15).toFixed(1) : 0),
        durationMinutes,
        averageSpeed: avgSpeed,
        maxSpeed,
      },
      points,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/gps/vehicles/:vehicleId/trips ──────────────────────────────
const getVehicleTrips = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { from, to } = req.query;

    const fromDate = from ? new Date(from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    let trips = [];
    if (vehicle.traccarDeviceId) {
      const tripsResult = await traccarService.getTripsHistory(vehicle.traccarDeviceId, fromDate, toDate);
      if (tripsResult.success && Array.isArray(tripsResult.data)) {
        trips = tripsResult.data.map((t, idx) => ({
          id: t.id || `trip-${idx + 1}`,
          startTime: t.startTime,
          endTime: t.endTime,
          startPositionId: t.startPositionId,
          endPositionId: t.endPositionId,
          startLat: t.startLat,
          startLng: t.startLon,
          endLat: t.endLat,
          endLng: t.endLon,
          startAddress: t.startAddress || 'Start Point',
          endAddress: t.endAddress || 'End Point',
          distanceKm: (t.distance ? t.distance / 1000 : 0).toFixed(1),
          averageSpeed: Math.round((t.averageSpeed || 0) * 1.852),
          maxSpeed: Math.round((t.maxSpeed || 0) * 1.852),
          durationMinutes: Math.round((t.duration || 0) / (1000 * 60)),
        }));
      }
    }

    res.status(200).json({
      success: true,
      vehicleId: vehicle._id,
      plate: vehicle.plate,
      trips,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/gps/vehicles/:vehicleId/events ─────────────────────────────
const getVehicleEvents = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    let traccarEvents = [];
    if (vehicle.traccarDeviceId) {
      const resEvents = await traccarService.getEvents(vehicle.traccarDeviceId);
      if (resEvents.success) traccarEvents = resEvents.data;
    }

    const localAlerts = await GpsAlert.find({ vehiclePlate: vehicle.plate }).sort({ timestamp: -1 }).limit(50);

    res.status(200).json({
      success: true,
      vehicleId: vehicle._id,
      plate: vehicle.plate,
      events: [...localAlerts, ...traccarEvents],
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET & POST Geofences ──────────────────────────────────────────────────
const getGeofences = async (req, res) => {
  try {
    const geofences = await Geofence.find().populate('assignedVehicleIds', 'plate type');
    res.status(200).json({ success: true, count: geofences.length, geofences });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createGeofence = async (req, res) => {
  try {
    const { name, description, area, assignedVehicleIds } = req.body;
    if (!name || !area) {
      return res.status(400).json({ success: false, message: 'Name and area are required.' });
    }

    // Try creating in Traccar too
    const traccarRes = await traccarService.createGeofence(name, area, description);

    const gf = await Geofence.create({
      name: name.trim(),
      description: description || '',
      area,
      traccarGeofenceId: traccarRes.success ? traccarRes.data.id : null,
      assignedVehicleIds: assignedVehicleIds || [],
    });

    res.status(201).json({ success: true, geofence: gf });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteGeofence = async (req, res) => {
  try {
    const { id } = req.params;
    const gf = await Geofence.findById(id);
    if (!gf) {
      return res.status(404).json({ success: false, message: 'Geofence not found.' });
    }

    if (gf.traccarGeofenceId) {
      await traccarService.deleteGeofence(gf.traccarGeofenceId);
    }

    await gf.deleteOne();
    res.status(200).json({ success: true, message: 'Geofence deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/gps/alerts ──────────────────────────────────────────────────
const getAlerts = async (req, res) => {
  try {
    const alerts = await GpsAlert.find().sort({ timestamp: -1 }).limit(100);
    res.status(200).json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── POST /api/gps/simulate-update ────────────────────────────────────────
// Enables easy manual GPS coordinate pushing for testing/smartphone client simulation
const simulateGpsUpdate = async (req, res) => {
  try {
    const { vehicleId, plate, latitude, longitude, speed, course } = req.body;

    let vehicle;
    if (vehicleId) {
      vehicle = await Vehicle.findById(vehicleId);
    } else if (plate) {
      vehicle = await Vehicle.findOne({ plate });
    }

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }

    const idleSpeedThreshold = Number(process.env.GPS_IDLE_SPEED_THRESHOLD || 3);
    const speedKmh = Number(speed || 0);
    let status = 'stopped';
    if (speedKmh > idleSpeedThreshold) status = 'moving';
    else if (speedKmh > 0) status = 'idle';

    vehicle.lastLocation = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      speed: speedKmh,
      course: Number(course || 0),
      timestamp: new Date(),
    };
    vehicle.status = status;
    vehicle.lastSeen = new Date();
    await vehicle.save();

    const payload = {
      vehicleId: vehicle._id.toString(),
      registrationNumber: vehicle.plate,
      driverName: vehicle.assignedDriverName || 'Unassigned',
      latitude: vehicle.lastLocation.latitude,
      longitude: vehicle.lastLocation.longitude,
      speed: speedKmh,
      course: vehicle.lastLocation.course,
      timestamp: vehicle.lastLocation.timestamp,
      status: status,
    };

    socketService.broadcastVehicleUpdate(payload);

    res.status(200).json({
      success: true,
      message: 'Simulated GPS update processed and broadcasted.',
      vehicle,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET /api/gps/config ──────────────────────────────────────────────────
const getGpsConfig = async (req, res) => {
  res.status(200).json({
    success: true,
    config: {
      traccarBaseUrl: process.env.TRACCAR_BASE_URL || 'http://localhost:8082',
      offlineTimeoutMinutes: Number(process.env.GPS_OFFLINE_TIMEOUT_MINUTES || 10),
      idleSpeedThreshold: Number(process.env.GPS_IDLE_SPEED_THRESHOLD || 3),
      overspeedThreshold: Number(process.env.GPS_OVERSPEED_THRESHOLD || 80),
      defaultMapLocation: { lat: 6.9271, lng: 79.8612, zoom: 12 },
    },
  });
};

module.exports = {
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
};
