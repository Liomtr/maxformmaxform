<!-- 填写问卷（美化版） -->
<template>
  <div class="page" :class="{ embed: preview }" data-testid="fill-survey-page">
    <!-- 加载中 -->
    <el-skeleton v-if="loading" :rows="6" animated class="skeleton" />

    <!-- 空态：标题置顶，仅保留返回首页按钮 -->
    <div v-else-if="!survey" class="closed-block">
      <h2 v-if="closedMeta.title" class="closed-survey-title">{{ closedMeta.title }}</h2>
      <el-empty class="closed-empty">
        <template #description>
          <div class="closed-wrap">
            <div class="closed-title">{{ errorMsg || '问卷不存在或已关闭' }}</div>
            <div v-if="closedMeta.status==='closed' && closedMeta.closedAt" class="closed-meta">关闭时间：{{ formatDate(closedMeta.closedAt) }}</div>
          </div>
        </template>
      </el-empty>
    </div>

    <!-- 填写区域 -->
    <div v-else class="survey-wrapper">
      <!-- 右上角二维码区域 - 完全独立于答题区域 -->
      <div class="qr-section-outside">
        <div class="qr-code-container">
          <canvas ref="qrCanvasRef" class="qr-canvas-mini"></canvas>
        </div>
        <p class="qr-tip-mini">扫码答题</p>
      </div>
      
      <div class="survey-container">
        <el-card class="paper" shadow="never">
        <div class="paper-header">
          <h2 class="paper-title">{{ survey.title }}</h2>
          <div class="desc" v-if="survey.description" v-html="safeHtml(survey.description)"></div>
          <div v-if="survey.settings?.showProgress" class="progress-panel">
            <div class="progress-copy">进度 {{ answeredVisibleQuestions }}/{{ totalVisibleQuestions }}</div>
            <el-progress :percentage="progressPercent" :show-text="false" :stroke-width="8" />
          </div>
        </div>
      <el-divider />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="q-form">
        <template v-for="(q, idx) in survey.questions" :key="'q-'+idx">
          <template v-if="visibleMap[String(idx+1)] !== false">
          <el-form-item :prop="String(q.id ?? (idx+1))" :required="!!q.required" class="q-item" :data-testid="`fill-question-${idx}`">
            <template #label>
              <div class="q-label" :data-testid="`fill-question-title-${idx}`">
                <span v-if="!q.hideSystemNumber" class="q-number">{{ idx + 1 }}</span>
                <span class="q-title">
                  <template v-if="(q as any).titleHtml">
                    <span v-html="safeHtml((q as any).titleHtml)"></span>
                  </template>
                  <template v-else>
                    {{ q.title }}
                  </template>
                </span>
              </div>
            </template>
            <div class="q-desc" v-if="q.description" v-html="safeHtml(q.description)"></div>
            <!-- 段落说明 -->
            <template v-if="getRenderType(q) === 'stage_explain'">
              <div class="stage-explain-block">
                <div class="stage-explain-text" v-html="safeHtml((q as any).titleHtml || q.title || '')"></div>
              </div>
            </template>
            <!-- 下拉题 -->
            <template v-else-if="getRenderType(q) === 'dropdown'">
              <el-select v-model="form[q.id ?? (idx+1)]" placeholder="请选择" style="width: 320px; max-width: 100%;">
                <el-option
                  v-for="opt in filteredOptions(q, idx).filter((item: any) => item.value != null)"
                  :key="'s-'+String(opt.value)"
                  :label="String(opt.label || '')"
                  :value="opt.value"
                  :disabled="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull"
                />
              </el-select>
              <template v-for="opt in filteredOptions(q, idx)" :key="'sd-'+(opt.value ?? 'h')">
                <div v-if="opt.value!=null && opt.desc" style="color:#64748b; font-size:12px; margin:6px 0 0;" v-html="opt.desc"></div>
              </template>
            </template>
            <!-- 单选题 -->
            <template v-else-if="q.type === 'radio'">
              <el-radio-group v-model="form[q.id ?? (idx+1)]" class="opt-vertical">
                <template v-for="(opt, oi) in filteredOptions(q, idx)" :key="'r-'+(opt.value ?? 'h-'+oi)">
                  <div v-if="opt.__groupHeader" class="group-header">{{ opt.__groupHeader }}</div>
                  <el-radio
                    v-if="opt.value!=null"
                    :label="opt.value"
                    class="opt-item"
                    :disabled="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull"
                    :title="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull ? (q.quotaFullText || '名额已满') : ''"
                  >
                    <span v-if="!opt.rich">{{ opt.label }}</span>
                    <span v-else v-html="opt.label"></span>
                    <span
                      v-if="q.quotasEnabled && q.quotaMode==='explicit' && q.quotaShowRemaining && opt.value!=null && Number(opt.quotaLimit)>0"
                      class="quota-remaining"
                    >（剩余{{ opt.__remaining }}）</span>
                  </el-radio>
                  <div v-if="opt.value!=null && opt.fillEnabled && String(form[q.id ?? (idx+1)]) === String(opt.value)" class="opt-fill-as-item">
                    <el-input
                      v-model="form['fill_'+(q.id ?? (idx+1))+'_'+opt.value]"
                      :placeholder="opt.fillPlaceholder || '请输入补充内容'"
                      style="width:300px;"
                    />
                  </div>
                </template>
              </el-radio-group>
              <template v-for="opt in filteredOptions(q, idx)" :key="'d-'+(opt.value ?? 'h')">
                <div v-if="opt.value!=null && opt.desc" style="color:#64748b; font-size:12px; margin:2px 0 6px 28px;" v-html="opt.desc"></div>
              </template>
            </template>
            <!-- 多选题 -->
            <template v-else-if="q.type === 'checkbox'">
              <el-checkbox-group v-model="form[q.id ?? (idx+1)]" class="opt-vertical" @change="onCheckboxChange(q, idx)">
                <template v-for="(opt, oi) in filteredOptions(q, idx)" :key="'c-'+(opt.value ?? 'h-'+oi)">
                  <div v-if="opt.__groupHeader" class="group-header">{{ opt.__groupHeader }}</div>
                  <el-checkbox
                    v-if="opt.value!=null"
                    :label="opt.value"
                    class="opt-item"
                    :disabled="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull"
                    :title="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull ? (q.quotaFullText || '名额已满') : ''"
                  >
                    <span v-if="!opt.rich">{{ opt.label }}</span>
                    <span v-else v-html="opt.label"></span>
                    <span
                      v-if="q.quotasEnabled && q.quotaMode==='explicit' && q.quotaShowRemaining && opt.value!=null && Number(opt.quotaLimit)>0"
                      class="quota-remaining"
                    >（剩余{{ opt.__remaining }}）</span>
                  </el-checkbox>
                  <div v-if="opt.value!=null && opt.fillEnabled && Array.isArray(form[q.id ?? (idx+1)]) && form[q.id ?? (idx+1)].map(String).includes(String(opt.value))" class="opt-fill-as-item">
                    <el-input
                      v-model="form['fill_'+(q.id ?? (idx+1))+'_'+opt.value]"
                      :placeholder="opt.fillPlaceholder || '请输入补充内容'"
                      style="width:300px;"
                    />
                  </div>
                </template>
              </el-checkbox-group>
              <template v-for="opt in filteredOptions(q, idx)" :key="'d-'+(opt.value ?? 'h')">
                <div v-if="opt.value!=null && opt.desc" style="color:#64748b; font-size:12px; margin:2px 0 6px 28px;" v-html="opt.desc"></div>
              </template>
            </template>
            <!-- 排序题 -->
            <template v-else-if="q.type === 'ratio'">
              <div class="ratio-answer">
                <div class="ratio-answer__summary" :class="{ invalid: hasRatioAnswer(q, idx) && !isRatioTotalValid(q, idx) }">
                  <span>当前合计 {{ formatRatioValue(getRatioTotal(q, idx)) }}%</span>
                  <span>剩余 {{ formatRatioValue(getRatioRemaining(q, idx)) }}%</span>
                </div>
                <div class="ratio-answer__list">
                  <div
                    v-for="opt in filteredOptions(q, idx).filter((item: any) => item.value != null)"
                    :key="`ratio-${String(opt.value)}`"
                    class="ratio-answer__item"
                  >
                    <div class="ratio-answer__meta">
                      <span v-if="!opt.rich" class="ratio-answer__label">{{ opt.label }}</span>
                      <span v-else class="ratio-answer__label" v-html="opt.label"></span>
                      <div v-if="opt.desc" class="ratio-answer__desc" v-html="opt.desc"></div>
                    </div>
                    <div class="ratio-answer__control">
                      <el-input-number
                        :model-value="getRatioAnswerValue(q, idx, opt.value)"
                        :min="0"
                        :max="100"
                        :step="1"
                        :precision="0"
                        controls-position="right"
                        @change="onRatioChange(q, idx, opt.value, $event)"
                      />
                      <span class="ratio-answer__suffix">%</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <template v-else-if="q.type === 'ranking'">
              <div class="ranking-answer">
                <div
                  v-for="(opt, orderIndex) in getRankingItems(q, idx)"
                  :key="'rk-'+String(opt.value)"
                  class="ranking-item"
                >
                  <div class="ranking-item-main">
                    <span class="ranking-order">{{ orderIndex + 1 }}</span>
                    <span v-if="!opt.rich" class="ranking-label">{{ opt.label }}</span>
                    <span v-else class="ranking-label" v-html="opt.label"></span>
                  </div>
                  <div class="ranking-actions">
                    <button type="button" class="ranking-btn" :disabled="orderIndex === 0" @click="moveRankingItem(q, idx, orderIndex, -1)">上移</button>
                    <button type="button" class="ranking-btn" :disabled="orderIndex === getRankingItems(q, idx).length - 1" @click="moveRankingItem(q, idx, orderIndex, 1)">下移</button>
                  </div>
                </div>
              </div>
            </template>
            <!-- 文件上传题 -->
            <template v-else-if="q.type === 'upload'">
              <div class="upload-answer">
                <label class="upload-picker" :class="{ disabled: uploadState[String(q.id ?? (idx+1))] || preview || isUploadLimitReached(q, idx) }">
                  <input
                    type="file"
                    :multiple="getUploadConfig(q).maxFiles > 1"
                    :accept="getUploadConfig(q).accept"
                    :disabled="uploadState[String(q.id ?? (idx+1))] || preview || isUploadLimitReached(q, idx)"
                    @change="onUploadFilesSelected(q, idx, $event)"
                  />
                  <span>{{ uploadState[String(q.id ?? (idx+1))] ? '上传中...' : getUploadButtonText(q, idx) }}</span>
                </label>
                <div class="upload-tip">{{ getUploadHelpText(q) }}</div>
                <div v-if="uploadErrors[String(q.id ?? (idx+1))]" class="upload-error">{{ uploadErrors[String(q.id ?? (idx+1))] }}</div>
                <div v-if="getUploadAnswerList(q, idx).length" class="upload-list">
                  <div v-for="(file, fileIndex) in getUploadAnswerList(q, idx)" :key="'up-'+file.id+'-'+fileIndex" class="upload-item">
                    <a class="upload-link" :href="file.url" target="_blank" rel="noopener noreferrer">{{ file.name }}</a>
                    <button v-if="!preview" type="button" class="upload-remove" @click="removeUploadedFile(q, idx, fileIndex)">移除</button>
                  </div>
                </div>
              </div>
            </template>
            <!-- 日期题 -->
            <template v-else-if="q.type === 'date'">
              <input
                v-model="form[q.id ?? (idx+1)]"
                class="native-date-input"
                type="date"
              />
            </template>
            <!-- 滑动条题 -->
            <template v-else-if="q.type === 'slider'">
              <div class="slider-answer">
                <el-slider
                  v-model="form[q.id ?? (idx+1)]"
                  :min="getSliderMin(q)"
                  :max="getSliderMax(q)"
                  :step="getSliderStep(q)"
                  show-input
                />
                <div class="slider-answer-meta">
                  <span>{{ getSliderMin(q) }}</span>
                  <span v-if="form[q.id ?? (idx+1)] != null">当前：{{ form[q.id ?? (idx+1)] }}</span>
                  <span>{{ getSliderMax(q) }}</span>
                </div>
              </div>
            </template>
            <template v-else-if="q.type === 'rating'">
              <div class="rating-answer">
                <el-rate
                  :model-value="Number(form[q.id ?? (idx+1)] || 0)"
                  :max="getRatingMax(q)"
                  @update:modelValue="onRatingChange(q, idx, $event)"
                />
                <div class="rating-answer-meta">评分范围：{{ getRatingMin(q) }} - {{ getRatingMax(q) }} 星</div>
              </div>
            </template>
            <template v-else-if="q.type === 'scale'">
              <div class="scale-answer">
                <div class="scale-labels">
                  <span>{{ getScaleMinLabel(q) }}</span>
                  <span>{{ getScaleMaxLabel(q) }}</span>
                </div>
                <div class="scale-options">
                  <button
                    v-for="value in getScaleValues(q)"
                    :key="`scale-${q.id ?? (idx+1)}-${value}`"
                    type="button"
                    :class="['scale-option', { active: Number(form[q.id ?? (idx+1)]) === value }]"
                    @click="form[q.id ?? (idx+1)] = value"
                  >
                    {{ value }}
                  </button>
                </div>
              </div>
            </template>
            <template v-else-if="q.type === 'matrix'">
              <div class="matrix-answer" :class="{ 'matrix-answer--dropdown': isMatrixDropdownQuestion(q) }">
                <template v-if="isMatrixDropdownQuestion(q)">
                  <div
                    v-for="row in getMatrixRows(q)"
                    :key="`matrix-select-row-${row.value}`"
                    class="matrix-answer-select-row"
                  >
                    <span class="matrix-answer-select-row__label">{{ row.label }}</span>
                    <el-select
                      :model-value="getMatrixAnswerValue(q, idx, row.value)"
                      placeholder="请选择"
                      class="matrix-answer-select-row__control"
                      @change="onMatrixSingleChange(q, idx, row.value, $event)"
                    >
                      <el-option
                        v-for="column in getMatrixColumns(q, idx)"
                        :key="`matrix-select-option-${row.value}-${column.value}`"
                        :label="column.label"
                        :value="String(column.value)"
                      />
                    </el-select>
                  </div>
                </template>
                <div v-else class="matrix-answer-table">
                  <div class="matrix-answer-row matrix-answer-row--head">
                    <span class="matrix-answer-cell matrix-answer-cell--row">维度</span>
                    <span
                      v-for="column in getMatrixColumns(q, idx)"
                      :key="`matrix-head-${column.value}`"
                      class="matrix-answer-cell"
                    >
                      {{ column.label }}
                    </span>
                  </div>
                  <div
                    v-for="row in getMatrixRows(q)"
                    :key="`matrix-row-${row.value}`"
                    class="matrix-answer-row"
                  >
                    <span class="matrix-answer-cell matrix-answer-cell--row">{{ row.label }}</span>
                    <span
                      v-for="column in getMatrixColumns(q, idx)"
                      :key="`matrix-cell-${row.value}-${column.value}`"
                      class="matrix-answer-cell"
                    >
                      <el-checkbox
                        v-if="isMatrixMultipleQuestion(q)"
                        :model-value="isMatrixOptionChecked(q, idx, row.value, column.value)"
                        @change="onMatrixMultipleChange(q, idx, row.value, column.value, $event)"
                      />
                      <el-radio
                        v-else
                        :model-value="getMatrixAnswerValue(q, idx, row.value)"
                        :label="String(column.value)"
                        @change="onMatrixSingleChange(q, idx, row.value, column.value)"
                      />
                    </span>
                  </div>
                </div>
              </div>
            </template>
            <!-- 多行文本 -->
            <template v-else-if="q.type === 'textarea'">
              <el-input v-model="form[q.id ?? (idx+1)]" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" placeholder="请输入" />
            </template>
            <!-- 单行输入/其他 -->
            <template v-else>
              <el-input v-model="form[q.id ?? (idx+1)]" placeholder="请输入" />
            </template>
          </el-form-item>
          <el-divider class="q-divider" />
          </template>
        </template>
      </el-form>

      <div class="actions">
        <el-button type="primary" size="large" class="submit-btn" :loading="submitting" @click="handleSubmit">提交</el-button>
        <el-alert v-if="successMsg" :closable="false" type="success" class="msg" show-icon :title="successMsg" />
        <el-alert v-if="errorMsg" :closable="false" type="error" class="msg" show-icon :title="errorMsg" />
      </div>
      </el-card>
      </div>
    </div>

  </div>
  
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSurvey, submitResponses, uploadSurveyFile, type UploadedSurveyFile } from '@/api/surveys'
import type { Survey } from '@/types/survey'
import { getQuestionRenderType } from '@/utils/questionTypeRegistry'
import { buildUploadQuestionHelpText, clearUploadSubmissionToken, getUploadSubmissionToken, normalizeUploadQuestionConfig, validateSelectedUploadFiles } from '@/utils/uploadQuestion'
type SurveyDTO = Survey
import type { FormInstance, FormRules } from 'element-plus'
import { useFillSurveyQuota } from './useFillSurveyQuota'
import { useFillSurveyVisibility } from './useFillSurveyVisibility'
import { useFillSurveyJumpLogic } from './useFillSurveyJumpLogic'
// 已移除复杂编码逻辑，直接使用9位数字ID

