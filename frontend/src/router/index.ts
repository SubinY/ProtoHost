import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('@/pages/LoginPage.vue') },
    { path: '/register', redirect: '/login' },
    { path: '/forgot-password', redirect: '/login' },
    { path: '/view/:slug', component: () => import('@/pages/ViewPage.vue') },
    {
      path: '/',
      component: () => import('@/layouts/AppLayout.vue'),
      meta: { auth: true },
      children: [
        { path: '', component: () => import('@/pages/DashboardPage.vue') },
        { path: 'upload', component: () => import('@/pages/UploadPage.vue') },
        { path: 'account/password', component: () => import('@/pages/ChangePasswordPage.vue') },
        {
          path: 'admin/users',
          component: () => import('@/pages/UsersManagePage.vue'),
          meta: { admin: true },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.auth && !auth.token) return '/login'
  if (to.meta.auth && auth.token && !auth.role) {
    try {
      await auth.fetchMe()
    } catch {
      auth.logout()
      return '/login'
    }
  }
  if (to.meta.admin && !auth.isAdmin) return '/'
})

export default router
