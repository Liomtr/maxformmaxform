import type { LegacyQuestionType, Question } from '@/types/survey'
import {
  IMPLEMENTED_LEGACY_QUESTION_TYPES as implementedLegacyQuestionTypes,
  LEGACY_QUESTION_TYPE_LABELS as legacyQuestionTypeLabels,
  LEGACY_TO_SERVER_TYPE_MAP as legacyToServerTypeMap,
  SERVER_TO_LEGACY_TYPE_MAP as serverToLegacyTypeMap,
  getLegacyQuestionConfigPanel as getSharedLegacyQuestionConfigPanel,
  getLegacyQuestionDraftConfig as getSharedLegacyQuestionDraftConfig,
  getLegacyQuestionDefaultOptions as getSharedLegacyQuestionDefaultOptions,
  getLegacyQuestionTypeLabel as getSharedLegacyQuestionTypeLabel,
  getQuestionRenderType as getSharedQuestionRenderType,
  getServerQuestionAnalyticsKind as getSharedServerQuestionAnalyticsKind,
  getServerQuestionTypeLabel as getSharedServerQuestionTypeLabel,
  isImplementedLegacyQuestionType as isImplementedLegacyQuestionTypeFromShared,
  legacyQuestionMatchesServerType as legacyQuestionMatchesServerTypeFromShared,
  legacyQuestionUsesMatrixConfig as legacyQuestionUsesMatrixConfigFromShared,
  legacyQuestionTypeHasOptions as legacyQuestionTypeHasOptionsFromShared,
  legacyQuestionUsesStandaloneConfig as legacyQuestionUsesStandaloneConfigFromShared,
  mapLegacyTypeToServer as mapLegacyTypeToServerFromShared,
  mapServerTypeToLegacy as mapServerTypeToLegacyFromShared,
  normalizeServerQuestionType as normalizeServerQuestionTypeFromShared,
  serverQuestionTypeHasOptions as serverQuestionTypeHasOptionsFromShared
} from '../../../shared/questionTypeRegistry.js'

export type ServerQuestionType =
  | 'input'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'slider'
  | 'ranking'
  | 'upload'
  | 'rating'
  | 'scale'
  | 'matrix'

export type QuestionAnalyticsKind = 'choice' | 'text' | 'metric' | 'files' | 'rating' | 'matrix' | 'other'
export type LegacyQuestionConfigPanel = 'default' | 'standalone' | 'matrix'

type QuestionWithUiType = Pick<Question, 'type'> & { uiType?: number | string }

export const LEGACY_TO_SERVER_TYPE = legacyToServerTypeMap as Record<number, ServerQuestionType>
export const SERVER_TO_LEGACY_TYPE = serverToLegacyTypeMap as Record<string, LegacyQuestionType>
export const LEGACY_QUESTION_TYPE_LABEL = legacyQuestionTypeLabels as Record<number, string>
export const IMPLEMENTED_LEGACY_QUESTION_TYPES = new Set<number>(implementedLegacyQuestionTypes as number[])

export function mapLegacyTypeToServer(type: LegacyQuestionType | number | string): ServerQuestionType {
  return mapLegacyTypeToServerFromShared(type) as ServerQuestionType
}

export function normalizeServerQuestionType(type: string): ServerQuestionType {
  return normalizeServerQuestionTypeFromShared(type) as ServerQuestionType
}

export function mapServerTypeToLegacy(type: string, uiType?: number | string): LegacyQuestionType {
  return mapServerTypeToLegacyFromShared(type, uiType) as LegacyQuestionType
}

export function isImplementedLegacyQuestionType(type: number | string): boolean {
  return isImplementedLegacyQuestionTypeFromShared(type)
}

export function getLegacyQuestionTypeLabel(type: number | string): string {
  return getSharedLegacyQuestionTypeLabel(type)
}

export function getServerQuestionTypeLabel(type: string): string {
  return getSharedServerQuestionTypeLabel(type)
}

export function getServerQuestionAnalyticsKind(type: string): QuestionAnalyticsKind {
  return getSharedServerQuestionAnalyticsKind(type) as QuestionAnalyticsKind
}

export function legacyQuestionTypeHasOptions(type: number | string): boolean {
  return legacyQuestionTypeHasOptionsFromShared(type)
}

export function serverQuestionTypeHasOptions(type: string): boolean {
  return serverQuestionTypeHasOptionsFromShared(type)
}

export function getLegacyQuestionDefaultOptions(type: number | string): string[] | undefined {
  return getSharedLegacyQuestionDefaultOptions(type)
}

export function getLegacyQuestionConfigPanel(type: number | string): LegacyQuestionConfigPanel {
  return getSharedLegacyQuestionConfigPanel(type) as LegacyQuestionConfigPanel
}

export function legacyQuestionUsesStandaloneConfig(type: number | string): boolean {
  return legacyQuestionUsesStandaloneConfigFromShared(type)
}

export function legacyQuestionUsesMatrixConfig(type: number | string): boolean {
  return legacyQuestionUsesMatrixConfigFromShared(type)
}

export function legacyQuestionMatchesServerType(type: number | string, serverType: string): boolean {
  return legacyQuestionMatchesServerTypeFromShared(type, serverType)
}

export function getLegacyQuestionDraftConfig<T extends Record<string, unknown> = Record<string, unknown>>(type: number | string): T | null {
  return getSharedLegacyQuestionDraftConfig(type) as T | null
}

export function getQuestionRenderType(question: QuestionWithUiType): string {
  return getSharedQuestionRenderType(question)
}
