import 'dotenv/config'

const config = {
  port: Number(process.env.PORT || 63002),
  frontendUrl: process.env.FRONTEND_URL || 'http://127.0.0.1:63000',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'survey_system'
  },

  upload: {
    maxSize: 10 * 1024 * 1024,
    pendingTtlHours: Number(process.env.UPLOAD_PENDING_TTL_HOURS || 24),
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  }
}

if (config.jwt.secret === 'dev-secret' && process.env.NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET must be set in production')
  process.exit(1)
}

export default config
