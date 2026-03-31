import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import answerRepository from '../src/repositories/answerRepository.js'
import fileRepository from '../src/repositories/fileRepository.js'
import surveyRepository from '../src/repositories/surveyRepository.js'
import surveyResultsSnapshotRepository from '../src/repositories/surveyResultsSnapshotRepository.js'
import { registerApiRouteHarness, UPLOAD_DIR } from './helpers/apiRouteHarness.js'
const { request, requestRaw } = registerApiRouteHarness()

test('GET /api/surveys/:id/results returns question level statistics', async () => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const toDateKey = value => {
    const date = new Date(value)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  surveyRepository.findByIdentifier = async () => ({
    id: 51,
    creator_id: 1,
    title: 'Analytics Survey',
    questions: [
      { type: 'radio', title: 'Single Choice', options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }] },
      { type: 'checkbox', title: 'Multiple Choice', options: [{ label: 'A', value: 'a' }, { label: 'B', value: 'b' }] },
      { type: 'input', title: 'Text Input' },
      { type: 'slider', title: 'Slider' },
      { type: 'rating', title: 'Rating' },
      { type: 'scale', title: 'Scale' },
      {
        type: 'matrix',
        title: 'Matrix Single',
        options: [{ label: 'Good', value: '1' }, { label: 'Fair', value: '2' }, { label: 'Poor', value: '3' }],
        matrix: {
          selectionType: 'single',
          rows: [{ label: 'Service', value: '1' }, { label: 'Speed', value: '2' }]
        }
      },
      {
        type: 'matrix',
        title: 'Matrix Multiple',
        options: [{ label: 'Skilled', value: '1' }, { label: 'Independent', value: '2' }, { label: 'Needs Help', value: '3' }],
        matrix: {
          selectionType: 'multiple',
          rows: [{ label: 'Product', value: '1' }, { label: 'System', value: '2' }]
        }
      },
      {
        type: 'matrix',
        uiType: 24,
        title: 'Matrix Dropdown',
        options: [{ label: 'High', value: '1' }, { label: 'Medium', value: '2' }, { label: 'Low', value: '3' }],
        matrix: {
          selectionType: 'single',
          rows: [{ label: 'Delivery', value: '1' }, { label: 'Collaboration', value: '2' }]
        }
      },
      { type: 'ratio', title: 'Ratio', options: [{ label: 'Brand', value: '1' }, { label: 'Price', value: '2' }, { label: 'Service', value: '3' }] },
      { type: 'ranking', title: 'Ranking', options: [{ label: 'X', value: 'x' }, { label: 'Y', value: 'y' }] },
      { type: 'upload', title: 'Upload' },
      { type: 'date', title: 'Date' }
    ]
  })
  answerRepository.getAggregateState = async () => ({
    answerCount: 2,
    latestAnswerId: 2,
    latestSubmittedAt: now.toISOString()
  })

  answerRepository.listBySurveyId = async () => ([
    {
      id: 1,
      status: 'completed',
      duration: 30,
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      submitted_at: now.toISOString(),
      answers_data: [
        { questionId: 1, questionType: 'radio', value: 'yes' },
        { questionId: 2, questionType: 'checkbox', value: ['a', 'b'] },
        { questionId: 3, questionType: 'input', value: 'sample one' },
        { questionId: 4, questionType: 'slider', value: 5 },
        { questionId: 5, questionType: 'rating', value: 5 },
        { questionId: 6, questionType: 'scale', value: 9 },
        { questionId: 7, questionType: 'matrix', value: { 1: '1', 2: '2' } },
        { questionId: 8, questionType: 'matrix', value: { 1: ['1', '2'], 2: ['2'] } },
        { questionId: 9, questionType: 'matrix', value: { 1: '1', 2: '2' } },
        { questionId: 10, questionType: 'ratio', value: { 1: 50, 2: 30, 3: 20 } },
        { questionId: 11, questionType: 'ranking', value: ['x', 'y'] },
        { questionId: 12, questionType: 'upload', value: [{ id: 101, name: 'a.pdf', url: '/uploads/a.pdf', size: 123, type: 'application/pdf' }] },
        { questionId: 13, questionType: 'date', value: '2026-03-20' }
      ]
    },
    {
      id: 2,
      status: 'incomplete',
      duration: 90,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
      submitted_at: yesterday.toISOString(),
      answers_data: [
        { questionId: 1, questionType: 'radio', value: 'no' },
        { questionId: 2, questionType: 'checkbox', value: ['b'] },
        { questionId: 3, questionType: 'input', value: 'sample two' },
        { questionId: 4, questionType: 'slider', value: 3 },
        { questionId: 5, questionType: 'rating', value: 3 },
        { questionId: 6, questionType: 'scale', value: 7 },
        { questionId: 7, questionType: 'matrix', value: { 1: '2', 2: '1' } },
        { questionId: 8, questionType: 'matrix', value: { 1: ['2'], 2: ['1', '3'] } },
        { questionId: 9, questionType: 'matrix', value: { 1: '2', 2: '1' } },
        { questionId: 10, questionType: 'ratio', value: { 1: 40, 2: 40, 3: 20 } },
        { questionId: 11, questionType: 'ranking', value: ['y', 'x'] },
        {
          questionId: 12,
          questionType: 'upload',
          value: [
            { id: 102, name: 'b.pdf', url: '/uploads/b.pdf', size: 456, type: 'application/pdf' },
            { id: 103, name: 'c.pdf', url: '/uploads/c.pdf', size: 789, type: 'application/pdf' }
          ]
        },
        { questionId: 13, questionType: 'date', value: '2026-03-22' }
      ]
    }
  ])

  const { response, json } = await request('/surveys/51/results')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.totalSubmissions, 2)
  assert.equal(json.data.total, 2)
  assert.equal(json.data.today, 1)
  assert.equal(json.data.completed, 1)
  assert.equal(json.data.incomplete, 1)
  assert.equal(json.data.completionRate, 50)
  assert.ok(Array.isArray(json.data.questionStats))
  assert.equal(json.data.questionStats.length, 13)
  assert.deepEqual(json.data.systemStats.devices, [
    { label: 'Desktop', value: '1' },
    { label: 'Mobile', value: '1' }
  ])
  assert.deepEqual(json.data.systemStats.browsers, [
    { label: 'Chrome', value: '1' },
    { label: 'Safari', value: '1' }
  ])
  assert.deepEqual(json.data.systemStats.operatingSystems, [
    { label: 'iOS', value: '1' },
    { label: 'Windows', value: '1' }
  ])
  assert.equal(json.data.submissionTrend.length, 30)
  assert.equal(json.data.submissionTrend.at(-1).date, toDateKey(now))
  assert.equal(json.data.submissionTrend.at(-1).count, 1)
  assert.equal(json.data.submissionTrend.at(-2).date, toDateKey(yesterday))
  assert.equal(json.data.submissionTrend.at(-2).count, 1)
  assert.deepEqual(json.data.regionStats, {
    hasLocationData: false,
    scope: 'submission-origin',
    missingCount: 2,
    items: [],
    emptyReason: 'No province/city source is stored for submissions yet.'
  })
  assert.equal(json.data.observability.snapshot.currentAccessMode, 'snapshot-rebuild')
  assert.equal(json.data.observability.snapshot.currentMissReason, 'missing')
  assert.equal(json.data.observability.snapshot.record.exists, false)
  assert.equal(json.data.observability.snapshot.source.answerCount, 2)
  assert.equal(json.data.observability.baseline.answerCount, 2)
  assert.equal(json.data.observability.baseline.largeSample, false)

  const radioStat = json.data.questionStats.find(item => item.questionId === 1)
  assert.equal(radioStat.options[0].count, 1)
  assert.equal(radioStat.options[0].percentage, 50)
  assert.equal(radioStat.options[1].count, 1)

  const inputStat = json.data.questionStats.find(item => item.questionId === 3)
  assert.deepEqual(inputStat.sampleAnswers, ['sample one', 'sample two'])

  const sliderStat = json.data.questionStats.find(item => item.questionId === 4)
  assert.equal(sliderStat.avgValue, 4)
  assert.equal(sliderStat.minValue, 3)
  assert.equal(sliderStat.maxValue, 5)

  const ratingStat = json.data.questionStats.find(item => item.questionId === 5)
  assert.equal(ratingStat.avgScore, 4)
  assert.equal(ratingStat.distribution['5'], 50)
  assert.equal(ratingStat.distribution['3'], 50)

  const scaleStat = json.data.questionStats.find(item => item.questionId === 6)
  assert.equal(scaleStat.avgScore, 8)
  assert.equal(scaleStat.distribution['9'], 50)
  assert.equal(scaleStat.distribution['7'], 50)

  const matrixStat = json.data.questionStats.find(item => item.questionId === 7)
  assert.equal(matrixStat.rows.length, 2)
  assert.equal(matrixStat.rows[0].options[0].count, 1)
  assert.equal(matrixStat.rows[0].options[1].count, 1)
  assert.equal(matrixStat.rows[1].options[0].count, 1)
  assert.equal(matrixStat.rows[1].options[1].count, 1)

  const matrixMultiStat = json.data.questionStats.find(item => item.questionId === 8)
  assert.equal(matrixMultiStat.matrixMode, 'multiple')
  assert.equal(matrixMultiStat.rows[0].options[0].count, 1)
  assert.equal(matrixMultiStat.rows[0].options[1].count, 2)
  assert.equal(matrixMultiStat.rows[1].options[0].count, 1)
  assert.equal(matrixMultiStat.rows[1].options[1].count, 1)
  assert.equal(matrixMultiStat.rows[1].options[2].count, 1)

  const matrixDropdownStat = json.data.questionStats.find(item => item.questionId === 9)
  assert.equal(matrixDropdownStat.matrixMode, 'single')
  assert.equal(matrixDropdownStat.rows[0].options[0].count, 1)
  assert.equal(matrixDropdownStat.rows[0].options[1].count, 1)
  assert.equal(matrixDropdownStat.rows[1].options[0].count, 1)
  assert.equal(matrixDropdownStat.rows[1].options[1].count, 1)

  const ratioStat = json.data.questionStats.find(item => item.questionId === 10)
  assert.equal(ratioStat.options[0].avgShare, 45)
  assert.equal(ratioStat.options[1].avgShare, 35)
  assert.equal(ratioStat.options[2].avgShare, 20)
  assert.equal(ratioStat.options[0].count, 2)

  const rankingStat = json.data.questionStats.find(item => item.questionId === 11)
  assert.equal(rankingStat.options[0].avgRank, 1.5)
  assert.equal(rankingStat.options[1].avgRank, 1.5)

  const uploadStat = json.data.questionStats.find(item => item.questionId === 12)
  assert.equal(uploadStat.totalAnswers, 2)
  assert.equal(uploadStat.totalFiles, 3)
  assert.equal(uploadStat.sampleFiles.length, 3)

  const dateStat = json.data.questionStats.find(item => item.questionId === 13)
  assert.equal(dateStat.earliestDate, '2026-03-20')
  assert.equal(dateStat.latestDate, '2026-03-22')
})

