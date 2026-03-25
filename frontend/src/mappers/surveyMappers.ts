import type { LegacyQuestionType, SurveyForm } from '@/types/survey'
import {
  mapLegacyTypeToServer as mapLegacyTypeToServerFromRegistry,
  mapServerTypeToLegacy as mapServerTypeToLegacyFromRegistry
} from '@/utils/questionTypeRegistry'

export function mapLegacyTypeToServer(type: LegacyQuestionType | number): string {
  return mapLegacyTypeToServerFromRegistry(type)
}

export function mapServerTypeToLegacy(type: string, uiType?: number | string): LegacyQuestionType {
  return mapServerTypeToLegacyFromRegistry(type, uiType)
}

export function toServerPayload(form: SurveyForm) {
  return {
    ...form,
    questions: form.questions.map(question => ({
      ...question,
      uiType: Number((question as any).uiType ?? question.type),
      type: mapLegacyTypeToServer(Number(question.type))
    }))
  }
}

export function fromServerPayload(form: any): SurveyForm {
  return {
    ...form,
    questions: (form.questions || []).map((question: any) => ({
      ...question,
      uiType: question.uiType,
      type: mapServerTypeToLegacy(question.type, question.uiType)
    }))
  }
}
