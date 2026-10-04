// Load environment variables first — services read process.env when they are required
require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const connectDB = require('./config/db');
const socketService = require('./services/socketService');

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/gps', require('./routes/gpsRoutes'));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 Fleet Management & Traccar GPS Backend is running!',
    version: '1.0.0',
    endpoints: {
      login: 'POST /api/auth/login',
      profile: 'GET /api/auth/me (requires Bearer token)',
      gpsVehicles: 'GET /api/gps/vehicles',
      gpsDevices: 'GET /api/gps/devices',
      gpsAlerts: 'GET /api/gps/alerts',
      gpsGeofences: 'GET /api/gps/geofences',
    },
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found.`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// ─── Initialize Socket.IO & Traccar WS ─────────────────────────────────────────
socketService.init(server);

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
  console.log(`⚡ WebSocket URL: ws://localhost:${PORT}\n`);
});
