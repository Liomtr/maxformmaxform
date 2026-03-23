import http from './http'

export async function fetchAudits(params?: Record<string, unknown>) {
  const { data } = await http.get('/audits', { params })
  return data
}
