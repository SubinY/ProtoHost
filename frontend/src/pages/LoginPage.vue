<template>
  <div class="min-h-screen flex items-center justify-center bg-background px-4">
    <div class="w-full max-w-md space-y-8">
      <div class="flex flex-col items-center gap-3">
        <div class="gradient-primary rounded-xl p-3">
          <LayersIcon class="h-8 w-8 text-white" />
        </div>
        <h1 class="text-3xl font-bold font-heading text-foreground">ProtoHost</h1>
        <p class="text-muted-foreground text-sm">原型托管，一键分享</p>
      </div>
      <div class="bg-card border border-border rounded-lg shadow-elevated p-6 space-y-4">
        <h2 class="text-xl font-heading font-semibold text-center">登录</h2>
        <form @submit.prevent="submit" class="space-y-4">
          <div class="space-y-1">
            <label class="text-sm font-medium">账号</label>
            <input
              v-model="email"
              type="text"
              required
              autocomplete="username"
              placeholder="admin"
              class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div class="space-y-1">
            <label class="text-sm font-medium">密码</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="6"
              placeholder="••••••••"
              class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
          <button
            type="submit"
            :disabled="loading"
            class="w-full gradient-primary text-white font-medium py-2 rounded-md text-sm disabled:opacity-60"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Layers as LayersIcon } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch (e: any) {
    error.value = e || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>
