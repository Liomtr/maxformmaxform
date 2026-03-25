import 'dotenv/config'
import User from './src/models/User.js'
import Role from './src/models/Role.js'
import { migrate, seed } from './src/db/migrate.js'
import knex from './src/db/knex.js'

async function ensureAdmin() {
  try {
    await knex.raw('SELECT 1')
    await migrate()
    await seed()

    const existing = await User.findByUsername('admin')
    if (existing) {
      console.log('Admin user already exists')
      return
    }

    const adminRole = await Role.findByCode('admin')
    if (!adminRole) {
      throw new Error('Admin role not found after seed')
    }

    const password = process.env.ADMIN_INIT_PASSWORD || '123456'
    const email = process.env.ADMIN_INIT_EMAIL || 'admin@example.com'
    const user = await User.create({
      username: 'admin',
      email,
      password,
      role_id: adminRole.id
    })

    console.log(`Admin user created: ${user.username}`)
  } catch (err) {
    console.error('Failed to initialize admin user:', err.message)
    process.exitCode = 1
  } finally {
    await knex.destroy()
  }
}

ensureAdmin()
