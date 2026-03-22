<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    :width="width"
    append-to-body
    destroy-on-close
    class="qrd-dialog"
    @close="onCancel"
    @opened="onOpened"
  >
  <div class="qrd-toolbar ql-toolbar ql-snow" v-show="ready">
      <!-- 左：基础格式 -->
      <span class="qrd-group">
        <select class="ql-size" v-model="_sizeModel" @change="applySize" :disabled="readOnly">
          <option v-for="s in sizeOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </span>
      <span class="qrd-group">
        <button class="ql-bold" :disabled="readOnly" data-tip="加粗" />
        <button class="ql-italic" :disabled="readOnly" data-tip="斜体" />
        <button class="ql-underline" :disabled="readOnly" data-tip="下划线" />
        <button class="ql-strike" :disabled="readOnly" data-tip="删除线" />
        <button class="ql-blockquote" :disabled="readOnly" data-tip="引用" />
        <button class="ql-code-block" :disabled="readOnly" data-tip="代码块" />
      </span>
      <span class="qrd-group">
        <button class="ql-list" value="ordered" :disabled="readOnly" data-tip="有序列表" />
        <button class="ql-list" value="bullet" :disabled="readOnly" data-tip="无序列表" />
        <!-- 自定义“对齐”下拉，替代 Quill 默认 select -->
        <span class="qrd-dropdown" :class="{ open: alignOpen }">
          <button class="qrd-btn" :disabled="readOnly" data-tip="对齐" @click.stop="toggleAlignMenu">
            <svg v-if="currentAlign==='left'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="15" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="15" y2="18"></line>
            </svg>
            <svg v-else-if="currentAlign==='center'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="6" x2="19" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="5" y1="18" x2="19" y2="18"></line>
            </svg>
            <svg v-else-if="currentAlign==='right'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="9" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="9" y1="18" x2="21" y2="18"></line>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div v-if="alignOpen" class="qrd-menu qrd-align-menu" @mousedown.prevent>
            <button class="item" :class="{ active: currentAlign==='left' }" @click="setAlign('left')">
              <span class="icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="3" y1="6" x2="15" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="15" y2="18"></line>
                </svg>
              </span>
              <span class="label">靠左对齐</span>
            </button>
            <button class="item" :class="{ active: currentAlign==='center' }" @click="setAlign('center')">
              <span class="icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="5" y1="6" x2="19" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="5" y1="18" x2="19" y2="18"></line>
                </svg>
              </span>
              <span class="label">居中对齐</span>
            </button>
            <button class="item" :class="{ active: currentAlign==='right' }" @click="setAlign('right')">
              <span class="icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="9" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="9" y1="18" x2="21" y2="18"></line>
                </svg>
              </span>
              <span class="label">靠右对齐</span>
            </button>
            <button class="item" :class="{ active: currentAlign==='justify' }" @click="setAlign('justify')">
              <span class="icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </span>
              <span class="label">两端对齐</span>
            </button>
          </div>
        </span>
        <button class="ql-indent" value="-1" :disabled="readOnly" data-tip="减少缩进" />
        <button class="ql-indent" value="+1" :disabled="readOnly" data-tip="增加缩进" />
      </span>
      <span class="qrd-group">
        <span class="qrd-tip" data-tip="文字颜色"><select class="ql-color" :disabled="readOnly" /></span>
        <span class="qrd-tip" data-tip="背景色"><select class="ql-background" :disabled="readOnly" /></span>
      </span>
      <span class="qrd-group">
        <!-- Emoji -->
        <button class="qrd-btn" :disabled="readOnly" @click="toggleEmoji" data-tip="表情">😊</button>
        <button class="ql-link" :disabled="readOnly" data-tip="超链接" />
        <button class="ql-image" :disabled="readOnly" data-tip="图片" />
        <button class="qrd-btn" :disabled="readOnly" @click="insertVideo" data-tip="音视频">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        </button>
        <button class="qrd-btn" :disabled="readOnly" @click="insertDivider" data-tip="分割线">—</button>
      </span>
      <span class="qrd-group">
        <!-- 改为自定义类，避免 Quill 报告未知 format 警告 -->
        <button class="qrd-btn qrd-undo" @click.prevent="undo" :disabled="readOnly" data-tip="撤销">↶</button>
        <button class="qrd-btn qrd-redo" @click.prevent="redo" :disabled="readOnly" data-tip="重做">↷</button>
        <button class="ql-clean" :disabled="readOnly" data-tip="清除格式" />
      </span>
      <span class="qrd-group meta" v-if="showCount">
        <span class="count" :class="{ overflow: contentLength > maxLength }">{{ contentLength }}<template v-if="maxLength">/{{ maxLength }}</template></span>
      </span>
      <!-- 工具浮层：表情 -->
      <div v-if="emojiVisible" class="qrd-emoji-panel" @mousedown.prevent>
        <span v-for="em in emojis" :key="em" class="item" @click="pickEmoji(em)">{{ em }}</span>
      </div>
      <!-- 链接自定义弹窗 -->
      <teleport to="body">
        <div v-if="showLinkDialog" class="qrd-link-mask" @click.self="closeLinkDialog">
          <div class="qrd-link-dialog" @mousedown.stop>
            <div class="head">
              <span>插入链接</span>
              <button class="close" @click="closeLinkDialog">×</button>
            </div>
            <div class="body">
              <label>显示文字</label>
              <input ref="linkTextRef" v-model="linkText" placeholder="如：点击查看" />
              <label style="margin-top:10px;">链接地址</label>
              <input v-model="linkUrl" placeholder="https://" />
              <div v-if="linkErr" class="err">{{ linkErr }}</div>
              <label class="blank-row"><input type="checkbox" v-model="linkBlank" /> 新窗口打开</label>
            </div>
            <div class="actions">
              <button class="btn ghost" @click="closeLinkDialog">取消</button>
              <button class="btn primary" @click="confirmLink">确定</button>
            </div>
          </div>
        </div>
      </teleport>
      
      <!-- 音视频自定义弹窗 -->
      <teleport to="body">
        <div v-if="showVideoDialog" class="qrd-video-mask" @click.self="closeVideoDialog">
          <div class="qrd-video-dialog" @mousedown.stop>
            <div class="head">
              <span>插入音视频</span>
              <button class="close" @click="closeVideoDialog">×</button>
            </div>
            <div class="body">
              <label>音视频地址或iframe嵌入代码</label>
              <textarea 
                ref="videoUrlRef" 
                v-model="videoUrl" 
                placeholder="支持以下格式：&#10;1. 直链地址：https://example.com/video.mp4&#10;2. iframe嵌入代码：&lt;iframe src=&quot;...&quot;&gt;&lt;/iframe&gt;&#10;3. 视频网站链接"
                rows="4"
              />
              <div v-if="videoErr" class="err">{{ videoErr }}</div>
              <div class="tips">
                <div class="tip-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                  支持 mp4、webm 等视频格式和 mp3、wav 等音频格式
                </div>
                <div class="tip-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                  </svg>
                  支持 B站、优酷等网站的iframe嵌入代码
                </div>
              </div>
            </div>
            <div class="actions">
              <button class="btn ghost" @click="closeVideoDialog">取消</button>
              <button class="btn primary" @click="confirmVideo">插入</button>
            </div>
          </div>
        </div>
      </teleport>
      <!-- 隐藏文件上传 -->
      <input ref="imageInputRef" type="file" accept="image/*" class="qrd-hidden" @change="onImagePicked" />
    </div>

    <div :style="{ minHeight: height }" class="qrd-editor-wrapper" :class="{ 'is-readonly': readOnly }">
      <div ref="editorRef" class="qrd-editor" />
      <div v-if="!readOnly && placeholder && empty" class="qrd-placeholder" @click="focus">{{ placeholder }}</div>
    </div>

    <template #footer>
      <div class="qrd-footer">
        <slot name="extra" />
        <div class="spacer" />
        <el-button @click="onCancel">取消</el-button>
        <el-button type="primary" :disabled="maxLength>0 && contentLength>maxLength" @click="onConfirm">保存</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed, onBeforeUnmount } from 'vue'
