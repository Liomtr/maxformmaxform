<!-- 移动端独立版：问卷作答页面 (FillSurveyMobilePage.vue)
  设计目标：
  - 独立于桌面版，避免复杂样式互相干扰
  - 轻量：去掉二维码侧栏、阴影复杂装饰，仅保留核心填写体验
  - 触控友好：更大点击区 / 间距 / 字号
  - 与桌面版保持逻辑一致（题目关联 / 跳题 / 默认选中 / 配额 / 安全过滤）
-->
<template>
  <div class="m-page" :class="{ loading, embed: preview }">
    <!-- 加载骨架 -->
    <el-skeleton v-if="loading" :rows="6" animated class="m-skeleton" />

    <!-- 异常或关闭 -->
    <div v-else-if="!survey" class="m-closed">
      <h2 class="m-closed-title">{{ closedMeta.title || '问卷不可用' }}</h2>
      <p class="m-closed-msg">{{ errorMsg || '问卷不存在或已关闭' }}</p>
    </div>

    <!-- 正常填写 -->
    <div v-else class="m-wrapper">
      <header class="m-header">
  <h1 class="m-title">{{ survey.title }}</h1>
        <div v-if="survey.description" class="m-desc" v-html="safeHtml(survey.description)"></div>
        <div v-if="survey.settings?.showProgress" class="m-progress-panel">
          <div class="m-progress-copy">进度 {{ answeredVisibleQuestions }}/{{ totalVisibleQuestions }}</div>
          <el-progress :percentage="progressPercent" :show-text="false" :stroke-width="8" />
        </div>
      </header>

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="m-form">
        <template v-for="(q, idx) in survey.questions" :key="'mq-'+idx">
          <template v-if="visibleMap[String(idx+1)] !== false">
            <el-form-item :prop="String(q.id ?? (idx+1))" :required="!!q.required" class="m-item">
              <template #label>
                <div class="m-q-label">
                  <span v-if="!q.hideSystemNumber" class="m-q-no">{{ idx+1 }}.</span>
                  <span class="m-q-title">
                    <template v-if="(q as any).titleHtml">
                      <span v-html="safeHtml((q as any).titleHtml)"></span>
                    </template>
                    <template v-else>
                      {{ q.title }}
                    </template>
                  </span>
                </div>
              </template>
              <div v-if="q.description" class="m-q-desc" v-html="safeHtml(q.description)"></div>

              <!-- 单选题 -->
              <el-radio-group v-if="q.type === 'radio'" v-model="form[q.id ?? (idx+1)]" class="m-opt-vertical">
                <template v-for="(opt, oi) in filteredOptions(q, idx)" :key="'mr-'+(opt.value ?? 'h-'+oi)">
                  <div v-if="opt.__groupHeader" class="m-group-header">{{ opt.__groupHeader }}</div>
                  <el-radio
                    v-if="opt.value!=null"
                    :label="opt.value"
                    class="m-opt-item"
                    :disabled="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull"
                    :title="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull ? (q.quotaFullText || '名额已满') : ''"
                  >
                    <span v-if="!opt.rich">{{ opt.label }}</span>
                    <span v-else v-html="opt.label"></span>
                    <span v-if="q.quotasEnabled && q.quotaMode==='explicit' && q.quotaShowRemaining && opt.value!=null && Number(opt.quotaLimit)>0" class="m-quota">(剩{{ opt.__remaining }})</span>
                  </el-radio>
                  <div v-if="opt.value!=null && opt.fillEnabled && String(form[q.id ?? (idx+1)]) === String(opt.value)" class="m-opt-fill">
                    <el-input
                      v-model="form['fill_'+(q.id ?? (idx+1))+'_'+opt.value]"
                      :placeholder="opt.fillPlaceholder || '请输入补充内容'"
                      input-style="font-size:14px"
                    />
                  </div>
                </template>
              </el-radio-group>

              <!-- 多选题 -->
              <el-checkbox-group v-else-if="q.type === 'checkbox'" v-model="form[q.id ?? (idx+1)]" class="m-opt-vertical" @change="onCheckboxChange(q, idx)">
                <template v-for="(opt, oi) in filteredOptions(q, idx)" :key="'mc-'+(opt.value ?? 'h-'+oi)">
                  <div v-if="opt.__groupHeader" class="m-group-header">{{ opt.__groupHeader }}</div>
                  <el-checkbox
                    v-if="opt.value!=null"
                    :label="opt.value"
                    class="m-opt-item"
                    :disabled="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull"
                    :title="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull ? (q.quotaFullText || '名额已满') : ''"
                  >
                    <span v-if="!opt.rich">{{ opt.label }}</span>
                    <span v-else v-html="opt.label"></span>
                    <span v-if="q.quotasEnabled && q.quotaMode==='explicit' && q.quotaShowRemaining && opt.value!=null && Number(opt.quotaLimit)>0" class="m-quota">(剩{{ opt.__remaining }})</span>
                  </el-checkbox>
                  <div v-if="opt.value!=null && opt.fillEnabled && Array.isArray(form[q.id ?? (idx+1)]) && form[q.id ?? (idx+1)].map(String).includes(String(opt.value))" class="m-opt-fill">
                    <el-input
                      v-model="form['fill_'+(q.id ?? (idx+1))+'_'+opt.value]"
                      :placeholder="opt.fillPlaceholder || '请输入补充内容'"
                      input-style="font-size:14px"
                    />
                  </div>
                </template>
              </el-checkbox-group>

              <!-- 文本题 -->
              <el-input v-else-if="q.type === 'textarea'" v-model="form[q.id ?? (idx+1)]" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" placeholder="请输入" />
              <el-input v-else v-model="form[q.id ?? (idx+1)]" placeholder="请输入" />
            </el-form-item>
            <el-divider class="m-divider" />
          </template>
        </template>
      </el-form>

      <div class="m-actions">
        <el-button type="primary" class="m-submit" :loading="submitting" @click="handleSubmit">提交</el-button>
        <el-alert v-if="successMsg" type="success" :closable="false" class="m-msg" show-icon :title="successMsg" />
        <el-alert v-if="errorMsg" type="error" :closable="false" class="m-msg" show-icon :title="errorMsg" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSurvey, getSurveyByShareCode, submitResponses } from '@/api/surveys'
