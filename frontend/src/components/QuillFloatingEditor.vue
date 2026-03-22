<template>
  <div
    ref="wrapperRef"
    class="qfe-wrapper"
    :class="{ 'is-focused': isFocused, 'no-border': toolbarInside && floating }"
    @click="onWrapperClick"
  >
    <!-- 精简最小工具栏：固定在编辑区顶部（不跟随滚动计算） -->
    <div v-show="toolbarVisible" ref="toolbarRef" class="qfe-toolbar ql-toolbar ql-snow qfe-fixed-above" @mousedown.prevent>
      <!-- 字号（保留 size 作为 T / 12px 类似效果） -->
      <span class="ql-formats">
        <!-- 自定义 6 档字号：10/12/14/16/20/28px -->
        <select class="ql-size" data-tip="字号">
          <option value="10px">很小</option>
          <option value="12px">小</option>
          <option value="14px" selected>正常</option>
          <option value="16px">大</option>
          <option value="20px">很大</option>
          <option value="28px">非常大</option>
        </select>
      </span>
      <!-- 颜色 -->
      <span class="ql-formats">
        <select class="ql-color" data-tip="文字颜色" />
        <select class="ql-background" data-tip="背景色" />
      </span>
      <!-- 样式 -->
      <span class="ql-formats">
        <button class="ql-bold" data-tip="加粗" />
        <button class="ql-italic" data-tip="斜体" />
        <button class="ql-underline" data-tip="下划线" />
        <button class="ql-strike" data-tip="删除线" />
      </span>
      <!-- 列表 & 对齐 -->
      <span class="ql-formats">
        <button class="ql-list" value="ordered" data-tip="有序列表" />
        <button class="ql-list" value="bullet" data-tip="无序列表" />
        <!-- 自定义对齐下拉：图标 + 中文 -->
        <div class="qfe-align" @mousedown.stop.prevent>
          <button class="qfe-align-btn" :class="'align-' + (currentAlign || 'left')" data-tip="对齐" @click.stop.prevent="toggleAlignMenu">
            <span v-html="currentAlignIcon" class="icon-svg" />
          </button>
          <ul v-if="showAlignMenu" class="qfe-align-menu" @mousedown.prevent>
            <li :class="{active: currentAlign===null}" @click.stop="applyAlign(null)">
              <span class="icon" v-html="icons.left"></span><span class="txt">靠左对齐</span>
            </li>
            <li :class="{active: currentAlign==='center'}" @click.stop="applyAlign('center')">
              <span class="icon" v-html="icons.center"></span><span class="txt">居中对齐</span>
            </li>
            <li :class="{active: currentAlign==='right'}" @click.stop="applyAlign('right')">
              <span class="icon" v-html="icons.right"></span><span class="txt">靠右对齐</span>
            </li>
            <li :class="{active: currentAlign==='justify'}" @click.stop="applyAlign('justify')">
              <span class="icon" v-html="icons.justify"></span><span class="txt">两端对齐</span>
            </li>
          </ul>
        </div>
      </span>
      <!-- 清除格式 -->
      <span class="ql-formats">
        <!-- 表情 -->
        <div class="qfe-emoji-wrapper" @mousedown.stop.prevent>
          <button class="qfe-emoji-btn" data-tip="表情" @click.stop.prevent="toggleEmojiPanel">😊</button>
          <div v-if="showEmojiPanel" class="qfe-emoji-panel" @mousedown.prevent>
            <span v-for="em in emojiList" :key="em" class="qfe-emoji-item" @click.stop="insertEmoji(em)">{{ em }}</span>
          </div>
        </div>
        <!-- 链接 / 图片 / 音视频 使用 Quill 原生处理器 -->
        <button class="ql-link" data-tip="超链接" />
        <button class="ql-image" data-tip="图片" />
        <button class="qfe-video-btn" data-tip="音视频" @click.stop.prevent="handleInsertVideo">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        </button>
        <button class="ql-clean" data-tip="清除格式" />
      </span>
      <!-- 高级编辑按钮 -->
      <span class="ql-formats">
        <button class="qfe-advanced-btn" data-tip="高级编辑" @click.stop.prevent="openAdvancedEditor">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
      </span>
      <!-- 隐藏文件输入：不占布局 -->
      <input ref="imageInputRef" class="qfe-file-hidden" type="file" accept="image/*" @change="onImageChosen" />
    </div>

    <!-- 编辑区 -->
    <div ref="editorContainerRef" class="qfe-editor-wrapper">
      <div ref="editorRef" class="qfe-editor ql-editor" />
      <div v-if="placeholder && empty && !isFocused" class="qfe-placeholder" @click.stop="focusEditor">{{ placeholder }}</div>
    </div>

    <!-- 自定义超链接弹窗（Teleport 到 body，避免容器高度变化引起抖动） -->
    <teleport to="body">
      <div v-if="showLinkDialog" class="qfe-link-mask" @click.self="cancelLink">
        <div class="qfe-link-dialog" @mousedown.stop @click.stop>
          <div class="qfe-link-head">
            <span>输入链接地址</span>
            <button class="qfe-link-close" @click="cancelLink">×</button>
          </div>
          <div class="qfe-link-body">
            <label class="qfe-link-label">链接名字：</label>
            <input ref="linkTextInputRef" v-model="linkText" class="qfe-link-input" placeholder="显示的文字" />
            <label class="qfe-link-label" style="margin-top:10px;">链接地址：</label>
            <input v-model="linkUrl" class="qfe-link-input" placeholder="https://" />
            <div v-if="linkError" class="qfe-link-error">{{ linkError }}</div>
          </div>
            <div class="qfe-link-actions">
              <button class="qfe-btn ghost" @click="cancelLink">取 消</button>
              <button class="qfe-btn primary" @click="confirmLink">确 定</button>
            </div>
        </div>
      </div>
    </teleport>

    <!-- 音视频自定义弹窗 -->
    <teleport to="body">
      <div v-if="showVideoDialog" class="qfe-video-mask" @click.self="closeVideoDialog">
        <div class="qfe-video-dialog" @mousedown.stop @click.stop>
          <div class="qfe-video-head">
            <span>插入音视频</span>
            <button class="qfe-video-close" @click="closeVideoDialog">×</button>
          </div>
          <div class="qfe-video-body">
            <label class="qfe-video-label">音视频地址或iframe嵌入代码</label>
            <textarea 
              ref="videoUrlRef" 
              v-model="videoUrl" 
              class="qfe-video-textarea"
              placeholder="支持以下格式：&#10;1. 直链地址：https://example.com/video.mp4&#10;2. iframe嵌入代码：&lt;iframe src=&quot;...&quot;&gt;&lt;/iframe&gt;&#10;3. 视频网站链接"
              rows="4"
            />
            <div v-if="videoErr" class="qfe-video-error">{{ videoErr }}</div>
            <div class="qfe-video-tips">
              <div class="qfe-video-tip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                支持 mp4、webm 等视频格式和 mp3、wav 等音频格式
              </div>
              <div class="qfe-video-tip">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                  <line x1="8" y1="21" x2="16" y2="21"></line>
                  <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>
                支持 B站、优酷等网站的iframe嵌入代码
              </div>
            </div>
          </div>
          <div class="qfe-video-actions">
            <button class="qfe-btn ghost" @click="closeVideoDialog">取 消</button>
            <button class="qfe-btn primary" @click="confirmVideo">插 入</button>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 高级富文本编辑弹窗 -->
    <QuillRichTextDialog
      v-model="showAdvancedDialog"
      :content="advancedContent"
      title="高级编辑"
      @confirm="onAdvancedConfirm"
      @cancel="showAdvancedDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'
