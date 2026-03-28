import { ref, type ComputedRef, type Ref } from 'vue'
import type { Router } from 'vue-router'
import type { Survey } from '@/types/survey'
import { submitResponses } from '@/api/surveys'
import { clearUploadSubmissionToken } from '@/utils/uploadQuestion'

interface UseFillSurveyJumpLogicOptions {
  survey: Ref<Survey | null>
  form: Ref<Record<string, any>>
  router: Router
  shareId: ComputedRef<string>
  storageKey: ComputedRef<string>
  submissionToken: ComputedRef<string>
}

export function useFillSurveyJumpLogic({
  survey,
  form,
  router,
  shareId,
  storageKey,
  submissionToken
}: UseFillSurveyJumpLogicOptions) {
  const jumpStartAfter = ref<number | null>(null)
  const jumpHideUntil = ref<number | null>(null)

  async function applyJumpLogic(baseVisibility: Record<number, boolean>) {
    const nextVisibility = { ...baseVisibility }
    jumpStartAfter.value = null
    jumpHideUntil.value = null
    let hitInvalid = false

    for (let index = 0; index < (survey.value?.questions || []).length; index += 1) {
      const question: any = survey.value?.questions?.[index]
      const order = index + 1
      const key = String(question.id ?? order)
      if (nextVisibility[order] === false) continue

      const jumpLogic: any = question.jumpLogic
      if (!jumpLogic) continue

      let target: string | undefined
      if (jumpLogic.byOption && (question.type === 'radio' || question.type === 'checkbox')) {
        const value = form.value[key]
        if (question.type === 'radio') {
          target = jumpLogic.byOption[String(value)]
        } else if (Array.isArray(value)) {
          const candidates = value.map((item: any) => jumpLogic.byOption[String(item)]).filter(Boolean)
          if (candidates.length) {
            target = candidates.includes('end') ? 'end' : String(Math.max(...candidates.map((item: string) => Number(item))))
          }
        }
      }
      if (!target && jumpLogic.unconditional) target = String(jumpLogic.unconditional)

      if (!target) continue

      if (target === 'end') {
        jumpStartAfter.value = Math.max(jumpStartAfter.value || 0, order)
        jumpHideUntil.value = (survey.value?.questions || []).length + 1
        break
      }

      if (target === 'invalid') {
        hitInvalid = true
        break
      }

      if (/^\d+$/.test(target)) {
        const to = Number(target)
        if (to > order + 1) {
          jumpStartAfter.value = Math.max(jumpStartAfter.value || 0, order)
          jumpHideUntil.value = Math.max(jumpHideUntil.value || 0, to)
        }
      }
    }

    if (hitInvalid) {
      await submitInvalidSurvey()
      return { visibility: nextVisibility, invalidSubmitted: true }
    }

    if (jumpStartAfter.value && jumpHideUntil.value) {
      for (let index = 0; index < (survey.value?.questions || []).length; index += 1) {
        const order = index + 1
        if (order > jumpStartAfter.value && order < jumpHideUntil.value) {
          nextVisibility[order] = false
        }
      }
    }

    return { visibility: nextVisibility, invalidSubmitted: false }
  }

  async function submitInvalidSurvey() {
    const currentShareId = shareId.value
    try {
      await submitResponses(currentShareId, [], {
        invalid: true,
        clientSubmissionToken: submissionToken.value
      })
      clearUploadSubmissionToken(storageKey.value)
      router.push({
        name: 'SurveySuccess',
        params: { id: currentShareId },
        query: {
          message: '感谢作答，本问卷不符合条件，已标记为无效提交。',
          title: survey.value?.title
        }
      })
    } catch {
      clearUploadSubmissionToken(storageKey.value)
      router.push({
        name: 'SurveySuccess',
        params: { id: currentShareId },
        query: {
          message: '您不符合本次问卷条件，已结束作答。',
          title: survey.value?.title
        }
      })
    }
  }

  return {
    jumpStartAfter,
    jumpHideUntil,
    applyJumpLogic
  }
}