test('GET /api/surveys/:id/results exposes large-sample baseline metrics on snapshot hits', async () => {
  surveyRepository.findByIdentifier = async () => ({
    id: 53,
    creator_id: 1,
    title: 'Large Sample Survey',
    updated_at: '2026-03-28T09:00:00.000Z',
    questions: Array.from({ length: 12 }, (_, index) => ({
      id: index + 1,
      type: 'input',
      title: `Question ${index + 1}`
    }))
  })
  answerRepository.getAggregateState = async () => ({
    answerCount: 1200,
    latestAnswerId: 1200,
    latestSubmittedAt: '2026-03-28T12:00:00.000Z'
  })
  surveyResultsSnapshotRepository.findBySurveyId = async () => ({
    payload: {
      totalSubmissions: 1200,
      total: 1200,
      today: 32,
      completed: 1180,
      incomplete: 20,
      completionRate: 98.3,
      avgDuration: '42s',
      avgTime: 42,
      lastSubmitAt: '2026-03-28T12:00:00.000Z',
      submissionTrend: Array.from({ length: 30 }, (_, index) => ({
        date: `2026-03-${String(index + 1).padStart(2, '0')}`,
        label: String(index + 1).padStart(2, '0'),
        count: index + 1
      })),
      regionStats: {
        hasLocationData: true,
        scope: 'submission-origin',
        missingCount: 0,
        items: [{ label: 'Guangdong / Shenzhen', value: '1200' }],
        emptyReason: null
      },
      systemStats: {
        devices: [{ label: 'Desktop', value: '900' }, { label: 'Mobile', value: '300' }],
        browsers: [{ label: 'Chrome', value: '1000' }, { label: 'Safari', value: '200' }],
        operatingSystems: [{ label: 'Windows', value: '700' }, { label: 'macOS', value: '500' }]
      },
      questionStats: Array.from({ length: 12 }, (_, index) => ({
        questionId: index + 1,
        questionTitle: `Question ${index + 1}`,
        type: 'input',
        totalAnswers: 1200,
        sampleAnswers: ['A', 'B']
      }))
    },
    answerCount: 1200,
    latestAnswerId: 1200,
    latestSubmittedAt: '2026-03-28T12:00:00.000Z',
    surveyUpdatedAt: '2026-03-28T09:00:00.000Z',
    createdAt: '2026-03-28T12:01:00.000Z',
    updatedAt: '2026-03-28T12:02:00.000Z'
  })
  answerRepository.listBySurveyId = async () => {
    throw new Error('listBySurveyId should not be called on snapshot hit')
  }

  const { response, json } = await request('/surveys/53/results')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.equal(json.data.totalSubmissions, 1200)
  assert.equal(json.data.observability.snapshot.currentAccessMode, 'snapshot-hit')
  assert.equal(json.data.observability.snapshot.record.exists, true)
  assert.equal(json.data.observability.snapshot.record.updatedAt, '2026-03-28T12:02:00.000Z')
  assert.ok(json.data.observability.snapshot.record.ageMs >= 0)
  assert.equal(json.data.observability.snapshot.source.answerCount, 1200)
  assert.equal(json.data.observability.snapshot.hitRate, 100)
  assert.equal(json.data.observability.baseline.answerCount, 1200)
  assert.equal(json.data.observability.baseline.questionCount, 12)
  assert.equal(json.data.observability.baseline.questionStatCount, 12)
  assert.equal(json.data.observability.baseline.largeSample, true)
  assert.equal(json.data.observability.baseline.largeSampleThreshold, 1000)
  assert.equal(json.data.observability.baseline.sampleTier, 'large')
  assert.ok(json.data.observability.baseline.corePayloadBytes > 0)
})

