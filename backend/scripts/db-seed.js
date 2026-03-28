import knex from '../src/db/knex.js'
import { seedDevAccounts } from '../src/db/seed.js'

async function run() {
  try {
    await knex.raw('SELECT 1')
    await seedDevAccounts()
    console.log('db:seed:dev completed')
  } catch (error) {
    console.error('db:seed:dev failed:', error.message)
    process.exitCode = 1
  } finally {
    await knex.destroy()
  }
}

run()
