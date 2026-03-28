<template>
  <div v-if="mode === 'settings'" class="settings-area">
    <div class="settings-container">
      <h3>????</h3>

      <div class="settings-section">
        <h4>????</h4>
        <div class="setting-item">
          <label>????</label>
          <select v-model="surveyForm.type" class="form-select">
            <option value="normal">????</option>
            <option value="anonymous">????</option>
            <option value="limited">????</option>
          </select>
        </div>

        <div class="setting-item">
          <label>??????</label>
          <input v-model="surveyForm.endTime" type="datetime-local" class="form-input" />
        </div>
      </div>

      <div class="settings-section">
        <h4>????</h4>
        <div class="setting-item">
          <label class="checkbox-label">
            <input v-model="surveyForm.settings.showProgress" type="checkbox" />
            ?????
          </label>
        </div>

        <div class="setting-item">
          <label class="checkbox-label">
            <input v-model="surveyForm.settings.randomizeQuestions" type="checkbox" />
            ??????
          </label>
        </div>
      </div>

      <div class="settings-section">
        <h4>????</h4>
        <div class="setting-item">
          <label class="checkbox-label">
            <input v-model="surveyForm.settings.allowMultipleSubmissions" type="checkbox" />
            ??????
          </label>
        </div>

        <div class="setting-item">
          <label class="checkbox-label">
            <input v-model="surveyForm.settings.collectIP" type="checkbox" />
            ??IP??
          </label>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="share-area">
    <SurveySharePanel :title="surveyForm.title" :shareLink="computedShareLink" />
  </div>
</template>

<script setup lang="ts">
import type { CreateSurveyPublishPanelContract } from './createSurveyPageContracts'
import SurveySharePanel from './SurveySharePanel.vue'
import './createSurveyPage.css'

const props = defineProps<{
  mode: 'settings' | 'share'
  context: CreateSurveyPublishPanelContract
}>()
const mode = props.mode

const { surveyForm, computedShareLink } = props.context
</script>