test('GET /api/surveys/:id/results aggregates available region data', async () => {
  surveyRepository.findByIdentifier = async () => ({
    id: 52,
    creator_id: 1,
    title: 'Region Survey',
    questions: []
  })

  answerRepository.listBySurveyId = async () => ([
    {
      id: 11,
      province: 'Guangdong',
      city: 'Shenzhen',
      submitted_at: new Date().toISOString(),
      answers_data: []
    },
    {
      id: 12,
      province_name: 'Guangdong',
      city_name: 'Shenzhen',
      submitted_at: new Date().toISOString(),
      answers_data: []
    },
    {
      id: 13,
      geo_province: 'Zhejiang',
      geo_city: 'Hangzhou',
      submitted_at: new Date().toISOString(),
      answers_data: []
    }
  ])

  const { response, json } = await request('/surveys/52/results')

  assert.equal(response.status, 200)
  assert.equal(json.success, true)
  assert.deepEqual(json.data.regionStats, {
    hasLocationData: true,
    scope: 'submission-origin',
    missingCount: 0,
    items: [
      { label: 'Guangdong / Shenzhen', value: '2' },
      { label: 'Zhejiang / Hangzhou', value: '1' }
    ],
    emptyReason: null
  })
})

test('POST /api/answers/download/attachments streams a zip for managed survey files', async () => {
  const fixtureName = 'attachments-fixture.txt'
  const fixturePath = `${UPLOAD_DIR}/${fixtureName}`
  fs.writeFileSync(fixturePath, 'attachment fixture')

  surveyRepository.findByIdentifier = async () => ({
    id: 61,
    creator_id: 1,
    title: 'Attachment Survey'
  })
  fileRepository.listAnswerFilesBySurveyId = async () => ([
    {
      id: 7001,
      answer_id: 88,
      survey_id: 61,
      name: 'evidence.txt',
      url: `/uploads/${fixtureName}`
    }
  ])

  try {
    const { response, buffer } = await requestRaw('/answers/download/attachments', {
      method: 'POST',
      body: { survey_id: 61 }
    })

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-type'), 'application/zip')
    assert.match(response.headers.get('content-disposition') || '', /survey-61-attachments\.zip/)
    assert.ok(buffer.length > 20)
    assert.equal(buffer.subarray(0, 2).toString(), 'PK')
  } finally {
    if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath)
  }
})

