import { computed, ref, type ComputedRef, type Ref } from 'vue'
import { uploadSurveyFile, type UploadedSurveyFile } from '@/api/surveys'
import {
  buildUploadQuestionHelpText,
  clearUploadSubmissionToken,
  getUploadSubmissionToken,
  normalizeUploadQuestionConfig,
  validateSelectedUploadFiles
} from '@/utils/uploadQuestion'

interface UseFillSurveyUploadOptions {
  preview: boolean
  form: Ref<Record<string, any>>
  storageKey: ComputedRef<string>
  uploadTargetId: ComputedRef<string>
}

export function useFillSurveyUpload({
  preview,
  form,
  storageKey,
  uploadTargetId
}: UseFillSurveyUploadOptions) {
  const uploadState = ref<Record<string, boolean>>({})
  const uploadErrors = ref<Record<string, string>>({})
  const submissionToken = computed(() => getUploadSubmissionToken(storageKey.value))

  function getUploadAnswerList(question: any, index: number): UploadedSurveyFile[] {
    const key = String(question.id ?? index + 1)
    return Array.isArray(form.value[key]) ? form.value[key] : []
  }

  function getUploadConfig(question: any) {
    return normalizeUploadQuestionConfig(question)
  }

  function getUploadHelpText(question: any) {
    return buildUploadQuestionHelpText(question)
  }

  function isUploadLimitReached(question: any, index: number) {
    return getUploadAnswerList(question, index).length >= getUploadConfig(question).maxFiles
  }

  function getUploadButtonText(question: any, index: number) {
    if (preview) return '预览模式不可上传'
    if (isUploadLimitReached(question, index)) return '已达到上传上限'
    return '选择文件'
  }

  function removeUploadedFile(question: any, index: number, fileIndex: number) {
    const key = String(question.id ?? index + 1)
    const next = [...getUploadAnswerList(question, index)]
    next.splice(fileIndex, 1)
    form.value[key] = next
  }

  async function onUploadFilesSelected(question: any, index: number, event: Event) {
    const input = event.target as HTMLInputElement | null
    const files = Array.from(input?.files || [])
    if (input) input.value = ''
    if (!files.length) return

    const key = String(question.id ?? index + 1)
    if (preview) {
      uploadErrors.value[key] = '预览模式不上传文件'
      return
    }

    const selectionError = validateSelectedUploadFiles(question, getUploadAnswerList(question, index).length, files)
    if (selectionError) {
      uploadErrors.value[key] = selectionError
      return
    }

    uploadErrors.value[key] = ''
    uploadState.value[key] = true

    try {
      const surveyId = uploadTargetId.value
      if (!surveyId) throw new Error('缺少问卷标识，无法上传文件')

      const uploaded = [...getUploadAnswerList(question, index)]
      for (const file of files) {
        const saved = await uploadSurveyFile(surveyId, file, {
          questionId: index + 1,
          submissionToken: submissionToken.value
        })
        uploaded.push(saved)
      }
      form.value[key] = uploaded
    } catch (error: any) {
      uploadErrors.value[key] = error?.response?.data?.error?.message || error?.message || '文件上传失败'
    } finally {
      uploadState.value[key] = false
    }
  }

  function clearCurrentUploadSubmissionToken() {
    clearUploadSubmissionToken(storageKey.value)
  }

  return {
    uploadState,
    uploadErrors,
    submissionToken,
    getUploadAnswerList,
    getUploadConfig,
    getUploadHelpText,
    isUploadLimitReached,
    getUploadButtonText,
    removeUploadedFile,
    onUploadFilesSelected,
    clearCurrentUploadSubmissionToken
  }
}
