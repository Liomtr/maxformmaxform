import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginApi, registerApi, meApi } from '../api/auth'
import type { User, Role } from '../types/user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<User | null>(null)
  const role = ref<Role | null>(null)

  const isLoggedIn = computed(() => !!token.value)
  const roleCode = computed(() => role.value?.code || '')
  const permissions = computed(() => role.value?.permissions || [])
  const isAdmin = computed(() => roleCode.value === 'admin' || permissions.value.includes('*'))
  const roleLabel = computed(() => isAdmin.value ? '管理员' : '普通用户')
  const identityCode = computed(() => isAdmin.value ? 'PROJECT_ADMIN' : 'USER')
  const username = computed(() => user.value?.nickname || user.value?.username || '')

  function setAuth(t: string, u: User) {
    token.value = t
    user.value = u
    localStorage.setItem('token', t)
  }

  function clearAuth() {
    token.value = ''
    user.value = null
    role.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
  }

  async function login(name: string, password: string) {
    const res = await loginApi(name, password)
    setAuth(res.token, res.user)
    await fetchMe()
    return res
  }

  async function register(name: string, password: string, email?: string) {
    const res = await registerApi(name, password, email)
    setAuth(res.token, res.user)
    await fetchMe()
    return res
  }

  async function fetchMe() {
    if (!token.value) return
    try {
      const res = await meApi()
      user.value = res.user
      role.value = res.role
    } catch {
      clearAuth()
    }
  }

  function hasPermission(code: string) {
    return isAdmin.value || permissions.value.includes(code)
  }

  function logout() {
    clearAuth()
  }

  return {
    token, user, role,
    isLoggedIn, roleCode, permissions, isAdmin, roleLabel, identityCode, username,
    hasPermission,
    login, register, fetchMe, logout, clearAuth
  }
})
