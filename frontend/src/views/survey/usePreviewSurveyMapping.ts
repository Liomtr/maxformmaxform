import { computed } from 'vue'
import type { Survey } from '@/types/survey'
import { mapLegacyTypeToServer } from '@/utils/questionTypeRegistry'

export interface LegacyQuestionDraft {
  id: string | number
  type: number
  title: string
  description?: string
  required?: boolean
  options?: any[]
  validation?: Record<string, unknown>
  upload?: Record<string, unknown>
  matrix?: { rows?: any[]; selectionType?: string }
  logic?: any
  jumpLogic?: any
  optionGroups?: any[]
  quotasEnabled?: boolean
  quotaMode?: string
  quotaShowRemaining?: boolean
}

export function usePreviewSurveyMapping(surveyForm: { title:string; description:string; questions: LegacyQuestionDraft[] }) {
  const mappedSurveyForPreview = computed<Survey>(() => ({
    id: 0,
    title: surveyForm.title,
    description: surveyForm.description,
    creator_id: 0,
    settings: {},
    style: {},
    share_code: 'preview',
    status: 'published',
    response_count: 0,
    created_at: '',
    updated_at: '',
    questions: (surveyForm.questions||[]).map((q:any, i:number)=>({
      id: q.id || (i+1),
      uiType: Number(q.uiType ?? q.type),
      title: q.title,
      titleHtml: (q as any).titleHtml || (q as any).__titleHtml || undefined,
      description: q.description,
      type: mapLegacyTypeToServer(q.type),
      required: !!q.required,
      hideSystemNumber: !!(q as any).hideSystemNumber,
      options: Array.isArray(q.options)? q.options.map((o:any)=> typeof o==='string'? o : o):[],
      validation: (q as any).validation || undefined,
      upload: (q as any).upload || undefined,
      matrix: (q as any).matrix
        ? {
            ...(q as any).matrix,
            rows: Array.isArray((q as any).matrix.rows)
              ? (q as any).matrix.rows.map((row: any, index: number) => ({
                  label: typeof row === 'string' ? row : String(row?.label ?? row?.text ?? `维度${index + 1}`),
                  value: String(index + 1),
                  order: index + 1
                }))
              : []
          }
        : undefined,
      logic: (q as any).logic || null,
      jumpLogic: (q as any).jumpLogic || null,
      optionGroups: (q as any).optionGroups || [],
      quotasEnabled: (q as any).quotasEnabled || false,
      quotaMode: (q as any).quotaMode || 'explicit',
      quotaShowRemaining: (q as any).quotaShowRemaining || false
    }))
  }))
  return { mappedSurveyForPreview }
}
