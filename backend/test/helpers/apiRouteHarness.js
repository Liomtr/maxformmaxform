import { after, afterEach, before } from 'node:test'
import app from '../../app.js'
import { UPLOAD_DIR } from '../../src/utils/uploadStorage.js'
import transactionManager from '../../src/db/transaction.js'
import { createApiRequestClient } from './apiRequestClient.js'
import { applyDefaultFileStubs, resetApiRouteModelState } from './apiModelState.js'

let server
let baseUrl
const originalTransactionRun = transactionManager.run

export function registerApiRouteHarness() {
  const client = createApiRequestClient(() => baseUrl)

  before(async () => {
    applyDefaultFileStubs()
    transactionManager.run = async callback => callback({})
    server = app.listen(0)
    await new Promise(resolve => server.once('listening', resolve))
    const address = server.address()
    baseUrl = `http://127.0.0.1:${address.port}/api`
  })

  after(async () => {
    transactionManager.run = originalTransactionRun
    await new Promise(resolve => server.close(resolve))
  })

  afterEach(() => {
    resetApiRouteModelState()
  })

  return client
}

export { UPLOAD_DIR }
