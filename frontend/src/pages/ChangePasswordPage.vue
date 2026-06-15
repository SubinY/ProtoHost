<template>
  <div class="flex-1 overflow-y-auto p-8">
    <div class="max-w-md mx-auto bg-card border border-border rounded-lg shadow-elevated p-6 space-y-4">
      <h2 class="text-xl font-heading font-semibold">修改密码</h2>
      <form @submit.prevent="submit" class="space-y-4">
        <div class="space-y-1">
          <label class="text-sm font-medium">当前密码</label>
          <input
            v-model="oldPassword"
            type="password"
            required
            class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">新密码</label>
          <input
            v-model="newPassword"
            type="password"
            required
            minlength="6"
            class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">确认新密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            minlength="6"
            class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <p v-if="success" class="text-sm text-green-600">{{ success }}</p>
        <button
          type="submit"
          :disabled="loading"
          class="w-full gradient-primary text-white font-medium py-2 rounded-md text-sm disabled:opacity-60"
        >
          {{ loading ? '保存中...' : '保存' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { authApi } from '@/api/auth'

const oldPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')
const success = ref('')

async function submit() {
  error.value = ''
  success.value = ''
  if (newPassword.value !== confirmPassword.value) {
    error.value = '两次输入的新密码不一致'
    return
  }
  loading.value = true
  try {
    await authApi.changePassword(oldPassword.value, newPassword.value)
    success.value = '密码已更新'
    oldPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e: any) {
    error.value = e || '修改失败'
  } finally {
    loading.value = false
  }
}
</script>
