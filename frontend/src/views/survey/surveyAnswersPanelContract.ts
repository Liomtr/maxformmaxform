import type { SurveyResults } from '@/api/surveys'
import type { Survey } from '@/types/survey'

export interface AnswerStats {
  total: number
  today: number
  avgScore: number
  completionRate?: number
  completed?: number
  incomplete?: number
  avgTime?: string
  pageViews?: number
  avgDuration?: string
}

export interface SurveyAnswersPanelContract<Question = any> {
  stats?: AnswerStats
  surveyId?: string
  questions?: Question[]
  surveyTitle?: string
  collectionRange?: string
  initialResults?: SurveyResults | null
}

function formatDateOnly(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN')
}

export function createAnswerStatsFromResults(results: SurveyResults): AnswerStats {
  return {
    total: results.total,
    today: results.today,
    avgScore: results.avgScore || 0,
    completionRate: results.completionRate,
    completed: results.completed,
    incomplete: results.incomplete,
    avgTime: results.avgDuration || (results.avgTime != null ? `${results.avgTime}s` : '-'),
    avgDuration: results.avgDuration || '-'
  }
}

export function createSurveyAnswersPanelContract<Question = any>(
  input: SurveyAnswersPanelContract<Question>
): SurveyAnswersPanelContract<Question> {
  return {
    stats: input.stats,
    surveyId: input.surveyId,
    questions: input.questions || [],
    surveyTitle: input.surveyTitle || '问卷结果',
    collectionRange: input.collectionRange || '--',
    initialResults: input.initialResults ?? null
  }
}

export function createSurveyAnswersPanelContractFromResults({
  survey,
  results
}: {
  survey: Survey
  results: SurveyResults
}): SurveyAnswersPanelContract {
  const start = formatDateOnly(survey.createdAt || survey.created_at)
  const end = formatDateOnly(results.lastSubmitAt) || '至今'

  return createSurveyAnswersPanelContract({
    stats: createAnswerStatsFromResults(results),
    surveyId: String(survey.id),
    questions: survey.questions,
    surveyTitle: survey.title,
    collectionRange: start ? `${start} 至 ${end}` : end,
    initialResults: results
  })
}