import QuillRichTextDialog from './QuillRichTextDialog.vue'

interface Props {
  modelValue: string
  placeholder?: string
  readOnly?: boolean
  floating?: boolean        // 兼容旧：不再使用动态计算
  autoHide?: boolean
  panelOffsetY?: number
  panelOffsetX?: number
  hideWhenEmpty?: boolean
  fixedAbove?: boolean      // 是否固定在编辑区域顶部
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请输入内容...',
  readOnly: false,
  floating: false,
  autoHide: true,
  panelOffsetY: -42,
  panelOffsetX: 0,
  hideWhenEmpty: true,
  fixedAbove: true
})

const emit = defineEmits<{
  (e:'update:modelValue', v:string):void
  (e:'change', v:string):void
  (e:'focus'):void
  (e:'blur'):void
}>()

const wrapperRef = ref<HTMLElement|null>(null)
const editorRef = ref<HTMLElement|null>(null)
const editorContainerRef = ref<HTMLElement|null>(null)
const toolbarRef = ref<HTMLElement|null>(null)
const quill = ref<Quill | null>(null)

const isFocused = ref(false)
const empty = ref(true)
const panelLeft = ref(0)
const panelTop = ref(0)
let rafId: number | null = null
const showAlignMenu = ref(false)
const currentAlign = ref<string | null>(null)
const showEmojiPanel = ref(false)
const emojiList = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤔','🙄','😢','😭','😡','👍','👎','👏','🙏','🔥','✨','✅','❌','🌟','🎉','💡']
const imageInputRef = ref<HTMLInputElement|null>(null)
// Link dialog state
const showLinkDialog = ref(false)
const linkText = ref('')
const linkUrl = ref('')
const linkError = ref('')
const linkRange = ref<{index:number,length:number}|null>(null)
const linkTextInputRef = ref<HTMLInputElement|null>(null)

