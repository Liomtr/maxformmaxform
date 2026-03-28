<template>
  <CreateSurveyPageShell
    :shell="contracts.shell"
    :toolbar="contracts.toolbar"
    :preview-panel="contracts.previewPanel"
    :answers-panel="contracts.answersPanel"
    :question-config-panel="contracts.questionConfigPanel"
    :question-list-panel="contracts.questionListPanel"
    :publish-panel="contracts.publishPanel"
    :logic-settings-panel="contracts.logicSettingsPanel"
  />
</template>

<script setup lang="ts">
import { useSurveyEditor } from '@/composables/useSurveyEditor'
import CreateSurveyPageShell from './CreateSurveyPageShell.vue'

const contracts = useSurveyEditor()
</script>
