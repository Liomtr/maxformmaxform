import { computed } from 'vue'
import type { Survey } from '@/types/survey'

export interface LegacyQuestionDraft {
  id: string | number
  type: number
  title: string
  description?: string
  required?: boolean
  options?: any[]
  logic?: any
  jumpLogic?: any
  optionGroups?: any[]
  quotasEnabled?: boolean
  quotaMode?: string
  quotaShowRemaining?: boolean
}

export function usePreviewSurveyMapping(surveyForm: { title:string; description:string; questions: LegacyQuestionDraft[] }) {
  const mapLegacyToServer = (n:number):string => {
    switch(n){
      case 1: return 'input'
      case 2: return 'textarea'
      case 3: return 'radio'
      case 4: return 'checkbox'
      case 11: return 'ranking'
      case 13: return 'upload'
      case 14: return 'date'
      default: return 'input'
    }
  }
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
      title: q.title,
      titleHtml: (q as any).titleHtml || (q as any).__titleHtml || undefined,
      description: q.description,
      type: mapLegacyToServer(q.type),
      required: !!q.required,
      hideSystemNumber: !!(q as any).hideSystemNumber,
      options: Array.isArray(q.options)? q.options.map((o:any)=> typeof o==='string'? o : o):[],
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
