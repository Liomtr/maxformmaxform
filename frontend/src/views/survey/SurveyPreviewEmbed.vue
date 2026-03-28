<template>
  <div class="survey-preview-embed" :class="`mode-${viewDevice}`">
    <div class="preview-bar center-only">
      <div class="device-switch">
        <button :class="{ active: viewDevice==='desktop' }" @click="viewDevice='desktop'">💻 桌面</button>
        <button :class="{ active: viewDevice==='mobile' }" @click="viewDevice='mobile'">📱 手机</button>
        <button :class="{ active: viewDevice==='tablet' }" @click="viewDevice='tablet'">🟦 平板</button>
        <button :class="{ active: viewDevice==='trifold' }" @click="viewDevice='trifold'">🟩 三折叠</button>
      </div>
    </div>
    <div class="preview-body">
      <!-- 桌面 -->
      <div v-if="viewDevice==='desktop'" class="desktop-wrapper">
        <FillSurveyPage :injectedSurvey="mappedSurveyForPreview" preview class="embed-desktop" />
      </div>
      <!-- 手机 -->
      <div v-else-if="viewDevice==='mobile'" class="mobile-wrapper">
        <div class="phone-shell iphone17 scale-small">
          <div class="btn btn-power" />
          <div class="btn btn-vol-up" />
            <div class="btn btn-vol-down" />
          <div class="dynamic-island">
            <div class="island-hole cam" />
            <div class="island-hole sensor" />
          </div>
          <div class="phone-glass">
            <div class="glass-reflect" />
            <div class="screen-bezel">
              <div class="screen-inner">
                <div class="screen-content">
                  <div class="phone-scroll">
                    <FillSurveyMobilePage :injectedSurvey="mappedSurveyForPreview" preview />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 平板 -->
      <div v-else-if="viewDevice==='tablet'" class="tablet-wrapper">
        <div class="tablet-shell">
          <div class="tablet-glass">
            <div class="tablet-screen">
              <FillSurveyPage :injectedSurvey="mappedSurveyForPreview" preview class="tablet-survey" />
            </div>
          </div>
        </div>
      </div>
      <!-- 三折叠（复用桌面填答组件，宽幅+虚拟折痕） -->
      <div v-else class="trifold-wrapper">
        <div class="trifold-shell">
          <div class="trifold-glass">
            <div class="trifold-screen">
              <FillSurveyPage :injectedSurvey="mappedSurveyForPreview" preview class="trifold-survey" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import FillSurveyPage from './FillSurveyPage.vue'
import FillSurveyMobilePage from './FillSurveyMobilePage.vue'
import { usePreviewSurveyMapping } from './usePreviewSurveyMapping'
import type { SurveyPreviewPanelContract } from './surveyPreviewPanelContract'

const props = defineProps<SurveyPreviewPanelContract>()

// 题目映射（数字 -> 后端字符串类型）
const { mappedSurveyForPreview } = usePreviewSurveyMapping(props.surveyForm)

// 设备切换：默认根据窗口宽度初始化一次
const viewDevice = ref<'desktop' | 'mobile' | 'tablet' | 'trifold'>('desktop')
if (typeof window !== 'undefined') {
  viewDevice.value = window.innerWidth < 860 ? 'mobile' : 'desktop'
}

// 如果无题则强制 desktop（避免空手机壳浪费空间）
watchEffect(()=>{
  if (!props.surveyForm.questions?.length) viewDevice.value = 'desktop'
})
</script>

