import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({
  baseURL: '/api',
  timeout: 30000
})

http.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  res => res,
  async err => {
    const status = err?.response?.status
    let errorData = err?.response?.data?.error

    if (!errorData && err?.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text()
        const parsed = JSON.parse(text)
        errorData = parsed?.error
        if (parsed && err.response) {
          err.response.data = parsed
        }
      } catch {
        errorData = undefined
      }
    }

    if (status === 401) {
      const code = errorData?.code
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (code === 'TOKEN_EXPIRED') {
        ElMessage.warning('登录已过期，请重新登录')
      }
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      ElMessage.error('无权限执行此操作')
    } else if (status === 413) {
      ElMessage.error('上传文件过大')
    } else {
      const msg = errorData?.message || err.message || '请求失败'
      ElMessage.error(msg)
    }

    return Promise.reject(err)
  }
)

export default http
