<!-- SurveyTopToolbar 顶部工具栏组件
  用途：问卷编辑/预览/设置/分享/答卷详情 的顶部导航与操作区
  Props：
    - title: string，显示问卷标题
    - currentTab: 'edit'|'preview'|'settings'|'share'|'answers'（支持 v-model:currentTab）
    - saving?: boolean，保存中态
    - canPublish?: boolean，是否允许发布
  Emits：
    - update:currentTab(tab)
    - goBack()
    - save()
    - publish()
  设计约束：高度固定 50px；面包屑字号 24px；激活态 3px 下划线；可复用至其它页面。
-->
<template>
  <header class="toolbar" role="banner">
    <div class="toolbar__left">
      <button class="toolbar__back" type="button" @click="$emit('goBack')" title="返回上一页">
        <span class="toolbar__back-icon" aria-hidden="true">
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M606.2 250.9H436.8V86.8L8 309.2l428.8 222.3V367.4H622c185.3 0 280.6 74.1 280.6 222.3 0 153.5-95.3 227.6-291.1 227.6H113.9v116.5h502.9c264.7 0 397-111.2 397-333.5 0-232.9-137.7-349.4-407.6-349.4z"
              fill="currentColor"
            />
          </svg>
        </span>
        <span>返回</span>
      </button>
    </div>

    <nav class="toolbar__tabs" role="tablist" aria-label="问卷操作导航">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="toolbar__tab"
        type="button"
        :class="{ 'toolbar__tab--active': currentTab === tab.key }"
        role="tab"
        :aria-selected="currentTab === tab.key"
        @click="updateTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </nav>

    <div class="toolbar__actions">
      <button data-testid="editor-save-button" class="toolbar__btn" type="button" @click="$emit('save')" :disabled="saving">
        {{ saving ? '保存中…' : '保存草稿' }}
      </button>
      <button data-testid="editor-publish-button" class="toolbar__btn toolbar__btn--primary" type="button" @click="$emit('publish')" :disabled="!canPublish">
        发布问卷
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, defineProps, defineEmits } from 'vue'

type TabKey = 'edit'|'preview'|'settings'|'share'|'answers'

const props = defineProps<{
  currentTab: TabKey
  saving?: boolean
  canPublish?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:currentTab', v: TabKey): void
  (e: 'goBack'): void
  (e: 'save'): void
  (e: 'publish'): void
}>()

const tabs = computed(() => ([
  { key: 'edit', label: '问卷编辑' },
  { key: 'settings', label: '问卷设置' },
  { key: 'share', label: '问卷分享' },
  { key: 'answers', label: '答卷详情' },
] satisfies Array<{ key: TabKey; label: string }>))

function updateTab(v: TabKey) {
  emit('update:currentTab', v)
}
</script>

<style scoped>

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 24px;
  background: linear-gradient(180deg, #4a5d86 0%, #3f506f 100%);
  border-bottom: 1px solid rgba(47, 63, 95, 0.85);
}

.toolbar__left {
  display: flex;
  align-items: center;
  gap: 0;
  min-width: 0;
  flex: 0 0 200px;
}

.toolbar__back {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.12);
  color: #f5f7fa;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.toolbar__back:hover,
.toolbar__back:focus-visible {
  background-color: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  outline: none;
}

.toolbar__back-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.toolbar__back-icon svg {
  width: 100%;
  height: 100%;
}

.toolbar__tabs {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  min-width: 0;
  flex: 1 1 auto;
}

.toolbar__tab {
  position: relative;
  padding: 7px 0;
  border: none;
  background: transparent;
  font-size: 14px;
  color: rgba(229, 235, 245, 0.78);
  cursor: pointer;
  transition: color 0.2s ease;
}

.toolbar__tab:hover,
.toolbar__tab:focus-visible {
  color: #e2e8f0;
  outline: none;
}

.toolbar__tab::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 3px;
  border-radius: 3px;
  background: transparent;
  transition: background-color 0.2s ease;
}

.toolbar__tab--active {
  color: #ffffff;
  font-weight: 600;
}

.toolbar__tab--active::after {
  background: #4a9dff;
}

.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 240px;
  justify-content: flex-end;
}

.toolbar__btn {
  min-width: 96px;
  padding: 5px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.toolbar__btn:hover:not(:disabled),
.toolbar__btn:focus-visible {
  background-color: rgba(255, 255, 255, 0.16);
  border-color: rgba(255, 255, 255, 0.32);
  outline: none;
}

.toolbar__btn--primary {
  border-color: transparent;
  background: linear-gradient(135deg, #3b92ff 0%, #5aa8ff 100%);
  color: #ffffff;
  box-shadow: 0 4px 10px rgba(58, 146, 255, 0.28);
}

.toolbar__btn--primary:hover:not(:disabled),
.toolbar__btn--primary:focus-visible {
  background: linear-gradient(135deg, #2f85f0 0%, #4c9eff 100%);
  box-shadow: 0 6px 14px rgba(58, 146, 255, 0.34);
}

.toolbar__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 1024px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
    row-gap: 12px;
    height: auto;
    padding: 12px 16px;
  }

  .toolbar__left,
  .toolbar__actions {
    justify-content: space-between;
    width: 100%;
    flex: 0 0 auto;
  }

  .toolbar__tabs {
    order: 3;
    width: 100%;
    overflow-x: auto;
    flex: 0 0 auto;
  }
}

@media (max-width: 640px) {
  .toolbar__actions {
    gap: 8px;
  }

  .toolbar__btn {
    flex: 1;
    min-width: 0;
  }
}
</style>