const props = defineProps<{ injectedSurvey?: SurveyDTO | null; preview?: boolean }>()
const preview = props.preview === true
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const survey = ref<SurveyDTO | null>(null)
const form = ref<Record<string, any>>({})
const formRef = ref<FormInstance>()
const rules = ref<FormRules>({})
// 跳题链：仅隐藏“当前题之后到目标题之前”的范围
const submitting = ref(false)
const successMsg = ref('')
const errorMsg = ref('')
const closedMeta = ref<{ title?: string; closedAt?: string; status?: string }>({})

// 二维码相关
const currentUrl = ref('')
const qrCanvasRef = ref<HTMLCanvasElement>()
// 标记哪些题已经应用过“默认选中”（defaultSelected），避免用户取消后再次自动选中
const defaultApplied = ref<Record<string, boolean>>({})
const storageKey = computed(() => String(route.params.id || survey.value?.shareId || survey.value?.id || 'preview'))
const routeShareId = computed(() => String(route.params.id || ''))
const uploadState = ref<Record<string, boolean>>({})
const uploadErrors = ref<Record<string, string>>({})
const submissionToken = computed(() => getUploadSubmissionToken(storageKey.value))

// 已取消填写页题型图标展示（按需求隐藏）

// 为分组随机生成稳定的展示计划（仅对本次会话稳定）
const groupPlanCache = ref<Record<string, any[]>>({})
const { normalizeQuestionOptions, applyQuotaState } = useFillSurveyQuota()
const {
  visibleMap,
  totalVisibleQuestions,
  answeredVisibleQuestions,
  progressPercent,
  computeQuestionVisibility,
  areConditionGroupsVisible,
  syncAnswersWithVisibility
} = useFillSurveyVisibility({
  survey,
  form
})
const {
  applyJumpLogic
} = useFillSurveyJumpLogic({
  survey,
  form,
  router,
  shareId: routeShareId,
  storageKey,
  submissionToken
})

