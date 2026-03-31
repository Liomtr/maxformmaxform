import { computed, reactive, ref, type Ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { SurveyEditorForm, SurveyEditorQuestion } from './editor-core'
import type {
  QuestionJumpLogicDTO,
  QuestionJumpTargetDTO,
  QuestionLogicConditionDTO,
  QuestionLogicOperatorDTO,
  VisibleWhenDTO
} from '../../../../shared/survey.contract.js'

type UiCond = { depIdx: number; picked?: string[]; op?: QuestionLogicOperatorDTO; text?: string }

interface EditorLogicOptions {
  surveyForm: SurveyEditorForm
  editingIndex: Ref<number>
  getQuestionTypeLabel: (type: number | string) => string
}

export function useEditorLogic(options: EditorLogicOptions) {
  const { surveyForm, editingIndex, getQuestionTypeLabel } = options

  const showLogicDialog = ref(false)
  const logicTargetIndex = ref<number | null>(null)
  const logicRows = reactive<UiCond[]>([])

  const showJumpDialog = ref(false)
  const jumpTargetIndex = ref<number | null>(null)
  const jumpByOptionEnabled = ref(true)
  const jumpUnconditionalEnabled = ref(false)
  const jumpByOption = ref<Record<string, string>>({})
  const jumpUnconditionalTarget = ref('')

  function toStringMap(entries: Record<string, QuestionJumpTargetDTO> | undefined) {
    if (!entries) return {}
    return Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, String(value)]))
  }

  function normalizeJumpTarget(value: string): QuestionJumpTargetDTO | null {
    const normalized = String(value || '').trim()
    if (!normalized) return null
    if (normalized === 'end' || normalized === 'invalid') return normalized
    return /^\d+$/.test(normalized) ? (normalized as `${number}`) : null
  }

  function selectablePrevQs(targetIdx: number) {
    return (surveyForm.questions || []).slice(0, targetIdx)
  }

  function openJumpDialog(index: number) {
    jumpTargetIndex.value = index
    const question = surveyForm.questions[index]
    jumpByOptionEnabled.value = true
    jumpUnconditionalEnabled.value = false
    jumpByOption.value = {}
    jumpUnconditionalTarget.value = ''
    const jumpLogic = question?.jumpLogic
    if (jumpLogic?.byOption) {
      jumpByOptionEnabled.value = true
      jumpByOption.value = toStringMap(jumpLogic.byOption)
    }
    if (jumpLogic?.unconditional) {
      jumpUnconditionalEnabled.value = true
      jumpUnconditionalTarget.value = String(jumpLogic.unconditional)
    }
    showJumpDialog.value = true
  }

  function closeJumpDialog() {
    showJumpDialog.value = false
  }

  function saveJumpDialog() {
    const index = jumpTargetIndex.value
    if (index == null) return
    const question = surveyForm.questions[index]
    const data: QuestionJumpLogicDTO = {}
    if (jumpByOptionEnabled.value) {
      const byOption = Object.fromEntries(
        Object.entries(jumpByOption.value || {})
          .map(([optionValue, target]) => [optionValue, normalizeJumpTarget(target)])
          .filter((entry): entry is [string, QuestionJumpTargetDTO] => entry[1] !== null)
      )
      if (Object.keys(byOption).length > 0) data.byOption = byOption
    }
    if (jumpUnconditionalEnabled.value) {
      const unconditional = normalizeJumpTarget(jumpUnconditionalTarget.value)
      if (unconditional) data.unconditional = unconditional
    }
    question.jumpLogic = data.byOption || data.unconditional ? data : undefined
    showJumpDialog.value = false
  }

  async function clearAllLogicAssociations() {
    try {
      await ElMessageBox.confirm('确定要清空所有题目的题目关联吗？此操作不可恢复。', '删除确认', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
    surveyForm.questions.forEach(question => {
      if (question.logic) question.logic.visibleWhen = undefined
    })
    ElMessage.success('已清空所有题目的题目关联')
  }

  async function clearCurrentQuestionLogic() {
    const index = logicTargetIndex.value
    if (index == null) return
    try {
      await ElMessageBox.confirm('确定要清空当前题目的题目关联吗？此操作不可恢复。', '删除确认', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
    const question = surveyForm.questions[index]
    if (!question.logic) question.logic = {}
    question.logic.visibleWhen = undefined
    const prevQuestions = selectablePrevQs(index)
    logicRows.splice(0, logicRows.length)
    logicRows.push({ depIdx: Math.max(0, prevQuestions.length - 1), picked: [], op: 'eq', text: '' })
    ElMessage.success('已清空当前题目的题目关联')
  }

  function openLogicDialog(index: number) {
    if (index <= 0) return
    const prevQuestions = selectablePrevQs(index)
    logicTargetIndex.value = index
    editingIndex.value = index
    logicRows.splice(0, logicRows.length)
    const question = surveyForm.questions[index]
    const groups = question?.logic?.visibleWhen || []
    if (Array.isArray(groups) && groups.length > 0) {
      groups.forEach(group => {
        const condition = Array.isArray(group) && group[0] ? group[0] : null
        if (!condition) return
        const depIdx = prevQuestions.findIndex(prevQuestion => {
          const byId = String(prevQuestion.id) === String(condition.qid)
          if (byId) return true
          const globalIndex = surveyForm.questions.findIndex(item => String(item.id) === String(prevQuestion.id))
          return String(globalIndex + 1) === String(condition.qid)
        })
        if (depIdx < 0) return
        const depQuestion = prevQuestions[depIdx]
        if (Array.isArray(depQuestion?.options) && depQuestion.options.length > 0) {
          const labels = depQuestion.options.map(option => String(option))
          const rawValues = Array.isArray(condition.value) ? condition.value.map(String) : [String(condition.value)]
          const picked = rawValues.map((value: string) => {
            const numberValue = Number(value)
            if (!Number.isNaN(numberValue) && numberValue >= 1 && numberValue <= labels.length) {
              return String(labels[numberValue - 1])
            }
            return String(value)
          })
          logicRows.push({ depIdx, picked })
          return
        }
        logicRows.push({
          depIdx,
          op: (condition.op || 'eq') as QuestionLogicOperatorDTO,
          text: Array.isArray(condition.value) ? String(condition.value[0] ?? '') : String(condition.value ?? '')
        })
      })
    }
    if (logicRows.length === 0) logicRows.push({ depIdx: Math.max(0, prevQuestions.length - 1), picked: [], op: 'eq', text: '' })
    showLogicDialog.value = true
  }

  function closeLogicDialog() {
    showLogicDialog.value = false
  }

  function addLogicRow() {
    const prevQuestions = selectablePrevQs(logicTargetIndex.value ?? 0)
    logicRows.push({ depIdx: Math.max(0, prevQuestions.length - 1), picked: [], op: 'eq', text: '' })
  }

  function removeLogicRow(index: number) {
    logicRows.splice(index, 1)
  }

  function togglePick(index: number, value: string) {
    const picked = logicRows[index].picked
    if (!picked) return
    const text = String(value)
    const targetIndex = picked.indexOf(text)
    if (targetIndex >= 0) picked.splice(targetIndex, 1)
    else picked.push(text)
  }

  function buildVisibleGroups(rows: UiCond[], prevQuestions: SurveyEditorQuestion[]): VisibleWhenDTO {
    const groups: VisibleWhenDTO = []
    for (const row of rows) {
      const depQuestion = prevQuestions[row.depIdx]
      if (!depQuestion) continue
      const hasOptions = Array.isArray(depQuestion.options) && depQuestion.options.length > 0
      if (hasOptions) {
        if (!row.picked || row.picked.length === 0) continue
        const isMulti = Number(depQuestion.type) === 4
        const condition: QuestionLogicConditionDTO = {
          qid: depQuestion.id,
          op: isMulti ? 'overlap' : 'in',
          value: [...row.picked]
        }
        groups.push([condition])
        continue
      }
      const op = row.op || 'eq'
      const text = (row.text ?? '').trim()
      if (!text) continue
      groups.push([{ qid: depQuestion.id, op, value: text }])
    }
    return groups
  }

  function saveLogicDialog() {
    const index = logicTargetIndex.value
    if (index == null) return
    const question = surveyForm.questions[index]
    const groups = buildVisibleGroups(logicRows, selectablePrevQs(index))
    if (!question.logic) question.logic = {}
    question.logic.visibleWhen = groups.length ? groups : undefined
    showLogicDialog.value = false
  }

  const showOptionDialog = ref(false)
  const optionTargetIndex = ref<number | null>(null)
  const activeOptIdx = ref(0)
  const optionLogicRows = reactive<UiCond[]>([])

  function openOptionLogicDialog(index: number) {
    if (index <= 0) return
    const question = surveyForm.questions[index]
    if (!Array.isArray(question.options) || question.options.length === 0) return
    optionTargetIndex.value = index
    editingIndex.value = index
    activeOptIdx.value = 0
    initOptionLogicRowsFromQuestion(index, 0)
    showOptionDialog.value = true
  }

  function onPickLeftOption(index: number) {
    if (optionTargetIndex.value == null) return
    activeOptIdx.value = index
    onSwitchActiveOption()
  }

  function hasOptionLogic(index: number) {
    const questionIndex = optionTargetIndex.value
    if (questionIndex == null) return false
    const question = surveyForm.questions[questionIndex]
    const groups = question?.optionLogic?.[index]
    return Array.isArray(groups) && groups.length > 0
  }

  function initOptionLogicRowsFromQuestion(qIndex: number, optIndex: number) {
    optionLogicRows.splice(0, optionLogicRows.length)
    const prevQuestions = selectablePrevQs(qIndex)
    const groups = surveyForm.questions[qIndex]?.optionLogic?.[optIndex] || []
    if (Array.isArray(groups) && groups.length > 0) {
      groups.forEach(group => {
        const condition = Array.isArray(group) && group[0] ? group[0] : null
        if (!condition) return
        const depIdx = prevQuestions.findIndex(prevQuestion => {
          return String(prevQuestion.id) === String(condition.qid) || String(surveyForm.questions.findIndex(item => String(item.id) === String(prevQuestion.id)) + 1) === String(condition.qid)
        })
        if (depIdx < 0) return
        const depQuestion = prevQuestions[depIdx]
        if (Array.isArray(depQuestion?.options) && depQuestion.options.length > 0) {
          const labels = depQuestion.options.map(option => String(option))
          const rawValues = Array.isArray(condition.value) ? condition.value.map(String) : [String(condition.value)]
          const picked = rawValues.map((value: string) => {
            const numberValue = Number(value)
            return !Number.isNaN(numberValue) && numberValue >= 1 && numberValue <= labels.length ? String(labels[numberValue - 1]) : String(value)
          })
          optionLogicRows.push({ depIdx, picked })
          return
        }
        optionLogicRows.push({
          depIdx,
          op: (condition.op || 'eq') as QuestionLogicOperatorDTO,
          text: Array.isArray(condition.value) ? String(condition.value[0] ?? '') : String(condition.value ?? '')
        })
      })
    }
    if (optionLogicRows.length === 0) {
      optionLogicRows.push({ depIdx: Math.max(0, prevQuestions.length - 1), picked: [], op: 'eq', text: '' })
    }
  }

  function closeOptionDialog() {
    showOptionDialog.value = false
  }

  function onSwitchActiveOption() {
    initOptionLogicRowsFromQuestion(optionTargetIndex.value ?? 0, activeOptIdx.value)
  }

  function addOptionLogicRow() {
    const prevQuestions = selectablePrevQs(optionTargetIndex.value ?? 0)
    optionLogicRows.push({ depIdx: Math.max(0, prevQuestions.length - 1), picked: [], op: 'eq', text: '' })
  }

  function removeOptionLogicRow(index: number) {
    optionLogicRows.splice(index, 1)
  }

  function toggleOptionPick(index: number, value: string) {
    const picked = optionLogicRows[index].picked || (optionLogicRows[index].picked = [])
    const text = String(value)
    const targetIndex = picked.indexOf(text)
    if (targetIndex >= 0) picked.splice(targetIndex, 1)
    else picked.push(text)
  }

  async function clearCurrentOptionLogic() {
    const qIndex = optionTargetIndex.value
    if (qIndex == null) return
    try {
      await ElMessageBox.confirm('确定要清空当前选项的关联吗？', '删除确认', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
    const question = surveyForm.questions[qIndex]
    if (!question.optionLogic) question.optionLogic = []
    question.optionLogic[activeOptIdx.value] = undefined
    optionLogicRows.splice(0, optionLogicRows.length)
    const prevQuestions = selectablePrevQs(qIndex)
    optionLogicRows.push({ depIdx: Math.max(0, prevQuestions.length - 1), picked: [], op: 'eq', text: '' })
    ElMessage.success('已清空当前选项的关联')
  }

  async function clearAllOptionLogicForThisQuestion() {
    const qIndex = optionTargetIndex.value
    if (qIndex == null) return
    try {
      await ElMessageBox.confirm('确定要清空本题所有选项的关联吗？此操作不可恢复。', '删除确认', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
    } catch {
      return
    }
    const question = surveyForm.questions[qIndex]
    if (!Array.isArray(question.options)) question.options = []
    question.optionLogic = new Array(question.options.length).fill(undefined)
    optionLogicRows.splice(0, optionLogicRows.length)
    const prevQuestions = selectablePrevQs(qIndex)
    optionLogicRows.push({ depIdx: Math.max(0, prevQuestions.length - 1), picked: [], op: 'eq', text: '' })
    ElMessage.success('已清空本题所有选项的关联')
  }

  function saveCurrentOptionLogic(closeDialog: boolean) {
    const qIndex = optionTargetIndex.value
    if (qIndex == null) return
    const question = surveyForm.questions[qIndex]
    const groups = buildVisibleGroups(optionLogicRows, selectablePrevQs(qIndex))
    if (!question.optionLogic) question.optionLogic = []
    question.optionLogic[activeOptIdx.value] = groups.length ? groups : undefined
    if (closeDialog) showOptionDialog.value = false
  }

  function saveOptionDialog() {
    saveCurrentOptionLogic(true)
  }

  function saveOptionDialogOne() {
    saveCurrentOptionLogic(false)
    ElMessage.success('已保存当前选项的关联')
  }

  const currentOptionSummary = computed(() => {
    const qIndex = optionTargetIndex.value
    if (qIndex == null) return ''
    const prevQuestions = selectablePrevQs(qIndex)
    const opMap: Record<string, string> = {
      eq: '等于',
      neq: '不等于',
      gt: '大于',
      gte: '大于等于',
      lt: '小于',
      lte: '小于等于',
      regex: '匹配正则',
      in: '等于其一',
      overlap: '包含其一'
    }
    const parts: string[] = []
    for (const row of optionLogicRows) {
      const depQuestion = prevQuestions[row.depIdx]
      if (!depQuestion) continue
      const order = surveyForm.questions.findIndex(item => String(item.id) === String(depQuestion.id)) + 1
      const depTitle = depQuestion.title || getQuestionTypeLabel(depQuestion.type)
      const hasOptions = Array.isArray(depQuestion.options) && depQuestion.options.length > 0
      if (hasOptions) {
        const picked = row.picked || []
        if (!picked.length) continue
        const indexes = picked
          .map(value => (depQuestion.options || []).findIndex((option: any) => String(option) === String(value)))
          .filter(index => index >= 0)
          .map(index => index + 1)
          .sort((a, b) => a - b)
        if (!indexes.length) continue
        parts.push(`依赖于[${order}.${depTitle}]第${indexes.join('、第')}个选项`)
        continue
      }
      const text = (row.text || '').trim()
      if (!text) continue
      parts.push(`依赖于[${order}.${depTitle}]${opMap[row.op || 'eq'] || row.op || 'eq'} ${text}`)
    }
    return parts.join(' 或 ')
  })

  function optionSummary(qIndex: number, optIndex: number): string {
    const question = surveyForm.questions[qIndex]
    const groups = question?.optionLogic?.[optIndex] || []
    if (!Array.isArray(groups) || groups.length === 0) return ''
    const opMap: Record<string, string> = {
      eq: '等于',
      neq: '不等于',
      gt: '大于',
      gte: '大于等于',
      lt: '小于',
      lte: '小于等于',
      regex: '匹配正则',
      in: '等于其一',
      overlap: '包含其一'
    }
    const parts: string[] = []
    for (const group of groups) {
      const condition = Array.isArray(group) && group[0] ? group[0] : null
      if (!condition) continue
      let depIdx = surveyForm.questions.findIndex(item => String(item.id) === String(condition.qid))
      if (depIdx < 0 && /^\d+$/.test(String(condition.qid))) depIdx = Number(String(condition.qid)) - 1
      const depQuestion = surveyForm.questions[depIdx]
      if (!depQuestion) continue
      const order = depIdx + 1
      const depTitle = depQuestion.title || getQuestionTypeLabel(depQuestion.type)
      const hasOptions = Array.isArray(depQuestion.options) && depQuestion.options.length > 0
      if (hasOptions) {
        const picked = Array.isArray(condition.value) ? condition.value : []
        if (!picked.length) continue
        const indexes = picked
          .map(value => (depQuestion.options || []).findIndex(option => String(option) === String(value)))
          .filter((index: number) => index >= 0)
          .map((index: number) => index + 1)
          .sort((a: number, b: number) => a - b)
        if (!indexes.length) continue
        parts.push(`依赖于[${order}.${depTitle}]第${indexes.join('、第')}个选项`)
        continue
      }
      const text = String(condition.value ?? '').trim()
      if (!text) continue
      parts.push(`依赖于[${order}.${depTitle}]${opMap[condition.op || 'eq'] || condition.op} ${text}`)
    }
    return parts.join(' 或 ')
  }

  function jumpSummary(qIndex: number, optIndex: number): string {
    const question = surveyForm.questions[qIndex]
    const jumpLogic = question?.jumpLogic
    if (!jumpLogic?.byOption) return ''
    const target = jumpLogic.byOption[String(optIndex + 1)]
    if (!target) return ''
    if (target === 'end') return '跳转到[问卷末尾]'
    if (target === 'invalid') return '跳转到[无效提交]'
    if (!/^\d+$/.test(String(target))) return ''
    const to = Number(String(target))
    const targetQuestion = surveyForm.questions[to - 1]
    if (!targetQuestion) return `跳转到[第${to}题]`
    const name = targetQuestion.title || getQuestionTypeLabel(targetQuestion.type)
    return `跳转到[第${to}题：${name}]`
  }

  function questionLogicSummary(qIndex: number): string {
    const question = surveyForm.questions[qIndex]
    const groups = question?.logic?.visibleWhen || []
    if (!Array.isArray(groups) || groups.length === 0) return ''
    const opMap: Record<string, string> = {
      eq: '等于',
      neq: '不等于',
      gt: '大于',
      gte: '大于等于',
      lt: '小于',
      lte: '小于等于',
      regex: '匹配正则',
      in: '等于其一',
      overlap: '包含其一',
      includes: '包含',
      notIncludes: '不包含'
    }
    const parts: string[] = []
    for (const group of groups) {
      const condition = Array.isArray(group) && group[0] ? group[0] : null
      if (!condition) continue
      let depIdx = surveyForm.questions.findIndex(item => String(item.id) === String(condition.qid))
      if (depIdx < 0 && /^\d+$/.test(String(condition.qid))) depIdx = Number(String(condition.qid)) - 1
      const depQuestion = surveyForm.questions[depIdx]
      if (!depQuestion) continue
      const order = depIdx + 1
      const depTitle = depQuestion.title || getQuestionTypeLabel(depQuestion.type)
      const hasOptions = Array.isArray(depQuestion.options) && depQuestion.options.length > 0
      if (hasOptions) {
        const picked = Array.isArray(condition.value) ? condition.value : []
        if (!picked.length) continue
        const indexes = picked
          .map(value => (depQuestion.options || []).findIndex(option => String(option) === String(value)))
          .filter((index: number) => index >= 0)
          .map((index: number) => index + 1)
          .sort((a: number, b: number) => a - b)
        if (!indexes.length) continue
        parts.push(`依赖于[${order}.${depTitle}]第${indexes.join('、第')}个选项`)
        continue
      }
      const text = Array.isArray(condition.value) ? String(condition.value[0] ?? '') : String(condition.value ?? '')
      if (!text) continue
      parts.push(`依赖于[${order}.${depTitle}]${opMap[condition.op || 'eq'] || condition.op} ${text}`)
    }
    return parts.join(' 或 ')
  }

  return {
    showLogicDialog,
    logicTargetIndex,
    logicRows,
    selectablePrevQs,
    openLogicDialog,
    closeLogicDialog,
    addLogicRow,
    removeLogicRow,
    togglePick,
    clearCurrentQuestionLogic,
    clearAllLogicAssociations,
    saveLogicDialog,
    showOptionDialog,
    closeOptionDialog,
    optionTargetIndex,
    activeOptIdx,
    openOptionLogicDialog,
    onPickLeftOption,
    hasOptionLogic,
    currentOptionSummary,
    clearCurrentOptionLogic,
    optionLogicRows,
    toggleOptionPick,
    removeOptionLogicRow,
    addOptionLogicRow,
    saveOptionDialogOne,
    clearAllOptionLogicForThisQuestion,
    saveOptionDialog,
    showJumpDialog,
    closeJumpDialog,
    jumpByOptionEnabled,
    jumpTargetIndex,
    jumpByOption,
    jumpUnconditionalEnabled,
    jumpUnconditionalTarget,
    openJumpDialog,
    saveJumpDialog,
    optionSummary,
    jumpSummary,
    questionLogicSummary
  }
}