<style scoped>
/* 去掉外层白框：透明背景 + 无边框/阴影/圆角 + 去除额外 padding */
.survey-preview-embed { background:transparent; border:none; border-radius:0; box-shadow:none; padding:0; }
.survey-preview-embed .preview-bar { display:flex; justify-content:center; align-items:center; margin:0 0 8px; padding:4px 0; }
.survey-preview-embed .preview-bar.center-only { gap:12px; }
.survey-preview-embed .preview-bar .title { font-weight:600; font-size:14px; color:#111827; }
.device-switch { display:flex; gap:6px; }
.device-switch button { border:1px solid #d1d5db; background:#f8fafc; padding:4px 10px; font-size:12px; border-radius:6px; cursor:pointer; color:#374151; }
.device-switch button.active { background:linear-gradient(#2563eb,#1d4ed8); color:#fff; border-color:#1d4ed8; box-shadow:0 0 0 1px #1d4ed8 inset; }
.preview-body { display:flex; justify-content:center; }
.desktop-wrapper { width:100%; }
.embed-desktop :deep(.page) { max-width:800px; margin:0 auto; }
/* 手机壳样式 */
.mobile-wrapper { display:flex; justify-content:center; }
.phone-shell.iphone17 { width:430px; margin:4px auto 8px; aspect-ratio:430/880; position:relative; padding:0; }
.phone-shell.iphone17::before { content:""; position:absolute; inset:0; border-radius:52px; padding:2px; background:linear-gradient(140deg,#fafafa,#d5d9dd 28%,#f4f6f8 43%,#c8cdd1 60%,#eef1f3 78%,#d0d5d9); -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0); -webkit-mask-composite:xor; mask-composite:exclude; box-shadow:0 4px 18px rgba(0,0,0,.15),0 0 0 1px rgba(255,255,255,.2) inset; pointer-events:none; }
.phone-shell.iphone17 .phone-glass { position:absolute; inset:6px; border-radius:46px; background:#000; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.06) inset,0 0 0 2px #000; }
.phone-shell.iphone17 .glass-reflect { position:absolute; inset:0; pointer-events:none; background:radial-gradient(ellipse at 20% 10%,rgba(255,255,255,.15),transparent 60%),linear-gradient(135deg,rgba(255,255,255,.12),transparent 40%),linear-gradient(45deg,rgba(255,255,255,.05),transparent 55%); mix-blend-mode:screen; opacity:.9; }
.phone-shell.iphone17 .screen-bezel { position:absolute; inset:4px; border-radius:42px; background:#000; box-shadow:0 0 0 1px rgba(255,255,255,.05) inset,0 0 0 2px #000; }
.phone-shell.iphone17 .screen-inner { position:absolute; inset:6px; border-radius:38px; background:#fff; display:flex; }
.phone-shell.iphone17 .screen-inner .screen-content { position:absolute; inset:0; border-radius:34px; background:#fff; overflow:hidden; box-shadow:0 0 0 1px rgba(0,0,0,.05) inset; display:flex; flex-direction:column; }
.phone-shell.iphone17 .phone-scroll { flex:1; overflow:auto; -webkit-overflow-scrolling:touch; padding-top:56px; }
.phone-shell.iphone17 .dynamic-island { position:absolute; top:18px; left:50%; transform:translateX(-50%); height:34px; width:132px; background:#020617; border-radius:22px; display:flex; align-items:center; justify-content:center; gap:10px; box-shadow:0 2px 6px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.07) inset; z-index:3; }
.phone-shell.iphone17 .dynamic-island .island-hole { width:14px; height:14px; background:#0f172a; border-radius:50%; }
.phone-shell.iphone17 .dynamic-island .island-hole.sensor { width:10px; height:10px; background:radial-gradient(circle at 30% 30%,#1e293b,#020617 70%); }
.phone-shell.iphone17 .btn { position:absolute; background:#1e293b; border-radius:4px; width:5px; }
.phone-shell.iphone17 .btn-power { height:70px; right:-3px; top:270px; box-shadow:0 0 0 1px rgba(255,255,255,.2) inset,0 1px 2px rgba(0,0,0,.4); }
.phone-shell.iphone17 .btn-vol-up { height:54px; left:-3px; top:250px; box-shadow:0 0 0 1px rgba(255,255,255,.2) inset,0 1px 2px rgba(0,0,0,.4); }
.phone-shell.iphone17 .btn-vol-down { height:54px; left:-3px; top:320px; box-shadow:0 0 0 1px rgba(255,255,255,.2) inset,0 1px 2px rgba(0,0,0,.4); }
.phone-shell.iphone17.scale-small { transform:scale(.88); transform-origin:top center; }

/* 平板预览样式（简化 iPad / 折叠屏风格） */
.tablet-wrapper { display:flex; justify-content:center; width:100%; }
.tablet-shell { position:relative; width: min(100%, 1080px); aspect-ratio: 4/3; max-width:1080px; background:linear-gradient(145deg,#1f2937,#111827); padding:14px; border-radius:40px; box-shadow:0 8px 28px rgba(0,0,0,.25),0 0 0 2px rgba(255,255,255,.08) inset; }
.tablet-glass { position:absolute; inset:14px; background:#000; border-radius:32px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.06) inset; display:flex; }
.tablet-screen { flex:1; background:#fff; overflow:auto; -webkit-overflow-scrolling:touch; padding:32px 36px 64px; }
.tablet-screen :deep(.page) { max-width:800px; margin:0 auto; }
.tablet-survey :deep(.page) { max-width:800px; }

/* 三折叠设备样式：更宽，模拟左右折痕 */
.trifold-wrapper { display:flex; justify-content:center; width:100%; }
.trifold-shell { position:relative; width:min(100%, 1400px); aspect-ratio: 20/11; max-width:1400px; background:linear-gradient(135deg,#1e293b,#0f172a 60%,#1e293b); padding:10px; border-radius:42px; box-shadow:0 8px 28px rgba(0,0,0,.28),0 0 0 2px rgba(255,255,255,.07) inset; }
.trifold-shell::before, .trifold-shell::after { content:""; position:absolute; top:10px; bottom:10px; width:2px; background:linear-gradient(#00000055,#ffffff22,#00000055); z-index:2; }
.trifold-shell::before { left:33.33%; }
.trifold-shell::after { left:66.66%; }
.trifold-glass { position:absolute; inset:10px; background:#000; border-radius:34px; overflow:hidden; box-shadow:0 0 0 1px rgba(255,255,255,.06) inset; display:flex; }
.trifold-screen { flex:1; background:#fff; overflow:auto; -webkit-overflow-scrolling:touch; padding:32px 54px 48px; }
.trifold-screen :deep(.page) { max-width:800px; margin:0 auto; }
.trifold-survey :deep(.page) { max-width:800px; }

@media (max-width:1500px){
  .trifold-shell { width:95%; }
}
@media (max-width:1100px){
  .trifold-shell { width:100%; border-radius:36px; }
  .trifold-screen { padding:32px 40px 64px; }
  .trifold-shell::before { left:34%; }
  .trifold-shell::after { left:68%; }
}

@media (max-width:1200px){
  .tablet-shell { width: 90%; }
}
</style>
