import User from '../models/User.js'
import Role from '../models/Role.js'

const BASE_ROLES = [
  {
    name: '管理员',
    code: 'admin',
    permissions: ['*']
  },
  {
    name: '普通用户',
    code: 'user',
    permissions: ['survey:create', 'survey:edit', 'survey:view', 'answer:view']
  }
]

const DEFAULT_DEV_ACCOUNTS = [
  { username: 'admin', email: 'admin@example.com', roleCode: 'admin', password: '123456' },
  { username: 'test1', email: 'test1@example.com', roleCode: 'user', password: '123456' }
]

export async function ensureBaseRoles() {
  const roles = {}
  let createdCount = 0

  for (const roleDef of BASE_ROLES) {
    let role = await Role.findByCode(roleDef.code)
    if (!role) {
      role = await Role.create(roleDef)
      createdCount += 1
    }
    roles[roleDef.code] = role
  }

  if (createdCount > 0) {
    console.log(`Base roles ensured (${createdCount} created)`)
  } else {
    console.log('Base roles already present')
  }

  return roles
}

export async function seedDevAccounts() {
  const roles = await ensureBaseRoles()
  let createdCount = 0
  let skippedCount = 0

  for (const account of DEFAULT_DEV_ACCOUNTS) {
    const existing = await User.findByUsername(account.username)
    if (existing) {
      skippedCount += 1
      continue
    }

    const role = roles[account.roleCode]
    if (!role) {
      throw new Error(`Role ${account.roleCode} not found`)
    }

    await User.create({
      username: account.username,
      email: account.email,
      password: account.password,
      role_id: role.id
    })
    createdCount += 1
  }

  console.log(`Development accounts ensured (${createdCount} created, ${skippedCount} skipped)`)
}

export async function ensureAdminUser(options = {}) {
  const username = String(options.username || 'admin')
  const email = String(options.email || 'admin@example.com')
  const password = String(options.password || '123456')

  const existing = await User.findByUsername(username)
  if (existing) {
    console.log(`Admin user already exists: ${username}`)
    return { created: false, user: existing }
  }

  const roles = await ensureBaseRoles()
  const adminRole = roles.admin
  if (!adminRole) {
    throw new Error('Admin role not found')
  }

  const user = await User.create({
    username,
    email,
    password,
    role_id: adminRole.id
  })

  console.log(`Admin user created: ${user.username}`)
  return { created: true, user }
}
