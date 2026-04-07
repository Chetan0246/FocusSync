module.exports = {
  JWT_SECRET: process.env.JWT_SECRET || 'focussync-secure-jwt-secret-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
