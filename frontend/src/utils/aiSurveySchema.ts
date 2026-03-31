import { z } from 'zod'

const aiOptionSchema = z.union([
  z.string().trim().min(1).transform(label => ({ label, value: label })),
  z.object({
    label: z.string().trim().min(1),
    value: z.union([z.string(), z.number()]).optional()
  })
]).transform(option => ({
  label: option.label,
  value: option.value ?? option.label
}))

const aiNumberValidationSchema = z.object({
  min: z.number().finite().optional(),
  max: z.number().finite().optional(),
  step: z.number().positive().finite().optional()
})

const aiQuestionSchema = z.object({
  qid: z.union([z.string(), z.number()]).transform(value => String(value).trim()),
  title: z.string().trim().min(1),
  type: z.enum(['radio', 'checkbox', 'text', 'textarea', 'number', 'date', 'select']),
  required: z.boolean().optional().default(false),
  options: z.array(aiOptionSchema).optional(),
  placeholder: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  validation: aiNumberValidationSchema.optional()
}).superRefine((question, ctx) => {
  if (!question.qid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['qid'],
      message: 'qid is required'
    })
  }

  if (['radio', 'checkbox', 'select'].includes(question.type)) {
    if (!Array.isArray(question.options) || question.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: `${question.type} questions require at least 2 options`
      })
    }
  }

  if (question.type === 'number') {
    const min = question.validation?.min
    const max = question.validation?.max
    const step = question.validation?.step

    if (min != null && max != null && max < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validation', 'max'],
        message: 'validation.max must be greater than or equal to validation.min'
      })
    }

    if (step != null && step <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['validation', 'step'],
        message: 'validation.step must be greater than 0'
      })
    }
  }
})

const aiSurveySchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional().default(''),
  questions: z.array(aiQuestionSchema).min(1)
}).superRefine((survey, ctx) => {
  const seen = new Set<string>()

  survey.questions.forEach((question, index) => {
    if (seen.has(question.qid)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['questions', index, 'qid'],
        message: `duplicate qid "${question.qid}"`
      })
      return
    }

    seen.add(question.qid)
  })
})

export interface AiSurveyImportQuestion {
  legacyType: number
  title: string
  required: boolean
  options?: string[]
  placeholder?: string
  description?: string
  validation?: Record<string, unknown>
}

export interface AiSurveyImportPayload {
  title: string
  description: string
  questions: AiSurveyImportQuestion[]
}

type AiSurveyParseSuccess = {
  success: true
  data: AiSurveyImportPayload
}

type AiSurveyParseFailure = {
  success: false
  issues: string[]
}

export type AiSurveyParseResult = AiSurveyParseSuccess | AiSurveyParseFailure

const AI_JSON_FENCE_PATTERN = /```(?:json)?\s*([\s\S]*?)```/i

function extractJsonCandidate(input: string): string {
  const trimmed = String(input || '').trim()
  if (!trimmed) return ''

  const fencedMatch = trimmed.match(AI_JSON_FENCE_PATTERN)
  if (fencedMatch?.[1]) return fencedMatch[1].trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1).trim()
  }

  return trimmed
}

function mapAiQuestionTypeToLegacy(type: z.infer<typeof aiQuestionSchema>['type']): number {
  switch (type) {
    case 'text':
      return 1
    case 'textarea':
      return 2
    case 'radio':
      return 3
    case 'checkbox':
      return 4
    case 'select':
      return 7
    case 'number':
      return 8
    case 'date':
      return 14
    default:
      return 1
  }
}

function toImportPayload(input: z.infer<typeof aiSurveySchema>): AiSurveyImportPayload {
  return {
    title: input.title,
    description: input.description || '',
    questions: input.questions.map(question => ({
      legacyType: mapAiQuestionTypeToLegacy(question.type),
      title: question.title,
      required: question.required,
      options: question.options?.map(option => option.label),
      placeholder: question.placeholder,
      description: question.description,
      validation: question.type === 'number'
        ? {
            min: question.validation?.min ?? 0,
            max: question.validation?.max ?? 100,
            step: question.validation?.step ?? 1
          }
        : undefined
    }))
  }
}

export function isLikelyAiJsonInput(input: string): boolean {
  const trimmed = String(input || '').trim()
  return trimmed.startsWith('{') || trimmed.includes('```')
}

export function formatAiSurveyIssues(issues: string[]): string {
  return issues.slice(0, 8).map(issue => `- ${issue}`).join('\n')
}

export function parseAiSurveyInput(input: string): AiSurveyParseResult {
  const jsonCandidate = extractJsonCandidate(input)

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonCandidate)
  } catch {
    return {
      success: false,
      issues: ['AI output is not valid JSON']
    }
  }

  const result = aiSurveySchema.safeParse(parsed)
  if (!result.success) {
    return {
      success: false,
      issues: result.error.issues.map(issue => {
        const path = issue.path.length > 0 ? issue.path.join('.') : 'root'
        return `${path}: ${issue.message}`
      })
    }
  }

  return {
    success: true,
    data: toImportPayload(result.data)
  }
}
