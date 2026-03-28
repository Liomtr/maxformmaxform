import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { SurveyEditorForm, SurveyEditorQuestion } from './editor-core'

interface EditorQuotaOptions {
  surveyForm: SurveyEditorForm
}

export function useEditorQuota(options: EditorQuotaOptions) {
  const { surveyForm } = options

  const showQuotaDialog = ref(false)
  const quotaTargetIndex = ref<number | null>(null)
  const quotaEnabled = ref(false)
  const quotaActiveTab = ref<'count' | 'tips'>('count')
  const quotaRows = ref<Array<{ label: any; quotaLimit: number; quotaEnabled: boolean }>>([])
  const quotaMode = ref<'explicit' | 'implicit'>('explicit')
  const quotaFullText = ref('名额已满')
  const quotaShowRemaining = ref(false)

  const quotaTotal = computed(() =>
    quotaRows.value.reduce((sum, row) => sum + (row.quotaEnabled && Number(row.quotaLimit) > 0 ? Number(row.quotaLimit) : 0), 0)
  )
  const quotaAnyPositive = computed(() => quotaRows.value.some(row => row.quotaEnabled && Number(row.quotaLimit || 0) > 0))

  function syncQuotaEnabledFromNumbers() {
    quotaEnabled.value = quotaAnyPositive.value
  }

  function openQuotaDialog(index: number) {
    quotaTargetIndex.value = index
    const question: any = surveyForm.questions[index]
    const options = Array.isArray(question.options) ? question.options : []
    const extras = Array.isArray(question.optionExtras) ? question.optionExtras : []
    quotaRows.value = options.map((label: any, optionIndex: number) => ({
      label,
      quotaLimit: Number(extras[optionIndex]?.quotaLimit || 0),
      quotaEnabled: extras[optionIndex]?.quotaEnabled !== false
    }))
    const anyPositive = quotaRows.value.some(row => Number(row.quotaLimit || 0) > 0)
    quotaEnabled.value = question.quotasEnabled != null ? !!question.quotasEnabled : anyPositive
    quotaActiveTab.value = 'count'
    quotaMode.value = question.quotaMode || 'explicit'
    quotaFullText.value = question.quotaFullText || '名额已满'
    quotaShowRemaining.value = !!question.quotaShowRemaining
    showQuotaDialog.value = true
  }

  function sanitizeQuota(index: number) {
    const row = quotaRows.value[index]
    if (!row) return
    let value = Number(row.quotaLimit)
    if (!Number.isFinite(value) || value < 0) value = 0
    row.quotaLimit = Math.floor(value)
    syncQuotaEnabledFromNumbers()
  }

  function quotaBatchIncrease(delta: number) {
    quotaRows.value = quotaRows.value.map(row => ({
      ...row,
      quotaLimit: Math.floor(Math.max(0, Number(row.quotaLimit) || 0) + delta)
    }))
    syncQuotaEnabledFromNumbers()
  }

  function quotaClearAll() {
    quotaRows.value = quotaRows.value.map(row => ({ ...row, quotaLimit: 0 }))
    syncQuotaEnabledFromNumbers()
  }

  function showQuotaExample() {
    ElMessage.info('示例：非常满意 50，满意 30，一般 15，不满意 5，非常不满意 0')
  }

  function closeQuotaDialog() {
    showQuotaDialog.value = false
  }

  function saveQuotaDialog() {
    if (quotaTargetIndex.value == null) return
    const question: any = surveyForm.questions[quotaTargetIndex.value]
    question.optionExtras = Array.isArray(question.optionExtras) ? question.optionExtras : []
    question.quotasEnabled = quotaRows.value.some(row => Number(row.quotaLimit || 0) > 0)
    question.quotaMode = quotaMode.value
    question.quotaFullText = quotaFullText.value
    question.quotaShowRemaining = !!quotaShowRemaining.value
    quotaRows.value.forEach((row, index) => {
      question.optionExtras[index] = question.optionExtras[index] || {}
      question.optionExtras[index].quotaLimit = Number(row.quotaLimit || 0)
      question.optionExtras[index].quotaEnabled = !!row.quotaEnabled
    })
    showQuotaDialog.value = false
  }

  function optionRemaining(question: SurveyEditorQuestion, optionIndex: number) {
    try {
      const extras = Array.isArray(question.optionExtras) ? question.optionExtras : []
      const limit = Number(extras?.[optionIndex]?.quotaLimit || 0)
      if (!question?.quotasEnabled || !Number.isFinite(limit) || limit <= 0) return null
      const used = Number((question.options?.[optionIndex] as any)?.quotaUsed || 0)
      return Math.max(0, limit - used)
    } catch {
      return null
    }
  }

  function isQuotaConfigured(question: SurveyEditorQuestion): boolean {
    if (!question || !question.quotasEnabled) return false
    const options: any[] = Array.isArray(question.options) ? question.options : []
    for (let index = 0; index < options.length; index += 1) {
      const extra = Array.isArray(question.optionExtras) ? question.optionExtras[index] : undefined
      const limit = extra && typeof extra.quotaLimit === 'number' ? extra.quotaLimit : typeof options[index]?.quotaLimit === 'number' ? options[index].quotaLimit : 0
      const enabled = extra && typeof extra.quotaEnabled === 'boolean' ? extra.quotaEnabled : typeof options[index]?.quotaEnabled === 'boolean' ? options[index].quotaEnabled : true
      if (enabled && Number(limit) > 0) return true
    }
    return false
  }

  return {
    showQuotaDialog,
    openQuotaDialog,
    closeQuotaDialog,
    quotaEnabled,
    quotaActiveTab,
    showQuotaExample,
    quotaClearAll,
    quotaBatchIncrease,
    quotaRows,
    sanitizeQuota,
    quotaTotal,
    quotaMode,
    quotaFullText,
    quotaShowRemaining,
    saveQuotaDialog,
    optionRemaining,
    isQuotaConfigured
  }
}