test('POST /api/answers/download/survey streams an xlsx for managed survey answers', async () => {
  surveyRepository.findByIdentifier = async () => ({
    id: 62,
    creator_id: 1,
    title: 'Workbook Survey'
  })
  answerRepository.listBySurveyId = async () => ([
    {
      id: 701,
      submitted_at: '2026-03-28T12:00:00.000Z',
      ip_address: '1.1.1.1',
      duration: 12,
      status: 'completed',
      answers_data: [{ questionId: 1, value: 'Alice' }]
    }
  ])

  const { response, buffer } = await requestRaw('/answers/download/survey', {
    method: 'POST',
    body: { survey_id: 62 }
  })

  assert.equal(response.status, 200)
  assert.equal(
    response.headers.get('content-type'),
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  )
  assert.match(response.headers.get('content-disposition') || '', /survey-62\.xlsx/)
  assert.ok(buffer.length > 20)
  assert.equal(buffer.subarray(0, 2).toString('hex'), '504b')
})

test('POST /api/answers/download/survey rejects invalid survey_id payload structures', async () => {
  const { response, json } = await request('/answers/download/survey', {
    method: 'POST',
    body: { survey_id: { id: 62 } }
  })

  assert.equal(response.status, 400)
  assert.equal(json.success, false)
  assert.equal(json.error.code, 'VALIDATION')
  assert.match(json.error.message, /survey_id must be an integer/i)
})