// Video dialog state
const showVideoDialog = ref(false)
const videoUrl = ref('')
const videoErr = ref('')
const videoUrlRef = ref<HTMLInputElement|null>(null)
const videoRange = ref<{index:number,length:number}|null>(null)

// Advanced editor dialog state
const showAdvancedDialog = ref(false)
const advancedContent = ref('')

const icons = {
  left: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="17" y2="18"/></svg>',
  center: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="6" x2="18" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>',
  right: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="7" y1="18" x2="21" y2="18"/></svg>',
  justify: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>'
}

const currentAlignIcon = computed(()=>{
  if(!currentAlign.value) return icons.left
  return icons[currentAlign.value as keyof typeof icons] || icons.left
})

const toolbarVisible = computed(()=>{
  if (!toolbarRef.value) return false
  if (props.autoHide && !isFocused.value) return false
  if (props.hideWhenEmpty && empty.value && !isFocused.value) return false
  return true
})

const toolbarInside = computed(()=>true)

function initQuill(){
  if (!editorRef.value || !toolbarRef.value) return
  setupCustomSizes()
  registerIframeBlot()
  quill.value = new Quill(editorRef.value, {
    theme: 'snow',
    readOnly: props.readOnly,
    placeholder: '',  // 移除内置 placeholder，使用自定义的 qfe-placeholder div
    modules: {
      toolbar: {
        container: toolbarRef.value!,
        handlers: {
          link: handleInsertLink,
          image: handleInsertImage
        }
      },
      history: { delay: 1000, maxStack: 100, userOnly: true }
    }
  })
  cleanupSizeFallback()
  // 初始内容
  if (props.modelValue) {
    quill.value.root.innerHTML = props.modelValue
    checkEmpty()
  }

  quill.value.on('text-change', ()=>{
    const html = quill.value!.root.innerHTML
    checkEmpty()
    emit('update:modelValue', html)
    emit('change', html)
  })
  quill.value.on('selection-change', range => {
    // 链接弹窗打开时忽略 Quill selection 变化，防止焦点闪动导致 toolbar 高度变化引起抖动
    if (showLinkDialog.value) return
    if (range) {
      if(!isFocused.value){
        isFocused.value = true
        emit('focus')
      }
      updateCurrentAlign()
    } else {
      isFocused.value = false
      emit('blur')
      if (props.autoHide) {
        setTimeout(()=>{ if(!isFocused.value){} }, 40)
      }
    }
  })
}

// 自定义 6 档字号 whitelist，并使用 style attributor
function setupCustomSizes(){
  const SizeStyle = Quill.import('attributors/style/size')
  SizeStyle.whitelist = ['10px','12px','14px','16px','20px','28px']
  Quill.register(SizeStyle, true)
}

function registerIframeBlot(){
  if((Quill as any).imports['formats/iframe']) return
  const BlockEmbed = Quill.import('blots/block/embed')
  class IframeBlot extends BlockEmbed {
    static blotName = 'iframe'
    static tagName = 'iframe'
    static className = 'qfe-iframe'
    
    static create(value: string) {
      const node = super.create() as HTMLIFrameElement
      if (typeof value === 'string') {
        // 如果是完整的iframe HTML代码
        if (value.includes('<iframe')) {
          const tempDiv = document.createElement('div')
          tempDiv.innerHTML = value
          const iframe = tempDiv.querySelector('iframe')
          if (iframe) {
            // 复制所有属性
            Array.from(iframe.attributes).forEach(attr => {
              node.setAttribute(attr.name, attr.value)
            })
          }
        } else {
          // 如果是简单的URL
          node.src = value
        }
      }
      
      // 设置默认属性
      if (!node.getAttribute('width')) node.setAttribute('width', '320')
      if (!node.getAttribute('height')) node.setAttribute('height', '240')
      node.setAttribute('frameborder', '0')
      node.setAttribute('allowfullscreen', 'true')
      
      return node
    }
    
    static value(node: HTMLIFrameElement) {
      return node.outerHTML
    }
  }
  Quill.register(IframeBlot as any, true)
}

