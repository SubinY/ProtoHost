<template>
  <div class="flex-1 overflow-y-auto p-8">
    <div class="max-w-2xl mx-auto">
      <div class="bg-card border border-border rounded-lg shadow-elevated p-6">
        <h2 class="font-heading font-semibold text-xl mb-6">上传原型</h2>
        <form @submit.prevent="submit" class="space-y-5">
          <div
            @dragenter.prevent="drag = true"
            @dragleave.prevent="drag = false"
            @dragover.prevent
            @drop.prevent="onDrop"
            @click="($refs.fileInput as HTMLInputElement).click()"
            :class="
              drag
                ? 'border-primary bg-primary/5'
                : file
                  ? 'border-accent bg-accent/5'
                  : 'border-border hover:border-muted-foreground'
            "
            class="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
          >
            <input ref="fileInput" type="file" accept=".zip" class="hidden" @change="onFileSelect" />
            <div v-if="file" class="flex items-center justify-center gap-3">
              <FileArchiveIcon class="h-8 w-8 text-accent" />
              <div class="text-left">
                <p class="font-medium">{{ file.name }}</p>
                <p class="text-sm text-muted-foreground">{{ (file.size / 1024 / 1024).toFixed(2) }} MB</p>
              </div>
            </div>
            <div v-else>
              <UploadIcon class="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p class="font-medium">拖拽 ZIP 文件到此处</p>
              <p class="text-sm text-muted-foreground mt-1">或点击选择文件（Axure 导出的 HTML 包）</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-sm font-medium">所属分组</label>
              <select
                v-model="groupId"
                class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option :value="undefined">未分组</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="text-sm font-medium">项目名称 *</label>
              <input
                v-model="name"
                required
                maxlength="100"
                placeholder="我的原型"
                class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="text-sm font-medium">版本号 *</label>
              <input
                v-model="version"
                required
                maxlength="20"
                placeholder="例如 1.0.0"
                class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="text-sm font-medium">描述（可选）</label>
            <textarea
              v-model="description"
              rows="3"
              maxlength="500"
              placeholder="简要描述你的原型..."
              class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <div class="flex items-center justify-between p-4 bg-secondary rounded-lg">
            <div>
              <p class="text-sm font-medium">访问权限</p>
              <p class="text-xs text-muted-foreground mt-0.5">{{ isPublic ? '任何人都可以查看' : '需要密码才能查看' }}</p>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <span class="text-sm text-muted-foreground">{{ isPublic ? '公开' : '私密' }}</span>
              <div
                @click="isPublic = !isPublic"
                :class="isPublic ? 'bg-primary' : 'bg-muted'"
                class="w-10 h-6 rounded-full relative transition-colors cursor-pointer"
              >
                <div
                  :class="isPublic ? 'translate-x-4' : 'translate-x-0'"
                  class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform"
                />
              </div>
            </label>
          </div>

          <div v-if="!isPublic" class="space-y-1">
            <label class="text-sm font-medium">访问密码</label>
            <input
              v-model="accessPassword"
              type="text"
              maxlength="50"
              placeholder="设置查看密码"
              class="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div v-if="uploading" class="space-y-1">
            <div class="w-full bg-secondary rounded-full h-2">
              <div class="gradient-primary h-2 rounded-full transition-all" :style="{ width: progress + '%' }" />
            </div>
            <p class="text-xs text-muted-foreground text-center">{{ progress < 100 ? '上传中...' : '完成！' }}</p>
          </div>

          <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

          <button
            type="submit"
            :disabled="!file || !name.trim() || uploading"
            class="w-full gradient-primary text-white font-medium py-2 rounded-md text-sm disabled:opacity-60"
          >
            {{ uploading ? '上传中...' : '上传并发布' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Upload as UploadIcon, FileArchive as FileArchiveIcon } from 'lucide-vue-next'
import { projectApi } from '@/api/project'
import { groupApi } from '@/api/group'
import type { ProjectGroup } from '@/types'

const router = useRouter()
const file = ref<File | null>(null)
const name = ref('')
const version = ref('1.0.0')
const description = ref('')
const isPublic = ref(true)
const accessPassword = ref('')
const groupId = ref<number | undefined>(undefined)
const groups = ref<ProjectGroup[]>([])
const uploading = ref(false)
const progress = ref(0)
const drag = ref(false)
const error = ref('')

async function fetchGroups() {
  const { data } = await groupApi.list()
  groups.value = data
}

onMounted(fetchGroups)

function onDrop(e: DragEvent) {
  drag.value = false
  const f = e.dataTransfer?.files[0]
  if (f?.name.endsWith('.zip')) {
    file.value = f
    if (!name.value) name.value = f.name.replace('.zip', '')
  } else error.value = '请上传 ZIP 文件'
}

function onFileSelect(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f?.name.endsWith('.zip')) {
    file.value = f
    if (!name.value) name.value = f.name.replace('.zip', '')
  } else error.value = '请上传 ZIP 文件'
}

async function submit() {
  if (!file.value) return
  error.value = ''
  uploading.value = true
  progress.value = 10
  try {
    const form = new FormData()
    form.append('file', file.value)
    form.append('name', name.value.trim())
    form.append('version', version.value.trim() || '1.0.0')
    if (description.value.trim()) form.append('description', description.value.trim())
    form.append('isPublic', String(isPublic.value))
    if (!isPublic.value && accessPassword.value) form.append('accessPassword', accessPassword.value)
    if (groupId.value) form.append('groupId', String(groupId.value))
    progress.value = 30
    await projectApi.upload(form)
    progress.value = 100
    router.push('/')
  } catch (e: any) {
    error.value = e || '上传失败'
  } finally {
    uploading.value = false
  }
}
</script>
