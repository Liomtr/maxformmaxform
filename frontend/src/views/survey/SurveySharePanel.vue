<!--
  SurveySharePanel 问卷分享面板
  用途：图片2风格的分享区（左侧蓝色二维码卡片 + 右侧链接与操作卡片）
  Props：
    - title: string  问卷标题（用于左侧标题与下载文件名）
    - shareLink: string  分享链接（用于二维码/复制/打开/嵌入）
  事件：无（内部直接处理复制、打开、嵌入弹窗、下载二维码）
  依赖：使用 https://api.qrserver.com 生成二维码图片；若需离线/内网可替换为本地库（如 `qrcode`）
  交互功能：
    - 复制链接（Clipboard API）
    - 新窗口打开链接
    - 展示网页嵌入 iframe 代码（弹窗）
    - 保存二维码 PNG（直接下载）
    - 生成海报（占位，可用 html2canvas/dom-to-image 实现）
  设计约束：
    - 布局 grid：左 320px 蓝卡 + 右自适应面板，≤900px 自动单列
    - 蓝卡使用渐变与投影；右侧卡片浅灰边框、悬浮阴影反馈
-->
<template>
  <div class="page-container">
    <div class="top-tabs" role="tablist" aria-label="分享与派发设置">
      <button
        v-for="t in topTabs"
        :key="t.id"
        class="top-tab"
        :class="{ active: t.id === activeTopTab, disabled: t.disabled }"
        role="tab"
        :aria-selected="t.id === activeTopTab"
        @click="!t.disabled && (activeTopTab = t.id)"
      >
        <span class="tt-ico" aria-hidden="true">{{ t.emoji }}</span>
        <span class="tt-text">{{ t.label }}</span>
      </button>
    </div>
    <div v-if="activeTopTab==='share'" class="share-wrap">
    <!-- 左侧：二维码卡片 -->
    <section class="qr-card">
      <h4 class="qr-title">{{ title || '我的问卷' }}</h4>
      <div class="qr-box">
        <template v-if="hasLink">
          <img
            class="qr-img"
            :src="qrSrc"
            alt="二维码"
            aria-label="问卷二维码"
            :style="{ width: qrSize + 'px', height: qrSize + 'px' }"
          />
        </template>
        <template v-else>
          <div
            class="qr-empty"
            :style="{ width: qrSize + 'px', height: qrSize + 'px' }"
          >未发布<small>发布后生成二维码</small></div>
        </template>
      </div>
      <p class="qr-tip">{{ hasLink ? '扫一扫或长按识别二维码' : '发布问卷后可分享' }}</p>
      <div class="qr-actions">
        <label class="qr-size" title="二维码尺寸">
          尺寸
          <select class="sel" v-model.number="qrSize">
            <option :value="200">200</option>
            <option :value="240">240</option>
            <option :value="300">300</option>
          </select>
        </label>
        <button class="btn btn-primary" :disabled="!hasLink" @click="downloadQR">保存</button>
        <button class="btn btn-outline" @click="makePoster">生成海报</button>
      </div>
    </section>

    <!-- 右侧：链接与操作 -->
  <section class="share-panel">
      <div class="link-row" :title="shareLink ? '点击复制或使用右侧按钮' : '发布问卷后才能生成分享链接'">
        <span class="link-icon">🔗</span>
        <input class="share-input" :value="shareLink" :placeholder="shareLink ? '' : '发布问卷后生成 /s/9位码 分享链接'" readonly @click="selectInput" @focus="selectInput" />
        <button class="btn btn-copy" :disabled="!hasLink" @click="copyLink">
          <span v-if="copiedLink">✅ 已复制</span>
          <span v-else>复制</span>
        </button>
        <button class="btn btn-open" :disabled="!hasLink" @click="openLink">打开</button>
      </div>

      <div class="op-grid">
        <div class="op-card" :class="{ disabled: !hasLink }" @click="hasLink && copyLink()">
          <div class="op-ico">📋</div>
          <div class="op-text">复制链接</div>
        </div>
          <div class="op-card" :class="{ disabled: !hasLink }" @click="hasLink && openLink()">
          <div class="op-ico">↗</div>
          <div class="op-text">直接打开</div>
        </div>
        <div class="op-card" :class="{ disabled: !hasLink }" @click="hasLink && showEmbed()">
          <div class="op-ico op-code">&lt;/&gt;</div>
          <div class="op-text">网页嵌入</div>
        </div>
      </div>

      <!-- 网页嵌入：参考图中的下半部分 -->
      <div class="embed-card">
        <div class="embed-header">
          <div class="tabs">
            <button class="tab" :class="{active: embedTab==='web'}" @click="embedTab='web'">网页嵌入</button>
            <button class="tab" :class="{active: embedTab==='site'}" @click="embedTab='site'">网站集成</button>
            <button class="tab" :class="{active: embedTab==='app'}" @click="embedTab='app'">APP集成</button>
          </div>
          <div class="tips" v-if="!hasLink">发布后可生成嵌入代码</div>
        </div>
        <div class="embed-controls">
          <label>问卷宽度：</label>
          <input type="number" class="w-input" v-model.number="embedWidth" min="320" step="10" />
          <span class="unit">px</span>
          <div class="divider"></div>
          <label>自适应：</label>
          <select v-model="embedMode" class="sel">
            <option value="responsive">自适应高度</option>
            <option value="fixed">固定高度</option>
          </select>
          <div class="divider"></div>
          <label>样式：</label>
          <select v-model="embedStyle" class="sel">
            <option value="clean">简洁模式</option>
            <option value="standard">标准模式</option>
          </select>
        </div>
        <div class="code-box">
          <textarea class="code" :value="embedCode" readonly></textarea>
        </div>
        <div class="embed-actions">
          <button class="btn" :disabled="!hasLink" @click="copyCode">
            <span v-if="copiedCode">✅ 已复制</span>
            <span v-else>复制代码</span>
          </button>
          <button class="btn" :disabled="!hasLink" @click="previewEmbed">预览效果</button>
          <a class="alt-switch" href="javascript:void(0)" @click="embedAlt = !embedAlt">{{ embedAlt ? '使用 iframe 代码' : '使用 JS 集成' }}</a>
        </div>
      </div>
    </section>
    </div>
    <div v-else class="placeholder-card">
      <div class="ph-title">{{ currentTabLabel }}</div>
      <div class="ph-sub">该功能即将上线，或在其他页面配置。需要我现在对接这一页的具体逻辑吗？</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps<{ title: string; shareLink: string }>()
