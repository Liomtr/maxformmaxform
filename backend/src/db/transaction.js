import knex from './knex.js'

const transactionManager = {
  async run(callback) {
    return knex.transaction(async trx => callback(trx))
  }
}

export default transactionManager
