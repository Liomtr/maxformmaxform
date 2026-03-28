import { nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { createSurvey, publishSurvey, updateSurvey } from '@/api/surveys'
import { useEditorBatch } from '@/composables/editor/editor-batch'
import { useEditorCore } from '@/composables/editor/editor-core'
import { useEditorLogic } from '@/composables/editor/editor-logic'
import { useEditorQuota } from '@/composables/editor/editor-quota'
import { useEditorRichtext } from '@/composables/editor/editor-richtext'
import {
  createSurveyPreviewPanelContract,
  type SurveyPreviewPanelContract
} from '@/views/survey/surveyPreviewPanelContract'

type EditorCoreState = ReturnType<typeof useEditorCore>
type EditorRichtextState = ReturnType<typeof useEditorRichtext>
type EditorLogicState = ReturnType<typeof useEditorLogic>
type EditorBatchState = ReturnType<typeof useEditorBatch>
type EditorQuotaState = ReturnType<typeof useEditorQuota>

export type SurveyEditorQuickActionKey = 'toggleNumbers' | 'batchAdd'

export interface SurveyEditorContextBoundary {
  surveyForm: EditorCoreState['surveyForm']
  currentSurveyId: EditorCoreState['currentSurveyId']
  saving: EditorCoreState['saving']
  canPublish: EditorCoreState['canPublish']
  currentTab: EditorCoreState['currentTab']
  showHeaderSettings: EditorCoreState['showHeaderSettings']
  validateForm: EditorCoreState['validateForm']
  errors: EditorCoreState['errors']
  closeQuestionEdit: EditorCoreState['closeQuestionEdit']
  showAIHelper: EditorCoreState['showAIHelper']
  editingIndex: EditorCoreState['editingIndex']
  getQuestionTypeLabel: EditorCoreState['getQuestionTypeLabel']
  moveQuestionUp: EditorCoreState['moveQuestionUp']
  moveQuestionDown: EditorCoreState['moveQuestionDown']
  duplicateQuestion: EditorCoreState['duplicateQuestion']
  deleteQuestion: EditorCoreState['deleteQuestion']
  ensureTitleRich: EditorRichtextState['ensureTitleRich']
  asPlain: EditorRichtextState['asPlain']
  onTitleFocus: EditorRichtextState['onTitleFocus']
  onTitleBlur: EditorRichtextState['onTitleBlur']
  shouldShowTitleBtn: EditorRichtextState['shouldShowTitleBtn']
  openTitleRichEditor: EditorRichtextState['openTitleRichEditor']
  isHintOpen: EditorCoreState['isHintOpen']
  onHintCheckboxChange: EditorCoreState['onHintCheckboxChange']
  hasOptions: EditorCoreState['hasOptions']
  addOption: EditorCoreState['addOption']
  openBatchEdit: EditorBatchState['openBatchEdit']
  isGroupConfigured: EditorCoreState['isGroupConfigured']
  isScoreConfigured: EditorCoreState['isScoreConfigured']
  isQuotaConfigured: EditorQuotaState['isQuotaConfigured']
  openGroupDialog: EditorBatchState['openGroupDialog']
  openQuotaDialog: EditorQuotaState['openQuotaDialog']
  groupHeaderFor: EditorBatchState['groupHeaderFor']
  optionRemaining: EditorQuotaState['optionRemaining']
  optionSummary: EditorLogicState['optionSummary']
  jumpSummary: EditorLogicState['jumpSummary']
  ensureOptionExtras: EditorCoreState['ensureOptionExtras']
  openOptionRichEditor: EditorRichtextState['openOptionRichEditor']
  addOptionAt: EditorCoreState['addOptionAt']
  removeOption: EditorCoreState['removeOption']
  toggleDesc: EditorCoreState['toggleDesc']
  toggleHidden: EditorCoreState['toggleHidden']
  isMatrixLegacyQuestion: EditorCoreState['isMatrixLegacyQuestion']
  isMatrixDropdownLegacyQuestion: EditorCoreState['isMatrixDropdownLegacyQuestion']
  isMatrixMultipleLegacyQuestion: EditorCoreState['isMatrixMultipleLegacyQuestion']
  addMatrixRow: EditorCoreState['addMatrixRow']
  ensureMatrixConfig: EditorCoreState['ensureMatrixConfig']
  removeMatrixRow: EditorCoreState['removeMatrixRow']
  selectablePrevQs: EditorLogicState['selectablePrevQs']
  questionLogicSummary: EditorLogicState['questionLogicSummary']
  openLogicDialog: EditorLogicState['openLogicDialog']
  openJumpDialog: EditorLogicState['openJumpDialog']
  openOptionLogicDialog: EditorLogicState['openOptionLogicDialog']
  isStandaloneConfigType: EditorCoreState['isStandaloneConfigType']
  ensureSliderValidation: EditorCoreState['ensureSliderValidation']
  normalizeSliderValidation: EditorCoreState['normalizeSliderValidation']
  isSliderLegacyQuestion: EditorCoreState['isSliderLegacyQuestion']
  isUploadLegacyQuestion: EditorCoreState['isUploadLegacyQuestion']
  ensureUploadConfig: EditorCoreState['ensureUploadConfig']
  normalizeUploadConfig: EditorCoreState['normalizeUploadConfig']
  uploadConfigSummary: EditorCoreState['uploadConfigSummary']
  isRatingLegacyQuestion: EditorCoreState['isRatingLegacyQuestion']
  ensureRatingValidation: EditorCoreState['ensureRatingValidation']
  normalizeRatingValidation: EditorCoreState['normalizeRatingValidation']
  isScaleLegacyQuestion: EditorCoreState['isScaleLegacyQuestion']
  ensureScaleValidation: EditorCoreState['ensureScaleValidation']
  normalizeScaleValidation: EditorCoreState['normalizeScaleValidation']
  getScalePreviewValues: EditorCoreState['getScalePreviewValues']
  finishEdit: EditorCoreState['finishEdit']
  addQuestionAfter: EditorCoreState['addQuestionAfter']
  openBatchAddDialog: EditorBatchState['openBatchAddDialog']
  panelTab: EditorCoreState['panelTab']
  categoryExpanded: EditorCoreState['categoryExpanded']
  toggleCategory: EditorCoreState['toggleCategory']
  addQuestionByType: EditorCoreState['addQuestionByType']
  aiPrompt: EditorCoreState['aiPrompt']
  generateByAI: EditorCoreState['generateByAI']
  outlineListEl: EditorCoreState['outlineListEl']
  showOutlineTip: EditorCoreState['showOutlineTip']
  draggingIndex: EditorCoreState['draggingIndex']
  onOutlineDragStart: EditorCoreState['onOutlineDragStart']
  dragOverIndex: EditorCoreState['dragOverIndex']
  dragOverPos: EditorCoreState['dragOverPos']
  onOutlineDragOver: EditorCoreState['onOutlineDragOver']
  onOutlineDrop: EditorCoreState['onOutlineDrop']
  onOutlineDragEnd: EditorCoreState['onOutlineDragEnd']
  startRename: EditorCoreState['startRename']
  renamingIndex: EditorCoreState['renamingIndex']
  renameText: EditorCoreState['renameText']
  renameInputEl: EditorCoreState['renameInputEl']
  confirmRename: EditorCoreState['confirmRename']
  showLogicDialog: EditorLogicState['showLogicDialog']
  closeLogicDialog: EditorLogicState['closeLogicDialog']
  logicRows: EditorLogicState['logicRows']
  logicTargetIndex: EditorLogicState['logicTargetIndex']
  togglePick: EditorLogicState['togglePick']
  removeLogicRow: EditorLogicState['removeLogicRow']
  addLogicRow: EditorLogicState['addLogicRow']
  clearCurrentQuestionLogic: EditorLogicState['clearCurrentQuestionLogic']
  clearAllLogicAssociations: EditorLogicState['clearAllLogicAssociations']
  saveLogicDialog: EditorLogicState['saveLogicDialog']
  showOptionDialog: EditorLogicState['showOptionDialog']
  closeOptionDialog: EditorLogicState['closeOptionDialog']
  optionTargetIndex: EditorLogicState['optionTargetIndex']
  activeOptIdx: EditorLogicState['activeOptIdx']
  onPickLeftOption: EditorLogicState['onPickLeftOption']
  optionLabelPlain: EditorRichtextState['optionLabelPlain']
  hasOptionLogic: EditorLogicState['hasOptionLogic']
  currentOptionSummary: EditorLogicState['currentOptionSummary']
  clearCurrentOptionLogic: EditorLogicState['clearCurrentOptionLogic']
  optionLogicRows: EditorLogicState['optionLogicRows']
  toggleOptionPick: EditorLogicState['toggleOptionPick']
  removeOptionLogicRow: EditorLogicState['removeOptionLogicRow']
  addOptionLogicRow: EditorLogicState['addOptionLogicRow']
  saveOptionDialogOne: EditorLogicState['saveOptionDialogOne']
  clearAllOptionLogicForThisQuestion: EditorLogicState['clearAllOptionLogicForThisQuestion']
  saveOptionDialog: EditorLogicState['saveOptionDialog']
  showJumpDialog: EditorLogicState['showJumpDialog']
  closeJumpDialog: EditorLogicState['closeJumpDialog']
  jumpByOptionEnabled: EditorLogicState['jumpByOptionEnabled']
  jumpTargetIndex: EditorLogicState['jumpTargetIndex']
  jumpByOption: EditorLogicState['jumpByOption']
  jumpUnconditionalEnabled: EditorLogicState['jumpUnconditionalEnabled']
  jumpUnconditionalTarget: EditorLogicState['jumpUnconditionalTarget']
  saveJumpDialog: EditorLogicState['saveJumpDialog']
  showRteDialog: EditorRichtextState['showRteDialog']
  rteContent: EditorRichtextState['rteContent']
  applyRteContent: EditorRichtextState['applyRteContent']
  showTitleRte: EditorRichtextState['showTitleRte']
  titleRteContent: EditorRichtextState['titleRteContent']
  applyTitleRteContent: EditorRichtextState['applyTitleRteContent']
  showBatchAddDialog: EditorBatchState['showBatchAddDialog']
  closeBatchAddDialog: EditorBatchState['closeBatchAddDialog']
  batchAddTab: EditorBatchState['batchAddTab']
  batchAddText: EditorBatchState['batchAddText']
  parsedQuestions: EditorBatchState['parsedQuestions']
  showAISuggestion: EditorBatchState['showAISuggestion']
  saveBatchAddQuestions: EditorBatchState['saveBatchAddQuestions']
  showBatchDialog: EditorBatchState['showBatchDialog']
  closeBatchDialog: EditorBatchState['closeBatchDialog']
  batchText: EditorBatchState['batchText']
  batchLineCount: EditorBatchState['batchLineCount']
  presetNames: EditorBatchState['presetNames']
  usePreset: EditorBatchState['usePreset']
  saveBatchEdit: EditorBatchState['saveBatchEdit']
  showGroupDialog: EditorBatchState['showGroupDialog']
  closeGroupDialog: EditorBatchState['closeGroupDialog']
  groupRows: EditorBatchState['groupRows']
  addGroupRow: EditorBatchState['addGroupRow']
  editGroupName: EditorBatchState['editGroupName']
  removeGroupRow: EditorBatchState['removeGroupRow']
  groupSourceOptions: EditorBatchState['groupSourceOptions']
  minStartFor: EditorBatchState['minStartFor']
  normalizeGroupRow: EditorBatchState['normalizeGroupRow']
  groupOrderRandom: EditorBatchState['groupOrderRandom']
  saveGroupDialog: EditorBatchState['saveGroupDialog']
  showGroupNameDialog: EditorBatchState['showGroupNameDialog']
  cancelGroupName: EditorBatchState['cancelGroupName']
  groupNameInput: EditorBatchState['groupNameInput']
  confirmGroupName: EditorBatchState['confirmGroupName']
  showQuotaDialog: EditorQuotaState['showQuotaDialog']
  closeQuotaDialog: EditorQuotaState['closeQuotaDialog']
  quotaEnabled: EditorQuotaState['quotaEnabled']
  quotaActiveTab: EditorQuotaState['quotaActiveTab']
  showQuotaExample: EditorQuotaState['showQuotaExample']
  quotaClearAll: EditorQuotaState['quotaClearAll']
  quotaBatchIncrease: EditorQuotaState['quotaBatchIncrease']
  quotaRows: EditorQuotaState['quotaRows']
  sanitizeQuota: EditorQuotaState['sanitizeQuota']
  quotaTotal: EditorQuotaState['quotaTotal']
  quotaMode: EditorQuotaState['quotaMode']
  quotaFullText: EditorQuotaState['quotaFullText']
  quotaShowRemaining: EditorQuotaState['quotaShowRemaining']
  saveQuotaDialog: EditorQuotaState['saveQuotaDialog']
  answerStats: EditorCoreState['answerStats']
  computedShareLink: EditorCoreState['computedShareLink']
  goBack: EditorCoreState['goBack']
  saveDraft: () => Promise<void>
  publishSurveyAction: () => Promise<void>
  areAllNumbersHidden: EditorCoreState['areAllNumbersHidden']
  triggerQuickAction: (action: SurveyEditorQuickActionKey) => Promise<void>
  switchEditorTab: (tab: 'edit' | 'preview') => void
}

function pickContext<T extends object, K extends readonly (keyof T)[]>(
  source: T,
  keys: K
): Pick<T, K[number]> {
  const result = {} as Pick<T, K[number]>

  for (const key of keys) {
    result[key] = source[key]
  }

  return result
}

const shellKeys = [
  'surveyForm',
  'currentTab',
  'closeQuestionEdit',
  'areAllNumbersHidden',
  'triggerQuickAction',
  'switchEditorTab'
] as const satisfies readonly (keyof SurveyEditorContextBoundary)[]

const toolbarKeys = [
  'currentTab',
  'saving',
  'canPublish',
  'goBack',
  'saveDraft',
  'publishSurveyAction'
] as const satisfies readonly (keyof SurveyEditorContextBoundary)[]

const previewPanelKeys = [
  'surveyForm'
] as const satisfies readonly (keyof SurveyEditorContextBoundary)[]

const questionConfigPanelKeys = [
  'panelTab',
  'categoryExpanded',
  'toggleCategory',
  'addQuestionByType',
  'showAIHelper',
  'aiPrompt',
  'generateByAI',
  'outlineListEl',
  'showOutlineTip',
  'surveyForm',
  'draggingIndex',
  'onOutlineDragStart',
  'dragOverIndex',
  'dragOverPos',
  'onOutlineDragOver',
  'onOutlineDrop',
  'onOutlineDragEnd',
  'editingIndex',
  'currentTab',
  'startRename',
  'renamingIndex',
  'renameText',
  'renameInputEl',
  'confirmRename',
  'getQuestionTypeLabel'
] as const satisfies readonly (keyof SurveyEditorContextBoundary)[]

const questionListPanelKeys = [
  'surveyForm',
  'showHeaderSettings',
  'validateForm',
  'errors',
  'closeQuestionEdit',
  'showAIHelper',
  'editingIndex',
  'getQuestionTypeLabel',
  'moveQuestionUp',
  'moveQuestionDown',
  'duplicateQuestion',
  'deleteQuestion',
  'ensureTitleRich',
  'asPlain',
  'onTitleFocus',
  'onTitleBlur',
  'shouldShowTitleBtn',
  'openTitleRichEditor',
  'isHintOpen',
  'onHintCheckboxChange',
  'hasOptions',
  'addOption',
  'openBatchEdit',
  'isGroupConfigured',
  'isScoreConfigured',
  'isQuotaConfigured',
  'openGroupDialog',
  'openQuotaDialog',
  'groupHeaderFor',
  'optionRemaining',
  'optionSummary',
  'jumpSummary',
  'ensureOptionExtras',
  'openOptionRichEditor',
  'addOptionAt',
  'removeOption',
  'toggleDesc',
  'toggleHidden',
  'isMatrixLegacyQuestion',
  'isMatrixDropdownLegacyQuestion',
  'isMatrixMultipleLegacyQuestion',
  'addMatrixRow',
  'ensureMatrixConfig',
  'removeMatrixRow',
  'selectablePrevQs',
  'questionLogicSummary',
  'openLogicDialog',
  'openJumpDialog',
  'openOptionLogicDialog',
  'isStandaloneConfigType',
  'ensureSliderValidation',
  'normalizeSliderValidation',
  'isSliderLegacyQuestion',
  'isUploadLegacyQuestion',
  'ensureUploadConfig',
  'normalizeUploadConfig',
  'uploadConfigSummary',
  'isRatingLegacyQuestion',
  'ensureRatingValidation',
  'normalizeRatingValidation',
  'isScaleLegacyQuestion',
  'ensureScaleValidation',
  'normalizeScaleValidation',
  'getScalePreviewValues',
  'finishEdit',
  'addQuestionAfter',
  'openBatchAddDialog'
] as const satisfies readonly (keyof SurveyEditorContextBoundary)[]

const publishPanelKeys = [
  'surveyForm',
  'computedShareLink'
] as const satisfies readonly (keyof SurveyEditorContextBoundary)[]

const logicSettingsKeys = [
  'showLogicDialog',
  'closeLogicDialog',
  'logicRows',
  'logicTargetIndex',
  'selectablePrevQs',
  'getQuestionTypeLabel',
  'togglePick',
  'removeLogicRow',
  'addLogicRow',
  'clearCurrentQuestionLogic',
  'clearAllLogicAssociations',
  'saveLogicDialog',
  'showOptionDialog',
  'closeOptionDialog',
  'optionTargetIndex',
  'surveyForm',
  'activeOptIdx',
  'onPickLeftOption',
  'optionLabelPlain',
  'hasOptionLogic',
  'currentOptionSummary',
  'clearCurrentOptionLogic',
  'optionLogicRows',
  'toggleOptionPick',
  'removeOptionLogicRow',
  'addOptionLogicRow',
  'saveOptionDialogOne',
  'clearAllOptionLogicForThisQuestion',
  'saveOptionDialog',
  'showJumpDialog',
  'closeJumpDialog',
  'jumpByOptionEnabled',
  'jumpTargetIndex',
  'asPlain',
  'jumpByOption',
  'jumpUnconditionalEnabled',
  'jumpUnconditionalTarget',
  'saveJumpDialog',
  'showRteDialog',
  'rteContent',
  'applyRteContent',
  'showTitleRte',
  'titleRteContent',
  'applyTitleRteContent',
  'showBatchAddDialog',
  'closeBatchAddDialog',
  'batchAddTab',
  'batchAddText',
  'parsedQuestions',
  'showAISuggestion',
  'saveBatchAddQuestions',
  'showBatchDialog',
  'closeBatchDialog',
  'batchText',
  'batchLineCount',
  'presetNames',
  'usePreset',
  'saveBatchEdit',
  'showGroupDialog',
  'closeGroupDialog',
  'groupRows',
  'addGroupRow',
  'editGroupName',
  'removeGroupRow',
  'groupSourceOptions',
  'minStartFor',
  'normalizeGroupRow',
  'groupOrderRandom',
  'saveGroupDialog',
  'showGroupNameDialog',
  'cancelGroupName',
  'groupNameInput',
  'confirmGroupName',
  'showQuotaDialog',
  'closeQuotaDialog',
  'quotaEnabled',
  'quotaActiveTab',
  'showQuotaExample',
  'quotaClearAll',
  'quotaBatchIncrease',
  'quotaRows',
  'sanitizeQuota',
  'quotaTotal',
  'quotaMode',
  'quotaFullText',
  'quotaShowRemaining',
  'saveQuotaDialog'
] as const satisfies readonly (keyof SurveyEditorContextBoundary)[]

export type SurveyEditorShellContract = Pick<SurveyEditorContextBoundary, (typeof shellKeys)[number]>
export type SurveyEditorToolbarContract = Pick<SurveyEditorContextBoundary, (typeof toolbarKeys)[number]>
export type SurveyEditorPreviewPanelContract = SurveyPreviewPanelContract
export type SurveyEditorQuestionConfigPanelContract = Pick<
  SurveyEditorContextBoundary,
  (typeof questionConfigPanelKeys)[number]
>
export type SurveyEditorQuestionListPanelContract = Pick<
  SurveyEditorContextBoundary,
  (typeof questionListPanelKeys)[number]
>
export type SurveyEditorPublishPanelContract = Pick<SurveyEditorContextBoundary, (typeof publishPanelKeys)[number]>
export type SurveyEditorLogicSettingsContract = Pick<SurveyEditorContextBoundary, (typeof logicSettingsKeys)[number]>

export interface SurveyEditorAnswersPanelContract {
  stats: SurveyEditorContextBoundary['answerStats']
  surveyId: SurveyEditorContextBoundary['currentSurveyId']
  questions: SurveyEditorContextBoundary['surveyForm']['questions']
  surveyTitle: SurveyEditorContextBoundary['surveyForm']['title']
  collectionRange: undefined
  initialResults: null
}

export interface SurveyEditorContracts {
  shell: SurveyEditorShellContract
  toolbar: SurveyEditorToolbarContract
  previewPanel: SurveyEditorPreviewPanelContract
  answersPanel: SurveyEditorAnswersPanelContract
  questionConfigPanel: SurveyEditorQuestionConfigPanelContract
  questionListPanel: SurveyEditorQuestionListPanelContract
  publishPanel: SurveyEditorPublishPanelContract
  logicSettingsPanel: SurveyEditorLogicSettingsContract
}

function createSurveyEditorContracts(editorContext: SurveyEditorContextBoundary): SurveyEditorContracts {
  return {
    shell: pickContext(editorContext, shellKeys),
    toolbar: pickContext(editorContext, toolbarKeys),
    previewPanel: createSurveyPreviewPanelContract(pickContext(editorContext, previewPanelKeys)),
    answersPanel: {
      stats: editorContext.answerStats,
      surveyId: editorContext.currentSurveyId,
      questions: editorContext.surveyForm.questions,
      surveyTitle: editorContext.surveyForm.title,
      collectionRange: undefined,
      initialResults: null
    },
    questionConfigPanel: pickContext(editorContext, questionConfigPanelKeys),
    questionListPanel: pickContext(editorContext, questionListPanelKeys),
    publishPanel: pickContext(editorContext, publishPanelKeys),
    logicSettingsPanel: pickContext(editorContext, logicSettingsKeys)
  }
}

export function useSurveyEditor(): SurveyEditorContracts {
  const core = useEditorCore()

  const richtext = useEditorRichtext({
    surveyForm: core.surveyForm,
    editingIndex: core.editingIndex,
    ensureOptionExtras: core.ensureOptionExtras
  })

  const logic = useEditorLogic({
    surveyForm: core.surveyForm,
    editingIndex: core.editingIndex,
    getQuestionTypeLabel: core.getQuestionTypeLabel
  })

  const batch = useEditorBatch({
    surveyForm: core.surveyForm,
    createDefaultQuestion: core.createDefaultQuestion,
    ensureOptionExtras: core.ensureOptionExtras
  })

  const quota = useEditorQuota({
    surveyForm: core.surveyForm
  })

  const saveDraft = async () => {
    core.validateForm()
    if (core.errors.title) return
    core.saving.value = true
    try {
      const payload = core.toServerPayload()
      const editingId = core.route.params?.id as string | undefined
      const created = editingId ? await updateSurvey(String(editingId), payload) : await createSurvey(payload)
      alert('草稿保存成功')
      if (!editingId && created.id) {
        core.router.push({ name: 'EditSurvey', params: { id: created.id } })
      }
    } catch (error: any) {
      console.error('保存草稿失败:', error)
      alert(error?.message || '保存失败，请稍后重试')
    } finally {
      core.saving.value = false
    }
  }

  const publishSurveyAction = async () => {
    core.validateForm()
    if (!core.canPublish.value) return
    if (!confirm('确定要发布这份问卷吗？发布后将无法修改基础结构。')) return

    try {
      const editingId = core.route.params?.id as string | undefined
      if (editingId) {
        await updateSurvey(String(editingId), core.toServerPayload())
        await publishSurvey(String(editingId))
      } else {
        const created = await createSurvey(core.toServerPayload())
        if (!created?.id) throw new Error('发布失败：未获取到问卷 ID')
        await publishSurvey(created.id)
      }
      alert('问卷发布成功')
      core.router.push({ name: 'SurveyList' })
    } catch (error: any) {
      console.error('发布失败:', error)
      alert(error?.message || '发布失败，请稍后重试')
    }
  }

  const triggerQuickAction = async (action: SurveyEditorQuickActionKey) => {
    switch (action) {
      case 'toggleNumbers':
        if (core.surveyForm.questions.length === 0) {
          ElMessage.info('暂无题目可隐藏题号')
          return
        }
        {
          const nextState = !core.areAllNumbersHidden.value
          core.surveyForm.questions.forEach(question => {
            question.hideSystemNumber = nextState
          })
          await nextTick()
          ElMessage.success(nextState ? '已隐藏所有系统题号' : '已恢复系统题号显示')
        }
        return
      case 'batchAdd':
        batch.openBatchAddDialog()
        return
    }
  }

  const switchEditorTab = (tab: 'edit' | 'preview') => {
    if (tab === 'preview') core.closeQuestionEdit()
    core.currentTab.value = tab
  }

  const editorContext = {
    surveyForm: core.surveyForm,
    currentSurveyId: core.currentSurveyId,
    saving: core.saving,
    canPublish: core.canPublish,
    currentTab: core.currentTab,
    showHeaderSettings: core.showHeaderSettings,
    validateForm: core.validateForm,
    errors: core.errors,
    closeQuestionEdit: core.closeQuestionEdit,
    showAIHelper: core.showAIHelper,
    editingIndex: core.editingIndex,
    getQuestionTypeLabel: core.getQuestionTypeLabel,
    moveQuestionUp: core.moveQuestionUp,
    moveQuestionDown: core.moveQuestionDown,
    duplicateQuestion: core.duplicateQuestion,
    deleteQuestion: core.deleteQuestion,
    ensureTitleRich: richtext.ensureTitleRich,
    asPlain: richtext.asPlain,
    onTitleFocus: richtext.onTitleFocus,
    onTitleBlur: richtext.onTitleBlur,
    shouldShowTitleBtn: richtext.shouldShowTitleBtn,
    openTitleRichEditor: richtext.openTitleRichEditor,
    isHintOpen: core.isHintOpen,
    onHintCheckboxChange: core.onHintCheckboxChange,
    hasOptions: core.hasOptions,
    addOption: core.addOption,
    openBatchEdit: batch.openBatchEdit,
    isGroupConfigured: core.isGroupConfigured,
    isScoreConfigured: core.isScoreConfigured,
    isQuotaConfigured: quota.isQuotaConfigured,
    openGroupDialog: batch.openGroupDialog,
    openQuotaDialog: quota.openQuotaDialog,
    groupHeaderFor: batch.groupHeaderFor,
    optionRemaining: quota.optionRemaining,
    optionSummary: logic.optionSummary,
    jumpSummary: logic.jumpSummary,
    ensureOptionExtras: core.ensureOptionExtras,
    openOptionRichEditor: richtext.openOptionRichEditor,
    addOptionAt: core.addOptionAt,
    removeOption: core.removeOption,
    toggleDesc: core.toggleDesc,
    toggleHidden: core.toggleHidden,
    isMatrixLegacyQuestion: core.isMatrixLegacyQuestion,
    isMatrixDropdownLegacyQuestion: core.isMatrixDropdownLegacyQuestion,
    isMatrixMultipleLegacyQuestion: core.isMatrixMultipleLegacyQuestion,
    addMatrixRow: core.addMatrixRow,
    ensureMatrixConfig: core.ensureMatrixConfig,
    removeMatrixRow: core.removeMatrixRow,
    selectablePrevQs: logic.selectablePrevQs,
    questionLogicSummary: logic.questionLogicSummary,
    openLogicDialog: logic.openLogicDialog,
    openJumpDialog: logic.openJumpDialog,
    openOptionLogicDialog: logic.openOptionLogicDialog,
    isStandaloneConfigType: core.isStandaloneConfigType,
    ensureSliderValidation: core.ensureSliderValidation,
    normalizeSliderValidation: core.normalizeSliderValidation,
    isSliderLegacyQuestion: core.isSliderLegacyQuestion,
    isUploadLegacyQuestion: core.isUploadLegacyQuestion,
    ensureUploadConfig: core.ensureUploadConfig,
    normalizeUploadConfig: core.normalizeUploadConfig,
    uploadConfigSummary: core.uploadConfigSummary,
    isRatingLegacyQuestion: core.isRatingLegacyQuestion,
    ensureRatingValidation: core.ensureRatingValidation,
    normalizeRatingValidation: core.normalizeRatingValidation,
    isScaleLegacyQuestion: core.isScaleLegacyQuestion,
    ensureScaleValidation: core.ensureScaleValidation,
    normalizeScaleValidation: core.normalizeScaleValidation,
    getScalePreviewValues: core.getScalePreviewValues,
    finishEdit: core.finishEdit,
    addQuestionAfter: core.addQuestionAfter,
    openBatchAddDialog: batch.openBatchAddDialog,
    panelTab: core.panelTab,
    categoryExpanded: core.categoryExpanded,
    toggleCategory: core.toggleCategory,
    addQuestionByType: core.addQuestionByType,
    aiPrompt: core.aiPrompt,
    generateByAI: core.generateByAI,
    outlineListEl: core.outlineListEl,
    showOutlineTip: core.showOutlineTip,
    draggingIndex: core.draggingIndex,
    onOutlineDragStart: core.onOutlineDragStart,
    dragOverIndex: core.dragOverIndex,
    dragOverPos: core.dragOverPos,
    onOutlineDragOver: core.onOutlineDragOver,
    onOutlineDrop: core.onOutlineDrop,
    onOutlineDragEnd: core.onOutlineDragEnd,
    startRename: core.startRename,
    renamingIndex: core.renamingIndex,
    renameText: core.renameText,
    renameInputEl: core.renameInputEl,
    confirmRename: core.confirmRename,
    showLogicDialog: logic.showLogicDialog,
    closeLogicDialog: logic.closeLogicDialog,
    logicRows: logic.logicRows,
    logicTargetIndex: logic.logicTargetIndex,
    togglePick: logic.togglePick,
    removeLogicRow: logic.removeLogicRow,
    addLogicRow: logic.addLogicRow,
    clearCurrentQuestionLogic: logic.clearCurrentQuestionLogic,
    clearAllLogicAssociations: logic.clearAllLogicAssociations,
    saveLogicDialog: logic.saveLogicDialog,
    showOptionDialog: logic.showOptionDialog,
    closeOptionDialog: logic.closeOptionDialog,
    optionTargetIndex: logic.optionTargetIndex,
    activeOptIdx: logic.activeOptIdx,
    onPickLeftOption: logic.onPickLeftOption,
    optionLabelPlain: richtext.optionLabelPlain,
    hasOptionLogic: logic.hasOptionLogic,
    currentOptionSummary: logic.currentOptionSummary,
    clearCurrentOptionLogic: logic.clearCurrentOptionLogic,
    optionLogicRows: logic.optionLogicRows,
    toggleOptionPick: logic.toggleOptionPick,
    removeOptionLogicRow: logic.removeOptionLogicRow,
    addOptionLogicRow: logic.addOptionLogicRow,
    saveOptionDialogOne: logic.saveOptionDialogOne,
    clearAllOptionLogicForThisQuestion: logic.clearAllOptionLogicForThisQuestion,
    saveOptionDialog: logic.saveOptionDialog,
    showJumpDialog: logic.showJumpDialog,
    closeJumpDialog: logic.closeJumpDialog,
    jumpByOptionEnabled: logic.jumpByOptionEnabled,
    jumpTargetIndex: logic.jumpTargetIndex,
    jumpByOption: logic.jumpByOption,
    jumpUnconditionalEnabled: logic.jumpUnconditionalEnabled,
    jumpUnconditionalTarget: logic.jumpUnconditionalTarget,
    saveJumpDialog: logic.saveJumpDialog,
    showRteDialog: richtext.showRteDialog,
    rteContent: richtext.rteContent,
    applyRteContent: richtext.applyRteContent,
    showTitleRte: richtext.showTitleRte,
    titleRteContent: richtext.titleRteContent,
    applyTitleRteContent: richtext.applyTitleRteContent,
    showBatchAddDialog: batch.showBatchAddDialog,
    closeBatchAddDialog: batch.closeBatchAddDialog,
    batchAddTab: batch.batchAddTab,
    batchAddText: batch.batchAddText,
    parsedQuestions: batch.parsedQuestions,
    showAISuggestion: batch.showAISuggestion,
    saveBatchAddQuestions: batch.saveBatchAddQuestions,
    showBatchDialog: batch.showBatchDialog,
    closeBatchDialog: batch.closeBatchDialog,
    batchText: batch.batchText,
    batchLineCount: batch.batchLineCount,
    presetNames: batch.presetNames,
    usePreset: batch.usePreset,
    saveBatchEdit: batch.saveBatchEdit,
    showGroupDialog: batch.showGroupDialog,
    closeGroupDialog: batch.closeGroupDialog,
    groupRows: batch.groupRows,
    addGroupRow: batch.addGroupRow,
    editGroupName: batch.editGroupName,
    removeGroupRow: batch.removeGroupRow,
    groupSourceOptions: batch.groupSourceOptions,
    minStartFor: batch.minStartFor,
    normalizeGroupRow: batch.normalizeGroupRow,
    groupOrderRandom: batch.groupOrderRandom,
    saveGroupDialog: batch.saveGroupDialog,
    showGroupNameDialog: batch.showGroupNameDialog,
    cancelGroupName: batch.cancelGroupName,
    groupNameInput: batch.groupNameInput,
    confirmGroupName: batch.confirmGroupName,
    showQuotaDialog: quota.showQuotaDialog,
    closeQuotaDialog: quota.closeQuotaDialog,
    quotaEnabled: quota.quotaEnabled,
    quotaActiveTab: quota.quotaActiveTab,
    showQuotaExample: quota.showQuotaExample,
    quotaClearAll: quota.quotaClearAll,
    quotaBatchIncrease: quota.quotaBatchIncrease,
    quotaRows: quota.quotaRows,
    sanitizeQuota: quota.sanitizeQuota,
    quotaTotal: quota.quotaTotal,
    quotaMode: quota.quotaMode,
    quotaFullText: quota.quotaFullText,
    quotaShowRemaining: quota.quotaShowRemaining,
    saveQuotaDialog: quota.saveQuotaDialog,
    answerStats: core.answerStats,
    computedShareLink: core.computedShareLink,
    goBack: core.goBack,
    saveDraft,
    publishSurveyAction,
    areAllNumbersHidden: core.areAllNumbersHidden,
    triggerQuickAction,
    switchEditorTab
  } satisfies SurveyEditorContextBoundary

  return createSurveyEditorContracts(editorContext)
}

export type SurveyEditorContext = SurveyEditorContextBoundary