import type { Survey } from '@/types/survey'
type SurveyDTO = Survey
import type { FormInstance, FormRules } from 'element-plus'
import { applyVisibility } from '@/utils/visibility'

// 预览 / 注入模式支持
const props = defineProps<{ injectedSurvey?: SurveyDTO | null; preview?: boolean }>()
const preview = props.preview === true

// 路由 & 基础状态
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const survey = ref<SurveyDTO | null>(null)
const form = ref<Record<string, any>>({})
const formRef = ref<FormInstance>()
const rules = ref<FormRules>({})
const visibleMap = ref<Record<string, boolean>>({})
const submitting = ref(false)
const successMsg = ref('')
const errorMsg = ref('')
const closedMeta = ref<{ title?: string; closedAt?: string; status?: string }>({})
// 默认选中标记
const defaultApplied = ref<Record<string, boolean>>({})
// 跳题
const jumpStartAfter = ref<number | null>(null)
const jumpHideUntil = ref<number | null>(null)
const totalVisibleQuestions = computed(() => {
  const questions = survey.value?.questions || []
  if (!questions.length) return 0

  const visibleCount = questions.filter((_, index) => visibleMap.value[String(index + 1)] !== false).length
  return visibleCount || questions.length
})
const answeredVisibleQuestions = computed(() => {
  const questions = survey.value?.questions || []
  return questions.reduce((count, q: any, index: number) => {
    if (visibleMap.value[String(index + 1)] === false) return count

    const key = String(q.id ?? (index + 1))
    const value = form.value[key]
    const answered = Array.isArray(value)
      ? value.length > 0
      : value !== undefined && value !== null && String(value).trim() !== ''

    return count + (answered ? 1 : 0)
  }, 0)
})
const progressPercent = computed(() => {
  if (!totalVisibleQuestions.value) return 0
  return Math.min(100, Math.round((answeredVisibleQuestions.value / totalVisibleQuestions.value) * 100))
})

// 简易 shuffle（与桌面版一致）
function randShuffle<T>(arr: T[]): T[] { const a=[...arr]; for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]] } return a }
const groupPlanCache = ref<Record<string, any[]>>({})

