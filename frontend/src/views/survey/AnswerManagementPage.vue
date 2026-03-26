<template>
  <div class="answer-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">答卷管理</p>
        <h1>{{ surveyHeading }}</h1>
        <p class="header-meta">
          <span v-if="activeSurveyId">问卷 ID：{{ activeSurveyId }}</span>
          <span v-if="activeSurveyId">共 {{ total }} 份答卷</span>
        </p>
        <p v-if="activeStartTime || activeEndTime" class="filter-summary">
          <span v-if="activeStartTime">开始：{{ formatDateTime(activeStartTime) }}</span>
          <span v-if="activeEndTime">结束：{{ formatDateTime(activeEndTime) }}</span>
        </p>
      </div>

      <div class="toolbar">
        <input
          v-model="surveyIdInput"
          class="toolbar-input"
          placeholder="输入问卷 ID"
          @keyup.enter="applySurveyId"
        />
        <button class="btn ghost" type="button" @click="applySurveyId">查询</button>
        <button class="btn ghost" type="button" :disabled="!activeSurveyId || loading" @click="reload">
          刷新
        </button>
        <button class="btn primary" type="button" :disabled="!activeSurveyId || downloading" @click="download">
          {{ downloading ? '导出中...' : '导出 Excel' }}
        </button>
        <button class="btn ghost" type="button" :disabled="!activeSurveyId || downloadingAttachments" @click="downloadAttachments">
          {{ downloadingAttachments ? '打包中...' : '下载附件包' }}
        </button>
      </div>
    </header>

    <section v-if="!activeSurveyId" class="state-card">
      <h2>选择要查看的问卷</h2>
      <p>从结果页进入会自动带入问卷 ID，也可以在上方直接输入问卷 ID 查询答卷。</p>
    </section>

    <section v-else-if="loading && !answers.length" class="state-card">
      <h2>加载中</h2>
      <p>正在读取问卷答卷列表。</p>
    </section>

    <section v-else-if="errorMsg" class="state-card error">
      <h2>加载失败</h2>
      <p>{{ errorMsg }}</p>
    </section>

    <section v-else class="table-card">
      <div class="table-header">
        <div>
          <h2>答卷列表</h2>
          <p>
            <span v-if="total">显示第 {{ startItem }} - {{ endItem }} 条</span>
            <span v-else>当前问卷暂无答卷</span>
          </p>
          <p v-if="activeStartTime || activeEndTime" class="filter-meta">
            <span v-if="activeStartTime">开始：{{ formatDateTime(activeStartTime) }}</span>
            <span v-if="activeEndTime">结束：{{ formatDateTime(activeEndTime) }}</span>
            <button class="btn ghost btn-sm" type="button" @click="clearTimeFilter">清除筛选</button>
          </p>
        </div>
        <div class="table-header-actions">
          <button class="btn ghost" type="button" :disabled="page <= 1 || loading" @click="page -= 1">
            上一页
          </button>
          <span class="page-indicator">第 {{ page }} / {{ pageCount }} 页</span>
          <button class="btn ghost" type="button" :disabled="page >= pageCount || loading" @click="page += 1">
            下一页
          </button>
        </div>
      </div>

      <div v-if="answers.length" class="table-wrap">
        <table class="answers-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>提交时间</th>
              <th>状态</th>
              <th>IP</th>
              <th>用时</th>
              <th>答案预览</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="answer in answers" :key="answer.id">
              <td>#{{ answer.id }}</td>
              <td>{{ formatDateTime(answer.submitted_at) }}</td>
              <td>
                <span :class="['status-pill', answer.status]">
                  {{ formatStatus(answer.status) }}
                </span>
              </td>
              <td>{{ answer.ip_address || '-' }}</td>
              <td>{{ formatDuration(answer.duration) }}</td>
              <td class="preview-cell">{{ formatAnswerPreview(answer) }}</td>
              <td>
                <button class="btn danger-text" type="button" @click="remove(answer.id)">
                  删除
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        <h3>暂无答卷</h3>
        <p>当前问卷还没有用户提交答卷。</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteAnswers, downloadSurveyAttachmentsZip, downloadSurveyExcel, listAnswers } from '@/api/surveyAnswers'
import type { Answer } from '@/types/answer'

const PAGE_SIZE = 20

const route = useRoute()
const router = useRouter()

