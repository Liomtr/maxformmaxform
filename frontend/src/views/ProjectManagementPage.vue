<template>
  <div class="project-page">
    <h1>问卷管理</h1>
    <section class="toolbar">
      <button @click="showDialog = true">新建问卷</button>
    </section>
    <table v-if="projects.length" class="projects">
      <thead>
        <tr>
          <th>ID</th>
          <th>标题</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="project in projects" :key="project.id">
          <td>{{ project.id }}</td>
          <td>{{ project.title }}</td>
          <td>{{ project.status }}</td>
          <td>{{ formatDate(project.created_at) }}</td>
          <td>
            <button @click="edit(project)">编辑</button>
            <button @click="remove(project.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无问卷</p>
    <div v-if="showDialog" class="dialog">
      <h3>{{ editing ? '编辑问卷' : '新建问卷' }}</h3>
      <label>标题：<input v-model="form.title" /></label>
      <label>描述：<input v-model="form.description" /></label>
      <button @click="save">保存</button>
      <button @click="close">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { createSurvey, deleteSurvey, listSurveys, updateSurvey } from '@/api/surveys'
import type { Survey } from '@/types/survey'

const projects = ref<Survey[]>([])
const showDialog = ref(false)
const editing = ref(false)
const form = ref({ title: '', description: '' })
const editId = ref<number | null>(null)

function formatDate(d?: string) {
  if (!d) return '-'
  return new Date(d).toLocaleString()
}
async function load() {
  const result = await listSurveys()
  projects.value = result.list
}
function edit(project: Survey) {
  editing.value = true
  showDialog.value = true
  form.value = { title: project.title, description: project.description || '' }
  editId.value = project.id
}
function close() {
  showDialog.value = false
  editing.value = false
  form.value = { title: '', description: '' }
  editId.value = null
}
async function save() {
  if (editing.value && editId.value !== null) {
    await updateSurvey(editId.value, form.value)
  } else {
    await createSurvey({ ...form.value, questions: [] })
  }
  close()
  await load()
}
async function remove(id: number) {
  if (!window.confirm(`确认删除问卷 #${id} 吗？该操作会将其移入回收站。`)) return
  await deleteSurvey(id)
  await load()
}
onMounted(load)
</script>

<style scoped>
.project-page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
.projects { width: 100%; border-collapse: collapse; }
.projects th, .projects td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
.dialog { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -30%); background: #fff; border: 1px solid #ccc; padding: 24px; z-index: 1000; }
</style>
