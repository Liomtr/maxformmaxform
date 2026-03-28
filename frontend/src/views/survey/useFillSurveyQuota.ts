import type { QuestionOption } from '@/types/survey'

export interface FillSurveyOption extends QuestionOption {
  value: string
  label: string
  rich: boolean
  desc: string
  hidden: boolean
  visibleWhen?: unknown[]
  exclusive: boolean
  defaultSelected: boolean
  quotaLimit: number
  quotaUsed: number
  quotaEnabled: boolean
  fillEnabled: boolean
  fillRequired: boolean
  fillPlaceholder: string
}

export function useFillSurveyQuota() {
  function normalizeQuestionOptions(question: any): FillSurveyOption[] {
    const list = Array.isArray(question?.options) ? question.options : []
    return list.map((raw: any, index: number) => {
      if (raw && typeof raw === 'object') {
        return {
          value: String(raw.value ?? index + 1),
          label: String(raw.label ?? raw.text ?? ''),
          rich: !!raw.rich,
          desc: raw.desc ? String(raw.desc) : '',
          hidden: !!raw.hidden,
          visibleWhen: raw.visibleWhen,
          exclusive: !!raw.exclusive,
          defaultSelected: !!raw.defaultSelected,
          quotaLimit: Number(raw.quotaLimit || 0),
          quotaUsed: Number(raw.quotaUsed || 0),
          quotaEnabled: raw?.quotaEnabled !== false,
          fillEnabled: !!raw.fillEnabled,
          fillRequired: !!raw.fillRequired,
          fillPlaceholder: String(raw.fillPlaceholder || '')
        }
      }

      return {
        value: String(index + 1),
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
        fillPlaceholder: ''
      }
    })
  }

  function applyQuotaState(question: any, options: FillSurveyOption[]) {
    const enabled = !!question?.quotasEnabled
    return options.map((option) => {
      const limit = Number(option.quotaLimit || 0)
      const used = Number(option.quotaUsed || 0)
      const rowEnabled = option.quotaEnabled !== false
      const full = enabled && rowEnabled && limit > 0 && used >= limit
      const remaining = enabled && limit > 0 ? Math.max(0, limit - used) : null
      return {
        ...option,
        __quotaFull: full,
        __remaining: remaining
      }
    })
  }

  return {
    normalizeQuestionOptions,
    applyQuotaState
  }
}