const surveyIdInput = ref('')
const activeSurveyId = ref('')
const surveyTitle = ref('')
const activeStartTime = ref('')
const activeEndTime = ref('')
const answers = ref<Answer[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const downloading = ref(false)
const downloadingAttachments = ref(false)
const errorMsg = ref('')

const surveyHeading = computed(() => {
  if (surveyTitle.value) return surveyTitle.value
  if (activeSurveyId.value) return `问卷 #${activeSurveyId.value}`
  return '问卷答卷中心'
})

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const startItem = computed(() => (total.value === 0 ? 0 : (page.value - 1) * PAGE_SIZE + 1))
const endItem = computed(() => Math.min(page.value * PAGE_SIZE, total.value))

function normalizeSurveyId(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '').trim()
  return String(value ?? '').trim()
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

function formatDuration(value?: number | null) {
  const seconds = Number(value)
  if (!Number.isFinite(seconds) || seconds <= 0) return '-'
  if (seconds < 60) return `${Math.round(seconds)} 秒`
  const minutes = Math.floor(seconds / 60)
  const remainSeconds = Math.round(seconds % 60)
  return `${minutes} 分 ${remainSeconds} 秒`
}

function formatStatus(status: Answer['status']) {
  return status === 'completed' ? '已完成' : '未完成'
}

function formatAnswerValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(item => formatAnswerValue(item)).filter(Boolean).join('、')
  }
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return '[复杂数据]'
    }
  }
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

function formatAnswerPreview(answer: Answer): string {
  const items = Array.isArray(answer.answers_data) ? answer.answers_data : []
  const preview = items
    .slice(0, 3)
    .map(item => item.text || formatAnswerValue(item.value))
    .filter(Boolean)
    .join(' / ')

  if (preview) return preview
  return items.length ? '[无可预览内容]' : '-'
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function syncRouteQuery() {
  const query: Record<string, string> = {}
  if (activeSurveyId.value) query.surveyId = activeSurveyId.value
  if (surveyTitle.value) query.title = surveyTitle.value
  if (activeStartTime.value) query.startTime = activeStartTime.value
  if (activeEndTime.value) query.endTime = activeEndTime.value
  router.replace({ name: 'AnswerManagement', query })
}

async function load() {
  if (!activeSurveyId.value) {
    answers.value = []
    total.value = 0
    errorMsg.value = ''
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const result = await listAnswers({
      survey_id: activeSurveyId.value,
      page: page.value,
      pageSize: PAGE_SIZE,
      startTime: activeStartTime.value || undefined,
      endTime: activeEndTime.value || undefined
    })
    answers.value = result.list
    total.value = result.total

    if (page.value > pageCount.value) {
      page.value = pageCount.value
      return
    }
  } catch (error: any) {
    answers.value = []
    total.value = 0
    errorMsg.value = error?.response?.data?.error?.message || error?.message || '加载答卷失败'
  } finally {
    loading.value = false
  }
}

function initializeFromRoute() {
  activeSurveyId.value = normalizeSurveyId(route.query.surveyId ?? route.query.survey_id)
  surveyIdInput.value = activeSurveyId.value
  surveyTitle.value = Array.isArray(route.query.title)
    ? String(route.query.title[0] ?? '')
    : String(route.query.title ?? '')
  activeStartTime.value = Array.isArray(route.query.startTime)
    ? String(route.query.startTime[0] ?? '')
    : String(route.query.startTime ?? '')
  activeEndTime.value = Array.isArray(route.query.endTime)
    ? String(route.query.endTime[0] ?? '')
    : String(route.query.endTime ?? '')
}

async function applySurveyId() {
  const nextSurveyId = normalizeSurveyId(surveyIdInput.value)
  if (!nextSurveyId) {
    ElMessage.warning('请输入问卷 ID')
    return
  }

  activeSurveyId.value = nextSurveyId
  page.value = 1
  syncRouteQuery()
  await load()
}

async function reload() {
  await load()
}

async function clearTimeFilter() {
  activeStartTime.value = ''
  activeEndTime.value = ''
  page.value = 1
  syncRouteQuery()
  await load()
}

async function download() {
  if (!activeSurveyId.value || downloading.value) return

  downloading.value = true
  try {
    const blob = await downloadSurveyExcel(activeSurveyId.value)
    triggerBrowserDownload(blob, `survey-${activeSurveyId.value}.xlsx`)
  } finally {
    downloading.value = false
  }
}

async function downloadAttachments() {
  if (!activeSurveyId.value || downloadingAttachments.value) return

  downloadingAttachments.value = true
  try {
    const blob = await downloadSurveyAttachmentsZip(activeSurveyId.value)
    triggerBrowserDownload(blob, `survey-${activeSurveyId.value}-attachments.zip`)
  } finally {
    downloadingAttachments.value = false
  }
}

async function remove(id: number) {
  await ElMessageBox.confirm(`确认删除答卷 #${id} 吗？该操作不可恢复。`, '删除答卷', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })

  await deleteAnswers([id])
  ElMessage.success('答卷已删除')

  if (answers.value.length === 1 && page.value > 1) {
    page.value -= 1
    return
  }

  await load()
}

