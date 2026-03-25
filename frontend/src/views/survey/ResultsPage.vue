<template>
  <div class="results-page">
    <div v-if="loading" class="state-card">
      <h2>加载中</h2>
      <p>正在读取问卷结果和统计信息。</p>
    </div>

    <div v-else-if="errorMsg" class="state-card error">
      <h2>结果加载失败</h2>
      <p>{{ errorMsg }}</p>
    </div>

    <div v-else-if="!survey || !results" class="state-card">
      <h2>未找到结果</h2>
      <p>当前问卷不存在，或结果数据暂不可用。</p>
    </div>

    <div v-else class="results-layout">
      <section class="hero-card">
        <div>
          <p class="eyebrow">问卷结果</p>
          <h1>{{ survey.title }}</h1>
          <p class="meta">
            <span>状态：{{ survey.status }}</span>
            <span>创建时间：{{ formatDateTime(survey.createdAt || survey.created_at) }}</span>
            <span>最近提交：{{ formatDateTime(results.lastSubmitAt) }}</span>
          </p>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hero-stat-label">总提交</span>
            <strong>{{ results.totalSubmissions }}</strong>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-label">今日新增</span>
            <strong>{{ results.today }}</strong>
          </div>
          <div class="hero-stat">
            <span class="hero-stat-label">完成率</span>
            <strong>{{ results.completionRate }}%</strong>
          </div>
        </div>
      </section>

      <SurveyAnswersPanel
        :survey-id="String(survey.id)"
        :questions="survey.questions"
        :stats="panelStats"
        :survey-title="survey.title"
        :collection-range="collectionRange"
        :initial-results="results"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import SurveyAnswersPanel from './SurveyAnswersPanel.vue'
import { getResults, getSurvey, type SurveyResults } from '@/api/surveys'
import type { Survey } from '@/types/survey'

const route = useRoute()
const loading = ref(true)
const survey = ref<Survey | null>(null)
const results = ref<SurveyResults | null>(null)
const errorMsg = ref('')

const panelStats = computed(() => {
  if (!results.value) return undefined
  return {
    total: results.value.total,
    today: results.value.today,
    avgScore: results.value.avgScore || 0,
    completionRate: results.value.completionRate,
    completed: results.value.completed,
    incomplete: results.value.incomplete,
    avgTime: results.value.avgDuration || (results.value.avgTime != null ? `${results.value.avgTime}s` : '-'),
    avgDuration: results.value.avgDuration || '-'
  }
})

const collectionRange = computed(() => {
  if (!survey.value) return ''
  const start = formatDateOnly(survey.value.createdAt || survey.value.created_at)
  const end = formatDateOnly(results.value?.lastSubmitAt) || '至今'
  return `${start} 至 ${end}`
})

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatDateOnly(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN')
}

onMounted(async () => {
  try {
    const id = String(route.params.id || '')
    const [surveyData, resultsData] = await Promise.all([
      getSurvey(id),
      getResults(id)
    ])
    survey.value = surveyData
    results.value = resultsData
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.error?.message || e?.message || '加载结果失败'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.results-page {
  max-width: 1320px;
  margin: 24px auto 40px;
  padding: 0 16px;
}

.state-card {
  padding: 28px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.3);
  background: #fff8f8;
}

.state-card h2 {
  margin: 0 0 8px;
  font-size: 22px;
  color: #0f172a;
}

.state-card p {
  margin: 0;
  color: #64748b;
}

.results-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero-card {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.18), transparent 28%),
    linear-gradient(135deg, #ffffff 0%, #f6faff 100%);
  border: 1px solid rgba(191, 209, 235, 0.8);
  box-shadow: 0 18px 36px rgba(37, 99, 235, 0.08);
}

.eyebrow {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-card h1 {
  margin: 0 0 10px;
  font-size: 30px;
  line-height: 1.2;
  color: #0f172a;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 18px;
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(120px, 1fr));
  gap: 12px;
  min-width: min(100%, 420px);
}

.hero-stat {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(191, 209, 235, 0.8);
}

.hero-stat-label {
  color: #64748b;
  font-size: 12px;
}

.hero-stat strong {
  color: #0f172a;
  font-size: 28px;
  line-height: 1.1;
}

@media (max-width: 900px) {
  .hero-card {
    flex-direction: column;
  }

  .hero-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    min-width: 0;
  }
}

@media (max-width: 640px) {
  .results-page {
    padding: 0 12px;
  }

  .hero-card {
    padding: 20px;
    border-radius: 20px;
  }

  .hero-card h1 {
    font-size: 24px;
  }

  .hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
