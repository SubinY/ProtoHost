<template>
  <div class="flex h-screen bg-background overflow-hidden">
    <AppSidebar />
    <main class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, provide } from 'vue'
import AppSidebar from '@/components/AppSidebar.vue'

const groupsVersion = ref(0)
function bumpGroups() {
  groupsVersion.value++
}
provide('groupsVersion', groupsVersion)
provide('bumpGroups', bumpGroups)
</script>