// 顶部 Tabs：当前仅实现“答卷地址”面板，其它为占位（可随后接功能或路由）
type TopTab = { id: string; label: string; emoji: string; disabled?: boolean }
const topTabs = ref<TopTab[]>([
  { id: 'share', label: '答卷地址', emoji: '📨' },
  { id: 'widget', label: '网站组件', emoji: '🧩', disabled: true },
  { id: 'contacts', label: '外部联系人', emoji: '👥', disabled: true },
  { id: 'ip', label: 'IP地址段', emoji: '🛡️', disabled: true },
  { id: 'pwd', label: '答卷密码', emoji: '🔒', disabled: true },
  { id: 'source', label: '自定义来源', emoji: '🔗', disabled: true },
  { id: 'dispatch', label: '派发记录', emoji: '🎁', disabled: true },
  { id: 'crowd', label: '人群关联', emoji: '🧬', disabled: true }
])
const activeTopTab = ref<string>('share')
const currentTabLabel = computed(() => topTabs.value.find(t=>t.id===activeTopTab.value)?.label || '')
const hasLink = computed(() => !!props.shareLink)
const shareCode = computed(() => {
  const m = (props.shareLink || '').match(/\/s\/(\d{9})/)
  return m ? m[1] : ''
})
// 复制状态反馈
const copiedLink = ref(false)
const copiedCode = ref(false)