function getRenderType(q: any): string {
  return getQuestionRenderType(q)
}

function getSliderMin(q: any): number {
  const value = Number(q?.validation?.min)
  return Number.isFinite(value) ? value : 0
}

function getSliderMax(q: any): number {
  const value = Number(q?.validation?.max)
  return Number.isFinite(value) ? value : 100
}

function getSliderStep(q: any): number {
  const value = Number(q?.validation?.step)
  return Number.isFinite(value) && value > 0 ? value : 1
}

function getRatingMin(q: any): number {
  const value = Number(q?.validation?.min)
  return Number.isFinite(value) && value > 0 ? value : 1
}

function getRatingMax(q: any): number {
  const value = Number(q?.validation?.max)
  return Number.isFinite(value) && value >= getRatingMin(q) ? value : 5
}

function onRatingChange(q: any, idx: number, value: number) {
  const key = String(q.id ?? (idx + 1))
  form.value[key] = value
}

function getScaleMin(q: any): number {
  const value = Number(q?.validation?.min)
  return Number.isFinite(value) ? value : 0
}

function getScaleMax(q: any): number {
  const value = Number(q?.validation?.max)
  return Number.isFinite(value) && value >= getScaleMin(q) ? value : 10
}

function getScaleStep(q: any): number {
  const value = Number(q?.validation?.step)
  return Number.isFinite(value) && value > 0 ? value : 1
}

function getScaleMinLabel(q: any): string {
  return String(q?.validation?.minLabel || '最低')
}

function getScaleMaxLabel(q: any): string {
  return String(q?.validation?.maxLabel || '最高')
}

function getScaleValues(q: any): number[] {
  const values: number[] = []
  for (let value = getScaleMin(q); value <= getScaleMax(q); value += getScaleStep(q)) {
    values.push(value)
  }
  return values
}

function getMatrixRows(q: any) {
  const rows = Array.isArray(q?.matrix?.rows) ? q.matrix.rows : []
  return rows.map((row: any, index: number) => {
    if (row && typeof row === 'object') {
      return {
        label: String(row.label ?? row.text ?? `维度${index + 1}`),
        value: String(row.value ?? index + 1)
      }
    }
    return {
      label: String(row ?? `维度${index + 1}`),
      value: String(index + 1)
    }
  })
}

function getMatrixColumns(q: any, idx: number) {
  return (filteredOptions(q, idx) || []).filter((item: any) => item.value != null)
}

function getMatrixSelectionType(q: any): 'single' | 'multiple' {
  return q?.matrix?.selectionType === 'multiple' ? 'multiple' : 'single'
}

function isMatrixMultipleQuestion(q: any) {
  return getMatrixSelectionType(q) === 'multiple'
}

function isMatrixDropdownQuestion(q: any) {
  return getRenderType(q) === 'matrix_dropdown'
}

function getMatrixAnswerValue(q: any, idx: number, rowValue: string) {
  const key = String(q.id ?? (idx + 1))
  const answer = form.value[key]
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return ''
  const rowAnswer = answer[rowValue]
  if (Array.isArray(rowAnswer)) return String(rowAnswer[0] ?? '')
  return String(rowAnswer ?? '')
}