// 清理旧兜底遗留
function cleanupSizeFallback(){
  const root = toolbarRef.value
  if(!root) return
  root.querySelectorAll('.qfe-size-fallback').forEach(n=>n.remove())
  // 早期版本加过 data-label-cn，移除避免 ::after 重复
  root.querySelectorAll('.ql-picker.ql-size .ql-picker-item[data-label-cn]').forEach(it=>{
    (it as HTMLElement).removeAttribute('data-label-cn')
  })
}

function focusEditor(){
  if (quill.value) {
    quill.value.focus()
  }
}

function onWrapperClick(e:MouseEvent){
  if(showLinkDialog.value || showEmojiPanel.value || showAlignMenu.value) return
  const target = e.target as HTMLElement
  if(target.closest('.qfe-link-dialog')) return
  focusEditor()
}

function checkEmpty(){
  if (!quill.value) return
  const txt = quill.value.getText().trim()
  empty.value = txt.length === 0
}

function reposition(){
  if (!props.floating) return
  if (!editorContainerRef.value || !toolbarRef.value) return
  const rect = editorContainerRef.value.getBoundingClientRect()
  panelLeft.value = rect.left + props.panelOffsetX
  let top = rect.top + props.panelOffsetY
  if (top < 4) top = 4
  panelTop.value = top
}

function scheduleReposition(){
  if (!props.floating) return
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(reposition)
}

function updateCurrentAlign(){
  if(!quill.value) return
  const range = quill.value.getSelection()
  if(!range) return
  const fmt = quill.value.getFormat(range)
  currentAlign.value = (fmt.align as string) || null
}

function toggleAlignMenu(){
  showAlignMenu.value = !showAlignMenu.value
  if(showAlignMenu.value){
    updateCurrentAlign()
    setTimeout(()=>document.addEventListener('mousedown', handleDocClick),0)
  }else{
    document.removeEventListener('mousedown', handleDocClick)
  }
}

function handleDocClick(e:MouseEvent){
  if(!showAlignMenu.value) return
  const target = e.target as HTMLElement
  if(toolbarRef.value && !toolbarRef.value.contains(target)){
    showAlignMenu.value = false
    document.removeEventListener('mousedown', handleDocClick)
  }
}

function applyAlign(val: string | null){
  if(!quill.value) return
  quill.value.format('align', val || false)
  currentAlign.value = val
  showAlignMenu.value = false
  document.removeEventListener('mousedown', handleDocClick)
  quill.value.focus()
}

// Emoji
function toggleEmojiPanel(){
  showEmojiPanel.value = !showEmojiPanel.value
  if(showEmojiPanel.value){
    setTimeout(()=>document.addEventListener('mousedown', emojiDocClick),0)
  }else{
    document.removeEventListener('mousedown', emojiDocClick)
  }
}
function emojiDocClick(e:MouseEvent){
  const target = e.target as HTMLElement
  if(toolbarRef.value && !toolbarRef.value.contains(target)){
    showEmojiPanel.value = false
    document.removeEventListener('mousedown', emojiDocClick)
  }
}
function insertEmoji(em:string){
  if(!quill.value) return
  const range = quill.value.getSelection(true)
  const index = range ? range.index : quill.value.getLength()
  quill.value.insertText(index, em, 'user')
  quill.value.setSelection(index + em.length, 0, 'user')
  showEmojiPanel.value = false
  document.removeEventListener('mousedown', emojiDocClick)
}

// 链接/图片/视频 Handlers
function handleInsertLink(this: any){
  if(!quill.value) return
  const range = quill.value.getSelection()
  linkRange.value = range ? { index: range.index, length: range.length } : { index: quill.value.getLength(), length: 0 }
  let initialText = ''
  if(range && range.length){
    initialText = quill.value.getText(range.index, range.length)
  }
  // 检查是否已有链接格式
  if(range){
    const f = quill.value.getFormat(range)
    if(f.link){
      linkUrl.value = f.link
      if(!initialText) initialText = f.link
    } else {
      linkUrl.value = 'https://'
    }
  } else {
    linkUrl.value = 'https://'
  }
  linkText.value = initialText.trim()
  linkError.value = ''
  showLinkDialog.value = true
  setTimeout(()=>{ linkTextInputRef.value?.focus() }, 10)
}

