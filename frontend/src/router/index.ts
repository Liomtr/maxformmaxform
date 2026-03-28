import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/HomePage.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/auth/RegisterPage.vue')
  },
  {
    path: '/user-dashboard',
    name: 'UserDashboard',
    component: () => import('@/views/UserDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardPage.vue'),
    meta: { requiresAuth: true }
  },

  // --- Admin ---
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/overview' },
      { path: 'overview', name: 'AdminOverview', component: () => import('@/views/admin/Dashboard.vue') },
      { path: 'enterprise', name: 'AdminEnterprise', component: () => import('@/views/admin/Enterprise.vue') },
      { path: 'members', name: 'AdminMembers', component: () => import('@/views/admin/Members.vue') },
      { path: 'surveys', name: 'AdminSurveys', component: () => import('@/views/admin/Surveys.vue') },
      { path: 'roles', name: 'AdminRoles', component: () => import('@/views/admin/Roles.vue') },
      { path: 'depts', name: 'AdminDepts', component: () => import('@/views/admin/Depts.vue') },
      { path: 'positions', name: 'AdminPositions', component: () => import('@/views/admin/Positions.vue') },
      { path: 'messages', name: 'AdminMessages', component: () => import('@/views/admin/Messages.vue') },
      { path: 'approval', name: 'AdminAudits', component: () => import('@/views/admin/Audits.vue') },
      { path: 'profile', name: 'AdminProfile', component: () => import('@/views/admin/Profile.vue') },
      { path: 'statistics', name: 'AdminStatistics', component: () => import('@/views/admin/Statistics.vue') },
      { path: 'config', name: 'AdminConfig', component: () => import('@/views/admin/Config.vue') }
    ]
  },
  {
    path: '/admin/users',
    name: 'UserManagement',
    component: () => import('@/views/UserManagementPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/admin/files',
    name: 'FileManagement',
    component: () => import('@/views/FileManagementPage.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },

  // --- Survey ---
  {
    path: '/surveys',
    name: 'SurveyList',
    redirect: { name: 'UserDashboard' }
  },
  {
    path: '/surveys/create',
    name: 'CreateSurvey',
    component: () => import('@/views/survey/CreateSurveyLanding.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/surveys/create-legacy',
    name: 'CreateSurveyLegacy',
    component: () => import('@/views/survey/CreateSurveyPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/surveys/:id/edit',
    name: 'EditSurvey',
    component: () => import('@/views/survey/CreateSurveyPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/s/:id',
    name: 'FillSurvey',
    component: () => import('@/views/survey/FillSurveyPage.vue')
  },
  {
    path: '/m/s/:id',
    name: 'FillSurveyMobile',
    component: () => import('@/views/survey/FillSurveyMobilePage.vue')
  },
  {
    path: '/s/:id/success',
    name: 'SurveySuccess',
    component: () => import('@/views/survey/SuccessPage.vue')
  },
  {
    path: '/surveys/:id/results',
    name: 'SurveyResults',
    component: () => import('@/views/survey/ResultsPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/surveys/answers',
    name: 'AnswerManagement',
    component: () => import('@/views/survey/AnswerManagementPage.vue'),
    meta: { requiresAuth: true }
  },

  // --- Misc ---
  {
    path: '/security',
    name: 'SecurityLanding',
    component: () => import('@/views/SecurityLanding.vue')
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/views/Forbidden.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (authStore.token && !authStore.user) {
    await authStore.fetchMe()
  }

  if (authStore.isLoggedIn && to.name === 'Login') {
    return next({ name: 'UserDashboard' })
  }

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  if (to.meta.requiresAdmin && !authStore.isAdmin) {
    return next({ name: 'Forbidden' })
  }

  // Desktop/mobile survey auto-routing
  if (typeof window !== 'undefined') {
    const isDesktop = to.name === 'FillSurvey'
    const isMobile = to.name === 'FillSurveyMobile'
    if (isDesktop || isMobile) {
      const force = to.query.force as string
      if (force === 'mobile' && !isMobile) {
        return next({ name: 'FillSurveyMobile', params: to.params, replace: true })
      }
      if (force === 'desktop' && !isDesktop) {
        return next({ name: 'FillSurvey', params: to.params, replace: true })
      }
      if (isDesktop) {
        const ua = navigator.userAgent
        const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || window.innerWidth <= 768
        if (isMobileDevice) {
          return next({ name: 'FillSurveyMobile', params: to.params, query: to.query, replace: true })
        }
      }
    }
  }

  next()
})

export default router