function getMatrixAnswerValues(q: any, idx: number, rowValue: string) {
  const key = String(q.id ?? (idx + 1))
  const answer = form.value[key]
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return []
  const rowAnswer = answer[rowValue]
  return Array.isArray(rowAnswer) ? rowAnswer.map((item: any) => String(item)) : []
}

function isMatrixOptionChecked(q: any, idx: number, rowValue: string, columnValue: string) {
  return getMatrixAnswerValues(q, idx, rowValue).includes(String(columnValue))
}

function onMatrixSingleChange(q: any, idx: number, rowValue: string, columnValue: string) {
  const key = String(q.id ?? (idx + 1))
  const current = form.value[key]
  const next = current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {}
  const normalizedValue = String(columnValue ?? '').trim()
  if (normalizedValue) {
    next[String(rowValue)] = normalizedValue
  } else {
    delete next[String(rowValue)]
  }
  form.value[key] = next
}

function onMatrixMultipleChange(q: any, idx: number, rowValue: string, columnValue: string, checked: unknown) {
  const key = String(q.id ?? (idx + 1))
  const current = form.value[key]
  const next = current && typeof current === 'object' && !Array.isArray(current) ? { ...current } : {}
  const rowKey = String(rowValue)
  const normalizedColumnValue = String(columnValue)
  const selected = new Set(getMatrixAnswerValues(q, idx, rowKey))

  if (checked === true) {
    selected.add(normalizedColumnValue)
  } else {
    selected.delete(normalizedColumnValue)
  }

  const selectedValues = Array.from(selected)
  if (selectedValues.length > 0) {
    next[rowKey] = selectedValues
  } else {
    delete next[rowKey]
  }
  form.value[key] = next
}

function isMatrixAnswerComplete(q: any, idx: number) {
  const rows = getMatrixRows(q)
  if (rows.length === 0) return false
  return rows.every((row: { value: string }) => {
    if (isMatrixMultipleQuestion(q)) {
      return getMatrixAnswerValues(q, idx, row.value).length > 0
    }
    return getMatrixAnswerValue(q, idx, row.value) !== ''
  })
}

function getRatioAnswerMap(q: any, idx: number): Record<string, number> {
  const key = String(q.id ?? (idx + 1))
  const answer = form.value[key]
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return {}

  return Object.fromEntries(
    Object.entries(answer)
      .map(([optionKey, rawValue]) => {
        const numeric = Number(rawValue)
        return [String(optionKey), Number.isFinite(numeric) ? numeric : null]
      })
      .filter(([, numeric]) => numeric != null)
  ) as Record<string, number>
}

function getRatioAnswerValue(q: any, idx: number, optionValue: string) {
  const map = getRatioAnswerMap(q, idx)
  const value = map[String(optionValue)]
  return Number.isFinite(value) ? value : null
}

function onRatioChange(q: any, idx: number, optionValue: string, nextValue: unknown) {
  const key = String(q.id ?? (idx + 1))
  const current = { ...getRatioAnswerMap(q, idx) }
  const numeric = Number(nextValue)
  const optionKey = String(optionValue)

  if (!Number.isFinite(numeric)) {
    delete current[optionKey]
  } else {
    current[optionKey] = Math.min(100, Math.max(0, Math.round(numeric)))
  }

  form.value[key] = current
}

function getRatioTotal(q: any, idx: number) {
  return Number(
    Object.values(getRatioAnswerMap(q, idx))
      .reduce((sum, value) => sum + Number(value || 0), 0)
      .toFixed(2)
  )
}

function getRatioRemaining(q: any, idx: number) {
  return Number((100 - getRatioTotal(q, idx)).toFixed(2))
}

function hasRatioAnswer(q: any, idx: number) {
  return Object.keys(getRatioAnswerMap(q, idx)).length > 0
}

function isRatioTotalValid(q: any, idx: number) {
  return Math.abs(getRatioTotal(q, idx) - 100) <= 0.01
}

function isRatioAnswerValid(q: any, idx: number, required = false) {
  if (!hasRatioAnswer(q, idx)) return !required
  return isRatioTotalValid(q, idx)
}

function formatRatioValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function getEmptyAnswerValue(q: any) {
  if (q?.type === 'checkbox' || q?.type === 'ranking' || q?.type === 'upload') return []
  if (q?.type === 'matrix' || q?.type === 'ratio') return {}
  if (q?.type === 'slider') return null
  return ''
}

function getUploadAnswerList(q: any, idx: number): UploadedSurveyFile[] {
  const key = String(q.id ?? (idx + 1))
  return Array.isArray(form.value[key]) ? form.value[key] : []
}

function getUploadConfig(q: any) {
  return normalizeUploadQuestionConfig(q)
}

function getUploadHelpText(q: any) {
  return buildUploadQuestionHelpText(q)
}

function isUploadLimitReached(q: any, idx: number) {
  return getUploadAnswerList(q, idx).length >= getUploadConfig(q).maxFiles
}

function getUploadButtonText(q: any, idx: number) {
  if (preview) return '预览模式不可上传'
  if (isUploadLimitReached(q, idx)) return '已达到上传上限'
  return '选择文件'
}

function removeUploadedFile(q: any, idx: number, fileIndex: number) {
  const key = String(q.id ?? (idx + 1))
  const next = [...getUploadAnswerList(q, idx)]
  next.splice(fileIndex, 1)
  form.value[key] = next
}

async function onUploadFilesSelected(q: any, idx: number, event: Event) {
  const input = event.target as HTMLInputElement | null
  const files = Array.from(input?.files || [])
  if (input) input.value = ''
  if (!files.length) return

  const key = String(q.id ?? (idx + 1))
  if (preview) {
    uploadErrors.value[key] = '预览模式不上传文件'
    return
  }

  const selectionError = validateSelectedUploadFiles(q, getUploadAnswerList(q, idx).length, files)
  if (selectionError) {
    uploadErrors.value[key] = selectionError
    return
  }

  uploadErrors.value[key] = ''
  uploadState.value[key] = true

  try {
    const surveyId = String(route.params.id || survey.value?.shareId || survey.value?.id || '')
    if (!surveyId) throw new Error('缺少问卷标识，无法上传文件')
    const uploaded = [...getUploadAnswerList(q, idx)]
    for (const file of files) {
      const saved = await uploadSurveyFile(surveyId, file, {
        questionId: idx + 1,
        submissionToken: submissionToken.value
      })
      uploaded.push(saved)
    }
    form.value[key] = uploaded
  } catch (e: any) {
    uploadErrors.value[key] = e?.response?.data?.error?.message || e?.message || '文件上传失败'
  } finally {
    uploadState.value[key] = false
  }
}

function syncRankingAnswer(q: any, idx: number) {
  if (q?.type !== 'ranking') return
  const key = String(q.id ?? (idx + 1))
  const visible = (filteredOptions(q, idx) || []).filter((opt: any) => opt?.value != null)
  const visibleValues = visible.map((opt: any) => String(opt.value))
  const current = Array.isArray(form.value[key]) ? form.value[key].map(String) : []
  const next = current.filter((value: string) => visibleValues.includes(value))
  visibleValues.forEach((value: string) => {
    if (!next.includes(value)) next.push(value)
  })
  form.value[key] = next
}

function getRankingItems(q: any, idx: number) {
  const key = String(q.id ?? (idx + 1))
  const visible = (filteredOptions(q, idx) || []).filter((opt: any) => opt?.value != null)
  const order = Array.isArray(form.value[key]) ? form.value[key].map(String) : []
  const byValue = new Map(visible.map((opt: any) => [String(opt.value), opt]))
  const ordered = order.map((value: string) => byValue.get(value)).filter(Boolean)
  visible.forEach((opt: any) => {
    if (!order.includes(String(opt.value))) ordered.push(opt)
  })
  return ordered
}

