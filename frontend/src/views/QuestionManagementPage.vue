<template>
  <div class="question-page">
    <h1>题目管理</h1>
    <section class="toolbar">
      <input v-model="surveyId" placeholder="问卷ID" />
      <button @click="load">查询</button>
    </section>
    <table v-if="questions.length" class="questions">
      <thead>
        <tr>
          <th>ID</th>
          <th>标题</th>
          <th>类型</th>
          <th>顺序</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="question in questions" :key="question.id">
          <td>{{ question.id }}</td>
          <td>{{ question.title }}</td>
          <td>{{ question.type }}</td>
          <td>{{ question.order ?? '-' }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无题目</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { getSurvey } from '@/api/surveys'
import type { Question } from '@/types/survey'

const questions = ref<Question[]>([])
const surveyId = ref('')

async function load() {
  if (!surveyId.value.trim()) return
  const survey = await getSurvey(surveyId.value.trim())
  questions.value = survey.questions
}
</script>

<style scoped>
.question-page { padding: 16px; }
.toolbar { margin-bottom: 12px; }
.questions { width: 100%; border-collapse: collapse; }
.questions th, .questions td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
</style>