// 过滤选项（裁剪自桌面版）
function filteredOptions(q:any, idx:number){
  const answers: Record<number, any> = {}
  ;(survey.value?.questions||[]).forEach((qq:any, i:number) => { const key = String(qq.id ?? (i+1)); answers[i+1] = form.value[key] })
  const groupsOk = (groups?: any) => {
    if (!groups || !Array.isArray(groups) || groups.length===0) return true
    const toArr = (v:any)=> Array.isArray(v)?v:(v==null?[]:[v])
    const evalCond = (cond:any) => { const val = answers[Number(cond.qid)]; switch(cond.op){
      case 'eq': return val === cond.value
      case 'neq': return val !== cond.value
      case 'in': return toArr(cond.value).includes(val)
      case 'nin': return !toArr(cond.value).includes(val)
      case 'includes': return toArr(val).includes(cond.value)
      case 'notIncludes': return !toArr(val).includes(cond.value)
      case 'overlap': { const a=toArr(val); const b=toArr(cond.value); return a.some(x=>b.includes(x)) }
      case 'gt': return Number(val) > Number(cond.value)
      case 'gte': return Number(val) >= Number(cond.value)
      case 'lt': return Number(val) < Number(cond.value)
      case 'lte': return Number(val) <= Number(cond.value)
      case 'regex': try { return new RegExp(String(cond.value)).test(String(val??'')) } catch { return true }
      default: return true }
    }
    return groups.some((g:any[]) => Array.isArray(g) && g.length>0 && g.every(evalCond))
  }
  const list = Array.isArray(q.options)? q.options : []
  const normalized = list.map((raw:any, i:number) => {
    if (raw && typeof raw === 'object') {
      return { value:String(raw.value ?? (i+1)), label:String(raw.label ?? raw.text ?? ''), rich:!!raw.rich, desc:raw.desc?String(raw.desc):'', hidden:!!raw.hidden, visibleWhen:raw.visibleWhen, exclusive:!!raw.exclusive, defaultSelected:!!raw.defaultSelected, quotaLimit:Number(raw.quotaLimit||0), quotaUsed:Number(raw.quotaUsed||0), quotaEnabled:(raw as any)?.quotaEnabled !== false, fillEnabled:!!raw.fillEnabled, fillRequired:!!raw.fillRequired, fillPlaceholder:String(raw.fillPlaceholder||'') }
    }
    return { value:String(i+1), label:String(raw ?? ''), rich:false, desc:'', hidden:false, visibleWhen:undefined, exclusive:false, defaultSelected:false, quotaLimit:0, quotaUsed:0, quotaEnabled:true, fillEnabled:false, fillRequired:false, fillPlaceholder:'' }
  })
  const visibleOpts = normalized.filter((opt:any)=> !opt.hidden && groupsOk(opt.visibleWhen))
  const qEnabled = !!q.quotasEnabled
  const withQuota = visibleOpts.map((o:any)=>{ const limit=Number(o.quotaLimit||0); const used=Number(o.quotaUsed||0); const rowEnabled = (o.quotaEnabled !== false); const full = qEnabled && rowEnabled && limit>0 && used >= limit; const remaining = qEnabled && limit>0 ? Math.max(0, limit-used) : null; return { ...o, __quotaFull: full, __remaining: remaining } })

  const groups:any[] = Array.isArray(q?.optionGroups) ? q.optionGroups : []
  if (!groups.length) return withQuota
  const qKey = String(q.id ?? (idx+1))
  let plan = groupPlanCache.value[qKey]
  if (!plan){
    const valid = groups.map((g:any)=>( { name:String(g?.name||''), from:Math.max(1,Number(g?.from||0)), to:Number(g?.to||0), random:!!g?.random } )).filter(g=> Number.isFinite(g.to) && g.to>=g.from).sort((a,b)=>a.from-b.from)
    const base:any[] = []; const segs:any[] = []; let i=0; let counter=0
    const quotaByVal = new Map(withQuota.map((o:any)=>[String(o.value), !!o.__quotaFull]))
    const addQuota = (it:any)=> ({ ...it, __quotaFull: !!quotaByVal.get(String(it?.value)) })
    while(i<normalized.length){
      const g = valid.find(x=> x.from-1===i)
      if (g){
        counter++
        const end = Math.min(g.to, normalized.length)
        let items = normalized.slice(i,end).map(addQuota)
        if (g.random) items = randShuffle(items)
        const rawName = String(g.name||'').trim()
        const hiddenMark = rawName.startsWith('#') || rawName.startsWith('＃')
        const stripped = rawName.replace(/<[^>]*>/g,'').replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g,'')
        const title = hiddenMark ? '' : (stripped.length? rawName : `分组${counter}`)
        const segment:any[] = []
        if (title) segment.push({ __groupHeader: title, value:null })
        segment.push(...items)
        segs.push(segment)
        base.push({ __groupSeg:true })
        i=end
      } else { base.push(addQuota(normalized[i])); i++ }
    }
    const ordered = q.groupOrderRandom ? randShuffle(segs) : segs
    const merged:any[] = []; let p=0
    for(const it of base){ if (it.__groupSeg) merged.push(...(ordered[p++]||[])); else merged.push(it) }
    plan = merged
    groupPlanCache.value[qKey] = plan
  }
  const allow = new Set(withQuota.map((o:any)=> String(o.value)))
  const out:any[] = []; let pending:any=null
  for(const it of plan){
    if (it && it.__groupHeader){ pending=it; continue }
    if (!it || it.value==null) continue
    if (allow.has(String(it.value))){ if (pending){ out.push(pending); pending=null } out.push(it) }
  }
  return out
}

