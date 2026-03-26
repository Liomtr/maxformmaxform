import {
  getQuestionRenderType,
  getServerQuestionAnalyticsKind,
  getServerQuestionTypeLabel,
  normalizeServerQuestionType
} from './questionTypeRegistry.js'

function isAnsweredValue(value) {
  if (Array.isArray(value)) return value.length > 0
  if (value == null) return false
  if (typeof value === 'string') return value.trim() !== ''
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function toFiniteNumber(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function toRoundedAverage(values, digits = 2) {
  if (!Array.isArray(values) || values.length === 0) return null
  const total = values.reduce((sum, value) => sum + value, 0)
  return Number((total / values.length).toFixed(digits))
}

function buildNumericDistribution(values) {
  if (!Array.isArray(values) || values.length === 0) return {}

  const counts = new Map()
  values.forEach(value => {
    const key = Number(value)
    counts.set(key, (counts.get(key) || 0) + 1)
  })

  const total = values.length
  return Object.fromEntries(
    Array.from(counts.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([score, count]) => [String(score), Number(((count / total) * 100).toFixed(2))])
  )
}

function groupAnswersByQuestionId(submissions) {
  const answersByQuestionId = new Map()

  for (const submission of submissions) {
    const items = Array.isArray(submission?.answers_data) ? submission.answers_data : []
    for (const item of items) {
      const questionId = Number(item?.questionId)
      if (!Number.isFinite(questionId) || questionId < 1) continue
      if (!answersByQuestionId.has(questionId)) answersByQuestionId.set(questionId, [])
      answersByQuestionId.get(questionId).push(item)
    }
  }

  return answersByQuestionId
}

function buildChoiceStats(question, answeredItems, base) {
  const options = Array.isArray(question.options) ? question.options : []
  const answeredCount = answeredItems.length

  return {
    ...base,
    options: options.map(option => {
      const count = answeredItems.reduce((sum, item) => {
        const value = item?.value
        if (question.type === 'checkbox') {
          return sum + (Array.isArray(value) && value.map(String).includes(String(option.value)) ? 1 : 0)
        }
        return sum + (String(value) === String(option.value) ? 1 : 0)
      }, 0)

      return {
        label: String(option.label || option.value || ''),
        value: String(option.value || ''),
        count,
        percentage: answeredCount > 0 ? Number(((count / answeredCount) * 100).toFixed(2)) : 0
      }
    })
  }
}

function buildRankingStats(question, answeredItems, base) {
  const options = Array.isArray(question.options) ? question.options : []
  const answeredCount = answeredItems.length

  return {
    ...base,
    options: options.map(option => {
      const positions = answeredItems.flatMap(item => {
        const value = Array.isArray(item?.value) ? item.value.map(String) : []
        const indexInAnswer = value.indexOf(String(option.value))
        return indexInAnswer >= 0 ? [indexInAnswer + 1] : []
      })

      const count = positions.length
      return {
        label: String(option.label || option.value || ''),
        value: String(option.value || ''),
        count,
        percentage: answeredCount > 0 ? Number(((count / answeredCount) * 100).toFixed(2)) : 0,
        avgRank: toRoundedAverage(positions)
      }
    })
  }
}

function buildRatioStats(question, answeredItems, base) {
  const options = Array.isArray(question.options) ? question.options : []
  const answeredCount = answeredItems.length

  return {
    ...base,
    options: options.map(option => {
      const shares = answeredItems.map(item => {
        const value = item?.value
        if (!value || typeof value !== 'object' || Array.isArray(value)) return 0
        const numeric = toFiniteNumber(value[String(option.value)])
        return numeric != null ? Math.max(0, numeric) : 0
      })

      const totalShare = Number(shares.reduce((sum, share) => sum + share, 0).toFixed(2))
      const count = shares.filter(share => share > 0).length

      return {
        label: String(option.label || option.value || ''),
        value: String(option.value || ''),
        count,
        percentage: answeredCount > 0 ? Number(((count / answeredCount) * 100).toFixed(2)) : 0,
        totalShare,
        avgShare: answeredCount > 0 ? Number((totalShare / answeredCount).toFixed(2)) : 0
      }
    })
  }
}

function buildTextStats(answeredItems, base) {
  const values = answeredItems
    .map(item => String(item.value).trim())
    .filter(Boolean)

  return {
    ...base,
    sampleAnswers: Array.from(new Set(values)).slice(0, 5)
  }
}

function buildDateStats(answeredItems, base) {
  const values = answeredItems
    .map(item => String(item.value || '').trim())
    .filter(Boolean)
    .sort()

  return {
    ...base,
    sampleAnswers: Array.from(new Set(values)).slice(0, 5),
    earliestDate: values[0] || null,
    latestDate: values[values.length - 1] || null
  }
}

function buildMetricStats(answeredItems, base) {
  const values = answeredItems
    .map(item => toFiniteNumber(item.value))
    .filter(value => value != null)

  return {
    ...base,
    avgValue: toRoundedAverage(values),
    minValue: values.length > 0 ? Math.min(...values) : null,
    maxValue: values.length > 0 ? Math.max(...values) : null
  }
}

function buildRatingStats(answeredItems, base) {
  const values = answeredItems
    .map(item => toFiniteNumber(item.value))
    .filter(value => value != null)

  return {
    ...base,
    avgScore: toRoundedAverage(values),
    distribution: buildNumericDistribution(values)
  }
}

function buildMatrixStats(question, answeredItems, base) {
  const options = Array.isArray(question.options) ? question.options : []
  const rows = Array.isArray(question?.matrix?.rows) ? question.matrix.rows : []
  const isMultipleMatrix = question?.matrix?.selectionType === 'multiple'

  return {
    ...base,
    matrixMode: question?.matrix?.selectionType || 'single',
    rows: rows.map(row => {
      const rowValue = String(row?.value || '')
      const rowAnsweredItems = answeredItems.filter(item => {
        const answer = item?.value
        if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return false
        const rowAnswer = answer[rowValue]
        if (isMultipleMatrix) {
          return Array.isArray(rowAnswer) && rowAnswer.length > 0
        }
        return rowAnswer != null && String(rowAnswer).trim() !== ''
      })

      return {
        label: String(row?.label || rowValue),
        value: rowValue,
        totalAnswers: rowAnsweredItems.length,
        options: options.map(option => {
          const count = rowAnsweredItems.reduce((sum, item) => {
            const rowAnswer = item.value?.[rowValue]
            if (isMultipleMatrix) {
              return sum + (Array.isArray(rowAnswer) && rowAnswer.some(selected => String(selected) === String(option.value)) ? 1 : 0)
            }
            return sum + (String(rowAnswer) === String(option.value) ? 1 : 0)
          }, 0)

          return {
            label: String(option.label || option.value || ''),
            value: String(option.value || ''),
            count,
            percentage: rowAnsweredItems.length > 0 ? Number(((count / rowAnsweredItems.length) * 100).toFixed(2)) : 0
          }
        })
      }
    })
  }
}

function buildFileStats(answeredItems, base) {
  const fileLists = answeredItems
    .map(item => (Array.isArray(item?.value) ? item.value : []))
    .filter(list => list.length > 0)
  const files = fileLists.flat()

  return {
    ...base,
    totalFiles: files.length,
    sampleFiles: files.slice(0, 5).map(file => ({
      id: Number(file?.id || 0),
      name: String(file?.name || ''),
      url: String(file?.url || ''),
      type: String(file?.type || ''),
      size: Number(file?.size || 0)
    }))
  }
}

export function buildQuestionStats(questions, submissions, options = {}) {
  const normalizedQuestions = Array.isArray(questions) ? questions : []
  const questionTitlePrefix = String(options.questionTitlePrefix || 'Question')
  const answersByQuestionId = groupAnswersByQuestionId(Array.isArray(submissions) ? submissions : [])

  return normalizedQuestions.flatMap((question, index) => {
    if (getQuestionRenderType(question) === 'stage_explain') return []

    const questionId = index + 1
    const type = normalizeServerQuestionType(question?.type)
    const answerItems = answersByQuestionId.get(questionId) || []
    const answeredItems = answerItems.filter(item => isAnsweredValue(item?.value))
    const base = {
      questionId,
      questionTitle: String(question?.title || `${questionTitlePrefix} ${questionId}`),
      type,
      totalAnswers: answeredItems.length
    }
    const analyticsKind = getServerQuestionAnalyticsKind(type)

    if (type === 'radio' || type === 'checkbox') {
      return [buildChoiceStats(question, answeredItems, base)]
    }

    if (type === 'ranking') {
      return [buildRankingStats(question, answeredItems, base)]
    }

    if (type === 'ratio') {
      return [buildRatioStats(question, answeredItems, base)]
    }

    if (analyticsKind === 'text') {
      return [type === 'date' ? buildDateStats(answeredItems, base) : buildTextStats(answeredItems, base)]
    }

    if (analyticsKind === 'metric') {
      return [buildMetricStats(answeredItems, base)]
    }

    if (analyticsKind === 'rating') {
      return [buildRatingStats(answeredItems, base)]
    }

    if (analyticsKind === 'matrix') {
      return [buildMatrixStats(question, answeredItems, base)]
    }

    if (analyticsKind === 'files') {
      return [buildFileStats(answeredItems, base)]
    }

    return [base]
  })
}

export function normalizeQuestionStat(stat) {
  const type = normalizeServerQuestionType(stat?.type)
  const analyticsKind = getServerQuestionAnalyticsKind(type)
  const base = {
    questionId: stat?.questionId,
    questionTitle: String(stat?.questionTitle || ''),
    questionTypeLabel: getServerQuestionTypeLabel(type),
    sourceType: type
  }

  if (analyticsKind === 'choice') {
    return {
      ...base,
      type: 'choice',
      isRadio: type === 'radio',
      options: Array.isArray(stat?.options) ? stat.options : []
    }
  }

  if (analyticsKind === 'ratio') {
    return {
      ...base,
      type: 'ratio',
      totalAnswers: Number(stat?.totalAnswers || 0),
      options: Array.isArray(stat?.options) ? stat.options : []
    }
  }

  if (analyticsKind === 'text') {
    return {
      ...base,
      type: 'text',
      sampleAnswers: Array.isArray(stat?.sampleAnswers) ? stat.sampleAnswers : [],
      totalAnswers: Number(stat?.totalAnswers || 0),
      earliestDate: stat?.earliestDate || null,
      latestDate: stat?.latestDate || null
    }
  }

  if (analyticsKind === 'metric') {
    return {
      ...base,
      type: 'metric',
      totalAnswers: Number(stat?.totalAnswers || 0),
      avgValue: stat?.avgValue ?? null,
      minValue: stat?.minValue ?? null,
      maxValue: stat?.maxValue ?? null
    }
  }

  if (analyticsKind === 'matrix') {
    return {
      ...base,
      type: 'matrix',
      matrixMode: stat?.matrixMode || 'single',
      rows: (Array.isArray(stat?.rows) ? stat.rows : []).map(row => ({
        label: String(row?.label || ''),
        value: String(row?.value || ''),
        totalAnswers: Number(row?.totalAnswers || 0),
        options: Array.isArray(row?.options) ? row.options : []
      }))
    }
  }

  if (analyticsKind === 'files') {
    return {
      ...base,
      type: 'files',
      totalAnswers: Number(stat?.totalAnswers || 0),
      totalFiles: Number(stat?.totalFiles || 0),
      sampleFiles: Array.isArray(stat?.sampleFiles) ? stat.sampleFiles : []
    }
  }

  if (analyticsKind === 'rating') {
    return {
      ...base,
      type: 'rating',
      avgScore: stat?.avgScore ?? 0,
      distribution: stat?.distribution && typeof stat.distribution === 'object' ? stat.distribution : {}
    }
  }

  return null
}

export function getQuestionStatAverageLabel(stat) {
  const type = normalizeServerQuestionType(stat?.sourceType ?? stat?.type)
  if (type === 'ratio') return '平均占比'
  return type === 'scale' ? '平均值' : '平均分'
}

export function getQuestionStatDistributionLabel(stat, key) {
  const type = normalizeServerQuestionType(stat?.sourceType ?? stat?.type)
  if (type === 'rating') return `${key} 星`
  if (type === 'scale') return `${key} 分`
  return String(key)
}