import Quill from 'quill'
import 'quill/dist/quill.snow.css'

interface Props {
  modelValue: boolean
  content: string
  title?: string
  placeholder?: string
  width?: string
  height?: string
  readOnly?: boolean
  showCount?: boolean
  maxLength?: number
  enableSyntax?: boolean
  limitMode?: 'block' | 'truncate'
  imageUploader?: (file: File) => Promise<string>
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  content: '',
  title: '编辑富文本',
  placeholder: '请输入...',
  width: '960px',
  height: '380px',
  readOnly: false,
  showCount: true,
  maxLength: 0,
  enableSyntax: true,
  limitMode: 'block'
})
const emit = defineEmits<{
  (e:'update:modelValue', v:boolean):void
  (e:'update:content', v:string):void
  (e:'confirm', v:string):void
  (e:'cancel'):void
  (e:'change', v:string):void
}>()

const editorRef = ref<HTMLElement|null>(null)
const quill = ref<Quill|null>(null)
const ready = ref(false)
const empty = ref(true)
const alignOpen = ref(false)
const currentAlign = ref<'left' | 'center' | 'right' | 'justify'>('left')
const emojiVisible = ref(false)
const emojis = ['😀','😁','😂','🤣','😊','😍','😘','😎','🤔','🙄','😢','😭','😡','👍','👎','👏','🙏','🔥','✨','✅','❌','🌟','🎉','💡','💯','🚀','⚡']
const sizeOptions = [
  { label: '很小', value: '10px' },
  { label: '小', value: '12px' },
  { label: '正常', value: '14px' },
  { label: '大', value: '16px' },
  { label: '很大', value: '20px' },
  { label: '特大', value: '28px' }
]
const _sizeModel = ref('14px')

