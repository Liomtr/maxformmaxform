<template>
  <div class="answers-dashboard">
    <aside class="dashboard-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-icon">📋</span>
        <span class="sidebar-title">答卷中心</span>
      </div>
      <nav class="sidebar-nav">
        <button
          v-for="item in sidebarItems"
          :key="item.key"
          :data-testid="`results-nav-${item.key}`"
          :class="['sidebar-link', { active: currentSection === item.key }]"
          @click="currentSection = item.key"
        >
          <span class="link-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </button>
      </nav>
      <div class="sidebar-footer">
        <p>收集周期</p>
        <strong>{{ collectionRange }}</strong>
        <p class="meta">已收集 {{ stats.total }} 份</p>
      </div>
    </aside>

    <main class="dashboard-main">
      <section v-if="currentSection === 'summary'" class="summary-section">
        <div class="summary-metrics">
          <div v-for="item in summaryHighlights" :key="item.label" class="summary-metric">
            <p class="metric-label">{{ item.label }}</p>
            <p class="metric-value">
              <span class="metric-number">{{ item.value }}</span>
              <small v-if="item.suffix">{{ item.suffix }}</small>
            </p>
          </div>
        </div>

        <div class="summary-card summary-chart">
          <header class="summary-card-header">
            <div>
              <h2>收集趋势图</h2>
              <p>近30日每日收集数据变化情况</p>
            </div>
            <button class="header-link" :disabled="!surveyId || isExportingAnswers" @click="exportAnswersData">
              {{ isExportingAnswers ? '导出中...' : '导出数据' }}
            </button>
          </header>
          <div class="summary-card-body">
            <div v-if="hasTrendData" ref="trendChartRef" class="chart-surface chart-surface--area"></div>
            <div v-else class="card-empty">
              <strong>暂无趋势数据</strong>
              <p>答卷提交后，这里会展示近 30 天的真实趋势。</p>
            </div>
          </div>
        </div>

        <div class="summary-bottom">
          <div class="summary-card map-card">
            <header class="summary-card-header">
              <div>
                <h2>地域分布</h2>
                <p>按省份统计答卷来源</p>
              </div>
              <span class="header-meta">{{ regionCoverageText }}</span>
            </header>
            <div class="summary-card-body">
              <div v-if="hasRegionData" class="region-list">
                <div v-for="(item, index) in regionStats.items" :key="item.label" class="region-item">
                  <div class="region-item__head">
                    <span class="region-rank">#{{ index + 1 }}</span>
                    <span class="region-name">{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                  </div>
                  <div class="region-bar">
                    <span
                      class="region-bar__fill"
                      :style="{ width: clampPercent((Number(item.value) / Math.max(stats.total, 1)) * 100) }"
                    ></span>
                  </div>
                </div>
              </div>
              <div v-else class="card-empty card-empty--map">
                <strong>暂无地域分布</strong>
                <p>{{ regionEmptyReason }}</p>
              </div>
            </div>
          </div>
          <div class="summary-card system-card">
            <header class="summary-card-header">
              <div>
                <h2>系统环境</h2>
                <p>答卷设备与系统分布概览</p>
              </div>
              <div class="system-tabs">
                <button
                  v-for="tab in systemTabs"
                  :key="tab"
                  :class="['system-tab', { active: activeSystemTab === tab }]"
                  @click="activeSystemTab = tab"
                >
                  {{ tab }}
                </button>
              </div>
            </header>
            <div class="summary-card-body">
              <div v-if="currentSystemStats.length" ref="systemChartRef" class="chart-surface chart-surface--bar"></div>
              <div v-else class="card-empty card-empty--compact">
                <strong>暂无系统样本</strong>
                <p>答卷提交后将自动识别设备、浏览器和操作系统。</p>
              </div>
              <ul v-if="currentSystemStats.length" class="system-list">
                <li v-for="item in currentSystemStats" :key="item.label">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="currentSection === 'analysis'" class="analysis-section">
        <header class="analysis-header">
          <div>
            <h2>题目统计分析</h2>
            <p>针对每道题生成详细的选项分布、平均分与有效样本数据。</p>
          </div>
          <div class="analysis-tools">
            <div class="view-toggle">
              <button
                v-for="mode in analysisViewModes"
                :key="mode"
                :class="['view-mode-btn', { active: activeViewMode === mode }]"
                type="button"
                @click="activeViewMode = mode"
              >
                {{ mode }}
              </button>
            </div>
          </div>
        </header>

        <div v-if="analysisQuestions.length" class="analysis-list" data-testid="results-analysis-list">
          <article
            v-for="(question, index) in analysisQuestions"
            :key="question.questionId"
            :data-testid="`results-analysis-question-${question.questionId}`"
            class="question-analytics"
          >
            <header class="question-analytics__header">
              <div class="question-title-block">
                <span class="badge">第{{ index + 1 }}题</span>
                <div class="title-group">
                  <h3>{{ question.questionTitle }}</h3>
                  <span class="type">{{ question.questionTypeLabel }}</span>
                </div>
              </div>
              <div class="question-meta">
                <span class="question-meta__pill">有效答卷 {{ formatNumber(question.totalAnswers) }}</span>
                <span v-if="question.type === 'files'" class="question-meta__pill">文件总数 {{ formatNumber(question.totalFiles) }}</span>
              </div>
            </header>
            <QuestionAnalyticsChart
              v-if="question.type === 'choice' && isChartViewMode"
              :question="question"
              :mode="activeViewMode"
            />
            <div v-else-if="question.type === 'choice'" class="question-table">
              <div class="table-head">
                <span class="col-option">选项</span>
                <span class="col-count">小计</span>
                <span class="col-ratio">比例</span>
                <span v-if="isRankingQuestion(question)" class="col-rank">平均排序</span>
              </div>
              <div
                v-for="(option, idx) in question.options || []"
                :key="idx"
                class="table-row"
              >
                <span class="col-option">{{ option.label }}</span>
                <span class="col-count">{{ formatNumber(option.count) }}</span>
                <span class="col-ratio">
                  <span class="ratio-value">{{ formatPercent(option.percentage) }}</span>
                  <span class="ratio-bar">
                    <span
                      class="ratio-fill"
                      :style="{ width: clampPercent(option.percentage), background: barPalette[idx % barPalette.length] }"
                    ></span>
                  </span>
                </span>
                <span v-if="isRankingQuestion(question)" class="col-rank">{{ formatScore(option.avgRank) }}</span>
              </div>
            </div>

            <QuestionAnalyticsChart
              v-else-if="question.type === 'ratio' && isChartViewMode"
              :question="question"
              :mode="activeViewMode"
            />
            <div v-else-if="question.type === 'ratio'" class="question-table">
              <div class="table-head">
                <span class="col-option">选项</span>
                <span class="col-ratio">平均占比</span>
                <span class="col-count">非零答卷</span>
                <span class="col-ratio">非零比例</span>
              </div>
              <div
                v-for="(option, idx) in question.options || []"
                :key="`ratio-${idx}`"
                class="table-row"
              >
                <span class="col-option">{{ option.label }}</span>
                <span class="col-ratio">
                  <span class="ratio-value">{{ formatPercent(option.avgShare || 0) }}</span>
                  <span class="ratio-bar">
                    <span
                      class="ratio-fill"
                      :style="{ width: clampPercent(option.avgShare || 0), background: barPalette[idx % barPalette.length] }"
                    ></span>
                  </span>
                </span>
                <span class="col-count">{{ formatNumber(option.count) }}</span>
                <span class="col-ratio">
                  <span class="ratio-value">{{ formatPercent(option.percentage) }}</span>
                  <span class="ratio-bar">
                    <span
                      class="ratio-fill"
                      :style="{ width: clampPercent(option.percentage), background: barPalette[idx % barPalette.length] }"
                    ></span>
                  </span>
                </span>
              </div>
            </div>

            <QuestionAnalyticsChart
              v-else-if="question.type === 'rating' && isChartViewMode"
              :question="question"
              :mode="activeViewMode"
            />
            <div v-else-if="question.type === 'rating'" class="question-rating">
              <div class="rating-score">
                <span class="value">{{ formatScore(question.avgScore) }}</span>
                <span class="label">{{ getQuestionStatAverageLabel(question) }}</span>
              </div>
              <ul class="rating-distribution">
                <li v-for="entry in getDistributionEntries(question)" :key="entry.key">
                  <span class="star-label">{{ getDistributionLabel(question, entry.key) }}</span>
                  <div class="progress">
                    <div
                      class="progress-bar"
                      :style="{ width: clampPercent(entry.value), background: '#f59e0b' }"
                    ></div>
                  </div>
                  <span class="option-value">{{ formatPercent(entry.value) }}</span>
                </li>
              </ul>
            </div>

            <div v-else-if="question.type === 'text'" class="question-text">
              <div class="text-summary">
                <span class="text-pill">有效答卷 {{ formatNumber(question.totalAnswers) }}</span>
                <span v-if="question.earliestDate" class="text-pill">最早 {{ question.earliestDate }}</span>
                <span v-if="question.latestDate" class="text-pill">最晚 {{ question.latestDate }}</span>
              </div>
              <div v-if="question.sampleAnswers?.length" class="text-answer-list">
                <div v-for="(answer, answerIndex) in question.sampleAnswers" :key="answerIndex" class="text-answer-item">
                  {{ answer }}
                </div>
              </div>
              <p v-else>暂无有效样本。</p>
            </div>

            <template v-else-if="question.type === 'metric'">
              <QuestionAnalyticsChart
                v-if="isChartViewMode"
                :question="question"
                :mode="activeViewMode"
              />
              <div class="question-metric">
                <div class="metric-card">
                  <span class="metric-card-label">平均值</span>
                  <strong>{{ formatScore(question.avgValue) }}</strong>
                </div>
                <div class="metric-card">
                  <span class="metric-card-label">最小值</span>
                  <strong>{{ formatScore(question.minValue) }}</strong>
                </div>
                <div class="metric-card">
                  <span class="metric-card-label">最大值</span>
                  <strong>{{ formatScore(question.maxValue) }}</strong>
                </div>
                <div class="metric-card">
                  <span class="metric-card-label">有效答卷</span>
                  <strong>{{ formatNumber(question.totalAnswers) }}</strong>
                </div>
              </div>
            </template>

            <QuestionAnalyticsChart
              v-else-if="question.type === 'matrix' && isChartViewMode"
              :question="question"
              :mode="activeViewMode"
            />
            <div v-else-if="question.type === 'matrix'" class="question-matrix">
              <div
                v-for="row in question.rows || []"
                :key="row.value"
                class="question-matrix__row"
              >
                <div class="question-matrix__header">
                  <strong>{{ row.label }}</strong>
                  <span>有效答卷 {{ formatNumber(row.totalAnswers) }}</span>
                </div>
                <div class="question-table">
                  <div class="table-head">
                    <span class="col-option">选项</span>
                    <span class="col-count">小计</span>
                    <span class="col-ratio">比例</span>
                  </div>
                  <div
                    v-for="(option, idx) in row.options || []"
                    :key="`${row.value}-${idx}`"
                    class="table-row"
                  >
                    <span class="col-option">{{ option.label }}</span>
                    <span class="col-count">{{ formatNumber(option.count) }}</span>
                    <span class="col-ratio">
                      <span class="ratio-value">{{ formatPercent(option.percentage) }}</span>
                      <span class="ratio-bar">
                        <span
                          class="ratio-fill"
                          :style="{ width: clampPercent(option.percentage), background: barPalette[idx % barPalette.length] }"
                        ></span>
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="question.type === 'files'" class="question-files">
              <QuestionAnalyticsChart
                v-if="isChartViewMode"
                :question="question"
                :mode="activeViewMode"
              />
              <div class="file-toolbar">
                <div class="file-summary">
                  <span class="text-pill">有效答卷 {{ formatNumber(question.totalAnswers) }}</span>
                  <span class="text-pill">文件总数 {{ formatNumber(question.totalFiles) }}</span>
                </div>
                <button class="btn ghost btn-compact" :disabled="!hasAttachmentFiles || isDownloadingAttachments" @click="downloadAttachmentBundle">
                  {{ isDownloadingAttachments ? '打包中...' : '下载全部附件' }}
                </button>
              </div>
              <div v-if="question.sampleFiles?.length" class="file-list">
                <a
                  v-for="file in question.sampleFiles"
                  :key="file.id"
                  class="file-item"
                  :href="file.url"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span class="file-name">{{ file.name }}</span>
                  <span class="file-meta">{{ formatFileSize(file.size) }}</span>
                </a>
              </div>
              <p v-else>暂无文件样本。</p>
            </div>

            <div v-else class="question-text">
              <p>该题型暂不提供结构化统计图，可直接查看原始答卷明细。</p>
              <button class="btn ghost btn-compact" :disabled="!surveyId" @click="openAnswerManagement">查看原始答卷</button>
            </div>

          </article>
        </div>
        <div v-else class="empty-state">
          <h3>暂无题目数据</h3>
          <p>待有用户提交答卷后，将自动生成题目洞察。</p>
        </div>
      </section>

      <section v-else-if="currentSection === 'download'" class="download-panel">
        <div class="download-grid">
          <div class="download-card">
            <div class="card-icon">📋</div>
            <h3>答案列表</h3>
            <p>查看与筛选所有问卷答案，支持按字段导出。</p>
            <button class="btn primary" :disabled="!surveyId" @click="openAnswerManagement">查看答卷</button>
          </div>
          <div class="download-card">
            <div class="card-icon">📥</div>
            <h3>数据导出</h3>
            <p>一键导出 Excel / CSV 数据，便于在外部分析。</p>
            <button class="btn ghost" :disabled="!surveyId || isExportingAnswers" @click="exportAnswersData">
              {{ isExportingAnswers ? '导出中...' : '导出数据' }}
            </button>
          </div>
          <div class="download-card">
            <div class="card-icon">📁</div>
            <h3>附件下载</h3>
            <p>批量打包问卷附件，快速完成归档与审核。</p>
            <div class="download-summary">
              <span class="download-pill">上传题 {{ formatNumber(attachmentQuestionSummaries.length) }}</span>
              <span class="download-pill">文件总数 {{ formatNumber(attachmentTotalFiles) }}</span>
              <span class="download-pill">涉及答卷 {{ formatNumber(attachmentAnsweredCount) }}</span>
            </div>
            <ul v-if="attachmentQuestionSummaries.length" class="download-list">
              <li v-for="item in attachmentQuestionSummaries" :key="item.questionId">
                <span>{{ item.questionTitle }}</span>
                <strong>{{ formatNumber(item.totalFiles) }} 个文件</strong>
              </li>
            </ul>
            <div v-else class="download-empty">当前问卷还没有文件上传题。</div>
            <div v-if="attachmentSampleFiles.length" class="download-samples">
              <a
                v-for="file in attachmentSampleFiles"
                :key="file.id"
                class="download-sample"
                :href="file.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{{ file.name }}</span>
                <strong>{{ formatFileSize(file.size) }}</strong>
              </a>
            </div>
            <div v-else class="download-empty">当前还没有可下载的附件样本。</div>
            <button class="btn ghost" :disabled="!surveyId || !hasAttachmentFiles || isDownloadingAttachments" @click="downloadAttachmentBundle">
              {{ isDownloadingAttachments ? '打包中...' : '下载附件' }}
            </button>
          </div>
        </div>
      </section>

      <section v-else class="advanced-panel">
        <div class="advanced-card">
          <h3>时间筛选</h3>
          <p>按提交时间筛选答卷，并直接跳转到答卷列表页查看结果。</p>
          <div class="query-grid">
            <label class="query-field">
              <span>开始时间</span>
              <input v-model="advancedStartTime" class="input" type="datetime-local" />
            </label>
            <label class="query-field">
              <span>结束时间</span>
              <input v-model="advancedEndTime" class="input" type="datetime-local" />
            </label>
          </div>
          <div class="advanced-hint">
            <span v-if="advancedStartTime">开始：{{ formatAdvancedDateTime(advancedStartTime) }}</span>
            <span v-if="advancedEndTime">结束：{{ formatAdvancedDateTime(advancedEndTime) }}</span>
            <span v-if="!advancedStartTime && !advancedEndTime">未设置时间筛选，将查看全部答卷。</span>
          </div>
          <div class="advanced-actions">
            <button class="btn primary" :disabled="!surveyId || !canApplyAdvancedFilter" @click="applyAdvancedFilter">查看筛选结果</button>
            <button class="btn ghost" :disabled="!surveyId || !canApplyAdvancedFilter" @click="saveAdvancedFilter">保存筛选</button>
            <button class="btn ghost" :disabled="!savedAdvancedFilter" @click="restoreAdvancedFilter">恢复已存</button>
            <button class="btn ghost" :disabled="!advancedStartTime && !advancedEndTime" @click="clearAdvancedFilter">清空</button>
          </div>
        </div>

        <div class="advanced-card">
          <h3>SPSS 交换文件</h3>
          <p>导出 Excel 原始数据，并下载可用于变量说明与标签映射的 SPSS 语法文件。</p>
          <div class="advanced-hint">
            <span>题目数 {{ formatNumber(props.questions.length) }}</span>
            <span>建议先导出 Excel，再在 SPSS 中导入数据并执行语法。</span>
          </div>
          <div class="advanced-actions">
            <button class="btn primary" :disabled="!surveyId || isExportingAnswers" @click="exportAnswersData">
              {{ isExportingAnswers ? '导出中...' : '导出 Excel 数据' }}
            </button>
            <button class="btn ghost" :disabled="!props.questions.length" @click="downloadSpsSyntax">下载语法 (.sps)</button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { downloadSurveyAttachmentsZip, downloadSurveyExcel } from '@/api/surveyAnswers'
import { getResults as getSurveyStatistics, type SurveyResults } from '@/api/surveys'
import { echarts } from '@/utils/echarts'
import type { AnswerStats, SurveyAnswersPanelContract } from './surveyAnswersPanelContract'
import {
  getQuestionStatAverageLabel as getSharedQuestionStatAverageLabel,
  getQuestionStatDistributionLabel as getSharedQuestionStatDistributionLabel,
  normalizeQuestionStat as normalizeSharedQuestionStat
} from '../../../../shared/questionModel.js'

type ChartInstance = ReturnType<typeof echarts.init>
const QuestionAnalyticsChart = defineAsyncComponent(() => import('./QuestionAnalyticsChart.vue'))

type QuestionType = 'choice' | 'text' | 'rating' | 'metric' | 'files' | 'matrix' | 'ratio' | 'other'
type SectionKey = 'summary' | 'analysis' | 'download' | 'advanced'
type SystemTab = '设备' | '浏览器' | '操作系统'
type AnalysisViewMode = '表格' | '明细' | '饼状' | '条形' | '折线'

interface QuestionOption {
  label: string
  count: number
  percentage: number
  avgRank?: number | null
  avgShare?: number | null
  totalShare?: number | null
}

interface SampleFile {
  id: number
  name: string
  url: string
  type?: string
  size: number
}

interface AttachmentQuestionSummary {
  questionId: string | number
  questionTitle: string
  totalAnswers: number
  totalFiles: number
}

interface SavedAdvancedFilter {
  startTime: string
  endTime: string
}

interface MatrixRowStat {
  label: string
  value: string
  totalAnswers: number
  options: QuestionOption[]
}

interface CategoryStatItem {
  questionId: string | number
  questionTitle: string
  questionTypeLabel: string
  sourceType: string
  type: QuestionType
  isRadio?: boolean
  options?: QuestionOption[]
  sampleAnswers?: string[]
  sampleFiles?: SampleFile[]
  totalAnswers?: number
  totalFiles?: number
  avgScore?: number | string
  avgValue?: number | null
  minValue?: number | null
  maxValue?: number | null
  distribution?: Record<string, number>
  earliestDate?: string | null
  latestDate?: string | null
  rows?: MatrixRowStat[]
}

interface TrendPoint {
  date: string
  label: string
  count: number
}

interface SummaryListItem {
  label: string
  value: string
}

interface RegionStats {
  hasLocationData: boolean
  scope?: string
  missingCount: number
  items: SummaryListItem[]
  emptyReason: string | null
}

function isCategoryStatItem(value: CategoryStatItem | null): value is CategoryStatItem {
  return value !== null
}

const props = withDefaults(defineProps<SurveyAnswersPanelContract>(), {
  stats: () => ({
    total: 0,
    today: 0,
    avgScore: 0,
    completionRate: 0,
    completed: 0,
    incomplete: 0,
    avgTime: '-',
    pageViews: 0,
    avgDuration: '-'
  }),
  questions: () => [],
  surveyTitle: '问卷结果',
  collectionRange: '--',
  initialResults: null
})

const router = useRouter()
const currentSection = ref<SectionKey>('summary')
const realStatisticsData = ref<SurveyResults | null>(props.initialResults)
const isLoading = ref(false)
const isExportingAnswers = ref(false)
const isDownloadingAttachments = ref(false)
const activeSystemTab = ref<SystemTab>('设备')
const activeViewMode = ref<AnalysisViewMode>('表格')
const advancedStartTime = ref('')
const advancedEndTime = ref('')
const savedAdvancedFilter = ref<SavedAdvancedFilter | null>(null)
const trendChartRef = ref<HTMLDivElement | null>(null)
const systemChartRef = ref<HTMLDivElement | null>(null)

let trendChart: ChartInstance | null = null
let systemChart: ChartInstance | null = null

const sidebarItems: Array<{ key: SectionKey; label: string; icon: string }> = [
  { key: 'summary', label: '答卷概览', icon: '📋' },
  { key: 'analysis', label: '统计分析', icon: '📈' },
  { key: 'download', label: '查看下载答卷', icon: '📥' },
  { key: 'advanced', label: '高级工具', icon: '🧮' }
]

const barPalette = ['#2563eb', '#22c55e', '#f97316', '#a855f7', '#ef4444']
const systemTabs: SystemTab[] = ['设备', '浏览器', '操作系统']
const analysisViewModes: AnalysisViewMode[] = ['表格', '明细', '饼状', '条形', '折线']
const collectionRange = computed(() => props.collectionRange)

const emptyStats = (): AnswerStats => ({
  total: 0,
  today: 0,
  avgScore: 0,
  completionRate: 0,
  completed: 0,
  incomplete: 0,
  avgTime: '-',
  pageViews: 0,
  avgDuration: '-'
})

const emptyRegionStats = (): RegionStats => ({
  hasLocationData: false,
  scope: 'submission-origin',
  missingCount: 0,
  items: [],
  emptyReason: '当前答卷尚未记录省份或城市来源。'
})

const stats = computed<AnswerStats>(() => {
  if (realStatisticsData.value) {
    return {
      total: realStatisticsData.value.total ?? realStatisticsData.value.totalSubmissions ?? 0,
      today: realStatisticsData.value.today ?? 0,
      avgScore: realStatisticsData.value.avgScore ?? 0,
      completionRate: realStatisticsData.value.completionRate ?? 0,
      completed: realStatisticsData.value.completed ?? 0,
      incomplete: realStatisticsData.value.incomplete ?? 0,
      avgTime: realStatisticsData.value.avgDuration || (realStatisticsData.value.avgTime != null ? `${realStatisticsData.value.avgTime}s` : '-'),
      pageViews: props.stats?.pageViews ?? 0,
      avgDuration: realStatisticsData.value.avgDuration || '-'
    }
  }

  if (!props.surveyId) {
    return {
      ...emptyStats(),
      ...props.stats
    }
  }

  return emptyStats()
})

const summaryHighlights = computed(() => {
  const statValue = stats.value
  const completionRate = Number.isFinite(statValue.completionRate)
    ? Number(statValue.completionRate)
    : 0
  const completed = statValue.completed ?? Math.round((completionRate / 100) * statValue.total)

  return [
    { label: '今日新增', value: formatNumber(statValue.today) },
    { label: '数据总量', value: formatNumber(statValue.total) },
    { label: '总完成数', value: formatNumber(completed) },
    { label: '总完成率', value: completionRate.toFixed(0), suffix: '%' },
    { label: '平均答题时长', value: statValue.avgDuration || statValue.avgTime || '-' }
  ]
})

const submissionTrend = computed<TrendPoint[]>(() => {
  return (realStatisticsData.value?.submissionTrend || []).map((item: any) => ({
    date: String(item?.date || ''),
    label: String(item?.label || '').trim() || String(item?.date || '').slice(5),
    count: Number(item?.count || 0)
  }))
})

const hasTrendData = computed(() => submissionTrend.value.some(item => item.count > 0))

const regionStats = computed<RegionStats>(() => {
  const source = realStatisticsData.value?.regionStats
  if (!source) return emptyRegionStats()

  return {
    hasLocationData: !!source.hasLocationData,
    scope: source.scope || 'submission-origin',
    missingCount: Number(source.missingCount || 0),
    items: Array.isArray(source.items) ? source.items : [],
    emptyReason: source.emptyReason || null
  }
})

const hasRegionData = computed(() => regionStats.value.hasLocationData && regionStats.value.items.length > 0)

const regionCoverageText = computed(() => {
  const total = stats.value.total
  if (!total) return '暂无地域样本'
  const covered = Math.max(0, total - regionStats.value.missingCount)
  return `已识别 ${formatNumber(covered)} / ${formatNumber(total)} 份`
})

const regionEmptyReason = computed(() => {
  if (regionStats.value.emptyReason) return regionStats.value.emptyReason
  return '当前没有可用的地域来源数据。'
})

const systemStatsData = computed<Record<SystemTab, SummaryListItem[]>>(() => {
  const source = realStatisticsData.value?.systemStats || {}
  return {
    设备: source['设备'] || source.devices || [],
    浏览器: source['浏览器'] || source.browsers || [],
    操作系统: source['操作系统'] || source.operatingSystems || []
  }
})

const currentSystemStats = computed(() => systemStatsData.value[activeSystemTab.value])

const categoryStats = computed<CategoryStatItem[]>(() => {
  return (realStatisticsData.value?.questionStats || [])
    .map((stat: any) => normalizeQuestionStat(stat))
    .filter(isCategoryStatItem)
})

const analysisQuestions = computed<CategoryStatItem[]>(() => categoryStats.value)
const isChartViewMode = computed(() => ['饼状', '条形', '折线'].includes(activeViewMode.value))
const advancedFilterStorageKey = computed(() => `survey-results-advanced-filter:${props.surveyId || 'default'}`)
const canApplyAdvancedFilter = computed(() => {
  if (!props.surveyId) return false
  if (advancedStartTime.value && advancedEndTime.value) {
    return new Date(advancedStartTime.value).getTime() <= new Date(advancedEndTime.value).getTime()
  }
  return true
})
const attachmentQuestions = computed(() => {
  return analysisQuestions.value.filter(question => question.type === 'files')
})
const attachmentQuestionSummaries = computed<AttachmentQuestionSummary[]>(() => {
  return attachmentQuestions.value.map(question => ({
    questionId: question.questionId,
    questionTitle: question.questionTitle,
    totalAnswers: Number(question.totalAnswers || 0),
    totalFiles: Number(question.totalFiles || 0)
  }))
})
const attachmentTotalFiles = computed(() => {
  return attachmentQuestions.value.reduce((sum, question) => sum + Number(question.totalFiles || 0), 0)
})
const attachmentAnsweredCount = computed(() => {
  return attachmentQuestions.value.reduce((sum, question) => sum + Number(question.totalAnswers || 0), 0)
})
const attachmentSampleFiles = computed<SampleFile[]>(() => {
  const seen = new Set<number>()
  const files: SampleFile[] = []

  for (const question of attachmentQuestions.value) {
    for (const file of question.sampleFiles || []) {
      const fileId = Number(file?.id || 0)
      if (fileId > 0 && seen.has(fileId)) continue
      if (fileId > 0) seen.add(fileId)
      files.push({
        id: fileId,
        name: String(file?.name || ''),
        url: String(file?.url || ''),
        type: String(file?.type || ''),
        size: Number(file?.size || 0)
      })
      if (files.length >= 6) return files
    }
  }

  return files
})
const hasAttachmentFiles = computed(() => attachmentTotalFiles.value > 0)

function formatNumber(value?: number | null): string {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return '-'
  return new Intl.NumberFormat('zh-CN').format(Number(value))
}

function formatPercent(value?: number | string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0.00%'
  return `${num.toFixed(2)}%`
}

function clampPercent(value?: number | string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return '0%'
  return `${Math.max(0, Math.min(100, num))}%`
}

function formatScore(value?: number | string | null): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return '-'
  return num.toFixed(2)
}