function onCheckboxChange(q:any, idx:number){
  const key = String(q.id ?? (idx+1))
  const arr = Array.isArray(form.value[key]) ? form.value[key] : []
  const opts = filteredOptions(q, idx)
  const excl = new Set((opts||[]).filter((o:any)=> o.exclusive).map((o:any)=> String(o.value)))
  const pickedExcl = arr.find((v:any)=> excl.has(String(v)))
  if (pickedExcl) form.value[key] = [pickedExcl]
}

function applyDefaultIfNeeded(q:any, idx:number){
  const key = String(q.id ?? (idx+1))
  if (defaultApplied.value[key]) return
  const opts:any[] = filteredOptions(q, idx) || []
  const defaults = opts.filter(o=> o.defaultSelected)
  if (!defaults.length) return
  if (q.type === 'radio'){
    if (!form.value[key]){ form.value[key] = String(defaults[0].value); defaultApplied.value[key] = true }
  } else if (q.type === 'checkbox'){
    const cur = Array.isArray(form.value[key]) ? form.value[key] : []
    if (cur.length === 0){
      let next = defaults.map(o=> String(o.value))
      const excl = defaults.find(o=> o.exclusive)
      if (excl) next = [String(excl.value)]
      form.value[key] = next
      defaultApplied.value[key] = true
    }
  }
}

// 初始化 + 加载问卷
onMounted(async () => {
  if (props.injectedSurvey) {
    survey.value = JSON.parse(JSON.stringify(props.injectedSurvey))
  } else {
    try {
      const shareId = String(route.params.id || '')
      survey.value = await getSurvey(shareId)
      if (survey.value && survey.value.status && survey.value.status !== 'published') {
        errorMsg.value = survey.value.status === 'closed' ? '问卷已停止收集' : '问卷未发布'
        closedMeta.value = { title: survey.value.title, status: survey.value.status }
        survey.value = null
      }
    } catch (e:any) {
      const status = e?.response?.status; const msg = e?.response?.data?.error?.message || e?.response?.data?.message; const meta = e?.response?.data?.data
      if (status===404) errorMsg.value = msg || '问卷不存在或已删除'
      else if (status===403){ errorMsg.value = msg || '问卷未发布或已关闭'; if (meta) closedMeta.value = { title: meta.title, closedAt: meta.closedAt, status: meta.status } }
      else errorMsg.value = '加载失败，请稍后重试'
      survey.value = null
    }
  }
  if (survey.value) {
    if (survey.value.settings?.randomizeQuestions || (survey.value.settings as any)?.randomOrder) {
      survey.value.questions = randShuffle(survey.value.questions || [])
    }
    const nextRules: FormRules = {}
    survey.value.questions.forEach((q:any, index:number) => {
      const key = String(q.id ?? (index+1))
      if (q.type === 'checkbox') form.value[key] = []
      else form.value[key] = ''
      const opts:any[] = Array.isArray(q.options)? q.options : []
      opts.forEach((raw:any, i:number) => {
        const opt:any = (raw && typeof raw==='object') ? raw : { value:String(i+1) }
        if (opt.fillEnabled && opt.fillRequired){
          const fillKey = 'fill_'+(q.id ?? (index+1))+'_'+String(opt.value ?? (i+1))
          nextRules[fillKey] = [{ required:true, message:'请填写补充内容', trigger:['blur','change'] }]
          form.value[fillKey] = ''
        }
      })
      if (q.required){
        if (q.type === 'checkbox') nextRules[key] = [{ type:'array', required:true, message:'此题为必选', trigger:'change' }]
        else nextRules[key] = [{ required:true, message:'此题为必填', trigger:['blur','change'] }]
      }
    })
    rules.value = nextRules
    const answers: Record<number, any> = {}
    survey.value.questions.forEach((q:any, i:number) => { const key = String(q.id ?? (i+1)); answers[i+1] = form.value[key] })
    const vis = applyVisibility((survey.value.questions||[]).map((q:any, i:number)=>({ id:i+1, required:q.required, title:q.title, logic:q.logic })), answers)
    visibleMap.value = Object.fromEntries(Object.entries(vis).map(([k,v])=>[String(k), v as boolean]))
    survey.value.questions.forEach((q:any, i:number)=>{ const order=i+1; if (visibleMap.value[String(order)] !== false) applyDefaultIfNeeded(q,i) })
  }
  loading.value = false
})

