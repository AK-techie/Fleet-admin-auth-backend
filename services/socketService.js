const { Server } = require('socket.io');
const WebSocket = require('ws');
const Vehicle = require('../models/Vehicle');
const GpsAlert = require('../models/GpsAlert');
const traccarService = require('./traccarService');

class SocketService {
  constructor() {
    this.io = null;
    this.traccarWs = null;
    this.reconnectTimer = null;
  }

  init(server) {
    // 1. Initialize Socket.IO Server
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      console.log(`⚡ Socket.io client connected: ${socket.id}`);

      socket.on('disconnect', () => {
        console.log(`🔌 Socket.io client disconnected: ${socket.id}`);
      });
    });

    // 2. Connect to Traccar WebSocket
    this.connectTraccarWebSocket();
  }

  async connectTraccarWebSocket() {
    const traccarBase = process.env.TRACCAR_BASE_URL || 'http://localhost:8082';

    // Convert http -> ws  and  https -> wss  correctly
    const wsUrl = traccarBase
      .replace(/^https:\/\//, 'wss://')
      .replace(/^http:\/\//, 'ws://')
      + '/api/socket';

    console.log(`📡 Connecting to Traccar WebSocket at: ${wsUrl}`);

    try {
      // Traccar's WebSocket ignores Basic auth — it needs a session cookie from POST /api/session
      const cookie = await traccarService.createSession();

      this.traccarWs = new WebSocket(wsUrl, {
        headers: {
          Cookie: cookie,
        },
      });

      this.traccarWs.on('open', () => {
        console.log('✅ Connected to Traccar WebSocket server successfully.');
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });

      this.traccarWs.on('message', async (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          await this.handleTraccarWsMessage(parsed);
        } catch (err) {
          console.error('Error parsing Traccar WS message:', err.message);
        }
      });

      this.traccarWs.on('error', (err) => {
        console.warn('Traccar WebSocket error (Traccar might be offline or starting):', err.message);
      });

      this.traccarWs.on('close', () => {
        console.warn('Traccar WebSocket connection closed. Retrying in 10 seconds...');
        this.scheduleReconnect();
      });
    } catch (err) {
      console.error('Failed to create Traccar WebSocket:', err.message);
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connectTraccarWebSocket();
      }, 10000);
    }
  }

  async handleTraccarWsMessage(message) {
    // Traccar WS sends objects like { positions: [...], devices: [...], events: [...] }
    if (message.positions && Array.isArray(message.positions)) {
      for (const pos of message.positions) {
        await this.processPositionUpdate(pos);
      }
    }

    if (message.events && Array.isArray(message.events)) {
      for (const event of message.events) {
        await this.processEventUpdate(event);
      }
    }
  }

  async processPositionUpdate(pos) {
    const deviceId = pos.deviceId;
    if (!deviceId) return;

    // Find linked vehicle in MongoDB
    let vehicle = await Vehicle.findOne({ traccarDeviceId: deviceId });

    // Vehicle may be linked only by uniqueId (e.g. phone identifier) — resolve it via Traccar
    if (!vehicle) {
      const device = await traccarService.getDeviceById(deviceId);
      if (device.data?.uniqueId) {
        vehicle = await Vehicle.findOne({ traccarUniqueId: device.data.uniqueId });
        if (vehicle) vehicle.traccarDeviceId = deviceId;
      }
    }

    if (!vehicle) {
      // Unlinked device update
      return;
    }

    const idleSpeedThreshold = Number(process.env.GPS_IDLE_SPEED_THRESHOLD || 3);
    const overspeedThreshold = Number(process.env.GPS_OVERSPEED_THRESHOLD || 80);

    const speedKmh = Math.round((pos.speed || 0) * 1.852); // Convert knots to km/h if knots, or raw speed if already km/h
    let status = 'stopped';
    if (speedKmh > idleSpeedThreshold) {
      status = 'moving';
    } else if (speedKmh > 0) {
      status = 'idle';
    }

    // Update vehicle last location in DB
    vehicle.lastLocation = {
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: speedKmh,
      course: pos.course || 0,
      altitude: pos.altitude || 0,
      address: pos.address || '',
      accuracy: pos.accuracy || 0,
      timestamp: pos.fixTime ? new Date(pos.fixTime) : new Date(),
    };
    vehicle.status = status;
    vehicle.lastSeen = new Date();
    await vehicle.save();

    const payload = {
      vehicleId: vehicle._id.toString(),
      registrationNumber: vehicle.plate,
      driverName: vehicle.assignedDriverName || 'Unassigned',
      latitude: pos.latitude,
      longitude: pos.longitude,
      speed: speedKmh,
      course: pos.course || 0,
      timestamp: vehicle.lastLocation.timestamp,
      status: status,
      address: pos.address || '',
      accuracy: pos.accuracy || 0,
    };

    // Broadcast to all connected React clients via Socket.IO
    if (this.io) {
      this.io.emit('vehicleLocationUpdated', payload);
    }

    // Check overspeed alert trigger
    if (speedKmh > overspeedThreshold) {
      const alertDoc = await GpsAlert.create({
        vehicleId: vehicle._id,
        vehiclePlate: vehicle.plate,
        traccarDeviceId: deviceId,
        type: 'overspeed',
        severity: 'warning',
        message: `Vehicle ${vehicle.plate} exceeded speed limit (${speedKmh} km/h > ${overspeedThreshold} km/h)`,
        speed: speedKmh,
        location: { latitude: pos.latitude, longitude: pos.longitude },
        timestamp: new Date(),
      });

      if (this.io) {
        this.io.emit('gpsAlert', alertDoc);
      }
    }
  }

  async processEventUpdate(event) {
    if (!this.io) return;
    this.io.emit('traccarEvent', event);
  }

  // Method to manually trigger broadcast location (useful for APIs or simulations)
  broadcastVehicleUpdate(payload) {
    if (this.io) {
      this.io.emit('vehicleLocationUpdated', payload);
    }
  }

  broadcastAlert(alert) {
    if (this.io) {
      this.io.emit('gpsAlert', alert);
    }
  }
}

module.exports = new SocketService();