function formatFileSize(size?: number | null): string {
  const num = Number(size)
  if (!Number.isFinite(num) || num <= 0) return '0 B'
  if (num >= 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`
  if (num >= 1024) return `${(num / 1024).toFixed(1)} KB`
  return `${num} B`
}

function normalizeQuestionStat(stat: any): CategoryStatItem | null {
  return normalizeSharedQuestionStat(stat) as CategoryStatItem | null
}

function getQuestionStatAverageLabel(question: CategoryStatItem) {
  return getSharedQuestionStatAverageLabel(question)
}

function getDistributionEntries(question: CategoryStatItem) {
  const distribution = question.distribution || {}
  return Object.entries(distribution)
    .map(([key, value]) => ({ key, value: Number(value) }))
    .filter(entry => Number.isFinite(entry.value))
    .sort((a, b) => Number(b.key) - Number(a.key))
}

function getDistributionLabel(question: CategoryStatItem, key: string) {
  return getSharedQuestionStatDistributionLabel(question, key)
}

function isRankingQuestion(question: CategoryStatItem) {
  return question.sourceType === 'ranking'
}

function formatAdvancedDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

function refreshSavedAdvancedFilter() {
  if (!props.surveyId || typeof window === 'undefined') {
    savedAdvancedFilter.value = null
    return
  }
  try {
    const raw = window.localStorage.getItem(advancedFilterStorageKey.value)
    if (!raw) {
      savedAdvancedFilter.value = null
      return
    }
    const parsed = JSON.parse(raw)
    savedAdvancedFilter.value = {
      startTime: String(parsed?.startTime || ''),
      endTime: String(parsed?.endTime || '')
    }
  } catch {
    savedAdvancedFilter.value = null
  }
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function ensureChartInstance(element: HTMLDivElement | null, instance: ChartInstance | null) {
  if (!element) return null
  if (instance) return instance
  return echarts.init(element)
}

function disposeTrendChart() {
  trendChart?.dispose()
  trendChart = null
}

function disposeSystemChart() {
  systemChart?.dispose()
  systemChart = null
}

function renderTrendChart() {
  if (currentSection.value !== 'summary' || !trendChartRef.value || !hasTrendData.value) {
    disposeTrendChart()
    return
  }

  trendChart = ensureChartInstance(trendChartRef.value, trendChart)
  if (!trendChart) return

  trendChart.setOption({
    animationDuration: 300,
    grid: { top: 24, right: 16, bottom: 24, left: 32 },
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value: number) => `${formatNumber(Number(value))} 份`
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: submissionTrend.value.map(item => item.label),
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#64748b', fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 }
    },
    series: [{
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 7,
      data: submissionTrend.value.map(item => item.count),
      lineStyle: { width: 3, color: '#2563eb' },
      itemStyle: { color: '#2563eb' },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(37, 99, 235, 0.28)' },
          { offset: 1, color: 'rgba(37, 99, 235, 0.02)' }
        ])
      }
    }]
  })
}

function toRouteDateTime(value: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function applyAdvancedFilter() {
  if (!props.surveyId) {
    ElMessage.warning('缺少问卷 ID，无法筛选答卷。')
    return
  }
  if (!canApplyAdvancedFilter.value) {
    ElMessage.warning('结束时间不能早于开始时间。')
    return
  }

  const query: Record<string, string> = {
    surveyId: props.surveyId,
    title: props.surveyTitle || ''
  }
  const startTime = toRouteDateTime(advancedStartTime.value)
  const endTime = toRouteDateTime(advancedEndTime.value)
  if (startTime) query.startTime = startTime
  if (endTime) query.endTime = endTime

  router.push({
    name: 'AnswerManagement',
    query
  })
}

function saveAdvancedFilter() {
  if (!props.surveyId) {
    ElMessage.warning('缺少问卷 ID，无法保存筛选条件。')
    return
  }
  if (!canApplyAdvancedFilter.value) {
    ElMessage.warning('结束时间不能早于开始时间。')
    return
  }

  window.localStorage.setItem(advancedFilterStorageKey.value, JSON.stringify({
    startTime: advancedStartTime.value,
    endTime: advancedEndTime.value
  }))
  refreshSavedAdvancedFilter()
  ElMessage.success('筛选条件已保存到当前浏览器。')
}

function restoreAdvancedFilter() {
  const saved = savedAdvancedFilter.value
  if (!saved) {
    ElMessage.warning('当前没有已保存的筛选条件。')
    return
  }

  advancedStartTime.value = saved.startTime
  advancedEndTime.value = saved.endTime
  ElMessage.success('已恢复已保存的筛选条件。')
}

function clearAdvancedFilter() {
  advancedStartTime.value = ''
  advancedEndTime.value = ''
}

function buildSpsSyntax() {
  const questions = Array.isArray(props.questions) ? props.questions : []
  const lines: string[] = [
    '* Survey result variable dictionary.',
    'SET UNICODE=ON.',
    `* Survey title: ${escapeSpsText(props.surveyTitle || 'survey')}.`,
    '* Import the exported Excel data into SPSS first, then run labels below.',
    ''
  ]

  const variableLines: string[] = []
  const valueLabelBlocks: string[] = []
  const formatLines: string[] = []

  questions.forEach((question, index) => {
    const questionIndex = index + 1
    const rawTitle = String(question?.title || `Question ${questionIndex}`)
    const normalizedTitle = escapeSpsText(rawTitle)
    const sourceType = String(question?.type || '')

    if (sourceType === 'matrix' && Array.isArray(question?.matrix?.rows)) {
      const rows = question.matrix.rows
      rows.forEach((row: any, rowIndex: number) => {
        const variableName = `Q${questionIndex}_${rowIndex + 1}`
        const rowLabel = escapeSpsText(String(row?.label || row?.value || `Row ${rowIndex + 1}`))
        variableLines.push(`${variableName} '${normalizedTitle} - ${rowLabel}'`)
        pushValueLabels(valueLabelBlocks, variableName, question?.options)
      })
      return
    }

    const variableName = `Q${questionIndex}`
    variableLines.push(`${variableName} '${normalizedTitle}'`)

    if (sourceType === 'radio' || sourceType === 'dropdown' || sourceType === 'checkbox' || sourceType === 'ranking') {
      pushValueLabels(valueLabelBlocks, variableName, question?.options)
      return
    }

    if (sourceType === 'slider' || sourceType === 'scale' || sourceType === 'rating') {
      formatLines.push(`FORMATS ${variableName} (F8.2).`)
      return
    }

    if (sourceType === 'date') {
      formatLines.push(`* ${variableName} is expected to be imported as a date or ISO string.`)
      return
    }

    if (sourceType === 'upload') {
      formatLines.push(`* ${variableName} contains uploaded file metadata or URLs.`)
    }
  })

  if (variableLines.length) {
    lines.push('VARIABLE LABELS')
    variableLines.forEach((line, index) => {
      lines.push(`  ${line}${index === variableLines.length - 1 ? '.' : ''}`)
    })
    lines.push('')
  }

  if (valueLabelBlocks.length) {
    lines.push(...valueLabelBlocks)
    lines.push('')
  }

  if (formatLines.length) {
    lines.push(...formatLines)
    lines.push('')
  }

  lines.push('EXECUTE.')
  return `${lines.join('\r\n')}\r\n`
}

function pushValueLabels(blocks: string[], variableName: string, options: any) {
  if (!Array.isArray(options) || options.length === 0) return

  const pairs = options
    .map((option: any) => {
      const rawValue = option?.value ?? option?.label
      const rawLabel = option?.label ?? option?.value
      if (rawValue == null || rawLabel == null) return null
      return `  ${formatSpsValue(rawValue)} '${escapeSpsText(String(rawLabel))}'`
    })
    .filter(Boolean)

  if (pairs.length === 0) return

  blocks.push(`VALUE LABELS ${variableName}`)
  pairs.forEach((pair, index) => {
    blocks.push(`${pair}${index === pairs.length - 1 ? '.' : ''}`)
  })
}

function formatSpsValue(value: unknown) {
  const num = Number(value)
  if (Number.isFinite(num) && String(value).trim() !== '') {
    return String(num)
  }
  return `'${escapeSpsText(String(value ?? ''))}'`
}

function escapeSpsText(value: string) {
  return value.replace(/'/g, "''").replace(/\r?\n/g, ' ')
}

function downloadSpsSyntax() {
  const content = buildSpsSyntax()
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const safeTitle = (props.surveyTitle || `survey-${props.surveyId || 'results'}`)
    .replace(/[\\/:*?"<>|]/g, '-')
    .trim() || 'survey-results'
  triggerBrowserDownload(blob, `${safeTitle}.sps`)
  ElMessage.success('SPSS 语法文件已开始下载。')
}

function renderSystemChart() {
  if (currentSection.value !== 'summary' || !systemChartRef.value || currentSystemStats.value.length === 0) {
    disposeSystemChart()
    return
  }

  const items = [...currentSystemStats.value]
    .map(item => ({
      label: item.label,
      value: Number(item.value || 0)
    }))
    .filter(item => Number.isFinite(item.value) && item.value > 0)
    .slice(0, 6)
    .reverse()

  if (items.length === 0) {
    disposeSystemChart()
    return
  }

  systemChart = ensureChartInstance(systemChartRef.value, systemChart)
  if (!systemChart) return

  systemChart.setOption({
    animationDuration: 250,
    grid: { top: 12, right: 16, bottom: 12, left: 88 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      valueFormatter: (value: number) => `${formatNumber(Number(value))} 份`
    },
    xAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 }
    },
    yAxis: {
      type: 'category',
      data: items.map(item => item.label),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#334155', fontSize: 12 }
    },
    series: [{
      type: 'bar',
      data: items.map(item => item.value),
      barWidth: 16,
      itemStyle: {
        borderRadius: 999,
        color: '#22c55e'
      }
    }]
  })
}

async function syncSummaryCharts() {
  await nextTick()
  renderTrendChart()
  renderSystemChart()
}

function resizeCharts() {
  trendChart?.resize()
  systemChart?.resize()
}

const openAnswerManagement = () => {
  if (!props.surveyId) {
    ElMessage.warning('缺少问卷 ID，无法查看答卷。')
    return
  }

  router.push({
    name: 'AnswerManagement',
    query: {
      surveyId: props.surveyId,
      title: props.surveyTitle || undefined
    }
  })
}

const exportAnswersData = async () => {
  if (!props.surveyId || isExportingAnswers.value) {
    if (!props.surveyId) ElMessage.warning('缺少问卷 ID，无法导出答卷。')
    return
  }

  isExportingAnswers.value = true
  try {
    const blob = await downloadSurveyExcel(props.surveyId)
    triggerBrowserDownload(blob, `survey-${props.surveyId}.xlsx`)
    ElMessage.success('答卷数据已开始下载。')
  } finally {
    isExportingAnswers.value = false
  }
}

const downloadAttachmentBundle = async () => {
  if (!props.surveyId || isDownloadingAttachments.value) {
    if (!props.surveyId) ElMessage.warning('缺少问卷 ID，无法下载附件。')
    return
  }
  if (!hasAttachmentFiles.value) {
    ElMessage.warning('当前问卷还没有可打包下载的附件。')
    return
  }

  isDownloadingAttachments.value = true
  try {
    const blob = await downloadSurveyAttachmentsZip(props.surveyId)
    triggerBrowserDownload(blob, `survey-${props.surveyId}-attachments.zip`)
    ElMessage.success('附件压缩包已开始下载。')
  } finally {
    isDownloadingAttachments.value = false
  }
}

async function fetchRealStatistics() {
  if (props.initialResults) {
    realStatisticsData.value = props.initialResults
    await syncSummaryCharts()
    return
  }

  if (!props.surveyId) {
    realStatisticsData.value = null
    disposeTrendChart()
    disposeSystemChart()
    return
  }

  isLoading.value = true
  try {
    const data = await getSurveyStatistics(props.surveyId)
    realStatisticsData.value = data
    await syncSummaryCharts()
  } catch (error) {
    realStatisticsData.value = null
    disposeTrendChart()
    disposeSystemChart()
    console.warn('加载统计数据失败', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  refreshSavedAdvancedFilter()
  advancedStartTime.value = savedAdvancedFilter.value?.startTime || ''
  advancedEndTime.value = savedAdvancedFilter.value?.endTime || ''
  void fetchRealStatistics()
  window.addEventListener('resize', resizeCharts)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeCharts)
  disposeTrendChart()
  disposeSystemChart()
})

watch(
  [currentSection, submissionTrend, currentSystemStats],
  () => {
    void syncSummaryCharts()
  },
  { deep: true }
)

watch(() => props.initialResults, value => {
  if (value) {
    realStatisticsData.value = value
    void syncSummaryCharts()
    return
  }

  void fetchRealStatistics()
})

watch(() => props.surveyId, () => {
  refreshSavedAdvancedFilter()
  advancedStartTime.value = savedAdvancedFilter.value?.startTime || ''
  advancedEndTime.value = savedAdvancedFilter.value?.endTime || ''
  void fetchRealStatistics()
})
</script>

<style scoped>
.answers-dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  background: #f5f7fb;
  min-height: calc(100vh - 120px);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
}

.dashboard-sidebar {
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%);
  border-right: 1px solid rgba(148, 163, 184, 0.2);
  padding: 24px 20px;
  gap: 24px;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 16px;
  color: #1e293b;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.sidebar-icon {
  font-size: 24px;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #475569;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
}

.sidebar-link:hover,
.sidebar-link.active {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
  font-weight: 600;
}

.link-icon {
  font-size: 18px;
}

.sidebar-footer {
  margin-top: auto;
  padding: 16px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.12);
  font-size: 13px;
  color: #475569;
  line-height: 1.5;
}

.sidebar-footer strong {
  display: block;
  font-size: 15px;
  color: #1e293b;
  margin: 4px 0;
}

.sidebar-footer .meta {
  color: #64748b;
}

.dashboard-main {
  display: flex;
  flex-direction: column;
  padding: 32px 36px;
  gap: 32px;
  background: #ffffff;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
}

.header-info h1 {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.header-meta {
  font-size: 14px;
  color: #64748b;
}

.header-meta strong {
  color: #0f172a;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn.primary {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #fff;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.25);
}

.btn.primary:hover {
  filter: brightness(1.05);
}

.btn.ghost {
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.btn.ghost:hover {
  background: rgba(37, 99, 235, 0.15);
}

.summary-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 18px;
}

.summary-metric {
  background: #f8fafc;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 88px;
}

.metric-label {
  font-size: 13px;
  color: #64748b;
}

.metric-value {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-weight: 700;
  color: #0f172a;
  font-size: 26px;
}

.metric-number {
  line-height: 1.1;
}

.metric-hint {
  font-size: 12px;
  color: #94a3b8;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 24px;
}

.chart-card {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.chart-card.large {
  min-height: 320px;
}

.chart-card.small {
  min-height: 210px;
}

.chart-column {
  display: grid;
  gap: 24px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 0;
}

.chart-header h2,
.chart-header h3 {
  margin: 0;
  font-weight: 600;
  color: #0f172a;
}

.chart-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.chart-body {
  padding: 20px 24px 24px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.chart-placeholder {
  flex: 1;
  min-height: 200px;
  border-radius: 14px;
  border: 2px dashed rgba(148, 163, 184, 0.35);
  display: grid;
  place-items: center;
  color: #cbd5f5;
  font-size: 14px;
}

.chart-placeholder.ring {
  min-height: 140px;
}

.legend {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
  font-size: 13px;
  color: #475569;
}

.legend li {
  display: flex;
  align-items: center;
  gap: 8px;
}

.legend .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-value {
  margin-left: auto;
  color: #1e293b;
  font-weight: 600;
}

.header-link {
  background: none;
  border: none;
  padding: 0;
  font-size: 13px;
  color: #2563eb;
  cursor: pointer;
}

.header-link:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.summary-section {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.summary-card {
  background: #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 18px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.summary-card-header h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.summary-card-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.summary-card-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.summary-card.summary-chart {
  gap: 16px;
}

.summary-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
  gap: 24px;
}

.chart-surface {
  width: 100%;
  border-radius: 16px;
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.08), transparent 42%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  border: 1px solid rgba(191, 219, 254, 0.6);
}

.chart-surface--area {
  min-height: 260px;
}

.chart-surface--bar {
  min-height: 190px;
}

.card-empty {
  min-height: 180px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(255, 255, 255, 0.95));
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #64748b;
}

.card-empty strong {
  color: #0f172a;
  font-size: 16px;
}

.card-empty p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
}

.card-empty--map {
  min-height: 240px;
}

.card-empty--compact {
  min-height: 140px;
}

.region-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.region-item {
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid rgba(226, 232, 240, 0.9);
}

.region-item__head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
  color: #334155;
  font-size: 14px;
}

.region-rank {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 34px;
  height: 24px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 700;
}

.region-name {
  min-width: 0;
  font-weight: 600;
  color: #0f172a;
}

.region-bar {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.16);
}

.region-bar__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #2563eb 0%, #60a5fa 100%);
}

.system-tabs {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(37, 99, 235, 0.08);
  padding: 4px;
  border-radius: 999px;
}

.system-tab {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: #1d4ed8;
  cursor: pointer;
  transition: all 0.2s ease;
}

.system-tab.active {
  background: #ffffff;
  color: #1d4ed8;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.24);
}

.system-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  color: #475569;
}

.system-list li {
  display: flex;
  justify-content: space-between;
}

.system-list strong {
  color: #0f172a;
}

.summary-section,
.analysis-section,
.download-panel,
.advanced-panel {
  background: #ffffff;
  border-radius: 18px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  padding: 24px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
  gap: 24px;
}

.analysis-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 950px;
  width: 100%;
  margin: 0 auto;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

.analysis-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.analysis-header p {
  margin: 4px 0 0;
  font-size: 12px;
  color: #6b7280;
}

.analysis-tools {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.view-toggle {
  display: inline-flex;
  background: rgba(79, 70, 229, 0.08);
  border-radius: 999px;
  padding: 4px;
  gap: 6px;
}

.view-mode-btn {
  border: none;
  background: transparent;
  padding: 6px 14px;
  border-radius: 999px;
  font-size: 12px;
  color: #4c6ef5;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-mode-btn.active {
  background: #4c6ef5;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(76, 110, 245, 0.35);
}

.analysis-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: calc(100vh - 260px);
  overflow-y: auto;
  padding-right: 6px;
}

.analysis-list::-webkit-scrollbar {
  width: 6px;
}

.analysis-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.5);
  border-radius: 999px;
}

.question-analytics {
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  border: 1px solid rgba(231, 235, 244, 0.9);
  display: flex;
  flex-direction: column;
  gap: 18px;
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.06);
}

.question-analytics__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.question-title-block {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.question-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.question-meta__pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.05);
  color: #475569;
  font-size: 12px;
  font-weight: 600;
}

.badge {
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  font-size: 13px;
  border-radius: 10px;
  padding: 6px 12px;
}

.title-group h3 {
  margin: 0 0 4px;
  font-size: 18px;
  color: #0f172a;
}

.title-group .type {
  font-size: 12px;
  color: #1d4ed8;
  background: rgba(37, 99, 235, 0.1);
  padding: 4px 8px;
  border-radius: 8px;
}

.question-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.table-head,
.table-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) 88px minmax(220px, 1fr) 88px;
  gap: 16px;
  font-size: 13px;
  color: #475569;
  align-items: center;
}

.table-head {
  color: #9ca3af;
  font-weight: 600;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(191, 209, 235, 0.5);
}

.table-row {
  padding: 10px 0;
  border-bottom: 1px dashed rgba(191, 209, 235, 0.4);
}

.col-option {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #0f172a;
  font-weight: 600;
}

.col-count {
  text-align: right;
  font-weight: 600;
  color: #1f2937;
}

.col-ratio {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: flex-end;
}

.col-rank {
  text-align: right;
  font-weight: 600;
  color: #1f2937;
}

.ratio-bar {
  position: relative;
  flex: 1;
  height: 8px;
  background: rgba(226, 232, 240, 0.8);
  border-radius: 999px;
  overflow: hidden;
}

.ratio-fill {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.ratio-value {
  min-width: 64px;
  text-align: right;
  font-weight: 600;
  color: #1f2937;
}

.question-rating {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 24px;
  align-items: center;
}

.question-rating .rating-score {
  display: grid;
  place-items: center;
  background: rgba(251, 191, 36, 0.12);
  border-radius: 16px;
  padding: 20px;
  gap: 6px;
}

.question-rating .rating-score .value {
  font-size: 34px;
  font-weight: 700;
  color: #b45309;
}

.question-rating .rating-score .label {
  font-size: 13px;
  color: #f59e0b;
}

.rating-distribution {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
}

.rating-distribution li {
  display: grid;
  grid-template-columns: 60px 1fr 70px;
  gap: 12px;
  align-items: center;
}

.star-label {
  color: #475569;
}

.rating-distribution .progress {
  height: 10px;
  background: rgba(148, 163, 184, 0.25);
  border-radius: 999px;
  overflow: hidden;
}

.rating-distribution .progress-bar {
  height: 100%;
  border-radius: 999px;
}

.question-text {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
  color: #6b7280;
  background: rgba(226, 232, 240, 0.6);
  padding: 16px;
  border-radius: 12px;
}

.text-summary,
.file-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.text-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.text-answer-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.text-answer-item {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.9);
  color: #334155;
  line-height: 1.6;
}

.question-metric {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 16px;
}

.metric-card {
  padding: 18px;
  border-radius: 14px;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid rgba(226, 232, 240, 0.9);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}

.metric-card-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #64748b;
}

.metric-card strong {
  font-size: 26px;
  color: #0f172a;
}

.question-matrix {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.question-matrix__row {
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: #f8fafc;
}

.question-matrix__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  font-size: 13px;
  color: #64748b;
}

.question-files {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.file-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
  text-decoration: none;
}

.file-item:hover {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.08);
}

.file-name {
  min-width: 0;
  word-break: break-all;
}

.file-meta {
  flex-shrink: 0;
  color: #64748b;
  font-size: 12px;
}

.question-footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #94a3b8;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  border-radius: 16px;
  background: rgba(226, 232, 240, 0.6);
  color: #64748b;
}

.download-panel {
  display: flex;
  flex-direction: column;
}

.download-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.download-card {
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.download-card h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #0f172a;
}

.download-card p {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
}

.download-card .btn {
  align-self: flex-start;
}

.btn-compact {
  padding: 8px 14px;
  font-size: 13px;
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.download-card .btn.ghost {
  background: rgba(15, 23, 42, 0.06);
  color: #1f2937;
}

.card-icon {
  font-size: 32px;
}

.download-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.download-pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
  font-size: 12px;
  font-weight: 600;
}

.download-list,
.download-samples {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.download-list li,
.download-sample {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.92);
  color: #0f172a;
  text-decoration: none;
}

.download-list li span,
.download-sample span {
  min-width: 0;
  word-break: break-all;
}

.download-list li strong,
.download-sample strong {
  flex-shrink: 0;
  color: #475569;
  font-size: 12px;
}

.download-sample:hover {
  border-color: rgba(59, 130, 246, 0.35);
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.08);
}

.download-empty {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(148, 163, 184, 0.08);
  color: #64748b;
  font-size: 13px;
}

.advanced-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
}

.advanced-card {
  background: #f8fafc;
  border-radius: 14px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input {
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.6);
  min-width: 120px;
  font-size: 13px;
}

.query-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.query-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #475569;
  font-size: 13px;
}

.advanced-hint {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.advanced-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 1200px) {
  .answers-dashboard {
    grid-template-columns: 1fr;
  }

  .dashboard-sidebar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    border-right: none;
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }

  .sidebar-nav {
    flex-direction: row;
  }

  .dashboard-main {
    padding: 24px;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .summary-bottom {
    grid-template-columns: 1fr;
  }

  .rating-stats {
    grid-template-columns: 1fr;
  }

  .analysis-list {
    max-height: none;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
  }

  .summary-metrics {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  }

  .summary-card {
    padding: 18px;
  }

  .question-item {
    padding: 18px;
  }

  .download-grid {
    grid-template-columns: 1fr;
  }

  .table-head,
  .table-row {
    grid-template-columns: minmax(0, 1fr);
    gap: 8px;
  }

  .option-value {
    text-align: left;
  }
}
</style>