// 可见性 & 跳题 watch
let _visRAF = 0
watch(form, () => {
  if (_visRAF) cancelAnimationFrame(_visRAF)
  _visRAF = requestAnimationFrame(async () => {
    if (!survey.value) return
    const answers: Record<number, any> = {}
    ;(survey.value.questions||[]).forEach((q:any, i:number)=>{ const key = String(q.id ?? (i+1)); answers[i+1] = form.value[key] })
    const vis = applyVisibility((survey.value.questions||[]).map((q:any, i:number)=>({ id:i+1, required:q.required, title:q.title, logic:q.logic })), answers)
    jumpStartAfter.value = null; jumpHideUntil.value = null
    let hitInvalid = false
    for(let i=0;i<(survey.value.questions||[]).length;i++){
      const q:any = survey.value.questions[i]; const order=i+1; const key=String(q.id ?? order)
      if (vis[order] === false) continue
      const j:any = q.jumpLogic; if (!j) continue
      let target:string|undefined
      if (j.byOption && (q.type==='radio' || q.type==='checkbox')){
        const val = form.value[key]
        if (q.type==='radio') target = j.byOption[String(val)]
        else if (Array.isArray(val)){
          const candidates = val.map((v:any)=> j.byOption[String(v)]).filter(Boolean)
          if (candidates.length) target = candidates.includes('end') ? 'end' : String(Math.max(...candidates.map((s:string)=> Number(s))))
        }
      }
      if (!target && j.unconditional) target = String(j.unconditional)
      if (target){
        if (target==='end'){ jumpStartAfter.value=Math.max(jumpStartAfter.value||0, order); jumpHideUntil.value=(survey.value.questions||[]).length+1; break }
        else if (target==='invalid'){ hitInvalid=true; break }
        else if (/^\d+$/.test(target)){ const to=Number(target); if (to>order+1){ jumpStartAfter.value=Math.max(jumpStartAfter.value||0, order); jumpHideUntil.value=Math.max(jumpHideUntil.value||0, to) } }
      }
    }
    if (hitInvalid){
      const shareId = String(route.params.id || '')
      try { await submitResponses(shareId, [], { invalid:true }); router.push({ name:'SurveySuccess', params:{ id: shareId }, query:{ message:'感谢作答，本问卷不符合条件。', title: survey.value?.title } }) }
      catch { router.push({ name:'SurveySuccess', params:{ id: shareId }, query:{ message:'您不符合本次问卷条件。', title: survey.value?.title } }) }
      return
    }
    if (jumpStartAfter.value && jumpHideUntil.value){
      for(let i=0;i<(survey.value.questions||[]).length;i++){ const ord=i+1; if (ord>jumpStartAfter.value && ord<jumpHideUntil.value) vis[ord]=false }
    }
    ;(survey.value.questions||[]).forEach((q:any, i:number)=>{
      const order=i+1; const key=String(q.id ?? order)
      if (vis[order] === false){ if (q.type==='checkbox') form.value[key]=[]; else form.value[key]='' }
      else {
        if (q.type==='radio' || q.type==='checkbox'){
          const allowed = new Set((filteredOptions(q,i)||[]).map((opt:any)=> String(opt.value)))
          if (q.type==='radio'){ if (!allowed.has(String(form.value[key] ?? ''))) form.value[key]='' }
          else { const arr = Array.isArray(form.value[key]) ? form.value[key] : []; form.value[key] = arr.filter((v:any)=> allowed.has(String(v))) }
          applyDefaultIfNeeded(q,i)
          if (q.autoSelectOnAppear){
            const visibleOpts:any[] = filteredOptions(q,i) || []
            const autoOpts = visibleOpts.filter(o=> Array.isArray(o.visibleWhen) && o.visibleWhen.length>0)
            if (autoOpts.length>0){
              if (q.type==='radio'){ if (!form.value[key]) form.value[key]=String(autoOpts[0].value) }
              else if (q.type==='checkbox'){ const arrNow = Array.isArray(form.value[key]) ? form.value[key] : []; if (arrNow.length===0) form.value[key] = autoOpts.map(o=> String(o.value)) }
            }
          }
        }
      }
    })
    visibleMap.value = Object.fromEntries(Object.entries(vis).map(([k,v])=>[String(k), v as boolean]))
    _visRAF = 0
  })
}, { deep:true })

