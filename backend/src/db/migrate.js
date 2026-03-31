import knex from './knex.js'

export async function migrate() {
  const createdTables = {
    users: false,
    surveys: false,
    files: false
  }

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

  if (!await knex.schema.hasTable('positions')) {
    await knex.schema.createTable('positions', t => {
      t.increments('id').unsigned()
      t.string('name', 100).notNullable()
      t.string('code', 50).nullable().unique()
      t.boolean('is_virtual').notNullable().defaultTo(false)
      t.string('remark', 255).nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('name')
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
      t.integer('position_id').unsigned().nullable()
      t.string('avatar', 500).nullable()
      t.boolean('is_active').defaultTo(true)
      t.datetime('last_login_at').nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('role_id')
      t.index('dept_id')
      t.index('position_id')
    })
    createdTables.users = true
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
      t.integer('folder_id').unsigned().nullable()
      t.datetime('deleted_at').nullable()
      t.integer('deleted_by').unsigned().nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('creator_id')
      t.index('folder_id')
      t.index('status')
      t.index('deleted_at')
    })
    createdTables.surveys = true
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

  if (!await knex.schema.hasTable('survey_results_snapshots')) {
    await knex.schema.createTable('survey_results_snapshots', t => {
      t.increments('id').unsigned()
      t.integer('survey_id').unsigned().notNullable().unique()
      t.json('payload').notNullable()
      t.integer('answer_count').notNullable().defaultTo(0)
      t.integer('latest_answer_id').unsigned().nullable()
      t.datetime('latest_submitted_at').nullable()
      t.datetime('survey_updated_at').nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('survey_id')
      t.index('updated_at')
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
      t.integer('survey_id').unsigned().nullable()
      t.integer('question_order').unsigned().nullable()
      t.string('submission_token', 80).nullable()
      t.integer('answer_id').unsigned().nullable()
      t.string('public_token', 80).nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.index('uploader_id')
      t.index('survey_id')
      t.index('question_order')
      t.index('submission_token')
      t.index('answer_id')
      t.index('public_token')
    })
    createdTables.files = true
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

  if (!await knex.schema.hasTable('flows')) {
    await knex.schema.createTable('flows', t => {
      t.increments('id').unsigned()
      t.string('name', 100).notNullable()
      t.string('status', 20).notNullable().defaultTo('draft')
      t.text('description').nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('status')
    })
  }

  if (!await knex.schema.hasTable('question_bank_repos')) {
    await knex.schema.createTable('question_bank_repos', t => {
      t.increments('id').unsigned()
      t.string('name', 100).notNullable()
      t.text('description').nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
    })
  }

  if (!await knex.schema.hasTable('question_bank_questions')) {
    await knex.schema.createTable('question_bank_questions', t => {
      t.increments('id').unsigned()
      t.integer('repo_id').unsigned().notNullable()
      t.string('title', 255).notNullable()
      t.string('type', 50).nullable()
      t.string('difficulty', 50).nullable()
      t.decimal('score', 10, 2).nullable()
      t.json('content').nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('repo_id')
    })
  }

  if (!await knex.schema.hasTable('management_ai_executions')) {
    await knex.schema.createTable('management_ai_executions', t => {
      t.increments('id').unsigned()
      t.integer('actor_id').unsigned().notNullable()
      t.string('idempotency_key', 120).notNullable()
      t.string('action', 120).notNullable()
      t.string('request_hash', 64).notNullable()
      t.string('status', 20).notNullable().defaultTo('pending')
      t.json('request_payload').nullable()
      t.json('response_payload').nullable()
      t.string('error_code', 80).nullable()
      t.text('error_message').nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.unique(['actor_id', 'idempotency_key'])
      t.index('actor_id')
      t.index('action')
      t.index('status')
      t.index('created_at')
    })
  }

  if (!await knex.schema.hasTable('system_configs')) {
    await knex.schema.createTable('system_configs', t => {
      t.increments('id').unsigned()
      t.string('config_key', 100).notNullable().unique()
      t.json('config_value').nullable()
      t.integer('updated_by').unsigned().nullable()
      t.datetime('created_at').defaultTo(knex.fn.now())
      t.datetime('updated_at').defaultTo(knex.fn.now())
      t.index('config_key')
      t.index('updated_by')
    })
  }

  if (await knex.schema.hasTable('question_bank_questions')) {
    if (!await knex.schema.hasColumn('question_bank_questions', 'content')) {
      await knex.schema.alterTable('question_bank_questions', t => {
        t.json('content').nullable()
      })
    }
  }

  if (!createdTables.surveys && await knex.schema.hasTable('surveys')) {
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

  if (!createdTables.users && await knex.schema.hasTable('users')) {
    if (!await knex.schema.hasColumn('users', 'position_id')) {
      await knex.schema.alterTable('users', t => {
        t.integer('position_id').unsigned().nullable().index()
      })
    }
  }

  if (!createdTables.files && await knex.schema.hasTable('files')) {
    if (!await knex.schema.hasColumn('files', 'survey_id')) {
      await knex.schema.alterTable('files', t => {
        t.integer('survey_id').unsigned().nullable().index()
      })
    }
    if (!await knex.schema.hasColumn('files', 'public_token')) {
      await knex.schema.alterTable('files', t => {
        t.string('public_token', 80).nullable().index()
      })
    }
    if (!await knex.schema.hasColumn('files', 'question_order')) {
      await knex.schema.alterTable('files', t => {
        t.integer('question_order').unsigned().nullable().index()
      })
    }
    if (!await knex.schema.hasColumn('files', 'submission_token')) {
      await knex.schema.alterTable('files', t => {
        t.string('submission_token', 80).nullable().index()
      })
    }
    if (!await knex.schema.hasColumn('files', 'answer_id')) {
      await knex.schema.alterTable('files', t => {
        t.integer('answer_id').unsigned().nullable().index()
      })
    }
  }

  console.log('Database schema ensured')
}
