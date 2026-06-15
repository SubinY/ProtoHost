import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api/auth'

export type UserRole = 'admin' | 'user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userId = ref(Number(localStorage.getItem('userId')) || 0)
  const email = ref(localStorage.getItem('email') || '')
  const role = ref<UserRole>((localStorage.getItem('role') as UserRole) || 'user')

  const isAdmin = computed(() => role.value === 'admin')

  async function login(emailVal: string, password: string) {
    const { data } = await authApi.login(emailVal, password)
    setAuth(data)
  }

  async function fetchMe() {
    const { data } = await authApi.me()
    userId.value = data.userId
    email.value = data.email
    role.value = data.role
    localStorage.setItem('userId', String(data.userId))
    localStorage.setItem('email', data.email)
    localStorage.setItem('role', data.role)
  }

  function setAuth(data: { token: string; userId: number; email: string; role: UserRole }) {
    token.value = data.token
    userId.value = data.userId
    email.value = data.email
    role.value = data.role
    localStorage.setItem('token', data.token)
    localStorage.setItem('userId', String(data.userId))
    localStorage.setItem('email', data.email)
    localStorage.setItem('role', data.role)
  }

  function logout() {
    token.value = ''
    userId.value = 0
    email.value = ''
    role.value = 'user'
    localStorage.clear()
  }

  return { token, userId, email, role, isAdmin, login, fetchMe, logout }
})
