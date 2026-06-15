<template>
  <aside class="w-64 bg-card border-r border-border flex flex-col shrink-0">
    <router-link to="/" class="p-6 flex items-center gap-3 hover:opacity-90">
      <div class="gradient-primary rounded-lg p-1.5 text-white">
        <LayersIcon class="w-5 h-5" />
      </div>
      <span class="font-bold text-xl tracking-tight">ProtoHost</span>
    </router-link>

    <nav class="flex-1 px-4 space-y-1 overflow-y-auto">
      <div class="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2 mt-2">项目库</div>
      <router-link
        :to="{ path: '/' }"
        :class="isProjectsActive(undefined) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'"
        class="w-full flex items-center px-3 py-2 rounded-md font-medium transition-colors"
      >
        <div class="flex items-center gap-3 text-sm">
          <LayoutGridIcon class="w-4 h-4" />
          全部项目
        </div>
      </router-link>
      <router-link
        :to="{ path: '/', query: { groupId: '0' } }"
        :class="isProjectsActive(0) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'"
        class="w-full flex items-center px-3 py-2 rounded-md font-medium transition-colors"
      >
        <div class="flex items-center gap-3 text-sm">
          <InboxIcon class="w-4 h-4" />
          未分组
        </div>
      </router-link>

      <div class="pt-6 pb-2 px-2 flex items-center justify-between">
        <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">我的分组</span>
        <button @click="showAdd = true" class="text-muted-foreground hover:text-primary transition-colors">
          <PlusIcon class="w-4 h-4" />
        </button>
      </div>

      <div v-if="showAdd" class="px-2 mb-2">
        <input
          v-model="newGroupName"
          @keyup.enter="addGroup"
          @blur="cancelAdd"
          ref="addInput"
          placeholder="填写名称并按 Enter 保存"
          class="w-full bg-background border border-border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary outline-none"
        />
      </div>

      <div class="space-y-1">
        <div v-for="group in groups" :key="group.id" class="group flex items-center">
          <div v-if="editingGroupId === group.id" class="flex-1 px-2">
            <input
              v-model="editName"
              @keyup.enter="saveEdit(group.id)"
              @keyup.esc="cancelEdit"
              @blur="saveEdit(group.id)"
              ref="editInput"
              class="w-full bg-background border border-primary rounded px-2 py-1 text-sm outline-none"
            />
          </div>
          <router-link
            v-else
            :to="{ path: '/', query: { groupId: String(group.id) } }"
            :class="isProjectsActive(group.id) ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'"
            class="flex-1 flex items-center justify-between px-3 py-2 rounded-md transition-colors text-sm"
          >
            <div class="flex items-center gap-3 truncate">
              <FolderIcon class="w-4 h-4 text-amber-500" />
              <span class="truncate">{{ group.name }}</span>
            </div>
            <span class="text-[10px] text-muted-foreground ml-2">{{ group.projectCount }}</span>
          </router-link>
          <div v-if="editingGroupId !== group.id" class="hidden group-hover:flex items-center gap-1 ml-1 pr-1">
            <button @click.stop="startEdit(group)" class="p-1 text-muted-foreground hover:text-primary">
              <Edit2Icon class="w-3 h-3" />
            </button>
            <button @click.stop="deleteGroup(group)" class="p-1 text-muted-foreground hover:text-destructive">
              <Trash2Icon class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      <div class="pt-6 pb-2 px-2">
        <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">账户</span>
      </div>
      <router-link
        to="/account/password"
        :class="route.path === '/account/password' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'"
        class="w-full flex items-center px-3 py-2 rounded-md font-medium transition-colors text-sm gap-3"
      >
        <KeyRoundIcon class="w-4 h-4" />
        修改密码
      </router-link>
      <router-link
        v-if="auth.isAdmin"
        to="/admin/users"
        :class="route.path === '/admin/users' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-secondary'"
        class="w-full flex items-center px-3 py-2 rounded-md font-medium transition-colors text-sm gap-3"
      >
        <UsersIcon class="w-4 h-4" />
        用户管理
      </router-link>
    </nav>

    <div class="p-4 border-t border-border">
      <div
        class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-secondary cursor-pointer transition-colors group"
        @click="logout"
      >
        <div class="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground uppercase">
          {{ emailPrefix }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate">{{ auth.email }}</p>
          <p v-if="auth.isAdmin" class="text-[10px] text-muted-foreground">超管</p>
        </div>
        <LogOutIcon class="w-4 h-4 text-muted-foreground group-hover:text-primary" />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Layers as LayersIcon,
  LayoutGrid as LayoutGridIcon,
  Inbox as InboxIcon,
  Plus as PlusIcon,
  Folder as FolderIcon,
  LogOut as LogOutIcon,
  Edit2 as Edit2Icon,
  Trash2 as Trash2Icon,
  KeyRound as KeyRoundIcon,
  Users as UsersIcon,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { groupApi } from '@/api/group'
import type { ProjectGroup } from '@/types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const bumpGroups = inject<() => void>('bumpGroups')

const groups = ref<ProjectGroup[]>([])
const showAdd = ref(false)
const newGroupName = ref('')
const addInput = ref<HTMLInputElement>()
const editingGroupId = ref<number | null>(null)
const editName = ref('')
const editInput = ref<HTMLInputElement>()

const emailPrefix = computed(() => auth.email?.substring(0, 2) || 'PH')

function isProjectsActive(groupId: number | undefined) {
  if (route.path !== '/') return false
  const q = route.query.groupId
  if (groupId === undefined) return q === undefined || q === ''
  return String(groupId) === String(q)
}

async function fetchGroups() {
  const { data } = await groupApi.list()
  groups.value = data
}

function notifyChange() {
  bumpGroups?.()
  fetchGroups()
}

watch(showAdd, (val) => {
  if (val) nextTick(() => addInput.value?.focus())
})

onMounted(fetchGroups)

async function addGroup() {
  if (!newGroupName.value.trim()) {
    showAdd.value = false
    return
  }
  try {
    await groupApi.create(newGroupName.value.trim())
    newGroupName.value = ''
    showAdd.value = false
    notifyChange()
  } catch (e) {
    console.error(e)
  }
}

function cancelAdd() {
  setTimeout(() => {
    if (showAdd.value) {
      showAdd.value = false
      newGroupName.value = ''
    }
  }, 200)
}

function startEdit(group: ProjectGroup) {
  editingGroupId.value = group.id
  editName.value = group.name
  nextTick(() => editInput.value?.focus())
}

async function saveEdit(id: number) {
  if (editingGroupId.value === null) return
  const name = editName.value.trim()
  const original = groups.value.find((g) => g.id === id)?.name
  if (name && name !== original) {
    try {
      await groupApi.update(id, name)
      notifyChange()
    } catch (e) {
      console.error(e)
    }
  }
  editingGroupId.value = null
}

function cancelEdit() {
  editingGroupId.value = null
}

async function deleteGroup(group: ProjectGroup) {
  if (confirm(`确定删除分组「${group.name}」？此操作不会删除原型。`)) {
    await groupApi.remove(group.id)
    if (isProjectsActive(group.id)) {
      router.push('/')
    }
    notifyChange()
  }
}

function logout() {
  auth.logout()
  router.push('/login')
}
</script>