function moveRankingItem(q: any, idx: number, itemIndex: number, direction: -1 | 1) {
  const key = String(q.id ?? (idx + 1))
  syncRankingAnswer(q, idx)
  const current = Array.isArray(form.value[key]) ? [...form.value[key].map(String)] : []
  const targetIndex = itemIndex + direction
  if (itemIndex < 0 || targetIndex < 0 || targetIndex >= current.length) return
  const [moved] = current.splice(itemIndex, 1)
  current.splice(targetIndex, 0, moved)
  form.value[key] = current
}

function randShuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 基于当前答案，返回某题可见的选项列表（含分组随机与标题插入）
function filteredOptions(q:any, idx:number){
  const answers: Record<number, any> = {}
  ;(survey.value?.questions||[]).forEach((qq:any, i:number) => {
    const key = String(qq.id ?? (i+1))
    answers[i+1] = form.value[key]
  })
  const groupsOk = (groups?: any) => {
    if (!groups || !Array.isArray(groups) || groups.length===0) return true
    const toArr = (v:any)=> Array.isArray(v)?v:(v==null?[]:[v])
    const evalCond = (cond:any) => {
      const val = answers[Number(cond.qid)]
      switch(cond.op){
        case 'eq': return val === cond.value
        case 'neq': return val !== cond.value
        case 'in': return toArr(cond.value).includes(val)
        case 'nin': return !toArr(cond.value).includes(val)
        case 'includes': return toArr(val).includes(cond.value)
        case 'notIncludes': return !toArr(val).includes(cond.value)
        case 'overlap': { const a=toArr(val); const b=toArr(cond.value); return a.some(x=>b.includes(x)) }
        case 'gt': return Number(val) > Number(cond.value)
        case 'gte': return Number(val) >= Number(cond.value)
        case 'lt': return Number(val) < Number(cond.value)
        case 'lte': return Number(val) <= Number(cond.value)
        case 'regex': try { return new RegExp(String(cond.value)).test(String(val??'')) } catch { return true }
        default: return true
      }
    }
    return groups.some((g:any[]) => Array.isArray(g) && g.length>0 && g.every(evalCond))
  }
  const list = Array.isArray(q.options)? q.options : []
  const normalized = list.map((raw:any, i:number) => {
    if (raw && typeof raw === 'object') {
      // 兼容后端返回的对象结构
      return {
        value: String(raw.value ?? (i+1)),
        label: String(raw.label ?? raw.text ?? ''),
        rich: !!raw.rich,
        desc: raw.desc ? String(raw.desc) : '',
        hidden: !!raw.hidden,
        visibleWhen: raw.visibleWhen,
        exclusive: !!raw.exclusive,
        defaultSelected: !!raw.defaultSelected,
  quotaLimit: Number(raw.quotaLimit || 0),
  quotaUsed: Number(raw.quotaUsed || 0),
  quotaEnabled: (raw as any)?.quotaEnabled !== false,
  fillEnabled: !!raw.fillEnabled,
  fillRequired: !!raw.fillRequired,
  fillPlaceholder: String(raw.fillPlaceholder || ''),
      }
    }
    // 字符串/其他：按纯文本处理
    return {
      value: String(i+1),
      label: String(raw ?? ''),
      rich: false,
      desc: '',
      hidden: false,
      visibleWhen: undefined,
      exclusive: false,
      defaultSelected: false,
  quotaLimit: 0,
  quotaUsed: 0,
  quotaEnabled: true,
  fillEnabled: false,
  fillRequired: false,
  fillPlaceholder: '',
    }
  })
  const visibleOpts = normalized.filter((opt:any) => !opt.hidden && groupsOk(opt.visibleWhen))
  // 结合配额：若启用了配额且后端返回 quotaUsed 且设置了 quotaLimit>0，则判定是否已满
  const qEnabled = !!q.quotasEnabled
  const withQuota = visibleOpts.map((o:any)=>{
    const limit = Number(o.quotaLimit || 0)
    const used = Number(o.quotaUsed || 0)
    const rowEnabled = (o.quotaEnabled !== false)
    const full = qEnabled && rowEnabled && limit>0 && used >= limit
    const remaining = qEnabled && limit>0 ? Math.max(0, limit - used) : null
    return { ...o, __quotaFull: full, __remaining: remaining }
  })

  // 分组展示：若存在 optionGroups，则始终按分组插入标题；若配置了随机，则按组/组内随机。
  const groups:any[] = Array.isArray(q?.optionGroups) ? q.optionGroups : []
  const hasGroups = groups.length > 0
  if (!hasGroups) return withQuota

  const qKey = String(q.id ?? (idx+1))
  let plan = groupPlanCache.value[qKey]
  if (!plan) {
    // 规范化分组并按 from 升序
    const validGroups = groups
      .map((g:any)=>({
        name: String(g?.name || ''),
        from: Math.max(1, Number(g?.from || 0)),
        to: Number(g?.to || 0),
        random: !!g?.random
      }))
      .filter(g => Number.isFinite(g.to) && g.to >= g.from)
      .sort((a,b)=> a.from - b.from)

    // 构建基础计划：用占位替换分组范围，未分组选项保持原位
    const base:any[] = []
    const groupSegments:any[] = []
    let i = 0
    let groupCounter = 0
    // 为 plan 构建提供一个取带配额标记的函数
    const quotaByVal = new Map(withQuota.map((o:any)=> [String(o.value), !!o.__quotaFull]))
    const addQuota = (it:any) => ({ ...it, __quotaFull: !!quotaByVal.get(String(it?.value)) })
    while (i < normalized.length) {
      const g = validGroups.find(x => x.from - 1 === i)
      if (g) {
        groupCounter += 1
        // 生成该组的段
    const endIdx = Math.min(g.to, normalized.length)
  let items = normalized.slice(i, endIdx).map(addQuota)
  if (g.random) items = randShuffle(items)
        const rawName = String(g.name || '')
        const nameTrim = rawName.trim()
        const hiddenMark = nameTrim.startsWith('#') || nameTrim.startsWith('＃')
        const stripped = nameTrim
          // 去掉可能的HTML标签
          .replace(/<[^>]*>/g, '')
          // 去掉不可见空白字符（全角空格、窄空格等）仅用于判空
          .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, '')
        const displayCandidate = hiddenMark ? '' : nameTrim
        const title = hiddenMark ? '' : (stripped.length > 0 ? displayCandidate : `分组${groupCounter}`)
        const segment:any[] = []
        if (title) segment.push({ __groupHeader: title, value: null })
  segment.push(...items)
        groupSegments.push(segment)
        // 在基础计划中放一个占位符，稍后整体替换（用于支持分组顺序随机）
        base.push({ __groupSeg: true })
        i = endIdx
      } else {
        base.push(addQuota(normalized[i]))
        i++
      }
    }

    // 分组顺序随机：仅打乱 groupSegments 的相对顺序；未分组项的相对位置不变
    const orderedSegments = q.groupOrderRandom ? randShuffle(groupSegments) : groupSegments
    // 合成最终计划：将占位依次替换为已排序的分组段
    const merged:any[] = []
    let p = 0
    for (const it of base){
      if (it && it.__groupSeg) {
        const seg = orderedSegments[p++] || []
        merged.push(...seg)
      } else {
        merged.push(it)
      }
    }
    plan = merged
    groupPlanCache.value[qKey] = plan
  }
  // 在可见过滤基础上，保持 plan 的顺序；隐藏的选项跳过；标题若后续无任何可见选项则自动被过滤
  // 可见选项（即便已满也保留显示但不可选）
  const allow = new Set(withQuota.map((o:any) => String(o.value)))
  const out:any[] = []
  let pendingHeader: any = null
  for (const it of plan){
    if (it && it.__groupHeader){
      pendingHeader = it
      continue
    }
    if (!it || it.value==null) continue
    if (allow.has(String(it.value))){
      if (pendingHeader){ out.push(pendingHeader); pendingHeader = null }
      out.push(it)
    }
  }
  return out
}