function handleInsertImage(this: any){
  // 打开隐藏文件输入
  if(imageInputRef.value){
    imageInputRef.value.value=''
    imageInputRef.value.click()
  }
}
async function onImageChosen(e: Event){
  if(!quill.value) return
  const input = e.target as HTMLInputElement
  const file = input.files && input.files[0]
  if(!file) return
  const reader = new FileReader()
  reader.onload = () => {
    const base64 = reader.result as string
    const range = quill.value!.getSelection(true)
    const index = range ? range.index : quill.value!.getLength()
    quill.value!.insertEmbed(index, 'image', base64, 'user')
    quill.value!.setSelection(index + 1, 0, 'user')
  }
  reader.readAsDataURL(file)
}

function handleInsertVideo(this: any){
  if(!quill.value) return
  openVideoDialog()
}

function openVideoDialog(){
  if(!quill.value) return
  const range = quill.value.getSelection()
  videoRange.value = range ? { index: range.index, length: range.length } : { index: quill.value.getLength(), length: 0 }
  videoUrl.value = ''
  videoErr.value = ''
  showVideoDialog.value = true
  setTimeout(()=> videoUrlRef.value?.focus(), 10)
}

function closeVideoDialog(){
  showVideoDialog.value = false
}

function confirmVideo(){
  if(!quill.value || !videoRange.value) return
  const input = videoUrl.value.trim()
  if(!input) {
    videoErr.value = '请输入音视频地址或iframe嵌入代码'
    return
  }
  
  const { index } = videoRange.value
  // 1. iframe 代码
  if(input.includes('<iframe') && input.includes('</iframe>')) {
    quill.value.insertEmbed(index, 'iframe', input, 'user')
  } else if(/\.(mp4|webm|ogg|m3u8)(\?|#|$)/i.test(input)) {
    // 2. 明确的视频直链：使用自定义 html embed，带 controls
    const html = `<video src="${input}" controls playsinline preload="metadata" style="max-width:100%;display:block;margin:10px 0;border-radius:6px;">您的浏览器不支持 video 标签</video>`
    // 用 clipboard dangerouslyPasteHTML 在当前位置插入 HTML（保持一个 blot）
    const delta = (quill.value.clipboard as any).convert(html)
    quill.value.updateContents(new (Quill as any).Delta().retain(index).delete(videoRange.value.length || 0).concat(delta), 'user')
  } else if(/\.(mp3|wav|aac|ogg)(\?|#|$)/i.test(input)) {
    // 3. 音频直链
    const html = `<audio src="${input}" controls preload="metadata" style="display:block;margin:10px 0;max-width:100%;">您的浏览器不支持 audio 标签</audio>`
    const delta = (quill.value.clipboard as any).convert(html)
    quill.value.updateContents(new (Quill as any).Delta().retain(index).delete(videoRange.value.length || 0).concat(delta), 'user')
  } else if(input.startsWith('http')) {
    // 4. 其它 http(s) 链接：尝试识别 B站常规页面 URL 并转为播放器 iframe
    const bilibiliMatch = input.match(/bilibili\.com\/video\/((BV[\w]+)|av(\d+))/i)
    if(bilibiliMatch){
      let bvid = ''
      if(/^BV/i.test(bilibiliMatch[1])) bvid = bilibiliMatch[1]
      // 构造 B 站标准播放器地址（优先 bvid）
      const playerSrc = bvid ? `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&muted=0` : input
      quill.value.insertEmbed(index, 'iframe', `<iframe src="${playerSrc}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`, 'user')
    } else {
      quill.value.insertEmbed(index, 'iframe', `<iframe src="${input}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`, 'user')
    }
  } else {
    // 5. Fallback iframe
    quill.value.insertEmbed(index, 'iframe', `<iframe src="${input}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`, 'user')
  }

  quill.value.setSelection(index + 1, 0, 'user')
  showVideoDialog.value = false
}

// Link dialog actions
function confirmLink(){
  if(!quill.value || !linkRange.value) return
  const text = (linkText.value || '').trim()
  const url = (linkUrl.value || '').trim()
  // 简单校验
  if(!url || !/^https?:\/\//i.test(url)){
    linkError.value = '请输入以 http(s):// 开头的地址'
    return
  }
  const insertText = text || url
  const { index, length } = linkRange.value
  // 替换原有选择内容
  if(length){
    quill.value.deleteText(index, length, 'user')
  }
  quill.value.insertText(index, insertText, { link: url }, 'user')
  quill.value.setSelection(index + insertText.length, 0, 'user')
  showLinkDialog.value = false
}
function cancelLink(){
  showLinkDialog.value = false
}

// Advanced editor
function openAdvancedEditor(){
  if(!quill.value) return
  // 获取当前编辑器的 HTML 内容
  advancedContent.value = quill.value.root.innerHTML
  showAdvancedDialog.value = true
}

function onAdvancedConfirm(html: string){
  if(!quill.value) return
  // 将高级编辑器的内容设置回当前编辑器
  const sel = quill.value.getSelection()
  quill.value.root.innerHTML = html
  checkEmpty()
  emit('update:modelValue', html)
  emit('change', html)
  // 尝试恢复光标位置
  if(sel) {
    try {
      ;(quill.value as any).setSelection(sel)
    } catch(e) {
      // 如果位置无效，将光标放到末尾
      quill.value.setSelection(quill.value.getLength(), 0)
    }
  }
  showAdvancedDialog.value = false
}

// Esc 关闭
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && showLinkDialog.value){ showLinkDialog.value=false }
  if(e.key==='Escape' && showVideoDialog.value){ showVideoDialog.value=false }
})

