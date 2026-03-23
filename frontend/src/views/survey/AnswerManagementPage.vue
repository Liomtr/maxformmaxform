<template>
  <div class="answer-page">
    <div class="toolbar">
      <input v-model="surveyId" placeholder="问卷ID" />
      <button @click="load">查询</button>
      <button @click="download" :disabled="!surveyId">导出Excel</button>
    </div>

    <table v-if="answers.length" class="answers">
      <thead>
        <tr>
          <th>ID</th>
          <th>提交时间</th>
          <th>IP</th>
          <th>状态</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="answer in answers" :key="answer.id">
          <td>{{ answer.id }}</td>
          <td>{{ answer.submitted_at }}</td>
          <td>{{ answer.ip_address || '-' }}</td>
          <td>{{ answer.status }}</td>
          <td>
            <button @click="remove(answer.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else class="empty">暂无数据</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { deleteAnswers, downloadSurveyExcel, listAnswers } from '@/api/surveyAnswers'
import type { Answer } from '@/types/answer'

const surveyId = ref('')
const answers = ref<Answer[]>([])

const load = async () => {
  if (!surveyId.value.trim()) return
  const result = await listAnswers({ survey_id: surveyId.value.trim() })
  answers.value = result.list
}

const download = async () => {
  if (!surveyId.value.trim()) return
  const blob = await downloadSurveyExcel(surveyId.value.trim())
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `survey-${surveyId.value}.xlsx`
  anchor.click()
  URL.revokeObjectURL(url)
}

const remove = async (id: number) => {
  await deleteAnswers([id])
  await load()
}
</script>

<style scoped>
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.answers { width: 100%; border-collapse: collapse; }
.answers th, .answers td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
</style>
