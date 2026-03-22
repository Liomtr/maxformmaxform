<template>
  <div class="file-page">
    <h1>附件管理</h1>
    <section class="toolbar">
      <button @click="load">刷新</button>
    </section>
    <table v-if="files.length" class="files">
      <thead>
        <tr>
          <th>ID</th>
          <th>名称</th>
          <th>类型</th>
          <th>大小</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="file in files" :key="file.id">
          <td>{{ file.id }}</td>
          <td>{{ file.name }}</td>
          <td>{{ file.type }}</td>
          <td>{{ file.size }}</td>
          <td>
            <button @click="remove(file.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无附件</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import http from '@/api/http'

interface FileItem {
  id: number
  name: string
  type?: string
  size?: number
}

const files = ref<FileItem[]>([])

async function load() {
  const { data } = await http.get('/files')
  files.value = data?.data?.list || []
}

async function remove(id: number) {
  await http.delete(`/files/${id}`)
  await load()
}

onMounted(load)
</script>

<style scoped>
.file-page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
.files { width: 100%; border-collapse: collapse; }
.files th, .files td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
</style>
