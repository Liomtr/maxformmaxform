import jwt from 'jsonwebtoken'
import config from '../../src/config/index.js'

function adminToken() {
  return jwt.sign(
    { sub: 1, username: 'admin', roleCode: 'admin' },
    config.jwt.secret,
    { expiresIn: '1h' }
  )
}

export function createApiRequestClient(getBaseUrl) {
  async function request(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${adminToken()}`,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    const json = await response.json()
    return { response, json }
  }

  async function requestRaw(path, { method = 'GET', body } = {}) {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${adminToken()}`,
        'Content-Type': 'application/json'
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    })
    const buffer = Buffer.from(await response.arrayBuffer())
    return { response, buffer }
  }

  async function requestPublic(path, { method = 'GET', body, headers } = {}) {
    const response = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers,
      body
    })
    const json = await response.json()
    return { response, json }
  }

  return { request, requestRaw, requestPublic }
}