const showLinkDialog = ref(false)
const linkText = ref('')
const linkUrl = ref('https://')
const linkErr = ref('')
const linkBlank = ref(true)
const linkTextRef = ref<HTMLInputElement|null>(null)
let linkRange: any = null

const showVideoDialog = ref(false)
const videoUrl = ref('')
const videoErr = ref('')
const videoUrlRef = ref<HTMLInputElement|null>(null)
const videoRange = ref<any>(null)

const imageInputRef = ref<HTMLInputElement|null>(null)
const audioInputRef = ref<HTMLInputElement|null>(null)

const contentLength = computed(()=> (quill.value ? quill.value.getText().trim().length : 0))
const remaining = computed(()=> props.maxLength>0 ? Math.max(0, props.maxLength - contentLength.value) : Infinity)
let prevHtml = ''
let suppressChange = false

async function init(){
  if(!editorRef.value) return
  const Size = Quill.import('attributors/style/size')
  Size.whitelist = sizeOptions.map(s=>s.value)
  Quill.register(Size, true)
  registerHrBlot()
  registerIframeBlot()
  const toolbarEl = (editorRef.value.closest('.qrd-dialog') as HTMLElement)?.querySelector('.qrd-toolbar') as HTMLElement | null
  let syntaxModule: any = false
  if(props.enableSyntax){
    try {
      const mod:any = await import('highlight.js')
      const hljs = mod.default || mod
      syntaxModule = { highlight: (text:string)=> hljs.highlightAuto(text).value }
    } catch (e){
      console.warn('[QuillRichTextDialog] highlight.js 加载失败, 已降级为无语法高亮', e)
    }
  }
  quill.value = new Quill(editorRef.value, {
    theme:'snow',
    readOnly: props.readOnly,
    placeholder: '',  // 禁用 Quill 内置 placeholder，使用自定义的
    modules:{
      toolbar: toolbarEl ? { container: toolbarEl } : undefined,
      history: { delay: 800, maxStack: 150, userOnly: true },
      syntax: syntaxModule
    }
  })
  if(toolbarEl && quill.value){
    const tb = (quill.value as any).getModule('toolbar')
    tb?.addHandler('link', openLinkDialog)
    tb?.addHandler('image', ()=> triggerImagePick())
    // 自定义清除格式逻辑：无选区时清除当前行；若失败则清除全文
    tb?.addHandler('clean', onClean)
  }
  bindTextEvents()
  if(props.content){
    quill.value.root.innerHTML = props.content
    updateEmpty()
  }
  prevHtml = quill.value.root.innerHTML
  bindSelectionSync()
  bindKeyboard()
  ready.value = true
}

function bindTextEvents(){
  quill.value?.on('text-change', ()=>{
    if(suppressChange) return
    updateEmpty()
    if(props.maxLength>0 && contentLength.value > props.maxLength){
      if(props.limitMode === 'block'){
        suppressChange = true
        quill.value!.root.innerHTML = prevHtml
        const len = quill.value!.getLength()
        safeSetSelection(len-1,0)
        suppressChange = false
        return
      } else if(props.limitMode === 'truncate'){
        const plain = quill.value!.getText().slice(0, props.maxLength)
        suppressChange = true
        quill.value!.setText(plain,'silent')
        safeSetSelection(plain.length,0)
        suppressChange = false
        updateEmpty()
      }
    }
    const html = quill.value!.root.innerHTML
    prevHtml = html
    emit('update:content', html)
    emit('change', html)
  })
}

function bindSelectionSync(){
  quill.value?.on('selection-change', ()=>{
    if(!quill.value) return
    const range = quill.value.getSelection()
    if(!range) return
    const format = quill.value.getFormat(range.index)
    if(format.size){ _sizeModel.value = format.size }
    if(typeof format.align === 'string'){
      currentAlign.value = (format.align as any) || 'left'
    } else {
      currentAlign.value = 'left'
    }
  })
}

function toggleAlignMenu(){ if(!props.readOnly) alignOpen.value = !alignOpen.value }
function closeAlignMenu(){ alignOpen.value = false }
function setAlign(val: 'left'|'center'|'right'|'justify'){
  if(!quill.value) return
  closeAlignMenu()
  currentAlign.value = val
  quill.value.format('align', val === 'left' ? false as any : val)
}