watch(page, async (nextPage, previousPage) => {
  if (nextPage === previousPage || !activeSurveyId.value) return
  await load()
})

watch(
  () => route.fullPath,
  async () => {
    const previousSurveyId = activeSurveyId.value
    const previousTitle = surveyTitle.value
    const previousStartTime = activeStartTime.value
    const previousEndTime = activeEndTime.value

    initializeFromRoute()

    if (!activeSurveyId.value) {
      answers.value = []
      total.value = 0
      errorMsg.value = ''
      page.value = 1
      return
    }

    if (
      previousSurveyId !== activeSurveyId.value ||
      previousTitle !== surveyTitle.value ||
      previousStartTime !== activeStartTime.value ||
      previousEndTime !== activeEndTime.value
    ) {
      page.value = 1
      await load()
    }
  }
)

onMounted(async () => {
  initializeFromRoute()
  if (activeSurveyId.value) {
    await load()
  }
})
</script>

<style scoped>
.answer-page {
  max-width: 1280px;
  margin: 24px auto 40px;
  padding: 0 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: flex-start;
  padding: 24px 28px;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 26%),
    linear-gradient(135deg, #ffffff 0%, #f6fbff 100%);
  border: 1px solid rgba(186, 230, 253, 0.9);
  box-shadow: 0 18px 36px rgba(14, 165, 233, 0.08);
}

.eyebrow {
  margin: 0 0 6px;
  color: #0284c7;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.page-header h1 {
  margin: 0 0 10px;
  font-size: 30px;
  line-height: 1.2;
  color: #0f172a;
}

.header-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.filter-summary,
.filter-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 10px 0 0;
  color: #64748b;
  font-size: 13px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}

.toolbar-input {
  min-width: 240px;
  padding: 11px 14px;
  border-radius: 12px;
  border: 1px solid #cbd5e1;
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
  outline: none;
}

.toolbar-input:focus {
  border-color: #38bdf8;
  box-shadow: 0 0 0 4px rgba(56, 189, 248, 0.14);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 12px;
  padding: 11px 18px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.btn-sm {
  padding: 8px 12px;
  font-size: 12px;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn.primary {
  color: #ffffff;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.2);
}

.btn.ghost {
  color: #0f172a;
  background: #ffffff;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.btn.danger-text {
  padding: 0;
  background: transparent;
  color: #dc2626;
}

.state-card,
.table-card {
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.05);
}

.state-card {
  padding: 28px;
}

.state-card.error {
  border-color: rgba(239, 68, 68, 0.25);
  background: #fff8f8;
}

.state-card h2,
.table-header h2 {
  margin: 0 0 8px;
  color: #0f172a;
}

.state-card p,
.table-header p,
.empty-state p {
  margin: 0;
  color: #64748b;
}

.table-card {
  padding: 24px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 18px;
}

.table-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-indicator {
  min-width: 92px;
  text-align: center;
  color: #475569;
  font-size: 14px;
}

.table-wrap {
  overflow-x: auto;
}

.answers-table {
  width: 100%;
  min-width: 920px;
  border-collapse: collapse;
}

.answers-table th,
.answers-table td {
  padding: 14px 12px;
  border-top: 1px solid #e2e8f0;
  text-align: left;
  vertical-align: top;
}

.answers-table th {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  background: #f8fafc;
}

.answers-table td {
  color: #0f172a;
  font-size: 14px;
}

.preview-cell {
  max-width: 360px;
  color: #334155;
  white-space: normal;
  word-break: break-word;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  min-width: 64px;
  justify-content: center;
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.status-pill.completed {
  color: #166534;
  background: #dcfce7;
}

.status-pill.incomplete {
  color: #92400e;
  background: #fef3c7;
}

.empty-state {
  padding: 40px 20px 24px;
  text-align: center;
}

.empty-state h3 {
  margin: 0 0 8px;
  color: #0f172a;
}

@media (max-width: 900px) {
  .page-header,
  .table-header {
    flex-direction: column;
    align-items: stretch;
  }

  .toolbar {
    justify-content: stretch;
  }

  .toolbar > * {
    flex: 1 1 0;
  }
}

@media (max-width: 640px) {
  .answer-page {
    padding: 0 12px;
  }

  .page-header,
  .table-card,
  .state-card {
    padding: 20px;
    border-radius: 18px;
  }

  .page-header h1 {
    font-size: 24px;
  }

  .toolbar-input {
    min-width: 0;
  }
}
</style>