// 分组标题：当 oi 为某组起始（from-1）时显示该组名；以 # 开头的名称对作答者隐藏（去掉 #）
// 旧的按索引插标题逻辑已由 plan 插入占位实现，这里保留空实现避免误用
function groupHeaderForFill(_q:any, _idx:number): '' { return '' }

// 多选互斥：若选择了标记 exclusive 的选项，清空其它选项，仅保留该项
function onCheckboxChange(q:any, idx:number){
  const key = String(q.id ?? (idx+1))
  const arr = Array.isArray(form.value[key]) ? form.value[key] : []
  const opts = filteredOptions(q, idx)
  const excl = new Set((opts||[]).filter((o:any)=> o.exclusive).map((o:any)=> String(o.value)))
  const pickedExcl = arr.find((v:any)=> excl.has(String(v)))
  if (pickedExcl){
    form.value[key] = [pickedExcl]
  }
}

// 在题目可见、答案为空时应用“默认选中”
function applyDefaultIfNeeded(q:any, idx:number){
  const key = String(q.id ?? (idx+1))
  if (defaultApplied.value[key]) return
  const opts:any[] = filteredOptions(q, idx) || []
  const defaults = opts.filter(o=> o.defaultSelected)
  if (!defaults.length) return
  if (q.type === 'radio'){
    if (!form.value[key]){
      form.value[key] = String(defaults[0].value)
      defaultApplied.value[key] = true
    }
  } else if (q.type === 'checkbox'){
    const cur = Array.isArray(form.value[key]) ? form.value[key] : []
    if (cur.length === 0){
      let next = defaults.map(o=> String(o.value))
      // 互斥规则：若默认中包含互斥项，则仅保留一个互斥项
      const excl = defaults.find(o=> o.exclusive)
      if (excl) next = [String(excl.value)]
      form.value[key] = next
      defaultApplied.value[key] = true
    }
  }
}

async function refreshVisibilityState() {
  if (!survey.value) return false

  const baseVisibility = computeQuestionVisibility()
  const { visibility, invalidSubmitted } = await applyJumpLogic(baseVisibility)
  if (invalidSubmitted) return true

  syncAnswersWithVisibility({
    vis: visibility,
    filteredOptions,
    getEmptyAnswerValue,
    applyDefaultIfNeeded,
    syncRankingAnswer,
    isMatrixMultipleQuestion
  })

  return false
}

onMounted(async () => {
  try {
    if (props.injectedSurvey) {
      survey.value = JSON.parse(JSON.stringify(props.injectedSurvey))
      currentUrl.value = location.href
    } else {
      const shareId = String(route.params.id || '')
      currentUrl.value = window.location.href
      survey.value = await getSurvey(shareId)
      if (survey.value && survey.value.status && survey.value.status !== 'published') {
        errorMsg.value = survey.value.status === 'closed' ? '问卷已停止收集' : '问卷未发布'
        closedMeta.value = { title: survey.value.title, status: survey.value.status }
        survey.value = null
        return
      }
      if (!preview) generateQrCode()
    }
    if (!survey.value) return
    if (survey.value.settings?.randomizeQuestions || (survey.value.settings as any)?.randomOrder) {
      survey.value.questions = randShuffle(survey.value.questions || [])
    }
    const nextRules: FormRules = {}
    survey.value.questions.forEach((q: any, index: number) => {
      const key = String(q.id ?? (index + 1))
      form.value[key] = getEmptyAnswerValue(q)
      const makeFillRule = (msg:string) => [{ required: true, message: msg, trigger: ['blur','change'] }]
      const opts:any[] = Array.isArray(q.options) ? q.options : []
      opts.forEach((raw:any, i:number) => {
        const opt:any = (raw && typeof raw==='object') ? raw : { value: String(i+1), fillEnabled:false, fillRequired:false }
        if (opt.fillEnabled && opt.fillRequired){
          const fillKey = 'fill_'+(q.id ?? (index+1))+'_'+String(opt.value ?? (i+1))
          nextRules[fillKey] = makeFillRule('请填写补充内容')
          form.value[fillKey] = ''
        }
      })
      if (q.type === 'ratio') {
        nextRules[key] = [{
          validator: (_rule: any, value: any, callback: (error?: Error) => void) => {
            const hasValue = value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
            if (!hasValue && !q.required) {
              callback()
              return
            }
            if (isRatioAnswerValid(q, index, !!q.required)) {
              callback()
              return
            }
            callback(new Error('请将比重分配合计调整到 100%'))
          },
          trigger: 'change'
        }]
      } else if (q.required) {
        if (q.type === 'checkbox' || q.type === 'ranking' || q.type === 'upload') {
          nextRules[key] = [{ type: 'array', required: true, message: '此题为必选', trigger: 'change' }]
        } else if (q.type === 'matrix') {
          nextRules[key] = [{
            validator: (_rule: any, value: any, callback: (error?: Error) => void) => {
              if (value && typeof value === 'object' && !Array.isArray(value) && isMatrixAnswerComplete(q, index)) {
                callback()
                return
              }
              callback(new Error('请完成矩阵题每一行的选择'))
            },
            trigger: 'change'
          }]
        } else {
          nextRules[key] = [{ required: true, message: '此题为必填', trigger: ['blur','change'] }]
        }
      }
    })
    rules.value = nextRules
    await refreshVisibilityState()
  } catch (e:any) {
    if (!props.injectedSurvey){
      const status = e?.response?.status; const msg = e?.response?.data?.error?.message || e?.response?.data?.message; const meta = e?.response?.data?.data
      if (status === 404) errorMsg.value = msg || '问卷不存在或已删除'
      else if (status === 403){ errorMsg.value = msg || '问卷未发布或已关闭'; if (meta) closedMeta.value = { title: meta.title, closedAt: meta.closedAt, status: meta.status } }
      else errorMsg.value = '加载失败，请稍后重试'
    }
    survey.value = null
  } finally { loading.value = false }
})

// 答案变化时，实时计算可见性并清空隐藏题答案
let _visRAF = 0
watch(form, () => {
  if (_visRAF) cancelAnimationFrame(_visRAF)
  // Keep the async boundary so invalid-survey auto-submit can still await navigation.
  _visRAF = requestAnimationFrame(async () => {
    if (!survey.value) return
    await refreshVisibilityState()
    _visRAF = 0
  })
}, { deep: true })

