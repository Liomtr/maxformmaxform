import 'dotenv/config'
import { migrate } from './src/db/migrate.js'
import { ensureAdminUser } from './src/db/seed.js'
import knex from './src/db/knex.js'

async function ensureAdmin() {
  try {
    await knex.raw('SELECT 1')
    await migrate()
    await ensureAdminUser({
      password: process.env.ADMIN_INIT_PASSWORD || '123456',
      email: process.env.ADMIN_INIT_EMAIL || 'admin@example.com'
    })
  } catch (err) {
    console.error('Failed to initialize admin user:', err.message)
    process.exitCode = 1
  } finally {
    await knex.destroy()
  }
}

ensureAdmin()
