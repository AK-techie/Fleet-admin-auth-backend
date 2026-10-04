const axios = require('axios');

class TraccarService {
  constructor() {
    this.baseUrl = process.env.TRACCAR_BASE_URL || 'http://localhost:8082';
    this.username = process.env.TRACCAR_USERNAME || 'admin';
    this.password = process.env.TRACCAR_PASSWORD || 'admin';
    this.cookie = null;
  }

  getAuthConfig() {
    return {
      baseURL: this.baseUrl,
      auth: {
        username: this.username,
        password: this.password,
      },
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 5000,
    };
  }

  /**
   * Log in to Traccar and return the session cookie (needed for the WebSocket)
   */
  async createSession() {
    const response = await axios.post(
      '/api/session',
      new URLSearchParams({ email: this.username, password: this.password }).toString(),
      {
        baseURL: this.baseUrl,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 5000,
      }
    );
    const setCookie = response.headers['set-cookie'] || [];
    return setCookie.map((c) => c.split(';')[0]).join('; ');
  }

  /**
   * Fetch all devices from Traccar REST API
   */
  async getDevices() {
    try {
      const response = await axios.get('/api/devices', this.getAuthConfig());
      return { success: true, data: response.data };
    } catch (error) {
      console.warn('Traccar getDevices warning/error:', error.message);
      return {
        success: false,
        error: error.message,
        data: [],
        isOffline: true,
      };
    }
  }

  /**
   * Fetch single device by ID
   */
  async getDeviceById(deviceId) {
    try {
      const response = await axios.get(`/api/devices?id=${deviceId}`, this.getAuthConfig());
      return { success: true, data: response.data[0] || null };
    } catch (error) {
      console.warn(`Traccar getDeviceById(${deviceId}) error:`, error.message);
      return { success: false, error: error.message, data: null };
    }
  }

  /**
   * Create a device in Traccar
   */
  async createDevice(name, uniqueId) {
    try {
      const response = await axios.post(
        '/api/devices',
        { name, uniqueId },
        this.getAuthConfig()
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Traccar createDevice error:', error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Get position(s) from Traccar
   */
  async getPositions(deviceId = null) {
    try {
      const url = deviceId ? `/api/positions?id=${deviceId}` : '/api/positions';
      const response = await axios.get(url, this.getAuthConfig());
      return { success: true, data: response.data };
    } catch (error) {
      console.warn('Traccar getPositions error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get route history between two dates
   */
  async getRouteHistory(deviceId, fromDate, toDate) {
    try {
      const fromIso = new Date(fromDate).toISOString();
      const toIso = new Date(toDate).toISOString();
      const response = await axios.get(
        `/api/reports/route?deviceId=${deviceId}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        this.getAuthConfig()
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.warn(`Traccar getRouteHistory error for device ${deviceId}:`, error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get trip history report
   */
  async getTripsHistory(deviceId, fromDate, toDate) {
    try {
      const fromIso = new Date(fromDate).toISOString();
      const toIso = new Date(toDate).toISOString();
      const response = await axios.get(
        `/api/reports/trips?deviceId=${deviceId}&from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
        this.getAuthConfig()
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.warn(`Traccar getTripsHistory error for device ${deviceId}:`, error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get events report
   */
  async getEvents(deviceId = null, fromDate = null, toDate = null) {
    try {
      let url = '/api/reports/events?';
      if (deviceId) url += `deviceId=${deviceId}&`;
      if (fromDate) url += `from=${encodeURIComponent(new Date(fromDate).toISOString())}&`;
      if (toDate) url += `to=${encodeURIComponent(new Date(toDate).toISOString())}&`;

      const response = await axios.get(url, this.getAuthConfig());
      return { success: true, data: response.data };
    } catch (error) {
      console.warn('Traccar getEvents error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get list of Geofences
   */
  async getGeofences() {
    try {
      const response = await axios.get('/api/geofences', this.getAuthConfig());
      return { success: true, data: response.data };
    } catch (error) {
      console.warn('Traccar getGeofences error:', error.message);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Create a Geofence in Traccar
   */
  async createGeofence(name, area, description = '') {
    try {
      const response = await axios.post(
        '/api/geofences',
        { name, area, description },
        this.getAuthConfig()
      );
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Traccar createGeofence error:', error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Delete a Geofence
   */
  async deleteGeofence(id) {
    try {
      await axios.delete(`/api/geofences/${id}`, this.getAuthConfig());
      return { success: true };
    } catch (error) {
      console.error('Traccar deleteGeofence error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new TraccarService();