const handleSubmit = async () => {
  if (!survey.value) return
  successMsg.value = ''
  errorMsg.value = ''
  // 先进行前端校验
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) {
    errorMsg.value = '请先完成必填内容'
    return
  }
  if (preview) {
    successMsg.value = '（预览）模拟提交，不保存数据'
    return
  }
  submitting.value = true
  try {
    const shareId = String(route.params.id || '')
    // 以服务端返回的题目顺序为准，构造提交 payload；
    // 若返回的 q.id 缺失或重复，则使用序号 (idx+1) 作为后备，避免题目间相互影响
    const payload = (survey.value.questions || []).map((q: any, index: number) => {
      const key = String(q.id ?? (index + 1))
      return { questionId: Number(q.id ?? (index + 1)), value: form.value[key] }
    })
    const res = await submitResponses(shareId, payload, { clientSubmissionToken: submissionToken.value })
    if (res?.success) {
      clearUploadSubmissionToken(String(route.params.id || survey.value?.shareId || survey.value?.id || 'preview'))
      // 跳转到成功页面
      router.push({
        name: 'SurveySuccess',
        params: { id: shareId },
        query: {
          message: res.message || '提交成功，感谢参与！',
          title: survey.value.title
        }
      })
    } else {
      throw new Error(res?.message || '提交失败')
    }
  } catch (e: any) {
    // 优先展示后端返回的 message
    errorMsg.value = e?.response?.data?.message || e?.message || '提交失败'
  } finally {
    submitting.value = false
  }
}

// 生成二维码到右上角
const generateQrCode = async () => {
  console.log('开始生成二维码')
  currentUrl.value = window.location.href
  console.log('当前URL:', currentUrl.value)
  
  // 等待DOM更新
  await nextTick()
  
  // 再次等待，确保canvas完全渲染
  setTimeout(async () => {
    console.log('Canvas元素:', qrCanvasRef.value)
    if (qrCanvasRef.value) {
      try {
        // 动态导入qrcode库
        console.log('正在导入qrcode库...')
        const QRCode = await import('qrcode')
        console.log('qrcode库导入成功')
        
        // 设置canvas尺寸
        qrCanvasRef.value.width = 100
        qrCanvasRef.value.height = 100
        
        // 清空canvas
        const ctx = qrCanvasRef.value.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, 100, 100)
        console.log('Canvas已清空，开始生成二维码...')
        
        // 生成二维码
        await QRCode.default.toCanvas(qrCanvasRef.value, currentUrl.value, {
          width: 100,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        console.log('二维码生成成功！')
      } catch (err) {
        console.error('生成二维码失败:', err)
        // 显示错误信息
        const ctx = qrCanvasRef.value.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = '#ff0000'
        ctx.font = '12px Arial'
        ctx.fillText('生成失败', 20, 50)
      }
    } else {
      console.error('Canvas元素未找到')
    }
  }, 100)
}

// 复制链接
const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(currentUrl.value)
    // 这里使用简单的alert，避免依赖ElMessage
    alert('链接已复制到剪贴板')
  } catch (err) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = currentUrl.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    alert('链接已复制到剪贴板')
  }
}