onMounted(()=>{ initQuill() })

onBeforeUnmount(()=>{ if (rafId) cancelAnimationFrame(rafId); quill.value = null })

watch(()=>props.modelValue, (val)=>{
  if (!quill.value) return
  const current = quill.value.root.innerHTML
  if (val !== current) {
    const sel = quill.value.getSelection()
    quill.value.root.innerHTML = val || ''
    checkEmpty()
    if (sel) (quill.value as any).setSelection(sel)
  }
})
</script>

<style scoped>
.qfe-wrapper{ position:relative; width:100%; }
.qfe-editor-wrapper{ position:relative; min-height:120px; border:1px solid #d1d5db; border-radius:6px; background:#fff; }
.qfe-editor{ min-height:120px; padding:0px 0px; }
.qfe-editor:focus{ outline:none; }
.qfe-placeholder{ position:absolute; left:16px; top:10px; color:#9ca3af; pointer-events:none; }
.qfe-toolbar{ display:flex; align-items:center; gap:4px; padding:6px 8px; background:#f9fafb; border:1px solid #d1d5db; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.08); }
.qfe-toolbar.qfe-floating{ position:fixed; z-index:9999; }
.qfe-toolbar.qfe-fixed-above{ position:absolute; top:-40px; left:0; transform:translateY(-4px); z-index:10; }
.qfe-toolbar ::v-deep(.ql-picker){ line-height:20px; }
.qfe-toolbar ::v-deep(.ql-formats){ margin-right:4px; }
.qfe-toolbar ::v-deep(button){ width:26px; height:26px; display:inline-flex; align-items:center; justify-content:center; }
/* header 已移除，相关样式删除 */
.qfe-wrapper.is-focused .qfe-editor-wrapper{ box-shadow:0 0 0 1px #3b82f6; border-color:#3b82f6; }
/* 自定义 6 档字号中文映射（使用 style/size attributor 值） */
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="10px"]::before){ content:'很小' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="12px"]::before){ content:'小' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="14px"]::before){ content:'正常' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="16px"]::before){ content:'大' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="20px"]::before){ content:'很大' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="28px"]::before){ content:'非常大' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="10px"]::before){ content:'很小' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="12px"]::before){ content:'小' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="14px"]::before){ content:'正常' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="16px"]::before){ content:'大' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="20px"]::before){ content:'很大' !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="28px"]::before){ content:'非常大' !important; }

/* 缩窄顶部显示区，不跟随下拉宽度 */
.qfe-toolbar :deep(.ql-picker.ql-size){ width:auto; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-label){
  width:64px; /* 顶部显示更窄 */
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
  padding-right:18px; /* 给箭头留空间 */
  box-sizing:border-box;
}
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-options){
  min-width:120px; /* 下拉仍然足够宽 */
}

