<template>
  <div
    v-show="visible"
    ref="toolbarRef"
    class="qfe-mini-toolbar ql-toolbar ql-snow"
    :style="styleObject"
    @mousedown.prevent
  >
    <!-- 字号 -->
    <span class="ql-formats">
      <select class="ql-size" data-tip="字号">
        <option value="10px">很小</option>
        <option value="12px">小</option>
        <option value="14px" selected>正常</option>
        <option value="16px">大</option>
        <option value="20px">很大</option>
        <option value="28px">非常大</option>
      </select>
    </span>
    <!-- 颜色（使用外层容器承载 data-tip，避免直接作用于 select 失效） -->
    <span class="ql-formats">
      <span class="qfe-tip" data-tip="文字颜色"><select class="ql-color" /></span>
      <span class="qfe-tip" data-tip="背景色"><select class="ql-background" /></span>
    </span>
    <!-- 样式 -->
    <span class="ql-formats">
      <button class="ql-bold" data-tip="加粗" />
      <button class="ql-italic" data-tip="斜体" />
    </span>
    <!-- 对齐 -->
    <span class="ql-formats">
      <button class="ql-align" value="" data-tip="靠左" />
      <button class="ql-align" value="center" data-tip="居中" />
      <button class="ql-align" value="right" data-tip="靠右" />
      <button class="ql-align" value="justify" data-tip="两端" />
    </span>
    <!-- 链接/图片/音视频/高级 -->
    <span class="ql-formats">
      <button class="ql-link" data-tip="超链接" @click.stop.prevent="emitAction('link')" />
      <button class="ql-image" data-tip="图片" @click.stop.prevent="emitAction('image')" />
      <button class="qfe-video-btn" data-tip="音视频" @click.stop.prevent="emitAction('video')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </svg>
      </button>
      <button class="qfe-advanced-btn" data-tip="高级编辑" @click.stop.prevent="emitAction('advanced')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
        </svg>
      </button>
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

interface Props {
  visible?: boolean
  x?: number
  y?: number
  fixed?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
  x: 0,
  y: 0,
  fixed: false
})

const emit = defineEmits<{ (e:'action', type: 'link'|'image'|'video'|'advanced'): void; (e:'ready', el: HTMLElement): void }>()

const toolbarRef = ref<HTMLElement|null>(null)

const styleObject = computed<Record<string, string | number>>(() => ({
  position: props.fixed ? 'fixed' : 'absolute',
  left: props.x + 'px',
  top: props.y + 'px',
  zIndex: 10000
}))

function setupCustomSizes(){
  const SizeStyle = Quill.import('attributors/style/size')
  SizeStyle.whitelist = ['10px','12px','14px','16px','20px','28px']
  Quill.register(SizeStyle, true)
}

onMounted(() => {
  setupCustomSizes()
  if (toolbarRef.value) emit('ready', toolbarRef.value)
})

function emitAction(type: 'link'|'image'|'video'|'advanced'){
  emit('action', type)
}

defineExpose({ getToolbarEl: () => toolbarRef.value })
</script>

<style scoped>
.qfe-mini-toolbar{ display:flex; align-items:center; gap:4px; padding:6px 8px; background:#f9fafb; border:1px solid #d1d5db; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.08); }
.qfe-mini-toolbar :deep(.ql-formats){ margin-right:4px; }
.qfe-mini-toolbar :deep(button){ width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; }
.qfe-mini-toolbar :deep(.ql-picker){ line-height:20px; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size){ width:auto; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-label){ width:64px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:18px; box-sizing:border-box; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-options){ min-width:120px; }

.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="10px"]::before){ content:'很小' !important; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="12px"]::before){ content:'小' !important; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="14px"]::before){ content:'正常' !important; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="16px"]::before){ content:'大' !important; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="20px"]::before){ content:'很大' !important; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="28px"]::before){ content:'非常大' !important; }

/* 下拉选项预览（按字体大小渲染） */
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="10px"]::before){ content:'很小' !important; font-size:10px; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="12px"]::before){ content:'小' !important; font-size:12px; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="14px"]::before){ content:'正常' !important; font-size:14px; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="16px"]::before){ content:'大' !important; font-size:16px; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="20px"]::before){ content:'很大' !important; font-size:20px; }
.qfe-mini-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="28px"]::before){ content:'非常大' !important; font-size:24px; font-weight:600; }

.qfe-mini-toolbar .qfe-video-btn, .qfe-mini-toolbar .qfe-advanced-btn{ width:26px; height:26px; background:#fff; border:1px solid #d1d5db; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.qfe-mini-toolbar .qfe-video-btn:hover, .qfe-mini-toolbar .qfe-advanced-btn:hover{ background:#f3f4f6; }

/* 简易提示 */
.qfe-mini-toolbar .qfe-tip{ display:inline-block; position:relative; }
.qfe-mini-toolbar [data-tip]{ position:relative; }
.qfe-mini-toolbar [data-tip]::after, .qfe-mini-toolbar [data-tip]::before{ pointer-events:none; position:absolute; opacity:0; transition:opacity .12s; }
.qfe-mini-toolbar [data-tip]:hover::after, .qfe-mini-toolbar [data-tip]:hover::before{ opacity:1; }
.qfe-mini-toolbar [data-tip]::after{ content:attr(data-tip); bottom:100%; left:50%; transform:translate(-50%, -6px); background:#111; color:#fff; font-size:12px; line-height:1; padding:6px 8px; border-radius:4px; white-space:nowrap; z-index:10000; box-shadow:0 2px 6px rgba(0,0,0,0.35); }
.qfe-mini-toolbar [data-tip]::before{ content:""; bottom:100%; left:50%; transform:translate(-50%, 0); border:6px solid transparent; border-top-color:#111; z-index:10000; margin-bottom:-6px; }
</style>