// 其他操作
const formatDate = (iso?: string) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const pad = (n:number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

// 最小白名单 HTML 过滤 + 链接安全处理
function safeHtml(raw:string){
  if(!raw) return ''
  
  console.log('safeHtml input:', raw)
  
  const wrapper = document.createElement('div')
  wrapper.innerHTML = raw
  const allowed = new Set(['A','IMG','VIDEO','AUDIO','IFRAME','B','STRONG','I','EM','U','SPAN','P','BR','DIV','UL','OL','LI','H1','H2','H3'])
  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_ELEMENT, null)
  const remove:Element[] = []
  
  while(walker.nextNode()){
    const el = walker.currentNode as HTMLElement
    if(!allowed.has(el.tagName)){
      console.log('Removing disallowed tag:', el.tagName)
      // unwrap
      const parent = el.parentNode
      if(parent){
        while(el.firstChild) parent.insertBefore(el.firstChild, el)
        remove.push(el)
      }
      continue
    }
    if(el.tagName==='A'){
      const href = el.getAttribute('href') || ''
      if(!/^https?:\/\//i.test(href)) el.removeAttribute('href')
      el.setAttribute('target','_blank')
      el.setAttribute('rel','noopener noreferrer')
    }
    if(el.tagName==='IFRAME'){
      let src = el.getAttribute('src') || ''
      // 处理协议相对 // 开头
      if(/^\/\//.test(src)) src = 'https:' + src
      // B站普通播放器 iframe 如果只有 aid/bvid/cid 参数则保持；如果是普通页面已在上游转换
      if(/player\.bilibili\.com/i.test(src)){
        // 确保带有 muted=0 autoplay=0 （不强制自动播放 + 允许有声音）
        const u = new URL(src)
        if(!u.searchParams.has('autoplay')) u.searchParams.set('autoplay','0')
        if(!u.searchParams.has('muted')) u.searchParams.set('muted','0')
        src = u.toString()
      }
      el.setAttribute('src', src)
      el.setAttribute('frameborder','0')
      el.setAttribute('allowfullscreen','true')
      // 允许常见媒体特性
      el.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
      // sandbox：允许脚本、同源、展示、弹窗（部分平台需要 forms）
      el.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups allow-forms allow-popups-to-escape-sandbox')
      if(!el.getAttribute('width')) el.setAttribute('width','100%')
      if(!el.getAttribute('height')) el.setAttribute('height','240')
      el.classList.add('embed-video-frame')
    }
  }
  
  remove.forEach(n=>n.remove())
  
  const result = wrapper.innerHTML
  console.log('safeHtml output:', result)
  return result
}

// 填写端不显示依赖摘要（根据需求）
</script>

<style scoped>
 .page { 
  max-width: 800px; 
  margin: 60px auto 32px; 
  padding: 0 16px; 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", "Source Han Sans CN", sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}
.page.embed { /* 预览嵌入：保持与正式答题相同宽度 800px */
  max-width:800px; margin:0 auto; padding:0 0 24px;
}
.page.embed .survey-wrapper { margin-top:0; }
.page.embed .qr-section-outside { display:none; }
.skeleton { background: transparent; }

/* 问卷包装器 - 包含二维码和答题区域 */
.survey-wrapper {
  position: relative;
  width: 100%;
}

/* 问卷容器 - 只包含答题区域 */
.survey-container {
  position: relative;
  width: 100%;
}

/* 右上角二维码区域 - 与问卷区域间隔20px */
.qr-section-outside {
  position: absolute;
  top: 0;
  right: -140px;
  text-align: center;
  z-index: 99999 !important;
  width: 120px;
  background: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  pointer-events: auto;
}

.paper { border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px 20px 40px; box-shadow: 0 8px 30px rgba(31,41,55,.06); position: relative; }
.paper-header { 
  padding: 6px 8px 4px; 
  position: relative;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
  z-index: 100000 !important;
  position: relative;
  pointer-events: auto;
}

.qr-canvas-mini {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100000 !important;
  position: relative;
  pointer-events: auto;
  width: 100px !important;
  height: 100px !important;
  display: block;
}

.qr-tip-mini {
  font-size: 12px;
  color: #666;
  margin: 0;
  line-height: 1.2;
}
.paper-title { margin: 20px 8px 30px; font-size: 24px; font-weight: 700; text-align:center; color: var(--el-color-primary, #409eff); }
.desc { color: #6b7280; margin: 2px 8px 8px; }
.progress-panel { margin: 12px 8px 0; padding: 12px 14px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; }
.progress-copy { margin-bottom: 8px; color: #475569; font-size: 13px; font-weight: 600; }
.q-form { padding: 0 20px; }
.q-item { margin-bottom: 30px; }
.q-item :deep(.el-form-item__label) { font-weight: 600; color:#333333; font-size: 15px; margin-bottom: 15px; }
.q-label{ display:inline-flex; align-items:flex-start; gap:8px; line-height:1.5; }
.q-number{ font-weight:600; color:#1f2937; min-width:22px; text-align:right; }
.q-title{ font-weight:600; color:#1f2937; }
.group-header{
  display:block;
  background:#f3f4f6;
  color:#111827 !important;
  padding:8px 12px;
  border-radius:6px;
  margin:8px 0;
  font-weight:600;
  line-height:1.3;
  font-size:14px;
  white-space:pre-wrap;
  width:100%;
  box-sizing:border-box;
}
.q-desc { color:#6b7280; font-size: 13px; margin: -2px 0 8px; }
.opt-vertical { display:flex; flex-direction:column; gap:4px; align-items:stretch; width:100%; }
/* 对齐单选/多选的图标与文字，消除选中态带来的左右位移 */
.opt-vertical :deep(.el-radio),
.opt-vertical :deep(.el-checkbox) {
  display: flex;
  align-items: center;
  margin: -1.5px;
  font-size: 14px;
  line-height: 1.2;
}
.opt-vertical :deep(.el-radio__input),
.opt-vertical :deep(.el-checkbox__input) {
  margin-right: 10px;
}

/* 增大单选框尺寸 */
.opt-vertical :deep(.el-radio__input .el-radio__inner) {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

.opt-vertical :deep(.el-radio__input.is-checked .el-radio__inner::after) {
  width: 8px;
  height: 8px;
}

/* 增大复选框尺寸 */
.opt-vertical :deep(.el-checkbox__input .el-checkbox__inner) {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

.opt-vertical :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
  width: 6px;
  height: 10px;
  border-width: 0 2px 2px 0;
  left: 3px;
  top: -0.8px;
}
.opt-vertical :deep(.el-radio__label),
.opt-vertical :deep(.el-checkbox__label) {
  padding-left: 0 !important;
}
.q-divider { margin: 8px 0 6px; }
.actions { display:flex; flex-direction: column; align-items:center; gap:12px; margin: 16px 8px 10px; }
.submit-btn { min-width: 120px; }
.msg { padding: 0; width: 100%; max-width: 560px; }

/* 关闭空态样式 */
.closed-block { margin-top: 40px; }
.closed-survey-title { text-align: center; font-size: 20px; font-weight: 700; color: #334155; margin-bottom: 6px; }
.closed-empty :deep(.el-empty__description) { margin-top: 6px; }
.closed-wrap { text-align: center; }
.closed-title { font-size: 16px; color: #64748b; }
.closed-meta { font-size: 13px; color: #94a3b8; margin-top: 4px; }
.closed-actions { margin-top: 10px; display: flex; gap: 8px; justify-content: center; }

/* 让填空块像一个选项一样占据一行并对齐缩进 */
.opt-fill-as-item {
  display: flex;
  align-items: center;
  margin: -1.2px; /* 与 opt-vertical 行距一致 */
  padding-left: 35px; /* 与 label 匹配的缩进（图标宽度 + 间距）*/
}

/* 让填空框显示在每个选项内的第二行 */
.opt-item :deep(.el-radio__label),
.opt-item :deep(.el-checkbox__label) {
  display: inline-block;
}
.opt-content { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 6px; }

/* iframe 视频支持 - 与预览页面和编辑页面保持一致 */
.desc :deep(iframe),
.q-desc :deep(iframe),
.desc :deep(.qfe-iframe),
.q-desc :deep(.qfe-iframe),
.desc :deep(.embed-video-frame),
.q-desc :deep(.embed-video-frame) {
  display: block !important;
  margin: 10px auto !important;
  max-width: 100% !important;
  width: 100% !important;
  height: 450px !important;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: none;
  background: #f5f5f5;
  clear: both;
  float: none !important;
}

/* 响应式iframe */
@media (max-width: 768px) {
  .desc :deep(iframe),
  .q-desc :deep(iframe),
  .desc :deep(.qfe-iframe),
  .q-desc :deep(.qfe-iframe),
  .desc :deep(.embed-video-frame),
  .q-desc :deep(.embed-video-frame) {
    height: 300px !important;
  }
}

.opt-fill-line { margin-left: 0; }

/* 剩余配额显示样式（可通过 CSS 变量 --quota-remaining-color 自定义） */
.quota-remaining {
  color: var(--quota-remaining-color, #64748b); /* 默认柔和蓝灰色 */
  font-size: 12px;
  margin-left: 6px;
}

.stage-explain-block {
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  color: #334155;
}

.stage-explain-text {
  line-height: 1.7;
}

.native-date-input {
  width: min(320px, 100%);
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  color: #111827;
  background: #fff;
}

.slider-answer {
  width: min(420px, 100%);
  padding: 8px 4px 4px;
}

.slider-answer-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.rating-answer,
.scale-answer,
.matrix-answer {
  width: min(640px, 100%);
}

.rating-answer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rating-answer-meta {
  color: #64748b;
  font-size: 12px;
}

.scale-answer {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.scale-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scale-option {
  min-width: 40px;
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  background: #fff;
  color: #334155;
  cursor: pointer;
}

.scale-option.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
  font-weight: 600;
}

.matrix-answer {
  overflow-x: auto;
}

.matrix-answer--dropdown {
  overflow-x: visible;
}

.matrix-answer-table {
  min-width: 420px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
}

.matrix-answer-row {
  display: grid;
  grid-template-columns: minmax(120px, 1.2fr) repeat(auto-fit, minmax(72px, 1fr));
  align-items: center;
}

.matrix-answer-row--head {
  background: #f8fafc;
  font-weight: 600;
}

.matrix-answer-cell {
  padding: 12px 10px;
  border-bottom: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
  text-align: center;
}

.matrix-answer-cell--row {
  text-align: left;
  color: #1f2937;
}

.matrix-answer-row:last-child .matrix-answer-cell {
  border-bottom: none;
}

.matrix-answer-cell:last-child {
  border-right: none;
}

.ratio-answer {
  width: min(680px, 100%);
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.ratio-answer__summary {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, #f8fbff 0%, #eef6ff 100%);
  border: 1px solid #dbeafe;
  color: #1e3a8a;
  font-weight: 600;
}

.ratio-answer__summary.invalid {
  background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%);
  border-color: #fdba74;
  color: #9a3412;
}

.ratio-answer__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ratio-answer__item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #fff;
}

.ratio-answer__meta {
  min-width: 0;
}

.ratio-answer__label {
  color: #1f2937;
  font-weight: 600;
  line-height: 1.5;
}

.ratio-answer__desc {
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.ratio-answer__control {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ratio-answer__suffix {
  color: #64748b;
  font-weight: 600;
}

.matrix-answer-select-row {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(220px, 1.6fr);
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.matrix-answer-select-row + .matrix-answer-select-row {
  margin-top: 12px;
}

.matrix-answer-select-row__label {
  color: #1f2937;
  font-weight: 500;
}

.matrix-answer-select-row__control {
  width: 100%;
}

.ranking-answer {
  width: min(520px, 100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ranking-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fff;
}

.ranking-item-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.ranking-order {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.ranking-label {
  color: #111827;
  line-height: 1.5;
}

.ranking-actions {
  display: inline-flex;
  gap: 8px;
}

.ranking-btn {
  border: 1px solid #d1d5db;
  background: #f8fafc;
  color: #374151;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}

.ranking-btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.upload-answer {
  width: min(520px, 100%);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.upload-picker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  min-width: 132px;
  padding: 10px 16px;
  border: 1px dashed #94a3b8;
  border-radius: 10px;
  background: #f8fafc;
  color: #334155;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.upload-picker.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.upload-picker input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.upload-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.upload-tip {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.upload-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
}

.upload-link {
  color: #2563eb;
  text-decoration: none;
  word-break: break-all;
}

.upload-remove {
  border: 0;
  background: transparent;
  color: #dc2626;
  cursor: pointer;
  flex: 0 0 auto;
}

.upload-error {
  color: #dc2626;
  font-size: 12px;
}


</style>
