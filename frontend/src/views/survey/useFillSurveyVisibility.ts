import { computed, ref, type Ref } from 'vue'
import type { Survey } from '@/types/survey'
import { applyVisibility, evalCond } from '@/utils/visibility'

interface UseFillSurveyVisibilityOptions {
  survey: Ref<Survey | null>
  form: Ref<Record<string, any>>
}

interface SyncAnswersWithVisibilityOptions {
  vis: Record<number, boolean>
  filteredOptions: (question: any, index: number) => any[]
  getEmptyAnswerValue: (question: any) => any
  applyDefaultIfNeeded: (question: any, index: number) => void
  syncRankingAnswer: (question: any, index: number) => void
  isMatrixMultipleQuestion: (question: any) => boolean
}

const toStringMap = (vis: Record<number, boolean>) => Object.fromEntries(
  Object.entries(vis).map(([key, value]) => [String(key), value as boolean])
)

export function useFillSurveyVisibility({
  survey,
  form
}: UseFillSurveyVisibilityOptions) {
  const visibleMap = ref<Record<string, boolean>>({})

  const totalVisibleQuestions = computed(() => {
    const questions = survey.value?.questions || []
    if (!questions.length) return 0

    const visibleCount = questions.filter((_, index) => visibleMap.value[String(index + 1)] !== false).length
    return visibleCount || questions.length
  })

  const answeredVisibleQuestions = computed(() => {
    const questions = survey.value?.questions || []
    return questions.reduce((count, question: any, index: number) => {
      if (visibleMap.value[String(index + 1)] === false) return count

      const key = String(question.id ?? index + 1)
      const value = form.value[key]
      const answered = Array.isArray(value)
        ? value.length > 0
        : (value && typeof value === 'object'
          ? Object.keys(value).length > 0
          : value !== undefined && value !== null && String(value).trim() !== '')

      return count + (answered ? 1 : 0)
    }, 0)
  })

  const progressPercent = computed(() => {
    if (!totalVisibleQuestions.value) return 0
    return Math.min(100, Math.round((answeredVisibleQuestions.value / totalVisibleQuestions.value) * 100))
  })

  function buildAnswersByOrder() {
    const answers: Record<number, any> = {}
    ;(survey.value?.questions || []).forEach((question: any, index: number) => {
      const key = String(question.id ?? index + 1)
      answers[index + 1] = form.value[key]
    })
    return answers
  }

  function areConditionGroupsVisible(groups: any, answers: Record<number, any>) {
    if (!groups || !Array.isArray(groups) || groups.length === 0) return true
    return groups.some((group: any[]) => Array.isArray(group) && group.length > 0 && group.every((cond) => evalCond(cond, answers)))
  }

  function computeQuestionVisibility() {
    const questions = (survey.value?.questions || []).map((question: any, index: number) => ({
      id: index + 1,
      required: question.required,
      title: question.title,
      logic: question.logic
    }))
    return applyVisibility(questions, buildAnswersByOrder())
  }

  function setVisibleMap(vis: Record<number, boolean>) {
    visibleMap.value = toStringMap(vis)
  }

  function syncAnswersWithVisibility({
    vis,
    filteredOptions,
    getEmptyAnswerValue,
    applyDefaultIfNeeded,
    syncRankingAnswer,
    isMatrixMultipleQuestion
  }: SyncAnswersWithVisibilityOptions) {
    ;(survey.value?.questions || []).forEach((question: any, index: number) => {
      const order = index + 1
      const key = String(question.id ?? order)

      if (vis[order] === false) {
        form.value[key] = getEmptyAnswerValue(question)
        return
      }

      if (question.type === 'radio' || question.type === 'checkbox') {
        const allowed = new Set((filteredOptions(question, index) || []).map((option: any) => String(option.value)))
        if (question.type === 'radio') {
          if (!allowed.has(String(form.value[key] ?? ''))) form.value[key] = ''
        } else {
          const arr = Array.isArray(form.value[key]) ? form.value[key] : []
          form.value[key] = arr.filter((value: any) => allowed.has(String(value)))
        }

        applyDefaultIfNeeded(question, index)

        if (question.autoSelectOnAppear) {
          const visibleOptions: any[] = filteredOptions(question, index) || []
          const autoOptions = visibleOptions.filter((option) => Array.isArray(option.visibleWhen) && option.visibleWhen.length > 0)
          if (autoOptions.length > 0) {
            if (question.type === 'radio') {
              if (!form.value[key]) form.value[key] = String(autoOptions[0].value)
            } else if (question.type === 'checkbox') {
              const arrNow = Array.isArray(form.value[key]) ? form.value[key] : []
              if (arrNow.length === 0) form.value[key] = autoOptions.map((option) => String(option.value))
            }
          }
        }
        return
      }

      if (question.type === 'ranking') {
        syncRankingAnswer(question, index)
        return
      }

      if (question.type === 'matrix') {
        const allowed = new Set((filteredOptions(question, index) || []).map((option: any) => String(option.value)))
        const current = form.value[key]
        if (current && typeof current === 'object' && !Array.isArray(current)) {
          const next = Object.fromEntries(
            Object.entries(current)
              .map(([rowKey, value]) => {
                if (isMatrixMultipleQuestion(question)) {
                  const normalized = Array.isArray(value)
                    ? Array.from(new Set(value.map((item: any) => String(item)).filter((item) => allowed.has(item))))
                    : []
                  return [String(rowKey), normalized]
                }
                return [String(rowKey), String(value ?? '')]
              })
              .filter(([, value]) => {
                if (Array.isArray(value)) return value.length > 0
                return value === '' || allowed.has(value)
              })
          )
          form.value[key] = next
        }
        return
      }

      if (question.type === 'ratio') {
        const allowed = new Set((filteredOptions(question, index) || []).map((option: any) => String(option.value)))
        const current = form.value[key]
        if (current && typeof current === 'object' && !Array.isArray(current)) {
          const next = Object.fromEntries(
            Object.entries(current)
              .map(([optionKey, rawValue]) => [String(optionKey), Number(rawValue)])
              .filter(([optionKey, numeric]) => allowed.has(String(optionKey)) && Number.isFinite(numeric))
          )
          form.value[key] = next
        }
      }
    })

    setVisibleMap(vis)
  }

  return {
    visibleMap,
    totalVisibleQuestions,
    answeredVisibleQuestions,
    progressPercent,
    buildAnswersByOrder,
    areConditionGroupsVisible,
    computeQuestionVisibility,
    setVisibleMap,
    syncAnswersWithVisibility
  }
}
