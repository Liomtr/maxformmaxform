import knex from '../src/db/knex.js'
import { migrate } from '../src/db/migrate.js'

async function run() {
  try {
    await knex.raw('SELECT 1')
    await migrate()
    console.log('db:migrate completed')
  } catch (error) {
    console.error('db:migrate failed:', error.message)
    process.exitCode = 1
  } finally {
    await knex.destroy()
  }
}

run()
