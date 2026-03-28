import { nextTick, reactive, ref, type Ref } from 'vue'
import { escapeHtml as escapeHtmlUtil } from '@/utils/html'
import type { SurveyEditorForm, SurveyEditorQuestion } from './editor-core'

interface EditorRichtextOptions {
  surveyForm: SurveyEditorForm
  editingIndex: Ref<number>
  ensureOptionExtras: (question: SurveyEditorQuestion, optionIndex: number) => any
}

export function useEditorRichtext(options: EditorRichtextOptions) {
  const { surveyForm, editingIndex, ensureOptionExtras } = options

  const showRteDialog = ref(false)
  const rteContent = ref('')
  let rteTarget: { qIndex: number; optIndex: number } | null = null

  const showTitleRte = ref(false)
  const titleRteContent = ref('')
  const titleIndex = ref<number | null>(null)
  const titleRichMap = reactive<Record<string, { rich: boolean; html: string }>>({})
  const titleBtnVisibleIndex = ref<number | null>(null)

  function escapeHtml(value: string) {
    return escapeHtmlUtil(value)
  }

  function openOptionRichEditor(qIndex: number, optIndex: number) {
    const question = surveyForm.questions[qIndex] as SurveyEditorQuestion
    const raw = String(question.options?.[optIndex] ?? '')
    const extra = ensureOptionExtras(question, optIndex)
    rteContent.value = extra.rich ? raw : raw ? `<p>${escapeHtml(raw)}</p>` : ''
    rteTarget = { qIndex, optIndex }
    nextTick(() => {
      showRteDialog.value = true
    })
  }

  function applyRteContent(html: string) {
    if (!rteTarget) return
    const { qIndex, optIndex } = rteTarget
    const question = surveyForm.questions[qIndex] as SurveyEditorQuestion
    if (!Array.isArray(question.options)) question.options = []
    question.options[optIndex] = html
    const extra = ensureOptionExtras(question, optIndex)
    extra.rich = true
    rteTarget = null
  }

  function onTitleFocus(index: number) {
    editingIndex.value = index
    titleBtnVisibleIndex.value = index
  }

  function onTitleBlur(index: number, event?: FocusEvent) {
    const nextElement = (event?.relatedTarget as HTMLElement) || null
    if (nextElement && nextElement.closest && nextElement.closest('.title-rich-btn-wrap')) return
    setTimeout(() => {
      if (titleBtnVisibleIndex.value === index) titleBtnVisibleIndex.value = null
    }, 120)
  }

  function ensureTitleRich(qIndex: number) {
    const question = surveyForm.questions[qIndex]
    const key = String(question?.id ?? qIndex)
    if (!titleRichMap[key]) {
      titleRichMap[key] = {
        rich: !!question?.titleHtml,
        html: String(question?.titleHtml || '')
      }
    }
    return titleRichMap[key]
  }

  function shouldShowTitleBtn(index: number) {
    const info = ensureTitleRich(index)
    return titleBtnVisibleIndex.value === index || (info.rich && editingIndex.value === index)
  }

  function openTitleRichEditor(qIndex: number) {
    editingIndex.value = qIndex
    titleBtnVisibleIndex.value = qIndex
    const info = ensureTitleRich(qIndex)
    const raw = surveyForm.questions[qIndex]?.title || ''
    titleRteContent.value = info.rich ? info.html || '' : raw ? `<p>${escapeHtml(raw)}</p>` : ''
    titleIndex.value = qIndex
    nextTick(() => {
      showTitleRte.value = true
    })
  }

  function applyTitleRteContent(html: string) {
    if (titleIndex.value == null) return
    const question = surveyForm.questions[titleIndex.value]
    const key = String(question?.id ?? titleIndex.value)
    const info = ensureTitleRich(titleIndex.value)

    if (!html || !html.replace(/<[^>]+>/g, '').trim()) {
      info.rich = false
      info.html = ''
    } else {
      info.rich = true
      info.html = html
    }

    const text = (html || '').replace(/<[^>]+>/g, '').trim()
    question.title = text || question.title
    question.titleHtml = info.html
    titleRichMap[key] = { rich: info.rich, html: info.html }
    titleIndex.value = null
  }

  function stripTags(html: string): string {
    if (!html) return ''
    try {
      let text = String(html)
        .replace(/<\/(?:script|style)>/gi, '')
        .replace(/<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
      text = text
        .replace(/<\s*br\s*\/?>/gi, '\n')
        .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
        .replace(/<[^>]+>/g, '')
      text = decodeHtml(text)
      return text.replace(/\u00A0/g, ' ').replace(/[\t\r ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    } catch {
      return String(html)
    }
  }

  function decodeHtml(value: string): string {
    return value
      .replace(/&nbsp;/gi, ' ')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&amp;/gi, '&')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  }

  function asPlain(option: any): string {
    if (option == null) return ''
    if (typeof option === 'object') {
      const raw = String(option.label ?? option.text ?? option.value ?? '')
      return stripTags(raw) || raw
    }
    const raw = String(option)
    return /[<>]/.test(raw) ? stripTags(raw) : raw
  }

  function optionLabelPlain(option: any, index: number): string {
    const text = asPlain(option)
    return text || `选项${index + 1}`
  }

  return {
    showRteDialog,
    rteContent,
    openOptionRichEditor,
    applyRteContent,
    showTitleRte,
    titleRteContent,
    titleRichMap,
    onTitleFocus,
    onTitleBlur,
    shouldShowTitleBtn,
    ensureTitleRich,
    openTitleRichEditor,
    applyTitleRteContent,
    escapeHtml,
    asPlain,
    optionLabelPlain
  }
}
