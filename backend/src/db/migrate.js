import knex from './knex.js'

export async function migrate() {
  if (!await knex.schema.hasTable('roles')) {
    await knex.schema.createTable('roles', t => {
      t.increments('id').unsigned()
      t.string('name', 50).notNullable()
      t.string('code', 50).notNullable().unique()
      t.json('permissions').nullable()
      t.string('remark', 255).nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
    })
  }

  if (!await knex.schema.hasTable('depts')) {
    await knex.schema.createTable('depts', t => {
      t.increments('id').unsigned()
      t.string('name', 100).notNullable()
      t.integer('parent_id').unsigned().nullable()
      t.integer('sort_order').defaultTo(0)
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.index('parent_id')
    })
  }

  if (!await knex.schema.hasTable('users')) {
    await knex.schema.createTable('users', t => {
      t.increments('id').unsigned()
      t.string('username', 50).notNullable().unique()
      t.string('password', 255).notNullable()
      t.string('email', 255).nullable()
      t.integer('role_id').unsigned().nullable()
      t.integer('dept_id').unsigned().nullable()
      t.string('avatar', 500).nullable()
      t.boolean('is_active').defaultTo(true)
      t.datetime('last_login_at').nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('role_id')
      t.index('dept_id')
    })
  }

  if (!await knex.schema.hasTable('surveys')) {
    await knex.schema.createTable('surveys', t => {
      t.increments('id').unsigned()
      t.string('title', 200).notNullable()
      t.text('description').nullable()
      t.integer('creator_id').unsigned().notNullable()
      t.json('questions').notNullable()
      t.json('settings').nullable()
      t.json('style').nullable()
      t.string('share_code', 20).nullable().unique()
      t.enum('status', ['draft', 'published', 'closed']).defaultTo('draft')
      t.integer('response_count').defaultTo(0)
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('creator_id')
      t.index('status')
    })
  }

  if (!await knex.schema.hasTable('answers')) {
    await knex.schema.createTable('answers', t => {
      t.increments('id').unsigned()
      t.integer('survey_id').unsigned().notNullable()
      t.json('answers_data').notNullable()
      t.string('ip_address', 45).nullable()
      t.string('user_agent', 500).nullable()
      t.integer('duration').nullable()
      t.enum('status', ['completed', 'incomplete']).defaultTo('completed')
      t.datetime('submitted_at').defaultTo(knex.fn.now())
      t.index('survey_id')
      t.index('submitted_at')
    })
  }

  if (!await knex.schema.hasTable('files')) {
    await knex.schema.createTable('files', t => {
      t.increments('id').unsigned()
      t.string('name', 255).notNullable()
      t.string('url', 500).notNullable()
      t.integer('size').unsigned().defaultTo(0)
      t.string('type', 50).nullable()
      t.integer('uploader_id').unsigned().nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.index('uploader_id')
    })
  }

  if (!await knex.schema.hasTable('folders')) {
    await knex.schema.createTable('folders', t => {
      t.increments('id').unsigned()
      t.integer('creator_id').unsigned().notNullable()
      t.string('name', 100).notNullable()
      t.integer('parent_id').unsigned().nullable()
      t.integer('sort_order').defaultTo(0)
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('creator_id')
      t.index('parent_id')
    })
  }

  if (!await knex.schema.hasTable('messages')) {
    await knex.schema.createTable('messages', t => {
      t.increments('id').unsigned()
      t.integer('recipient_id').unsigned().nullable()
      t.string('type', 50).notNullable().defaultTo('system')
      t.string('level', 20).notNullable().defaultTo('info')
      t.string('title', 200).notNullable()
      t.text('content').nullable()
      t.string('entity_type', 50).nullable()
      t.integer('entity_id').unsigned().nullable()
      t.boolean('is_read').notNullable().defaultTo(false)
      t.datetime('read_at').nullable()
      t.integer('created_by').unsigned().nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.index('recipient_id')
      t.index('type')
      t.index('is_read')
      t.index('created_at')
    })
  }

  if (!await knex.schema.hasTable('audit_logs')) {
    await knex.schema.createTable('audit_logs', t => {
      t.increments('id').unsigned()
      t.integer('actor_id').unsigned().nullable()
      t.string('actor_username', 50).nullable()
      t.string('action', 100).notNullable()
      t.string('target_type', 50).nullable()
      t.string('target_id', 50).nullable()
      t.text('detail').nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.index('actor_id')
      t.index('actor_username')
      t.index('action')
      t.index('target_type')
      t.index('created_at')
    })
  }

  if (await knex.schema.hasTable('surveys')) {
    if (!await knex.schema.hasColumn('surveys', 'folder_id')) {
      await knex.schema.alterTable('surveys', t => {
        t.integer('folder_id').unsigned().nullable().index()
      })
    }
    if (!await knex.schema.hasColumn('surveys', 'deleted_at')) {
      await knex.schema.alterTable('surveys', t => {
        t.datetime('deleted_at').nullable().index()
      })
    }
    if (!await knex.schema.hasColumn('surveys', 'deleted_by')) {
      await knex.schema.alterTable('surveys', t => {
        t.integer('deleted_by').unsigned().nullable()
      })
    }
  }

  console.log('Database schema ensured')
}

export async function seed() {
  const adminRole = await knex('roles').where('code', 'admin').first()
  if (!adminRole) {
    await knex('roles').insert([
      { name: '管理员', code: 'admin', permissions: JSON.stringify(['*']) },
      { name: '普通用户', code: 'user', permissions: JSON.stringify(['survey:create', 'survey:edit', 'survey:view', 'answer:view']) }
    ])
    console.log('Default roles seeded')
  }
}
