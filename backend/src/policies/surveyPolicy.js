import { isAdmin, isOwner } from './accessPolicy.js'
import { SURVEY_ERROR_CODES, SURVEY_STATUS } from '../../../shared/survey.contract.js'

function getSurveyEndTime(survey) {
  const raw = survey?.settings?.endTime
  if (!raw) return null

  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

export function isSurveyExpired(survey) {
  const endTime = getSurveyEndTime(survey)
  return !!endTime && endTime.getTime() <= Date.now()
}

export function canManageSurvey(user, survey) {
  return isAdmin(user) || isOwner(user, survey?.creator_id)
}

export function getSurveyAccessMeta(survey) {
  const endTime = getSurveyEndTime(survey)
  const expired = !!endTime && endTime.getTime() <= Date.now()
  return {
    title: survey?.title,
    status: expired ? 'expired' : survey?.status,
    closedAt: endTime ? endTime.toISOString() : null
  }
}

export function getManageSurveyPolicy(user, survey, options = {}) {
  if (canManageSurvey(user, survey)) {
    return { allowed: true }
  }

  return {
    allowed: false,
    status: 403,
    body: {
      success: false,
      error: {
        code: SURVEY_ERROR_CODES.FORBIDDEN,
        message: options.message || 'You do not have permission to manage this survey'
      }
    }
  }
}

export function getPublicSurveyPolicy(user, survey) {
  if (survey?.status !== SURVEY_STATUS.PUBLISHED && !canManageSurvey(user, survey)) {
    return {
      allowed: false,
      status: 403,
      body: {
        success: false,
        error: { code: SURVEY_ERROR_CODES.FORBIDDEN, message: 'Survey is not published or access is forbidden' },
        data: getSurveyAccessMeta(survey)
      }
    }
  }

  if (isSurveyExpired(survey) && !canManageSurvey(user, survey)) {
    return {
      allowed: false,
      status: 403,
      body: {
        success: false,
        error: { code: SURVEY_ERROR_CODES.SURVEY_EXPIRED, message: 'Survey has expired' },
        data: getSurveyAccessMeta(survey)
      }
    }
  }

  return { allowed: true }
}
