const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
    PORT: process.env.PORT || 3001,
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Auth & Security Config
    MASTER_PASSWORD: process.env.NAS_PASSWORD || 'admin1234',
    JWT_SECRET: process.env.JWT_SECRET || 'nas-super-secret-jwt-key-change-in-production-2026',
    COOKIE_NAME: 'nas_token',
    COOKIE_MAX_AGE_MS: 24 * 60 * 60 * 1000, // 24 hours
    
    // Brute-force protection rules
    LOCKOUT_THRESHOLD: 5, // 5 consecutive failures
    LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes (900 seconds)
    BACKOFF_BASE_MS: 500 // Exponential backoff base (500ms, 1000ms, 2000ms...)
};