function bindKeyboard(){
  const root = (editorRef.value?.closest('.qrd-dialog') as HTMLElement) || document
  root.addEventListener('keydown', onKeydown)
  // 点击外部关闭对齐菜单
  root.addEventListener('mousedown', (e:MouseEvent)=>{
    const t = e.target as HTMLElement
    if(t && t.closest && t.closest('.qrd-dropdown')) return
    alignOpen.value = false
  })
}
function onKeydown(e:KeyboardEvent){
  if(e.key === 's' && (e.metaKey || e.ctrlKey)){
    e.preventDefault(); onConfirm();
  } else if(e.key === 'Enter' && (e.metaKey || (e.ctrlKey && !e.shiftKey))){
    e.preventDefault(); onConfirm();
  }
}
function updateEmpty(){
  if(!quill.value) return
  empty.value = quill.value.getText().trim().length===0
}
function focus(){ quill.value?.focus() }
function undo(){ (quill.value as any)?.history?.undo() }
function redo(){ (quill.value as any)?.history?.redo() }
function toggleEmoji(){ emojiVisible.value = !emojiVisible.value }
function pickEmoji(em:string){
  if(!quill.value) return
  const range = quill.value.getSelection(true)
  const index = range? range.index : quill.value.getLength()
  quill.value.insertText(index, em, 'user')
  safeSetSelection(index + em.length, 0)
  emojiVisible.value = false
}
function triggerImagePick(){ imageInputRef.value?.click() }
function onImagePicked(e:Event){
  if(!quill.value) return
  const file = (e.target as HTMLInputElement).files?.[0]; if(!file) return
  if(typeof props.imageUploader === 'function'){
    props.imageUploader(file).then(url=>{
      if(!quill.value) return
      const range = quill.value.getSelection(true)
      const idx = range? range.index : quill.value.getLength()
      quill.value.insertEmbed(idx, 'image', url, 'user')
      safeSetSelection(idx+1,0)
    }).catch(err=>{
      console.error('image upload failed', err)
      base64Embed()
    })
  } else base64Embed()
  function base64Embed(){
    const reader = new FileReader()
    reader.onload = ()=>{
      const base64 = reader.result as string
      if(!quill.value) return
      const range = quill.value.getSelection(true)
      const idx = range? range.index : quill.value.getLength()
      quill.value.insertEmbed(idx, 'image', base64, 'user')
      safeSetSelection(idx+1,0)
    }
    reader.readAsDataURL(file as Blob)
  }
}
function insertVideo(){
  if(!quill.value) return
  openVideoDialog()
}

function openVideoDialog(){
  if(props.readOnly || !quill.value) return
  videoRange.value = quill.value.getSelection()
  videoUrl.value = ''
  videoErr.value = ''
  showVideoDialog.value = true
  nextTick(()=> videoUrlRef.value?.focus())
}

function closeVideoDialog(){
  showVideoDialog.value = false
}

