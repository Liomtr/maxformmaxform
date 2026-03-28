<template>
  <div class="survey-editor">
    <SurveyTopToolbar
      v-bind="toolbarBindings"
      @update:currentTab="updateToolbarTab"
      @goBack="toolbar.goBack"
      @save="toolbar.saveDraft"
      @publish="toolbar.publishSurveyAction"
    />

    <div class="editor-container">
      <div class="main-editor">
        <div v-if="currentTab === 'edit'" class="edit-area" @click.self="closeQuestionEdit">
          <div class="editor-utility-row" aria-label="编辑快捷操作">
            <div class="editor-utility-bar editor-utility-bar--left" role="toolbar">
              <button
                type="button"
                :class="['utility-btn', 'utility-btn--icon', 'utility-tooltip', { 'is-active': areAllNumbersHidden }]"
                :disabled="surveyForm.questions.length === 0"
                aria-label="隐藏题号"
                data-tooltip="隐藏题号"
                @click.stop="triggerQuickAction('toggleNumbers')"
              >
                <span class="utility-icon" aria-hidden="true">
                  <svg viewBox="0 0 14 14" focusable="false">
                    <path d="M2 2.25h10v1H2zM2 6h6v1H2zM2 9.75h10v1H2z" />
                    <path d="M10.95 2.05 2.05 10.95l.707.707 8.9-8.9z" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                class="utility-btn utility-btn--icon utility-tooltip"
                aria-label="批量添加题目"
                data-tooltip="批量添加题目"
                @click.stop="triggerQuickAction('batchAdd')"
              >
                <span class="utility-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" focusable="false">
                    <path d="M2.5 2.5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm0 1v9h11v-9h-11Z" />
                    <path d="M4.5 4.75h5v1.5h-5v-1.5Zm0 3h5v1.5h-5v-1.5Zm0 3H7v1.5H4.5v-1.5Zm5.5 0h1.75v1.75h1.75v1.5h-1.75v1.75h-1.5v-1.75H8.5v-1.5h1.5v-1.75Z" />
                  </svg>
                </span>
              </button>
            </div>
            <div class="editor-utility-bar editor-utility-bar--mirrored" role="toolbar">
              <button
                type="button"
                class="utility-btn"
                aria-label="预览"
                :aria-pressed="false"
                @click.stop="switchEditorTab('preview')"
              >
                <span class="utility-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" focusable="false">
                    <path d="M10 4C5.5 4 2 7.5 1 10c1 2.5 4.5 6 9 6s8-3.5 9-6c-1-2.5-4.5-6-9-6Zm0 10c-3.05 0-5.5-2.45-6.42-4 0.93-1.55 3.37-4 6.42-4s5.49 2.45 6.42 4c-0.93 1.55-3.37 4-6.42 4Zm0-7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
                  </svg>
                </span>
                <span class="utility-label">预览</span>
              </button>
            </div>
          </div>

          <div class="edit-layout" @click.self="closeQuestionEdit">
            <CreateSurveyQuestionConfigPanel :context="questionConfigPanel" />
            <div class="edit-main" @click.self="closeQuestionEdit">
              <CreateSurveyQuestionListPanel :context="questionListPanel" />
            </div>
          </div>
        </div>

        <div v-else-if="currentTab === 'answers'" class="answers-area">
          <SurveyAnswersPanel v-bind="answersPanelBindings" />
        </div>

        <div v-else-if="currentTab === 'preview'" class="preview-area embedded">
          <SurveyPreviewEmbed v-bind="previewPanelBindings" />
        </div>

        <CreateSurveyPublishPanel v-else-if="currentTab === 'settings'" mode="settings" :context="publishPanel" />
        <CreateSurveyPublishPanel v-else-if="currentTab === 'share'" mode="share" :context="publishPanel" />
      </div>
    </div>

    <CreateSurveyLogicSettings :context="logicSettingsPanel" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  CreateSurveyAnswersPanelContract,
  CreateSurveyLogicSettingsContract,
  CreateSurveyPageShellContract,
  CreateSurveyPublishPanelContract,
  CreateSurveyPreviewPanelContract,
  CreateSurveyQuestionConfigPanelContract,
  CreateSurveyQuestionListPanelContract,
  CreateSurveyTopToolbarContract
} from './createSurveyPageContracts'
import { createSurveyAnswersPanelContract } from './surveyAnswersPanelContract'
import { createSurveyPreviewPanelContract } from './surveyPreviewPanelContract'
import SurveyTopToolbar from './SurveyTopToolbar.vue'
import SurveyPreviewEmbed from './SurveyPreviewEmbed.vue'
import SurveyAnswersPanel from './SurveyAnswersPanel.vue'
import CreateSurveyQuestionConfigPanel from './CreateSurveyQuestionConfigPanel.vue'
import CreateSurveyQuestionListPanel from './CreateSurveyQuestionListPanel.vue'
import CreateSurveyLogicSettings from './CreateSurveyLogicSettings.vue'
import CreateSurveyPublishPanel from './CreateSurveyPublishPanel.vue'
import './createSurveyPage.css'

const props = defineProps<{
  shell: CreateSurveyPageShellContract
  toolbar: CreateSurveyTopToolbarContract
  previewPanel: CreateSurveyPreviewPanelContract
  answersPanel: CreateSurveyAnswersPanelContract
  questionConfigPanel: CreateSurveyQuestionConfigPanelContract
  questionListPanel: CreateSurveyQuestionListPanelContract
  publishPanel: CreateSurveyPublishPanelContract
  logicSettingsPanel: CreateSurveyLogicSettingsContract
}>()

const {
  surveyForm,
  currentTab,
  closeQuestionEdit,
  areAllNumbersHidden,
  triggerQuickAction,
  switchEditorTab
} = props.shell

const { toolbar, previewPanel, answersPanel, questionConfigPanel, questionListPanel, publishPanel, logicSettingsPanel } = props

const toolbarBindings = computed(() => ({
  currentTab: toolbar.currentTab.value,
  saving: toolbar.saving.value,
  canPublish: toolbar.canPublish.value
}))

const previewPanelBindings = computed(() => createSurveyPreviewPanelContract({
  surveyForm: previewPanel.surveyForm
}))

const answersPanelBindings = computed(() => createSurveyAnswersPanelContract({
  stats: answersPanel.stats,
  surveyId: answersPanel.surveyId.value,
  questions: answersPanel.questions,
  surveyTitle: answersPanel.surveyTitle,
  collectionRange: answersPanel.collectionRange,
  initialResults: answersPanel.initialResults
}))

function updateToolbarTab(tab: CreateSurveyTopToolbarContract['currentTab']['value']) {
  toolbar.currentTab.value = tab
}
</script>

<style scoped>
.survey-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}
</style>
