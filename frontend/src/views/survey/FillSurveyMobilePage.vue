<template>
  <div class="mobile-fill-page" :class="{ embed: preview }">
    <FillSurveyPage
      class="mobile-fill-inner"
      :injectedSurvey="injectedSurvey ?? undefined"
      :preview="preview"
    />
  </div>
</template>

<script setup lang="ts">
import FillSurveyPage from './FillSurveyPage.vue'
import type { Survey } from '@/types/survey'

defineProps<{
  injectedSurvey?: Survey | null
  preview?: boolean
}>()
</script>

<style scoped>
.mobile-fill-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(37, 99, 235, 0.12), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 18%, #f3f7fb 100%);
}

.mobile-fill-page.embed {
  min-height: auto;
  background: transparent;
}

.mobile-fill-inner :deep(.page) {
  max-width: none;
  margin: 0;
  padding: 0 0 68px;
}

.mobile-fill-inner :deep(.page.embed) {
  padding: 0 0 28px;
}

.mobile-fill-inner :deep(.survey-wrapper),
.mobile-fill-inner :deep(.survey-container) {
  width: 100%;
}

.mobile-fill-inner :deep(.qr-section-outside) {
  display: none !important;
}

.mobile-fill-inner :deep(.paper) {
  border: none;
  border-radius: 0;
  box-shadow: none;
  padding: 20px 18px 36px;
  background: #fff;
}

.mobile-fill-inner :deep(.paper-header) {
  padding: 0;
}

.mobile-fill-inner :deep(.paper-title) {
  margin: 4px 0 16px;
  font-size: 22px;
  line-height: 1.35;
}

.mobile-fill-inner :deep(.desc) {
  margin: 0 0 12px;
  color: #475569;
  font-size: 14px;
  line-height: 1.6;
}

.mobile-fill-inner :deep(.progress-panel) {
  margin: 0 0 16px;
  padding: 10px 12px;
}

.mobile-fill-inner :deep(.q-form) {
  padding: 4px 0 0;
}

.mobile-fill-inner :deep(.q-item) {
  margin-bottom: 22px;
}

.mobile-fill-inner :deep(.q-item .el-form-item__label) {
  margin-bottom: 8px;
  font-size: 15px;
  line-height: 1.4;
}

.mobile-fill-inner :deep(.q-label) {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.mobile-fill-inner :deep(.q-number) {
  min-width: auto;
  color: #2563eb;
}

.mobile-fill-inner :deep(.q-desc) {
  margin: 2px 0 10px;
  line-height: 1.55;
}

.mobile-fill-inner :deep(.q-divider) {
  margin: 8px 0 12px;
}

.mobile-fill-inner :deep(.opt-vertical) {
  gap: 4px;
}

.mobile-fill-inner :deep(.opt-vertical .el-radio),
.mobile-fill-inner :deep(.opt-vertical .el-checkbox) {
  margin: 0;
  padding: 4px 0 4px 2px;
  align-items: flex-start;
}

.mobile-fill-inner :deep(.opt-vertical .el-radio__label),
.mobile-fill-inner :deep(.opt-vertical .el-checkbox__label) {
  line-height: 1.5;
  white-space: normal;
}

.mobile-fill-inner :deep(.opt-fill-as-item) {
  margin: 6px 0 0 0;
  padding-left: 0;
}

.mobile-fill-inner :deep(.opt-fill-as-item .el-input),
.mobile-fill-inner :deep(.el-select),
.mobile-fill-inner :deep(.slider-answer),
.mobile-fill-inner :deep(.rating-answer),
.mobile-fill-inner :deep(.scale-answer),
.mobile-fill-inner :deep(.matrix-answer),
.mobile-fill-inner :deep(.ranking-answer),
.mobile-fill-inner :deep(.upload-answer),
.mobile-fill-inner :deep(.native-date-input) {
  width: 100% !important;
  max-width: none !important;
}

.mobile-fill-inner :deep(.ranking-item) {
  flex-direction: column;
  align-items: stretch;
  gap: 10px;
}

.mobile-fill-inner :deep(.ranking-item-main) {
  align-items: flex-start;
}

.mobile-fill-inner :deep(.ranking-actions) {
  display: flex;
  width: 100%;
}

.mobile-fill-inner :deep(.ranking-btn) {
  flex: 1;
  padding: 8px 10px;
}

.mobile-fill-inner :deep(.upload-picker) {
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0 16px;
}

.mobile-fill-inner :deep(.upload-item) {
  align-items: flex-start;
}

.mobile-fill-inner :deep(.actions) {
  align-items: stretch;
  margin: 12px 0 0;
}

.mobile-fill-inner :deep(.submit-btn) {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  font-size: 16px;
  border-radius: 12px;
}

.mobile-fill-inner :deep(.msg) {
  max-width: none;
}

.mobile-fill-inner :deep(.closed-block) {
  margin-top: 0;
  padding: 48px 20px;
}

.mobile-fill-inner :deep(.desc iframe),
.mobile-fill-inner :deep(.q-desc iframe),
.mobile-fill-inner :deep(.desc .qfe-iframe),
.mobile-fill-inner :deep(.q-desc .qfe-iframe),
.mobile-fill-inner :deep(.desc .embed-video-frame),
.mobile-fill-inner :deep(.q-desc .embed-video-frame) {
  height: 210px !important;
  border-radius: 10px;
}

@media (min-width: 640px) {
  .mobile-fill-inner :deep(.paper) {
    max-width: 720px;
    margin: 0 auto;
    border-radius: 24px;
    box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
  }

  .mobile-fill-inner :deep(.desc iframe),
  .mobile-fill-inner :deep(.q-desc iframe),
  .mobile-fill-inner :deep(.desc .qfe-iframe),
  .mobile-fill-inner :deep(.q-desc .qfe-iframe),
  .mobile-fill-inner :deep(.desc .embed-video-frame),
  .mobile-fill-inner :deep(.q-desc .embed-video-frame) {
    height: 280px !important;
  }
}
</style>
