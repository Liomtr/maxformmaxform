import { migrate } from '../src/db/migrate.js'
import { ensureBaseRoles } from '../src/db/seed.js'

await migrate()
await ensureBaseRoles()
await import('../server.js')