function confirmVideo(){
  if(!quill.value) return
  const input = videoUrl.value.trim()
  if(!input) {
    videoErr.value = '请输入音视频地址或iframe嵌入代码'
    return
  }
  
  const range = videoRange.value || { index: quill.value.getLength(), length: 0 }
  const idx = range.index
  // 1. iframe 代码
  if(input.includes('<iframe') && input.includes('</iframe>')) {
    quill.value.insertEmbed(idx, 'iframe', input, 'user')
  } else if(/\.(mp4|webm|ogg|m3u8)(\?|#|$)/i.test(input)) {
    // 2. 视频直链：使用 <video controls>
    const html = `<video src="${input}" controls playsinline preload="metadata" style="max-width:100%;display:block;margin:10px 0;border-radius:6px;">您的浏览器不支持 video 标签</video>`
    const delta = (quill.value.clipboard as any).convert(html)
    quill.value.updateContents(new (Quill as any).Delta().retain(idx).delete(range.length || 0).concat(delta), 'user')
  } else if(/\.(mp3|wav|aac|ogg)(\?|#|$)/i.test(input)) {
    // 3. 音频直链
    const html = `<audio src="${input}" controls preload="metadata" style="display:block;margin:10px 0;max-width:100%;">您的浏览器不支持 audio 标签</audio>`
    const delta = (quill.value.clipboard as any).convert(html)
    quill.value.updateContents(new (Quill as any).Delta().retain(idx).delete(range.length || 0).concat(delta), 'user')
  } else if(input.startsWith('http')) {
    // 4. http(s) 链接：识别 B站普通页面 URL -> 转成播放器 iframe
    const bilibiliMatch = input.match(/bilibili\.com\/video\/((BV[\w]+)|av(\d+))/i)
    if(bilibiliMatch){
      let bvid = ''
      if(/^BV/i.test(bilibiliMatch[1])) bvid = bilibiliMatch[1]
      const playerSrc = bvid ? `https://player.bilibili.com/player.html?bvid=${bvid}&autoplay=0&muted=0` : input
      quill.value.insertEmbed(idx, 'iframe', `<iframe src="${playerSrc}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`, 'user')
    } else {
      quill.value.insertEmbed(idx, 'iframe', `<iframe src="${input}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`, 'user')
    }
  } else {
    // 5. fallback
    quill.value.insertEmbed(idx, 'iframe', `<iframe src="${input}" width="560" height="315" frameborder="0" allowfullscreen></iframe>`, 'user')
  }

  safeSetSelection(idx+1,0)
  showVideoDialog.value = false
}
function embedAudio(url: string){
  if (!quill.value) return
  const range = quill.value.getSelection(true)
  const idx = range ? range.index : quill.value.getLength()
  const html = `<audio src="${url}" controls preload="metadata" style="display:block;margin:10px 0;max-width:100%;">您的浏览器不支持 audio 标签</audio>`
  const delta = (quill.value.clipboard as any).convert(html)
  quill.value.updateContents(new (Quill as any).Delta().retain(idx).concat(delta), 'user')
  safeSetSelection(idx + 1, 0)
}

function insertAudio(){
  const pick = window.confirm('选择 “确定” 输入远程音频 URL，选择 “取消” 进行本地文件上传。')
  if(pick){
    const url = window.prompt('音频地址(支持 mp3 等)：')
    if(!url) return
    embedAudio(url)
  } else audioInputRef.value?.click()
}



function registerHrBlot(){
  if((Quill as any).imports['formats/hr']) return
  const BlockEmbed = Quill.import('blots/block/embed')
  class Hr extends BlockEmbed { static blotName = 'hr'; static tagName = 'hr'; static className = 'qrd-hr' }
  Quill.register(Hr as any, true)
}

function registerIframeBlot(){
  if((Quill as any).imports['formats/iframe']) return
  const BlockEmbed = Quill.import('blots/block/embed')
  class IframeBlot extends BlockEmbed {
    static blotName = 'iframe'
    static tagName = 'iframe'
    static className = 'qrd-iframe'
    
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
function insertDivider(){
  if(!quill.value) return
  const range = quill.value.getSelection(true)
  const idx = range? range.index : quill.value.getLength()
  quill.value.insertEmbed(idx, 'hr', true, 'user')
  quill.value.insertText(idx+1, '\n', 'silent')
  safeSetSelection(idx+2,0)
}
function applySize(){
  if(!quill.value) return
  const val = _sizeModel.value
  quill.value.format('size', val)
}
function openLinkDialog(){
  if(props.readOnly || !quill.value) return
  linkRange = quill.value.getSelection()
  let existingText=''
  if(linkRange && linkRange.length){ existingText = quill.value.getText(linkRange.index, linkRange.length) }
  linkText.value = existingText.trim()
  linkUrl.value = 'https://'
  linkErr.value = ''
  showLinkDialog.value = true
  nextTick(()=> linkTextRef.value?.focus())
}
function closeLinkDialog(){ showLinkDialog.value = false }
function confirmLink(){
  if(!quill.value) return
  const url = linkUrl.value.trim()
  if(!/^https?:\/\//i.test(url)){ linkErr.value='需以 http(s):// 开头'; return }
  const text = (linkText.value || url).trim()
  const r = linkRange || { index: quill.value.getLength(), length: 0 }
  if(r.length){ quill.value.deleteText(r.index, r.length, 'user') }
  quill.value.insertText(r.index, text, { link: url }, 'user')
  if(linkBlank.value){
    const a = quill.value.root.querySelector(`a[href="${CSS.escape(url)}"]`)
    if(a){ a.setAttribute('target','_blank'); a.setAttribute('rel','noopener noreferrer') }
  }
  safeSetSelection(r.index + text.length, 0)
  showLinkDialog.value = false
}
watch(()=>props.content, v=>{
  if(!quill.value) return
  const current = quill.value.root.innerHTML
  if(v !== current){
    const sel = quill.value.getSelection()
    quill.value.root.innerHTML = v || ''
    updateEmpty()
    if(sel) (quill.value as any).setSelection(sel)
  }
})
watch(()=>props.modelValue, v=>{ 
  if(v){
    nextTick(()=>{ destroyQuill(); init(); focus() })
  } else {
    // 弹窗关闭立即清理，避免下一次打开引用旧 DOM
    destroyQuill()
  }
})
function onOpened(){ /* init 已在 watch 中确保 */ setTimeout(()=>focus(),30) }
function onConfirm(){
  const html = quill.value?.root.innerHTML || ''
  emit('update:content', html)
  emit('confirm', html)
  emit('update:modelValue', false)
}
function onCancel(){ emit('cancel'); emit('update:modelValue', false) }
onMounted(()=>{ if(props.modelValue) init() })
onBeforeUnmount(()=>{ destroyQuill() })

function safeSetSelection(index:number, length:number){
  if(!quill.value) return
  const root = quill.value.root
  if(!root.isConnected) return
  try { quill.value.setSelection(index, length, 'silent') } catch(e){ /* ignore */ }
}
function destroyQuill(){
  if(quill.value){
    // 移除事件监听
    ;(quill.value as any).off('text-change')
    ;(quill.value as any).off('selection-change')
  }
  quill.value = null
  ready.value = false
}

// 清除格式：
// - 有选区：清除选区内所有格式（行/内联）
// - 无选区：优先清除“当前行”的格式；若无法获取当前行，则清除全文格式
function onClean(){
  if(!quill.value || props.readOnly) return
  const q:any = quill.value as any
  const len:number = quill.value.getLength()
  const sel = quill.value.getSelection(true)
  if(sel && sel.length > 0){
    quill.value.removeFormat(sel.index, sel.length, 'user')
    safeSetSelection(sel.index, 0)
    return
  }
  // 无选区：尝试清除当前行
  const range = sel || { index: 0, length: 0 }
  try{
    const lineTuple = q.getLine(range.index)
    const line = Array.isArray(lineTuple) ? lineTuple[0] : lineTuple
    if(line){
      const start = q.getIndex(line)
      const l = typeof line.length === 'function' ? line.length() : 0
      const lengthToClear = l > 0 ? l : Math.min(80, len - start) // 兜底
      quill.value.removeFormat(start, lengthToClear, 'user')
      safeSetSelection(start, 0)
      return
    }
  } catch(e){ /* ignore，走全文清除 */ }
  // 兜底：清除全文
  quill.value.removeFormat(0, len, 'user')
  safeSetSelection(0, 0)
}
</script>

<!--
 增强点说明:
 1. enableSyntax=true 时按需动态加载 highlight.js (需在 package.json 中添加 highlight.js 依赖, 并可在全局样式中引入主题: 例如 import 'highlight.js/styles/github.css').
 2. 新增 props.imageUploader / audioUploader 支持后端上传, 返回 URL 即可; 失败时回退 base64.
 3. limitMode=block|truncate 控制超长行为.
 4. 支持 Ctrl+S / Cmd+S 及 Ctrl/Cmd+Enter 快速保存.
 5. 选择变化自动同步 header/size 下拉.
 6. 注册 hr blot 修复分割线插入.
-->
<style scoped>
.qrd-dialog :deep(.el-dialog__header){ padding-bottom:6px; }
.qrd-toolbar{ position:relative; display:flex; flex-wrap:wrap; align-items:center; gap:6px; padding:8px 10px 6px; border:1px solid #d1d5db; border-radius:8px; background:#f9fafb; margin-bottom:10px; }
.qrd-group{ display:inline-flex; align-items:center; gap:4px; }
.qrd-group select{ height:30px; border:1px solid #d1d5db; border-radius:6px; background:#fff; padding:0 6px; font-size:13px; }
.qrd-group button{ width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; border:1px solid #d1d5db; background:#fff; border-radius:6px; cursor:pointer; font-size:14px; }
.qrd-group button:hover:not([disabled]){ background:#eef2f7; }
.qrd-group button[disabled]{ opacity:.4; cursor:not-allowed; }
.qrd-group.meta .count{ font-size:12px; color:#64748b; padding:0 6px; }
.qrd-group.meta .count.overflow{ color:#dc2626; font-weight:600; }
.qrd-group.meta .count::after{ content: attr(data-remaining); }

/* 自定义下拉菜单（对齐） */
.qrd-dropdown{ position:relative; display:inline-flex; }
.qrd-dropdown .qrd-btn{ width:30px; height:30px; border:1px solid #d1d5db; background:#fff; border-radius:6px; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; }
.qrd-dropdown .qrd-btn:hover{ background:#eef2f7; }
.qrd-dropdown .qrd-menu{ position:absolute; top:36px; left:0; min-width:160px; background:#fff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 10px 34px rgba(0,0,0,.18); padding:6px; z-index:4000; }
.qrd-dropdown .qrd-menu .item{ width:100%; display:flex; align-items:center; gap:8px; border:0; background:transparent; padding:8px 10px; border-radius:6px; cursor:pointer; color:#111827; font-size:13px; }
.qrd-dropdown .qrd-menu .item .icon{ width:18px; height:18px; display:inline-flex; color:#6b7280; }
.qrd-dropdown .qrd-menu .item:hover{ background:#f3f4f6; }
.qrd-dropdown .qrd-menu .item.active{ background:#eef2ff; color:#1e3a8a; }

.qrd-editor-wrapper{ position:relative; border:1px solid #d1d5db; border-radius:10px; background:#fff; }
.qrd-editor-wrapper.is-readonly{ background:#f5f7fa; }
.qrd-editor{ min-height:320px; padding:0; font-size:14px; line-height:1.6; text-align:left; }
.qrd-editor :deep(.ql-editor){ padding: 12px 12px 16px !important; }
.qrd-editor :deep(.ql-editor p){ margin: 0 0 8px; }
.qrd-editor:focus{ outline:none; }
.qrd-placeholder{ position:absolute; left:16px; top:14px; color:#9ca3af; pointer-events:none; }
/* 去除 Quill 自带的容器边框，避免与外层 wrapper 的边框叠加出现“双横线” */
.qrd-editor.ql-container.ql-snow { border: 0 !important; }

/* 强制 Quill 编辑器内所有段落左对齐，避免居中显示 */
.qrd-editor :deep(.ql-editor) { text-align: left !important; }
.qrd-editor :deep(.ql-editor p),
.qrd-editor :deep(.ql-editor div),
.qrd-editor :deep(.ql-editor h1),
.qrd-editor :deep(.ql-editor h2),
.qrd-editor :deep(.ql-editor h3) { text-align: left; }
.qrd-editor :deep(.ql-editor p.ql-align-center) { text-align: center; }
.qrd-editor :deep(.ql-editor p.ql-align-right) { text-align: right; }
.qrd-editor :deep(.ql-editor p.ql-align-justify) { text-align: justify; }

/* Emoji Panel */
.qrd-emoji-panel{ position:absolute; top:48px; left:10px; z-index:4000; background:#fff; border:1px solid #d1d5db; border-radius:8px; padding:8px; width:300px; display:flex; flex-wrap:wrap; gap:6px; box-shadow:0 4px 18px rgba(0,0,0,0.15); }
.qrd-emoji-panel .item{ width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-size:20px; cursor:pointer; border-radius:6px; }
.qrd-emoji-panel .item:hover{ background:#f3f4f6; }

/* Link dialog */
.qrd-link-mask{ position:fixed; inset:0; background:rgba(0,0,0,0.25); display:flex; align-items:center; justify-content:center; z-index:50000; }
.qrd-link-dialog{ width:440px; background:#fff; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.25); display:flex; flex-direction:column; padding:0 0 14px; animation:fadeIn .15s ease; }
.qrd-link-dialog .head{ display:flex; justify-content:space-between; align-items:center; padding:14px 18px 6px; font-weight:600; }
.qrd-link-dialog .close{ background:none; border:0; font-size:20px; cursor:pointer; line-height:1; }
.qrd-link-dialog .body{ display:flex; flex-direction:column; padding:0 20px; }
.qrd-link-dialog label{ font-size:12px; color:#555; margin:8px 0 4px; }
.qrd-link-dialog input{ height:34px; border:1px solid #d1d5db; border-radius:6px; padding:0 10px; outline:none; font-size:13px; }
.qrd-link-dialog input:focus{ border-color:#3b82f6; box-shadow:0 0 0 1px #3b82f6; }
.qrd-link-dialog .err{ color:#dc2626; font-size:12px; margin-top:6px; }
.qrd-link-dialog .blank-row{ margin-top:10px; font-size:12px; color:#555; display:flex; align-items:center; gap:6px; }
.qrd-link-dialog .actions{ display:flex; justify-content:flex-end; gap:10px; padding:16px 20px 0; }

/* Video dialog */
.qrd-video-mask{ position:fixed; inset:0; background:rgba(0,0,0,0.35); display:flex; align-items:center; justify-content:center; z-index:50000; }
.qrd-video-dialog{ width:520px; background:#fff; border-radius:16px; box-shadow:0 20px 60px rgba(0,0,0,0.3); display:flex; flex-direction:column; padding:0 0 18px; animation:fadeIn .2s ease; }
.qrd-video-dialog .head{ display:flex; justify-content:space-between; align-items:center; padding:18px 24px 8px; font-weight:600; font-size:16px; color:#1f2937; }
.qrd-video-dialog .close{ background:none; border:0; font-size:22px; cursor:pointer; line-height:1; color:#6b7280; border-radius:6px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; }
.qrd-video-dialog .close:hover{ background:#f3f4f6; color:#374151; }
.qrd-video-dialog .body{ display:flex; flex-direction:column; padding:0 24px; }
.qrd-video-dialog label{ font-size:13px; color:#374151; margin:12px 0 6px; font-weight:500; }
.qrd-video-dialog textarea{ min-height:100px; border:1px solid #d1d5db; border-radius:8px; padding:12px; outline:none; font-size:13px; font-family:ui-monospace,SFMono-Regular,'SF Mono',Monaco,Inconsolata,'Liberation Mono',monospace; line-height:1.4; resize:vertical; transition:all .2s; }
.qrd-video-dialog textarea:focus{ border-color:#3b82f6; box-shadow:0 0 0 3px rgba(59,130,246,0.1); }
.qrd-video-dialog .err{ color:#dc2626; font-size:12px; margin-top:8px; padding:8px 12px; background:#fef2f2; border-radius:6px; border-left:3px solid #dc2626; }
.qrd-video-dialog .tips{ margin-top:12px; }
.qrd-video-dialog .tip-item{ display:flex; align-items:center; gap:8px; font-size:12px; color:#6b7280; margin-bottom:6px; }
.qrd-video-dialog .tip-item svg{ flex-shrink:0; color:#9ca3af; }
.qrd-video-dialog .actions{ display:flex; justify-content:flex-end; gap:12px; padding:20px 24px 0; }

.btn{ min-width:80px; height:34px; padding:0 16px; border-radius:6px; border:1px solid #d1d5db; cursor:pointer; background:#fff; font-size:14px; }
.btn.ghost:hover{ background:#f3f4f6; }
.btn.primary{ background:#2563eb; border-color:#2563eb; color:#fff; }
.btn.primary:hover{ background:#1d4ed8; }

.qrd-footer{ display:flex; align-items:center; width:100%; }
.qrd-footer .spacer{ flex:1; }
.qrd-dialog :deep(.el-dialog__footer){ padding-top: 10px; }
.qrd-editor :deep(.ql-toolbar.ql-snow){ border: 0 !important; }
.qrd-editor :deep(.ql-container.ql-snow){ border: 0 !important; }

.qrd-hidden{ position:fixed; left:-9999px; top:-9999px; opacity:0; width:0; height:0; }
.qrd-audio{ display:block; margin:10px 0; }
.qrd-hr{ border:0; border-top:1px solid #e2e8f0; margin:12px 0; }

/* iframe 视频样式 - 与填写页面和预览页面保持一致 */
.qrd-iframe,
.qrd-editor :deep(iframe),
.qrd-editor :deep(.qfe-iframe) {
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

/* Tooltip (data-tip) */
.qrd-toolbar .qrd-tip{ display:inline-block; position:relative; }
.qrd-toolbar [data-tip]{ position:relative; }
.qrd-toolbar [data-tip]::after{ content:attr(data-tip); position:absolute; left:50%; bottom:100%; transform:translate(-50%,-6px); background:#111; color:#fff; font-size:12px; line-height:1; padding:6px 8px; border-radius:4px; white-space:nowrap; box-shadow:0 2px 8px rgba(0,0,0,.4); opacity:0; pointer-events:none; transition:opacity .12s; }
.qrd-toolbar [data-tip]::before{ content:""; position:absolute; left:50%; bottom:100%; transform:translate(-50%, 0); border:6px solid transparent; border-top-color:#111; opacity:0; transition:opacity .12s; }
.qrd-toolbar [data-tip]:hover::after, .qrd-toolbar [data-tip]:hover::before{ opacity:1; }

/* 字号选择器：使用 Quill 的 .ql-picker，将标签与下拉项显示为中文并按字号预览 */
.qrd-toolbar :deep(.ql-picker.ql-size){ min-width:84px; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-label){ width:84px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; padding-right:18px; box-sizing:border-box; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-options){ min-width:120px; }

/* 标签文案（当前所选） */
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="10px"]::before){ content:'很小' !important; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="12px"]::before){ content:'小' !important; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="14px"]::before){ content:'正常' !important; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="16px"]::before){ content:'大' !important; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="20px"]::before){ content:'很大' !important; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-label[data-value="28px"]::before){ content:'非常大' !important; }

/* 下拉选项预览（按字体大小渲染） */
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="10px"]::before){ content:'很小' !important; font-size:10px; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="12px"]::before){ content:'小' !important; font-size:12px; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="14px"]::before){ content:'正常' !important; font-size:14px; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="16px"]::before){ content:'大' !important; font-size:16px; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="20px"]::before){ content:'很大' !important; font-size:20px; }
.qrd-toolbar :deep(.ql-picker.ql-size .ql-picker-options .ql-picker-item[data-value="28px"]::before){ content:'非常大' !important; font-size:24px; font-weight:600; }

@keyframes fadeIn { from { opacity:0; transform:translateY(4px);} to { opacity:1; transform:translateY(0);} }
</style>
