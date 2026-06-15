<template>
  <div class="flex-1 overflow-y-auto p-8">
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-heading font-semibold">用户管理</h2>
        <button
          @click="openCreate"
          class="gradient-primary text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2"
        >
          <PlusIcon class="h-4 w-4" />新建用户
        </button>
      </div>

      <div class="bg-card border border-border rounded-lg overflow-hidden">
        <table class="w-full text-sm">
          <thead class="bg-secondary/50 border-b border-border">
            <tr>
              <th class="text-left px-4 py-3 font-medium">账号</th>
              <th class="text-left px-4 py-3 font-medium">角色</th>
              <th class="text-left px-4 py-3 font-medium">状态</th>
              <th class="text-left px-4 py-3 font-medium">创建时间</th>
              <th class="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id" class="border-b border-border last:border-0">
              <td class="px-4 py-3">{{ u.email }}</td>
              <td class="px-4 py-3">{{ u.role === 'admin' ? '超管' : '用户' }}</td>
              <td class="px-4 py-3">
                <span :class="u.enabled ? 'text-green-600' : 'text-destructive'">
                  {{ u.enabled ? '启用' : '禁用' }}
                </span>
              </td>
              <td class="px-4 py-3 text-muted-foreground">{{ formatDate(u.createdAt) }}</td>
              <td class="px-4 py-3 text-right space-x-2">
                <button
                  v-if="u.role !== 'admin'"
                  @click="openEdit(u)"
                  class="text-primary hover:underline"
                >
                  编辑
                </button>
                <button
                  v-if="u.role !== 'admin'"
                  @click="toggleEnabled(u)"
                  class="text-muted-foreground hover:text-foreground"
                >
                  {{ u.enabled ? '禁用' : '启用' }}
                </button>
                <button
                  v-if="u.role !== 'admin'"
                  @click="removeUser(u)"
                  class="text-destructive hover:underline"
                >
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="modalOpen"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4"
      @click.self="modalOpen = false"
    >
      <div class="bg-card border border-border rounded-lg p-6 w-full max-w-md space-y-4">
        <h3 class="font-heading font-semibold">{{ editing ? '编辑用户' : '新建用户' }}</h3>
        <div class="space-y-1">
          <label class="text-sm font-medium">账号</label>
          <input
            v-model="form.email"
            type="text"
            required
            :disabled="editing?.role === 'admin'"
            class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
          />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium">{{ editing ? '新密码（留空不修改）' : '初始密码' }}</label>
          <input
            v-model="form.password"
            type="password"
            :required="!editing"
            minlength="6"
            class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
          />
        </div>
        <div v-if="editing && editing.role !== 'admin'" class="flex items-center justify-between">
          <span class="text-sm">启用账号</span>
          <input v-model="form.enabled" type="checkbox" />
        </div>
        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>
        <div class="flex justify-end gap-2">
          <button @click="modalOpen = false" class="px-4 py-2 text-sm rounded-md border border-border">取消</button>
          <button @click="save" class="px-4 py-2 text-sm rounded-md gradient-primary text-white">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Plus as PlusIcon } from 'lucide-vue-next'
import { userApi } from '@/api/user'
import type { ManagedUser } from '@/types'

const users = ref<ManagedUser[]>([])
const modalOpen = ref(false)
const editing = ref<ManagedUser | null>(null)
const form = ref({ email: '', password: '', enabled: true })
const error = ref('')

function formatDate(v: string) {
  return new Date(v).toLocaleString()
}

async function load() {
  const { data } = await userApi.list()
  users.value = data
}

function openCreate() {
  editing.value = null
  form.value = { email: '', password: '', enabled: true }
  error.value = ''
  modalOpen.value = true
}

function openEdit(u: ManagedUser) {
  editing.value = u
  form.value = { email: u.email, password: '', enabled: u.enabled }
  error.value = ''
  modalOpen.value = true
}

async function save() {
  error.value = ''
  try {
    if (editing.value) {
      const payload: { email?: string; password?: string; enabled?: boolean } = {
        email: form.value.email.trim(),
        enabled: form.value.enabled,
      }
      if (form.value.password) payload.password = form.value.password
      await userApi.update(editing.value.id, payload)
    } else {
      await userApi.create(form.value.email.trim(), form.value.password)
    }
    modalOpen.value = false
    await load()
  } catch (e: any) {
    error.value = e || '保存失败'
  }
}

async function toggleEnabled(u: ManagedUser) {
  await userApi.setEnabled(u.id, !u.enabled)
  await load()
}

async function removeUser(u: ManagedUser) {
  if (!confirm(`确定删除账号「${u.email}」？该用户的项目与分组将一并删除，且不可恢复。`)) return
  await userApi.remove(u.id)
  await load()
}

onMounted(load)
</script>