// 提交
const handleSubmit = async () => {
  if (!survey.value) return
  successMsg.value=''; errorMsg.value=''
  const ok = await formRef.value?.validate().catch(()=>false)
  if (!ok){ errorMsg.value='请先完成必填内容'; return }
  if (preview) {
    successMsg.value = '（预览）模拟提交，不保存数据'
    return
  }
  submitting.value = true
  try {
    const shareId = String(route.params.id || '')
    const payload = (survey.value.questions||[]).map((q:any, index:number)=>{ const key=String(q.id ?? (index+1)); return { questionId: Number(q.id ?? (index+1)), value: form.value[key] } })
    const res = await submitResponses(shareId, payload)
    if (res?.success) router.push({ name:'SurveySuccess', params:{ id: shareId }, query:{ message: res.message || '提交成功，感谢参与！', title: survey.value.title } })
    else throw new Error(res?.message || '提交失败')
  } catch(e:any){ errorMsg.value = e?.response?.data?.message || e?.message || '提交失败' }
  finally { submitting.value = false }
}

// HTML 安全过滤（复用桌面版逻辑裁剪版）
function safeHtml(raw:string){
  if(!raw) return ''
  const wrapper = document.createElement('div'); wrapper.innerHTML = raw
  const allowed = new Set(['A','IMG','VIDEO','AUDIO','IFRAME','B','STRONG','I','EM','U','SPAN','P','BR','DIV','UL','OL','LI','H1','H2','H3'])
  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_ELEMENT, null)
  const remove:Element[] = []
  while(walker.nextNode()){
    const el = walker.currentNode as HTMLElement
    if(!allowed.has(el.tagName)){
      const parent = el.parentNode; if (parent){ while(el.firstChild) parent.insertBefore(el.firstChild, el); remove.push(el) }
      continue
    }
    if(el.tagName==='A'){
      const href = el.getAttribute('href') || ''
      if(!/^https?:\/\//i.test(href)) el.removeAttribute('href')
      el.setAttribute('target','_blank'); el.setAttribute('rel','noopener noreferrer')
    }
    if(el.tagName==='IFRAME'){
      let src = el.getAttribute('src') || ''
      if(/^\/\//.test(src)) src = 'https:' + src
      if(/player\.bilibili\.com/i.test(src)){
        const u = new URL(src); if(!u.searchParams.has('autoplay')) u.searchParams.set('autoplay','0'); if(!u.searchParams.has('muted')) u.searchParams.set('muted','0'); src = u.toString()
      }
      el.setAttribute('src', src); el.setAttribute('frameborder','0'); el.setAttribute('allowfullscreen','true')
      el.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
      el.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups allow-forms allow-popups-to-escape-sandbox')
      if(!el.getAttribute('width')) el.setAttribute('width','100%')
      if(!el.getAttribute('height')) el.setAttribute('height','240')
      el.classList.add('embed-video-frame')
    }
  }
  remove.forEach(n=>n.remove())
  return wrapper.innerHTML
}
</script>

<style scoped>
/* 全屏纯白背景：去除卡片感与灰色留白 */
.m-page { min-height:100vh; background:#fff; padding:0 0 68px; box-sizing:border-box; }
/* 嵌入预览模式（editor phone shell 内部） */
.m-page.embed { background:transparent; padding:0; min-height:auto; }
.m-page.embed .m-wrapper { padding:12px 12px 28px; box-shadow:none; }
/* 移除阴影/圆角/最大宽度限制，保留内部左右安全间距 */
.m-wrapper { max-width:none; margin:0; background:#fff; border-radius:0; padding:18px 18px 40px; box-shadow:none; }
.m-header { margin-bottom:12px; }
.m-title { font-size:22px; font-weight:700; text-align:center; color: var(--el-color-primary,#409eff); margin:4px 0 16px; }
.m-desc { color:#555; font-size:14px; line-height:1.55; }
.m-progress-panel { margin-top:12px; padding:10px 12px; background:#f8fafc; border:1px solid #e5e7eb; border-radius:10px; }
.m-progress-copy { margin-bottom:8px; color:#475569; font-size:13px; font-weight:600; }
.m-desc :deep(iframe),
.m-desc :deep(.qfe-iframe),
.m-q-desc :deep(iframe),
.m-q-desc :deep(.qfe-iframe) { display:block !important; width:100% !important; height:210px !important; margin:10px auto !important; border:0; border-radius:8px; background:#000; }
.m-form { padding:4px 2px 0; }
.m-item { margin-bottom:22px; }
.m-item :deep(.el-form-item__label){ font-weight:600; font-size:15px; line-height:1.3; margin-bottom:8px; color:#222; }
.m-q-label { display:flex; align-items:flex-start; gap:6px; }
.m-q-no { font-weight:600; color:#1f2937; }
.m-q-no { color:#2563eb; font-weight:600; }
.m-q-title { flex:1; }
.m-q-desc { color:#6b7280; font-size:13px; margin:2px 0 10px; line-height:1.5; }
.m-opt-vertical { display:flex; flex-direction:column; gap:4px; align-items:stretch; padding:2px 0; }
/* 纯文本风格：移除卡片/边框背景，仅保留行距 */
.m-opt-vertical :deep(.el-radio),
.m-opt-vertical :deep(.el-checkbox){
  padding:4px 0 4px 2px;
  border:none;
  background:transparent;
  border-radius:0;
  margin:0;
  min-height:auto;
  display:flex;
  align-items:center;
  line-height:1.5;
  transition:color .15s ease;
}
.m-opt-vertical :deep(.el-radio:hover .el-radio__label),
.m-opt-vertical :deep(.el-checkbox:hover .el-checkbox__label){ color:#1f4fbf; }
.m-opt-vertical :deep(.el-radio__input),
.m-opt-vertical :deep(.el-checkbox__input){ transform:scale(0.9); }
.m-opt-vertical :deep(.el-radio__label),
.m-opt-vertical :deep(.el-checkbox__label){ font-size:15px; color:#222; padding-left:4px; }
.m-opt-vertical :deep(.el-radio.is-checked .el-radio__label),
.m-opt-vertical :deep(.el-checkbox.is-checked .el-checkbox__label){ font-weight:600; color:#2563eb; }
.m-opt-vertical :deep(.el-radio.is-disabled .el-radio__label),
.m-opt-vertical :deep(.el-checkbox.is-disabled .el-checkbox__label){ color:#b4b8bf; }
.m-opt-item { width:100%; }
.m-group-header { background:#f3f4f6; padding:8px 10px; border-radius:8px; font-size:13px; font-weight:600; color:#374151; margin:4px 0 2px; }
.m-quota { color:#64748b; font-size:12px; margin-left:4px; }
.m-opt-fill { margin:6px 0 0 4px; }
.m-divider { margin:8px 0 12px; }
.m-actions { margin:12px 0 0; text-align:center; }
.m-submit { width:100%; height:48px; font-size:16px; font-weight:600; border-radius:12px; }
.m-msg { margin-top:14px; text-align:left; }

/* 嵌入视频统一高度（答题区内 iframe） */
.m-form :deep(iframe.embed-video-frame) { height:210px !important; }

@media (min-width: 460px){
  .m-desc :deep(iframe), .m-q-desc :deep(iframe), .m-form :deep(iframe.embed-video-frame){ height:260px !important; }
}
@media (min-width: 640px){
  .m-desc :deep(iframe), .m-q-desc :deep(iframe), .m-form :deep(iframe.embed-video-frame){ height:320px !important; }
}
@media (min-width: 768px){
  .m-desc :deep(iframe), .m-q-desc :deep(iframe), .m-form :deep(iframe.embed-video-frame){ height:360px !important; }
}
</style>
