import { useAuthStore } from '../stores/auth'
import { storeToRefs } from 'pinia'

export const useAuth = () => {
  const store = useAuthStore()
  const { token, user, role, isLoggedIn, roleCode, permissions, isAdmin, roleLabel, identityCode, username } = storeToRefs(store)

  return {
    token, user, role, isLoggedIn, roleCode, permissions, isAdmin, roleLabel, identityCode, username,
    hasPermission: store.hasPermission,
    login: store.login,
    register: store.register,
    logout: store.logout,
    fetchMe: store.fetchMe
  }
}