// 使用公开的二维码服务生成图片，无需引入依赖（可替换为本地库）
// 提升清晰度至 240px（桌面端更清楚），需要更大可调整 size
const qrSize = ref<number>(240)
const qrSrc = computed(() => hasLink.value ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(props.shareLink)}&size=${qrSize.value}x${qrSize.value}&margin=10` : '')

function copyLink(){
  const text = props.shareLink
  const done = () => {
    ElMessage.success('已复制链接到剪贴板')
    copiedLink.value = true
    setTimeout(() => (copiedLink.value = false), 1500)
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => ElMessage.error('复制失败，请手动选择复制'))
  } else {
    // 回退方案
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      const ok = document.execCommand('copy')
      if (ok) done(); else throw new Error('copy failed')
    } catch {
      ElMessage.error('复制失败，请手动选择复制')
    } finally {
      document.body.removeChild(ta)
    }
  }
}

function openLink(){
  window.open(props.shareLink, '_blank')
}

function showEmbed(){
  const code = `<iframe src="${props.shareLink}" width="100%" height="600" frameborder="0"></iframe>`
  ElMessageBox.alert(`<pre style="white-space:pre-wrap;word-break:break-all">${code.replace(/</g,'&lt;')}</pre>`, '网页嵌入代码', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '我知道了'
  })
}

function downloadQR(){
  // 直接以图片方式下载
  const a = document.createElement('a')
  a.href = (qrSrc.value)
  a.download = `${(props.title || 'survey')}-qrcode.png`
  a.click()
}

function makePoster(){
  ElMessage.info('海报生成功能开发中…')
}

// 嵌入区域
const embedTab = ref<'web' | 'site' | 'app'>('web')
const embedMode = ref<'responsive' | 'fixed'>('responsive')
const embedStyle = ref<'clean' | 'standard'>('clean')
const embedWidth = ref<number>(750)
const embedAlt = ref(false)

const embedCode = computed(() => {
  if (!hasLink.value) return '// 发布后生成嵌入代码'
  const src = props.shareLink
  const widthAttr = `${embedWidth.value}`
  const height = embedMode.value === 'fixed' ? 600 : 600
  if (!embedAlt.value) {
    return `<iframe src="${src}" width="${widthAttr}" height="${height}" style="max-width:100%;border:0;" loading="lazy" referrerpolicy="no-referrer" allowfullscreen></iframe>`
  }
  return `<!-- 简易 JS 集成示例 -->\n<div id="survey-embed" style="width:${widthAttr}px;max-width:100%"></div>\n<script>\n  (function(){\n    var el = document.getElementById('survey-embed');\n    var iframe = document.createElement('iframe');\n    iframe.src='${src}';\n    iframe.style.width='100%';\n    iframe.style.border='0';\n    iframe.loading='lazy';\n    iframe.height='${height}';\n    el.appendChild(iframe);\n  })();\n<\/script>`
})

function copyCode(){
  const text = embedCode.value
  const done = () => {
    ElMessage.success('嵌入代码已复制')
    copiedCode.value = true
    setTimeout(() => (copiedCode.value = false), 1500)
  }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done).catch(() => ElMessage.error('复制失败，请手动选择复制'))
  } else {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      const ok = document.execCommand('copy')
      if (ok) done(); else throw new Error('copy failed')
    } catch {
      ElMessage.error('复制失败，请手动选择复制')
    } finally {
      document.body.removeChild(ta)
    }
  }
}

function previewEmbed(){
  if (!hasLink.value) return
  window.open(props.shareLink, '_blank')
}

function selectInput(event: Event){
  const target = event.target
  if (target instanceof HTMLInputElement) target.select()
}
</script>

<style scoped>
.top-tabs{
  display:flex; gap:6px; align-items:center; padding: 6px 8px; margin-bottom:8px;
  background:#fff; border:1px solid #e5e7eb; border-radius:10px;
  overflow:auto; white-space:nowrap; scrollbar-width:thin;
}
.top-tab{ display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; border:1px solid transparent; background:transparent; cursor:pointer; color:#0f172a; font-weight:600; }
.top-tab:hover{ background:#f8fafc; }
.top-tab.active{ background:#eaf2ff; color:#1d4ed8; border-color:#c7d2fe; box-shadow: inset 0 -2px 0 #3b82f6; }
.top-tab.disabled{ opacity:.5; cursor:not-allowed; }
.tt-ico{ font-size:14px; line-height:1; }

.placeholder-card{ background:#fff; border:1px dashed #dbe3ef; border-radius:12px; padding:28px; text-align:center; color:#475569; }
.ph-title{ font-size:18px; font-weight:700; color:#0f172a; margin-bottom:6px; }
.ph-sub{ font-size:13px; opacity:.85; }
.page-container{
  width:100%;
  max-width: 1200px; /* 限制整页最大宽度，避免超宽屏过度拉伸 */
  margin: 0 auto;
  padding: 12px 16px;
  box-sizing: border-box;
}
.share-wrap{
  display:grid;
  grid-template-columns: 340px minmax(0, 1fr);
  gap: 18px;
  padding: 16px 18px;
}

/* 左侧蓝卡 */
.qr-card{
  position: relative;
  background: linear-gradient(180deg,#1e66ff 0%,#2d7bff 100%);
  color:#fff;
  border-radius: 16px;
  padding: 18px 18px 16px;
  display:flex; flex-direction:column; align-items:center; gap:12px;
  box-shadow: 0 10px 28px rgba(30,102,255,.25);
}
.qr-card::before{
  content:''; position:absolute; inset:0; border-radius:16px; pointer-events:none;
  background: radial-gradient(120px 60px at 20% 10%, rgba(255,255,255,.25), transparent 60%),
              radial-gradient(160px 80px at 80% 0%, rgba(255,255,255,.12), transparent 60%);
}
.qr-title{ margin:0; font-size:16px; font-weight:700; letter-spacing:.2px; }
.qr-box{ background:#fff; padding:12px; border-radius:12px; box-shadow:0 4px 18px rgba(0,0,0,.10); }
.qr-img{ display:block; }
.qr-empty{ display:flex; align-items:center; justify-content:center; flex-direction:column; color:#334155; background:linear-gradient(180deg,#e5eeff,#f2f6ff); border-radius:12px; font-weight:700; }
.qr-empty small{ font-weight:500; opacity:.8; }
.qr-tip{ margin:4px 0 0; opacity:.92; }
.qr-actions{ display:flex; gap:10px; margin-top:8px; }

/* 右侧区域 */
.share-panel{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:16px; box-shadow: 0 4px 16px rgba(15,23,42,.04); }
.link-row{ display:flex; align-items:center; gap:10px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; transition: box-shadow .18s, border-color .18s; }
.link-row:hover{ box-shadow:0 0 0 3px rgba(59,130,246,.10); border-color:#c7d2fe; }
.link-icon{ font-size:18px; opacity:.9; }
.share-input{ flex:1; border:0; background:transparent; outline:none; font-size:14px; color:#0f172a; min-width:0; }
.btn.btn-copy,.btn.btn-open{ background:#fff; color:#1d4ed8; border:1px solid #cbd5e1; border-radius:10px; padding:8px 12px; cursor:pointer; transition:transform .06s ease, background .18s, border-color .18s; }
.btn.btn-copy:hover,.btn.btn-open:hover{ background:#eef2ff; border-color:#bcd0ff; }
.btn.btn-copy:active,.btn.btn-open:active{ transform: translateY(1px); }
.btn[disabled]{ opacity:.5; cursor:not-allowed; }

.op-grid{ display:grid; grid-template-columns: repeat(3, 1fr); gap:14px; margin-top:14px; }
.op-card{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:20px 10px; text-align:center; cursor:pointer; transition: box-shadow .18s, transform .12s, border-color .18s, background .18s; min-height: 96px; display:flex; flex-direction:column; justify-content:center; align-items:center; }
.op-card:hover{ box-shadow:0 10px 24px -8px rgba(15,23,42,.16); border-color:#cfd8e3; transform: translateY(-2px); background:#fbfdff; }
.op-card.disabled{ opacity:.5; cursor:not-allowed; box-shadow:none; transform:none; }
.op-ico{ font-size:28px; color:#64748b; margin-bottom:6px; line-height:1; }
.op-ico.op-code{ font-weight:800; letter-spacing:.5px; }
.op-text{ color:#0f172a; font-weight:600; }

/* 嵌入代码卡片 */
.embed-card{ background:#fff; border:1px solid #e5e7eb; border-radius:14px; margin-top:12px; box-shadow:0 2px 10px rgba(2,6,23,.04); }
.embed-header{ display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border-bottom:1px solid #eef2f7; }
.tabs{ display:flex; gap:8px; }
.tab{ border:1px solid #e2e8f0; background:#f8fafc; color:#0f172a; border-radius:8px; padding:6px 10px; cursor:pointer; font-weight:600; }
.tab.active{ background:#eef2ff; border-color:#c7d2fe; color:#1d4ed8; }
.tips{ color:#64748b; font-size:12px; }
.embed-controls{ display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px dashed #eef2f7; flex-wrap:wrap; }
.w-input{ width:88px; padding:6px 8px; border:1px solid #e2e8f0; border-radius:8px; }
.sel{ padding:6px 8px; border:1px solid #e2e8f0; border-radius:8px; background:#fff; }
.unit{ color:#64748b; margin-right:6px; }
.divider{ width:1px; height:20px; background:#e5e7eb; margin:0 4px; }
.code-box{ background:#0b1020; margin:12px; border-radius:10px; overflow:hidden; }
.code{ width:100%; min-height:140px; border:0; outline:none; background:transparent; color:#e5e7eb; padding:12px 14px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; font-size:12px; }
.embed-actions{ display:flex; align-items:center; gap:10px; padding:8px 12px 14px; }
.alt-switch{ margin-left:auto; color:#64748b; font-size:12px; text-decoration:underline; }

/* 无障碍辅助：隐藏但可读 */
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

/* 复用按钮基样式（与全站类名一致） */
.btn{ display:inline-flex; align-items:center; gap:6px; border-radius:8px; border:1px solid transparent; font-weight:600; cursor:pointer; }
.btn-primary{ background: var(--el-color-primary, #1e66ff); color:#fff; padding:8px 16px; border-color: var(--el-color-primary, #1e66ff); }
.btn-primary:hover{ filter:brightness(1.05); }
.btn-outline{ background:transparent; color:#1e3a8a; padding:8px 16px; border-color:#cbd5e1; }
.btn-outline:hover{ background:#eef2ff; border-color:#bcd0ff; }

@media (max-width: 1280px){
  .page-container{ max-width: 1024px; }
}
@media (max-width: 1120px){
  .share-wrap{ grid-template-columns: 300px 1fr; }
  .op-grid{ grid-template-columns: 1fr 1fr; }
}
@media (max-width: 900px){
  .page-container{ max-width: 720px; padding: 8px 12px; }
  .share-wrap{ grid-template-columns: 1fr; padding: 12px; }
  .op-grid{ grid-template-columns: 1fr; }
  .qr-img{ width:200px !important; height:200px !important; }
}
</style>