/* 自定义对齐下拉 */
.qfe-align{ position:relative; display:inline-flex; }
.qfe-align-btn{ width:26px; height:26px; background:#fff; border:1px solid #d1d5db; border-radius:4px; display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0; }
.qfe-align-btn:hover{ background:#f3f4f6; }
.qfe-align-menu{ position:absolute; top:30px; left:0; list-style:none; margin:4px 0 0; padding:4px 0; background:#fff; border:1px solid #d1d5db; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,0.12); width:140px; z-index:2000; }
.qfe-align-menu li{ display:flex; align-items:center; gap:6px; font-size:13px; line-height:1.2; padding:6px 10px; cursor:pointer; }
.qfe-align-menu li .icon svg{ stroke-width:2.2; }
.qfe-align-menu li:hover{ background:#f3f4f6; }
.qfe-align-menu li.active{ color:#2563eb; background:#eff6ff; }
.qfe-align-menu li.active .icon svg{ color:#2563eb; stroke:#2563eb; }
.qfe-align-menu .icon{ width:20px; display:flex; align-items:center; justify-content:center; }

/* Emoji 面板 */
.qfe-emoji-wrapper{ position:relative; display:inline-flex; }
.qfe-emoji-btn{ width:26px; height:26px; background:#fff; border:1px solid #d1d5db; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px; }
.qfe-emoji-btn:hover{ background:#f3f4f6; }
.qfe-emoji-panel{ position:absolute; top:30px; left:0; width:200px; background:#fff; border:1px solid #d1d5db; border-radius:8px; padding:6px 6px 4px; box-shadow:0 4px 16px rgba(0,0,0,0.15); display:flex; flex-wrap:wrap; gap:4px; z-index:2200; }
.qfe-emoji-item{ width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:20px; cursor:pointer; border-radius:4px; transition:background .15s; }
.qfe-emoji-item:hover{ background:#f3f4f6; }

/* 视频按钮 */
.qfe-video-btn{ width:26px; height:26px; background:#fff; border:1px solid #d1d5db; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.qfe-video-btn:hover{ background:#f3f4f6; }
.qfe-video-btn svg{ color:#374151; }

/* 高级编辑按钮 */
.qfe-advanced-btn{ width:26px; height:26px; background:#fff; border:1px solid #d1d5db; border-radius:4px; cursor:pointer; display:flex; align-items:center; justify-content:center; }
.qfe-advanced-btn:hover{ background:#f3f4f6; }
.qfe-advanced-btn svg{ color:#374151; }

/* 隐藏文件选择，不影响布局 */
.qfe-file-hidden{ position:fixed; left:-9999px; top:-9999px; opacity:0; width:0; height:0; }

/* 链接弹窗 */
.qfe-link-mask{ position:fixed; inset:0; background:rgba(0,0,0,0.15); display:flex; align-items:center; justify-content:center; z-index:50000; }
.qfe-link-dialog{ width:420px; background:#fff; border-radius:10px; box-shadow:0 8px 32px rgba(0,0,0,0.18); padding:0 0 12px; font-size:14px; animation:qfeFade .15s ease; }
.qfe-link-head{ display:flex; align-items:center; justify-content:space-between; padding:14px 18px 10px; font-weight:600; }
.qfe-link-close{ background:none; border:0; font-size:20px; line-height:1; cursor:pointer; color:#555; }
.qfe-link-close:hover{ color:#000; }
.qfe-link-body{ padding:0 20px; display:flex; flex-direction:column; }
.qfe-link-label{ font-size:13px; color:#444; margin-bottom:4px; }
.qfe-link-input{ height:34px; line-height:34px; padding:0 10px; border:1px solid #cfd5dd; border-radius:6px; outline:none; font-size:13px; }
.qfe-link-input:focus{ border-color:#3b82f6; box-shadow:0 0 0 1px #3b82f6; }
.qfe-link-actions{ display:flex; justify-content:flex-end; gap:10px; padding:14px 20px 0; }
.qfe-btn{ min-width:72px; height:34px; font-size:13px; border-radius:6px; cursor:pointer; border:1px solid #d1d5db; background:#fff; }
.qfe-btn.ghost:hover{ background:#f3f4f6; }
.qfe-btn.primary{ background:#2563eb; border-color:#2563eb; color:#fff; }
.qfe-btn.primary:hover{ background:#1d4ed8; }
.qfe-link-error{ margin-top:8px; color:#dc2626; font-size:12px; }

/* 音视频弹窗 */
.qfe-video-mask{ position:fixed; inset:0; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; z-index:50000; }
.qfe-video-dialog{ width:520px; background:#fff; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,0.3); padding:0 0 18px; font-size:14px; animation:qfeFade .2s ease; }
.qfe-video-head{ display:flex; align-items:center; justify-content:space-between; padding:18px 24px 8px; font-weight:600; font-size:16px; color:#1f2937; }
.qfe-video-close{ background:none; border:0; font-size:22px; line-height:1; cursor:pointer; color:#6b7280; border-radius:6px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; }
.qfe-video-close:hover{ background:#f3f4f6; color:#374151; }
.qfe-video-body{ padding:0 24px; display:flex; flex-direction:column; }
.qfe-video-label{ font-size:13px; color:#374151; margin:12px 0 6px; font-weight:500; }
.qfe-video-textarea{ min-height:100px; border:1px solid #d1d5db; border-radius:8px; padding:12px; outline:none; font-size:13px; font-family:ui-monospace,SFMono-Regular,'SF Mono',Monaco,Inconsolata,'Liberation Mono',monospace; line-height:1.4; resize:vertical; transition:all .2s; }
.qfe-video-textarea:focus{ border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
.qfe-video-error{ color:#dc2626; font-size:12px; margin-top:8px; padding:8px 12px; background:#fef2f2; border-radius:6px; border-left:3px solid #dc2626; }
.qfe-video-tips{ margin-top:12px; }
.qfe-video-tip{ display:flex; align-items:center; gap:8px; font-size:12px; color:#6b7280; margin-bottom:6px; }
.qfe-video-tip svg{ flex-shrink:0; color:#9ca3af; }
.qfe-video-actions{ display:flex; justify-content:flex-end; gap:12px; padding:20px 24px 0; }

@keyframes qfeFade{ from{ transform:translateY(4px); opacity:0;} to{ transform:translateY(0); opacity:1;} }

/* 对应字体大小展示效果（编辑区内） */
.qfe-editor :deep(span[style*="font-size:10px"]){ line-height:1.4; }
.qfe-editor :deep(span[style*="font-size:12px"]){ line-height:1.5; }
.qfe-editor :deep(span[style*="font-size:14px"]){ line-height:1.6; }
.qfe-editor :deep(span[style*="font-size:16px"]){ line-height:1.6; }
.qfe-editor :deep(span[style*="font-size:20px"]){ line-height:1.3; }
.qfe-editor :deep(span[style*="font-size:28px"]){ line-height:1.2; }
/* 下拉选项实时预览实际字号 */
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="10px"]){ font-size:10px !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="12px"]){ font-size:12px !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="14px"]){ font-size:14px !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="16px"]){ font-size:16px !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="20px"]){ font-size:20px !important; }
.qfe-toolbar :deep(.ql-picker.ql-size .ql-picker-item[data-value="28px"]){ font-size:28px !important; }
/* 仅保留 ::before 覆盖，去掉兜底 span/::after，防止出现 “正文正文” */
/* ---------------------- 自定义黑色即时提示框 ---------------------- */
.qfe-toolbar [data-tip]{ position:relative; }
.qfe-toolbar [data-tip]::after, .qfe-toolbar [data-tip]::before{ pointer-events:none; position:absolute; opacity:0; transition:opacity .12s; }
.qfe-toolbar [data-tip]:hover::after, .qfe-toolbar [data-tip]:hover::before{ opacity:1; }
.qfe-toolbar [data-tip]::after{ content:attr(data-tip); bottom:100%; left:50%; transform:translate(-50%, -6px); background:#111; color:#fff; font-size:12px; line-height:1; padding:6px 8px; border-radius:4px; white-space:nowrap; z-index:10000; box-shadow:0 2px 6px rgba(0,0,0,0.35); }
.qfe-toolbar [data-tip]::before{ content:""; bottom:100%; left:50%; transform:translate(-50%, 0); border:6px solid transparent; border-top-color:#111; z-index:10000; margin-bottom:-6px; }
/* 富文本中直接插入的 video/audio 基础样式（非 iframe） */
.qfe-editor :deep(video){ max-width:100%; display:block; margin:10px 0; border-radius:6px; background:#000; }
.qfe-editor :deep(audio){ width:100%; display:block; margin:10px 0; }

/* iframe 视频样式 - 与填写页面和预览页面保持一致 */
.qfe-editor :deep(iframe),
.qfe-editor :deep(.qfe-iframe) {
  display: block !important;
  margin: 10px auto !important;
  max-width: 100% !important;
  width: 100% !important;
  height: 450px !important;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: none;
  background: #f5f5f5;
  clear: both;
  float: none !important;
}
</style>
