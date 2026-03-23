<!-- 填写问卷（美化版） -->
<template>
  <div class="page" :class="{ embed: preview }">
    <!-- 加载中 -->
    <el-skeleton v-if="loading" :rows="6" animated class="skeleton" />

    <!-- 空态：标题置顶，仅保留返回首页按钮 -->
    <div v-else-if="!survey" class="closed-block">
      <h2 v-if="closedMeta.title" class="closed-survey-title">{{ closedMeta.title }}</h2>
      <el-empty class="closed-empty">
        <template #description>
          <div class="closed-wrap">
            <div class="closed-title">{{ errorMsg || '问卷不存在或已关闭' }}</div>
            <div v-if="closedMeta.status==='closed' && closedMeta.closedAt" class="closed-meta">关闭时间：{{ formatDate(closedMeta.closedAt) }}</div>
          </div>
        </template>
      </el-empty>
    </div>

    <!-- 填写区域 -->
    <div v-else class="survey-wrapper">
      <!-- 右上角二维码区域 - 完全独立于答题区域 -->
      <div class="qr-section-outside">
        <div class="qr-code-container">
          <canvas ref="qrCanvasRef" class="qr-canvas-mini"></canvas>
        </div>
        <p class="qr-tip-mini">扫码答题</p>
      </div>
      
      <div class="survey-container">
        <el-card class="paper" shadow="never">
        <div class="paper-header">
          <h2 class="paper-title">{{ survey.title }}</h2>
          <div class="desc" v-if="survey.description" v-html="safeHtml(survey.description)"></div>
          <div v-if="survey.settings?.showProgress" class="progress-panel">
            <div class="progress-copy">进度 {{ answeredVisibleQuestions }}/{{ totalVisibleQuestions }}</div>
            <el-progress :percentage="progressPercent" :show-text="false" :stroke-width="8" />
          </div>
        </div>
      <el-divider />

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="q-form">
        <template v-for="(q, idx) in survey.questions" :key="'q-'+idx">
          <template v-if="visibleMap[String(idx+1)] !== false">
          <el-form-item :prop="String(q.id ?? (idx+1))" :required="!!q.required" class="q-item">
            <template #label>
              <div class="q-label">
                <span v-if="!q.hideSystemNumber" class="q-number">{{ idx + 1 }}</span>
                <span class="q-title">
                  <template v-if="(q as any).titleHtml">
                    <span v-html="safeHtml((q as any).titleHtml)"></span>
                  </template>
                  <template v-else>
                    {{ q.title }}
                  </template>
                </span>
              </div>
            </template>
            <div class="q-desc" v-if="q.description" v-html="safeHtml(q.description)"></div>
            <!-- 单选题 -->
            <template v-if="q.type === 'radio'">
              <el-radio-group v-model="form[q.id ?? (idx+1)]" class="opt-vertical">
                <template v-for="(opt, oi) in filteredOptions(q, idx)" :key="'r-'+(opt.value ?? 'h-'+oi)">
                  <div v-if="opt.__groupHeader" class="group-header">{{ opt.__groupHeader }}</div>
                  <el-radio
                    v-if="opt.value!=null"
                    :label="opt.value"
                    class="opt-item"
                    :disabled="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull"
                    :title="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull ? (q.quotaFullText || '名额已满') : ''"
                  >
                    <span v-if="!opt.rich">{{ opt.label }}</span>
                    <span v-else v-html="opt.label"></span>
                    <span
                      v-if="q.quotasEnabled && q.quotaMode==='explicit' && q.quotaShowRemaining && opt.value!=null && Number(opt.quotaLimit)>0"
                      class="quota-remaining"
                    >（剩余{{ opt.__remaining }}）</span>
                  </el-radio>
                  <div v-if="opt.value!=null && opt.fillEnabled && String(form[q.id ?? (idx+1)]) === String(opt.value)" class="opt-fill-as-item">
                    <el-input
                      v-model="form['fill_'+(q.id ?? (idx+1))+'_'+opt.value]"
                      :placeholder="opt.fillPlaceholder || '请输入补充内容'"
                      style="width:300px;"
                    />
                  </div>
                </template>
              </el-radio-group>
              <template v-for="opt in filteredOptions(q, idx)" :key="'d-'+(opt.value ?? 'h')">
                <div v-if="opt.value!=null && opt.desc" style="color:#64748b; font-size:12px; margin:2px 0 6px 28px;" v-html="opt.desc"></div>
              </template>
            </template>
            <!-- 多选题 -->
            <template v-else-if="q.type === 'checkbox'">
              <el-checkbox-group v-model="form[q.id ?? (idx+1)]" class="opt-vertical" @change="onCheckboxChange(q, idx)">
                <template v-for="(opt, oi) in filteredOptions(q, idx)" :key="'c-'+(opt.value ?? 'h-'+oi)">
                  <div v-if="opt.__groupHeader" class="group-header">{{ opt.__groupHeader }}</div>
                  <el-checkbox
                    v-if="opt.value!=null"
                    :label="opt.value"
                    class="opt-item"
                    :disabled="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull"
                    :title="q.quotasEnabled && q.quotaMode==='explicit' && opt.__quotaFull ? (q.quotaFullText || '名额已满') : ''"
                  >
                    <span v-if="!opt.rich">{{ opt.label }}</span>
                    <span v-else v-html="opt.label"></span>
                    <span
                      v-if="q.quotasEnabled && q.quotaMode==='explicit' && q.quotaShowRemaining && opt.value!=null && Number(opt.quotaLimit)>0"
                      class="quota-remaining"
                    >（剩余{{ opt.__remaining }}）</span>
                  </el-checkbox>
                  <div v-if="opt.value!=null && opt.fillEnabled && Array.isArray(form[q.id ?? (idx+1)]) && form[q.id ?? (idx+1)].map(String).includes(String(opt.value))" class="opt-fill-as-item">
                    <el-input
                      v-model="form['fill_'+(q.id ?? (idx+1))+'_'+opt.value]"
                      :placeholder="opt.fillPlaceholder || '请输入补充内容'"
                      style="width:300px;"
                    />
                  </div>
                </template>
              </el-checkbox-group>
              <template v-for="opt in filteredOptions(q, idx)" :key="'d-'+(opt.value ?? 'h')">
                <div v-if="opt.value!=null && opt.desc" style="color:#64748b; font-size:12px; margin:2px 0 6px 28px;" v-html="opt.desc"></div>
              </template>
            </template>
            <!-- 多行文本 -->
            <template v-else-if="q.type === 'textarea'">
              <el-input v-model="form[q.id ?? (idx+1)]" type="textarea" :autosize="{ minRows: 3, maxRows: 8 }" placeholder="请输入" />
            </template>
            <!-- 单行输入/其他 -->
            <template v-else>
              <el-input v-model="form[q.id ?? (idx+1)]" placeholder="请输入" />
            </template>
          </el-form-item>
          <el-divider class="q-divider" />
          </template>
        </template>
      </el-form>

      <div class="actions">
        <el-button type="primary" size="large" class="submit-btn" :loading="submitting" @click="handleSubmit">提交</el-button>
        <el-alert v-if="successMsg" :closable="false" type="success" class="msg" show-icon :title="successMsg" />
        <el-alert v-if="errorMsg" :closable="false" type="error" class="msg" show-icon :title="errorMsg" />
      </div>
      </el-card>
      </div>
    </div>

  </div>
  
</template>

<script setup lang="ts">
import { computed, onMounted, ref, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSurvey, getSurveyByShareCode, submitResponses } from '@/api/surveys'
import type { Survey } from '@/types/survey'
type SurveyDTO = Survey
import type { FormInstance, FormRules } from 'element-plus'
import { applyVisibility } from '@/utils/visibility'
// 已移除复杂编码逻辑，直接使用9位数字ID

const props = defineProps<{ injectedSurvey?: SurveyDTO | null; preview?: boolean }>()
const preview = props.preview === true
const route = useRoute()
const router = useRouter()
const loading = ref(true)
const survey = ref<SurveyDTO | null>(null)
const form = ref<Record<string, any>>({})
const formRef = ref<FormInstance>()
const rules = ref<FormRules>({})
const visibleMap = ref<Record<string, boolean>>({})
// 跳题链：仅隐藏“当前题之后到目标题之前”的范围
const jumpStartAfter = ref<number | null>(null)
const jumpHideUntil = ref<number | null>(null)
const submitting = ref(false)
const successMsg = ref('')
const errorMsg = ref('')
const closedMeta = ref<{ title?: string; closedAt?: string; status?: string }>({})

// 二维码相关
const currentUrl = ref('')
const qrCanvasRef = ref<HTMLCanvasElement>()
// 标记哪些题已经应用过“默认选中”（defaultSelected），避免用户取消后再次自动选中
const defaultApplied = ref<Record<string, boolean>>({})

// 已取消填写页题型图标展示（按需求隐藏）

// 为分组随机生成稳定的展示计划（仅对本次会话稳定）
const groupPlanCache = ref<Record<string, any[]>>({})
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
function randShuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 基于当前答案，返回某题可见的选项列表（含分组随机与标题插入）
function filteredOptions(q:any, idx:number){
  const answers: Record<number, any> = {}
  ;(survey.value?.questions||[]).forEach((qq:any, i:number) => {
    const key = String(qq.id ?? (i+1))
    answers[i+1] = form.value[key]
  })
  const groupsOk = (groups?: any) => {
    if (!groups || !Array.isArray(groups) || groups.length===0) return true
    const toArr = (v:any)=> Array.isArray(v)?v:(v==null?[]:[v])
    const evalCond = (cond:any) => {
      const val = answers[Number(cond.qid)]
      switch(cond.op){
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
        default: return true
      }
    }
    return groups.some((g:any[]) => Array.isArray(g) && g.length>0 && g.every(evalCond))
  }
  const list = Array.isArray(q.options)? q.options : []
  const normalized = list.map((raw:any, i:number) => {
    if (raw && typeof raw === 'object') {
      // 兼容后端返回的对象结构
      return {
        value: String(raw.value ?? (i+1)),
        label: String(raw.label ?? raw.text ?? ''),
        rich: !!raw.rich,
        desc: raw.desc ? String(raw.desc) : '',
        hidden: !!raw.hidden,
        visibleWhen: raw.visibleWhen,
        exclusive: !!raw.exclusive,
        defaultSelected: !!raw.defaultSelected,
  quotaLimit: Number(raw.quotaLimit || 0),
  quotaUsed: Number(raw.quotaUsed || 0),
  quotaEnabled: (raw as any)?.quotaEnabled !== false,
  fillEnabled: !!raw.fillEnabled,
  fillRequired: !!raw.fillRequired,
  fillPlaceholder: String(raw.fillPlaceholder || ''),
      }
    }
    // 字符串/其他：按纯文本处理
    return {
      value: String(i+1),
      label: String(raw ?? ''),
      rich: false,
      desc: '',
      hidden: false,
      visibleWhen: undefined,
      exclusive: false,
      defaultSelected: false,
  quotaLimit: 0,
  quotaUsed: 0,
  quotaEnabled: true,
  fillEnabled: false,
  fillRequired: false,
  fillPlaceholder: '',
    }
  })
  const visibleOpts = normalized.filter((opt:any) => !opt.hidden && groupsOk(opt.visibleWhen))
  // 结合配额：若启用了配额且后端返回 quotaUsed 且设置了 quotaLimit>0，则判定是否已满
  const qEnabled = !!q.quotasEnabled
  const withQuota = visibleOpts.map((o:any)=>{
    const limit = Number(o.quotaLimit || 0)
    const used = Number(o.quotaUsed || 0)
    const rowEnabled = (o.quotaEnabled !== false)
    const full = qEnabled && rowEnabled && limit>0 && used >= limit
    const remaining = qEnabled && limit>0 ? Math.max(0, limit - used) : null
    return { ...o, __quotaFull: full, __remaining: remaining }
  })

  // 分组展示：若存在 optionGroups，则始终按分组插入标题；若配置了随机，则按组/组内随机。
  const groups:any[] = Array.isArray(q?.optionGroups) ? q.optionGroups : []
  const hasGroups = groups.length > 0
  if (!hasGroups) return withQuota

  const qKey = String(q.id ?? (idx+1))
  let plan = groupPlanCache.value[qKey]
  if (!plan) {
    // 规范化分组并按 from 升序
    const validGroups = groups
      .map((g:any)=>({
        name: String(g?.name || ''),
        from: Math.max(1, Number(g?.from || 0)),
        to: Number(g?.to || 0),
        random: !!g?.random
      }))
      .filter(g => Number.isFinite(g.to) && g.to >= g.from)
      .sort((a,b)=> a.from - b.from)

    // 构建基础计划：用占位替换分组范围，未分组选项保持原位
    const base:any[] = []
    const groupSegments:any[] = []
    let i = 0
    let groupCounter = 0
    // 为 plan 构建提供一个取带配额标记的函数
    const quotaByVal = new Map(withQuota.map((o:any)=> [String(o.value), !!o.__quotaFull]))
    const addQuota = (it:any) => ({ ...it, __quotaFull: !!quotaByVal.get(String(it?.value)) })
    while (i < normalized.length) {
      const g = validGroups.find(x => x.from - 1 === i)
      if (g) {
        groupCounter += 1
        // 生成该组的段
    const endIdx = Math.min(g.to, normalized.length)
  let items = normalized.slice(i, endIdx).map(addQuota)
  if (g.random) items = randShuffle(items)
        const rawName = String(g.name || '')
        const nameTrim = rawName.trim()
        const hiddenMark = nameTrim.startsWith('#') || nameTrim.startsWith('＃')
        const stripped = nameTrim
          // 去掉可能的HTML标签
          .replace(/<[^>]*>/g, '')
          // 去掉不可见空白字符（全角空格、窄空格等）仅用于判空
          .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, '')
        const displayCandidate = hiddenMark ? '' : nameTrim
        const title = hiddenMark ? '' : (stripped.length > 0 ? displayCandidate : `分组${groupCounter}`)
        const segment:any[] = []
        if (title) segment.push({ __groupHeader: title, value: null })
  segment.push(...items)
        groupSegments.push(segment)
        // 在基础计划中放一个占位符，稍后整体替换（用于支持分组顺序随机）
        base.push({ __groupSeg: true })
        i = endIdx
      } else {
        base.push(addQuota(normalized[i]))
        i++
      }
    }

    // 分组顺序随机：仅打乱 groupSegments 的相对顺序；未分组项的相对位置不变
    const orderedSegments = q.groupOrderRandom ? randShuffle(groupSegments) : groupSegments
    // 合成最终计划：将占位依次替换为已排序的分组段
    const merged:any[] = []
    let p = 0
    for (const it of base){
      if (it && it.__groupSeg) {
        const seg = orderedSegments[p++] || []
        merged.push(...seg)
      } else {
        merged.push(it)
      }
    }
    plan = merged
    groupPlanCache.value[qKey] = plan
  }
  // 在可见过滤基础上，保持 plan 的顺序；隐藏的选项跳过；标题若后续无任何可见选项则自动被过滤
  // 可见选项（即便已满也保留显示但不可选）
  const allow = new Set(withQuota.map((o:any) => String(o.value)))
  const out:any[] = []
  let pendingHeader: any = null
  for (const it of plan){
    if (it && it.__groupHeader){
      pendingHeader = it
      continue
    }
    if (!it || it.value==null) continue
    if (allow.has(String(it.value))){
      if (pendingHeader){ out.push(pendingHeader); pendingHeader = null }
      out.push(it)
    }
  }
  return out
}

// 分组标题：当 oi 为某组起始（from-1）时显示该组名；以 # 开头的名称对作答者隐藏（去掉 #）
// 旧的按索引插标题逻辑已由 plan 插入占位实现，这里保留空实现避免误用
function groupHeaderForFill(_q:any, _idx:number): '' { return '' }

// 多选互斥：若选择了标记 exclusive 的选项，清空其它选项，仅保留该项
function onCheckboxChange(q:any, idx:number){
  const key = String(q.id ?? (idx+1))
  const arr = Array.isArray(form.value[key]) ? form.value[key] : []
  const opts = filteredOptions(q, idx)
  const excl = new Set((opts||[]).filter((o:any)=> o.exclusive).map((o:any)=> String(o.value)))
  const pickedExcl = arr.find((v:any)=> excl.has(String(v)))
  if (pickedExcl){
    form.value[key] = [pickedExcl]
  }
}

// 在题目可见、答案为空时应用“默认选中”
function applyDefaultIfNeeded(q:any, idx:number){
  const key = String(q.id ?? (idx+1))
  if (defaultApplied.value[key]) return
  const opts:any[] = filteredOptions(q, idx) || []
  const defaults = opts.filter(o=> o.defaultSelected)
  if (!defaults.length) return
  if (q.type === 'radio'){
    if (!form.value[key]){
      form.value[key] = String(defaults[0].value)
      defaultApplied.value[key] = true
    }
  } else if (q.type === 'checkbox'){
    const cur = Array.isArray(form.value[key]) ? form.value[key] : []
    if (cur.length === 0){
      let next = defaults.map(o=> String(o.value))
      // 互斥规则：若默认中包含互斥项，则仅保留一个互斥项
      const excl = defaults.find(o=> o.exclusive)
      if (excl) next = [String(excl.value)]
      form.value[key] = next
      defaultApplied.value[key] = true
    }
  }
}

onMounted(async () => {
  try {
    if (props.injectedSurvey) {
      survey.value = JSON.parse(JSON.stringify(props.injectedSurvey))
      currentUrl.value = location.href
    } else {
      const shareId = String(route.params.id || '')
      currentUrl.value = window.location.href
      survey.value = await getSurvey(shareId)
      if (survey.value && survey.value.status && survey.value.status !== 'published') {
        errorMsg.value = survey.value.status === 'closed' ? '问卷已停止收集' : '问卷未发布'
        closedMeta.value = { title: survey.value.title, status: survey.value.status }
        survey.value = null
        return
      }
      if (!preview) generateQrCode()
    }
    if (!survey.value) return
    if (survey.value.settings?.randomizeQuestions || (survey.value.settings as any)?.randomOrder) {
      survey.value.questions = randShuffle(survey.value.questions || [])
    }
    const nextRules: FormRules = {}
    survey.value.questions.forEach((q: any, index: number) => {
      const key = String(q.id ?? (index + 1))
      if (q.type === 'checkbox') form.value[key] = []
      else form.value[key] = ''
      const makeFillRule = (msg:string) => [{ required: true, message: msg, trigger: ['blur','change'] }]
      const opts:any[] = Array.isArray(q.options) ? q.options : []
      opts.forEach((raw:any, i:number) => {
        const opt:any = (raw && typeof raw==='object') ? raw : { value: String(i+1), fillEnabled:false, fillRequired:false }
        if (opt.fillEnabled && opt.fillRequired){
          const fillKey = 'fill_'+(q.id ?? (index+1))+'_'+String(opt.value ?? (i+1))
          nextRules[fillKey] = makeFillRule('请填写补充内容')
          form.value[fillKey] = ''
        }
      })
      if (q.required) {
        if (q.type === 'checkbox') nextRules[key] = [{ type: 'array', required: true, message: '此题为必选', trigger: 'change' }]
        else nextRules[key] = [{ required: true, message: '此题为必填', trigger: ['blur','change'] }]
      }
    })
    rules.value = nextRules
    const answers: Record<number, any> = {}
    survey.value.questions.forEach((q:any, i:number) => { const key = String(q.id ?? (i+1)); answers[i+1] = form.value[key] })
    const vis = applyVisibility((survey.value.questions||[]).map((q:any, i:number)=>({ id: i+1, required: q.required, title: q.title, logic: q.logic })), answers)
    visibleMap.value = Object.fromEntries(Object.entries(vis).map(([k,v])=>[String(k), v as boolean]))
    survey.value.questions.forEach((q:any, i:number)=>{ const order=i+1; if (visibleMap.value[String(order)] !== false) applyDefaultIfNeeded(q,i) })
  } catch (e:any) {
    if (!props.injectedSurvey){
      const status = e?.response?.status; const msg = e?.response?.data?.error?.message || e?.response?.data?.message; const meta = e?.response?.data?.data
      if (status === 404) errorMsg.value = msg || '问卷不存在或已删除'
      else if (status === 403){ errorMsg.value = msg || '问卷未发布或已关闭'; if (meta) closedMeta.value = { title: meta.title, closedAt: meta.closedAt, status: meta.status } }
      else errorMsg.value = '加载失败，请稍后重试'
    }
    survey.value = null
  } finally { loading.value = false }
})

// 答案变化时，实时计算可见性并清空隐藏题答案
let _visRAF = 0
watch(form, () => {
  if (_visRAF) cancelAnimationFrame(_visRAF)
  // 需要在回调内使用 await（无效问卷直接提交），因此将 RAF 回调标记为 async
  _visRAF = requestAnimationFrame(async () => {
    if (!survey.value) return
    const answers: Record<number, any> = {}
    ;(survey.value.questions||[]).forEach((q:any, i:number) => {
      const key = String(q.id ?? (i+1))
      answers[i+1] = form.value[key]
    })
    const vis = applyVisibility((survey.value.questions||[]).map((q:any, i:number)=>({ id: i+1, required: q.required, title: q.title, logic: q.logic })), answers)
    // 跳题逻辑：基于当前题答案计算“从哪一题之后开始隐藏、隐藏到哪一题（前一题）”
    jumpStartAfter.value = null
    jumpHideUntil.value = null
    let hitInvalid = false
    for (let i=0;i<(survey.value.questions||[]).length;i++){
      const q:any = survey.value.questions[i]
      const order = i + 1
      const key = String(q.id ?? order)
      // 只在题目可见且为选择题时处理
  // 若题目本身因题目关联被隐藏，则不参与跳题判定，避免冲突
  if (vis[order] === false) continue
      const j:any = q.jumpLogic
      if (!j) continue
      // 无条件跳题（优先级低于按选项跳题）
      let target:string|undefined
      if (j.byOption && (q.type==='radio' || q.type==='checkbox')){
        const val = form.value[key]
        if (q.type==='radio') {
          target = j.byOption[String(val)]
        } else if (Array.isArray(val)) {
          // 多选：若多选命中多个目标，取最远的（更大的题号或 end）
          const candidates = val.map((v:any)=> j.byOption[String(v)]).filter(Boolean)
          if (candidates.length) {
            // end 视为最大
            target = candidates.includes('end') ? 'end' : String(Math.max(...candidates.map((s:string)=> Number(s))))
          }
        }
      }
      if (!target && j.unconditional) target = String(j.unconditional)
      if (target) {
        if (target === 'end') {
          // 从当前题之后到末尾全部隐藏
          jumpStartAfter.value = Math.max(jumpStartAfter.value || 0, order)
          jumpHideUntil.value = (survey.value.questions||[]).length + 1
          break
        } else if (target === 'invalid') {
          hitInvalid = true
          break
        } else if (/^\d+$/.test(target)) {
          const to = Number(target)
          // 仅当确实跳过中间题时，才设置隐藏范围： (order, to)
          if (to > order + 1) {
            jumpStartAfter.value = Math.max(jumpStartAfter.value || 0, order)
            jumpHideUntil.value = Math.max(jumpHideUntil.value || 0, to)
          }
        }
      }
    }
    // 命中“直接提交为无效问卷”，立即尝试提交无效答卷
    if (hitInvalid) {
      // 构造最小 payload（无需答案内容）
      const shareId = String(route.params.id || '')
      try {
        const res = await submitResponses(shareId, [], { invalid: true })
        // 无论后端是否严格校验，前端直接显示“提交成功（无效）”并跳转
        router.push({ name: 'SurveySuccess', params: { id: shareId }, query: { message: '感谢作答，本问卷不符合条件，已标记为无效提交。', title: survey.value?.title } })
      } catch (e) {
        // 出错时也跳转但提示不同
        router.push({ name: 'SurveySuccess', params: { id: shareId }, query: { message: '您不符合本次问卷条件，已结束作答。', title: survey.value?.title } })
      }
      return
    }
    // 应用跳题：仅隐藏“当前题之后到目标题之前”的题目
    if (jumpStartAfter.value && jumpHideUntil.value){
      for (let i=0;i<(survey.value.questions||[]).length;i++){
        const ord = i+1
        if (ord > jumpStartAfter.value && ord < jumpHideUntil.value) {
          vis[ord] = false
        }
      }
    }
    // 清空隐藏题答案并同步 visibleMap（按题目顺序判断）
    ;(survey.value.questions||[]).forEach((q:any, i:number) => {
      const order = i + 1
      const key = String(q.id ?? order)
      if (vis[order] === false) {
        if (q.type === 'checkbox') form.value[key] = []
        else form.value[key] = ''
      } else {
        // 题目可见时，若选项级可见性变化导致当前值无效，需同步清理
        if (q.type === 'radio' || q.type === 'checkbox') {
          const allowed = new Set((filteredOptions(q, i) || []).map((opt:any)=> String(opt.value)))
          if (q.type === 'radio') {
            if (!allowed.has(String(form.value[key] ?? ''))) form.value[key] = ''
          } else {
            const arr = Array.isArray(form.value[key]) ? form.value[key] : []
            form.value[key] = arr.filter((v:any)=> allowed.has(String(v)))
          }
          // 先尝试应用“默认选中”（仅一次，且仅在答案为空时）
          applyDefaultIfNeeded(q, i)
          // 默认选中（可选开关）：当“设置了选项关联”的选项出现时，若当前未选择，默认选中
          if (q.autoSelectOnAppear) {
            const visibleOpts:any[] = filteredOptions(q, i) || []
            const autoOpts = visibleOpts.filter(o => Array.isArray(o.visibleWhen) && o.visibleWhen.length>0)
            if (autoOpts.length>0) {
            if (q.type === 'radio') {
              if (!form.value[key]) {
                form.value[key] = String(autoOpts[0].value)
              }
            } else if (q.type === 'checkbox') {
              const arrNow = Array.isArray(form.value[key]) ? form.value[key] : []
              if (arrNow.length === 0) {
                form.value[key] = autoOpts.map(o => String(o.value))
              }
            }
            }
          }
        }
      }
    })
  visibleMap.value = Object.fromEntries(Object.entries(vis).map(([k,v])=>[String(k), v as boolean]))
    _visRAF = 0
  })
}, { deep: true })

const handleSubmit = async () => {
  if (!survey.value) return
  successMsg.value = ''
  errorMsg.value = ''
  // 先进行前端校验
  const ok = await formRef.value?.validate().catch(() => false)
  if (!ok) {
    errorMsg.value = '请先完成必填内容'
    return
  }
  if (preview) {
    successMsg.value = '（预览）模拟提交，不保存数据'
    return
  }
  submitting.value = true
  try {
    const shareId = String(route.params.id || '')
    // 以服务端返回的题目顺序为准，构造提交 payload；
    // 若返回的 q.id 缺失或重复，则使用序号 (idx+1) 作为后备，避免题目间相互影响
    const payload = (survey.value.questions || []).map((q: any, index: number) => {
      const key = String(q.id ?? (index + 1))
      return { questionId: Number(q.id ?? (index + 1)), value: form.value[key] }
    })
    const res = await submitResponses(shareId, payload)
    if (res?.success) {
      // 跳转到成功页面
      router.push({
        name: 'SurveySuccess',
        params: { id: shareId },
        query: {
          message: res.message || '提交成功，感谢参与！',
          title: survey.value.title
        }
      })
    } else {
      throw new Error(res?.message || '提交失败')
    }
  } catch (e: any) {
    // 优先展示后端返回的 message
    errorMsg.value = e?.response?.data?.message || e?.message || '提交失败'
  } finally {
    submitting.value = false
  }
}

// 生成二维码到右上角
const generateQrCode = async () => {
  console.log('开始生成二维码')
  currentUrl.value = window.location.href
  console.log('当前URL:', currentUrl.value)
  
  // 等待DOM更新
  await nextTick()
  
  // 再次等待，确保canvas完全渲染
  setTimeout(async () => {
    console.log('Canvas元素:', qrCanvasRef.value)
    if (qrCanvasRef.value) {
      try {
        // 动态导入qrcode库
        console.log('正在导入qrcode库...')
        const QRCode = await import('qrcode')
        console.log('qrcode库导入成功')
        
        // 设置canvas尺寸
        qrCanvasRef.value.width = 100
        qrCanvasRef.value.height = 100
        
        // 清空canvas
        const ctx = qrCanvasRef.value.getContext('2d')
        if (!ctx) return
        ctx.clearRect(0, 0, 100, 100)
        console.log('Canvas已清空，开始生成二维码...')
        
        // 生成二维码
        await QRCode.default.toCanvas(qrCanvasRef.value, currentUrl.value, {
          width: 100,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        console.log('二维码生成成功！')
      } catch (err) {
        console.error('生成二维码失败:', err)
        // 显示错误信息
        const ctx = qrCanvasRef.value.getContext('2d')
        if (!ctx) return
        ctx.fillStyle = '#ff0000'
        ctx.font = '12px Arial'
        ctx.fillText('生成失败', 20, 50)
      }
    } else {
      console.error('Canvas元素未找到')
    }
  }, 100)
}

// 复制链接
const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(currentUrl.value)
    // 这里使用简单的alert，避免依赖ElMessage
    alert('链接已复制到剪贴板')
  } catch (err) {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = currentUrl.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    alert('链接已复制到剪贴板')
  }
}

// 其他操作
const formatDate = (iso?: string) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const pad = (n:number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

// 最小白名单 HTML 过滤 + 链接安全处理
function safeHtml(raw:string){
  if(!raw) return ''
  
  console.log('safeHtml input:', raw)
  
  const wrapper = document.createElement('div')
  wrapper.innerHTML = raw
  const allowed = new Set(['A','IMG','VIDEO','AUDIO','IFRAME','B','STRONG','I','EM','U','SPAN','P','BR','DIV','UL','OL','LI','H1','H2','H3'])
  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_ELEMENT, null)
  const remove:Element[] = []
  
  while(walker.nextNode()){
    const el = walker.currentNode as HTMLElement
    if(!allowed.has(el.tagName)){
      console.log('Removing disallowed tag:', el.tagName)
      // unwrap
      const parent = el.parentNode
      if(parent){
        while(el.firstChild) parent.insertBefore(el.firstChild, el)
        remove.push(el)
      }
      continue
    }
    if(el.tagName==='A'){
      const href = el.getAttribute('href') || ''
      if(!/^https?:\/\//i.test(href)) el.removeAttribute('href')
      el.setAttribute('target','_blank')
      el.setAttribute('rel','noopener noreferrer')
    }
    if(el.tagName==='IFRAME'){
      let src = el.getAttribute('src') || ''
      // 处理协议相对 // 开头
      if(/^\/\//.test(src)) src = 'https:' + src
      // B站普通播放器 iframe 如果只有 aid/bvid/cid 参数则保持；如果是普通页面已在上游转换
      if(/player\.bilibili\.com/i.test(src)){
        // 确保带有 muted=0 autoplay=0 （不强制自动播放 + 允许有声音）
        const u = new URL(src)
        if(!u.searchParams.has('autoplay')) u.searchParams.set('autoplay','0')
        if(!u.searchParams.has('muted')) u.searchParams.set('muted','0')
        src = u.toString()
      }
      el.setAttribute('src', src)
      el.setAttribute('frameborder','0')
      el.setAttribute('allowfullscreen','true')
      // 允许常见媒体特性
      el.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
      // sandbox：允许脚本、同源、展示、弹窗（部分平台需要 forms）
      el.setAttribute('sandbox','allow-scripts allow-same-origin allow-presentation allow-popups allow-forms allow-popups-to-escape-sandbox')
      if(!el.getAttribute('width')) el.setAttribute('width','100%')
      if(!el.getAttribute('height')) el.setAttribute('height','240')
      el.classList.add('embed-video-frame')
    }
  }
  
  remove.forEach(n=>n.remove())
  
  const result = wrapper.innerHTML
  console.log('safeHtml output:', result)
  return result
}

// 填写端不显示依赖摘要（根据需求）
</script>

<style scoped>
 .page { 
  max-width: 800px; 
  margin: 60px auto 32px; 
  padding: 0 16px; 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "微软雅黑", "PingFang SC", "Hiragino Sans GB", "Source Han Sans CN", sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}
.page.embed { /* 预览嵌入：保持与正式答题相同宽度 800px */
  max-width:800px; margin:0 auto; padding:0 0 24px;
}
.page.embed .survey-wrapper { margin-top:0; }
.page.embed .qr-section-outside { display:none; }
.skeleton { background: transparent; }

/* 问卷包装器 - 包含二维码和答题区域 */
.survey-wrapper {
  position: relative;
  width: 100%;
}

/* 问卷容器 - 只包含答题区域 */
.survey-container {
  position: relative;
  width: 100%;
}

/* 右上角二维码区域 - 与问卷区域间隔20px */
.qr-section-outside {
  position: absolute;
  top: 0;
  right: -140px;
  text-align: center;
  z-index: 99999 !important;
  width: 120px;
  background: white;
  border-radius: 8px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  pointer-events: auto;
}

.paper { border: 1px solid #e5e7eb; border-radius: 12px; padding: 30px 20px 40px; box-shadow: 0 8px 30px rgba(31,41,55,.06); position: relative; }
.paper-header { 
  padding: 6px 8px 4px; 
  position: relative;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  margin-bottom: 4px;
  z-index: 100000 !important;
  position: relative;
  pointer-events: auto;
}

.qr-canvas-mini {
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100000 !important;
  position: relative;
  pointer-events: auto;
  width: 100px !important;
  height: 100px !important;
  display: block;
}

.qr-tip-mini {
  font-size: 12px;
  color: #666;
  margin: 0;
  line-height: 1.2;
}
.paper-title { margin: 20px 8px 30px; font-size: 24px; font-weight: 700; text-align:center; color: var(--el-color-primary, #409eff); }
.desc { color: #6b7280; margin: 2px 8px 8px; }
.progress-panel { margin: 12px 8px 0; padding: 12px 14px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; }
.progress-copy { margin-bottom: 8px; color: #475569; font-size: 13px; font-weight: 600; }
.q-form { padding: 0 20px; }
.q-item { margin-bottom: 30px; }
.q-item :deep(.el-form-item__label) { font-weight: 600; color:#333333; font-size: 15px; margin-bottom: 15px; }
.q-label{ display:inline-flex; align-items:flex-start; gap:8px; line-height:1.5; }
.q-number{ font-weight:600; color:#1f2937; min-width:22px; text-align:right; }
.q-title{ font-weight:600; color:#1f2937; }
.group-header{
  display:block;
  background:#f3f4f6;
  color:#111827 !important;
  padding:8px 12px;
  border-radius:6px;
  margin:8px 0;
  font-weight:600;
  line-height:1.3;
  font-size:14px;
  white-space:pre-wrap;
  width:100%;
  box-sizing:border-box;
}
.q-desc { color:#6b7280; font-size: 13px; margin: -2px 0 8px; }
.opt-vertical { display:flex; flex-direction:column; gap:4px; align-items:stretch; width:100%; }
/* 对齐单选/多选的图标与文字，消除选中态带来的左右位移 */
.opt-vertical :deep(.el-radio),
.opt-vertical :deep(.el-checkbox) {
  display: flex;
  align-items: center;
  margin: -1.5px;
  font-size: 14px;
  line-height: 1.2;
}
.opt-vertical :deep(.el-radio__input),
.opt-vertical :deep(.el-checkbox__input) {
  margin-right: 10px;
}

/* 增大单选框尺寸 */
.opt-vertical :deep(.el-radio__input .el-radio__inner) {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

.opt-vertical :deep(.el-radio__input.is-checked .el-radio__inner::after) {
  width: 8px;
  height: 8px;
}

/* 增大复选框尺寸 */
.opt-vertical :deep(.el-checkbox__input .el-checkbox__inner) {
  width: 18px;
  height: 18px;
  border-width: 2px;
}

.opt-vertical :deep(.el-checkbox__input.is-checked .el-checkbox__inner::after) {
  width: 6px;
  height: 10px;
  border-width: 0 2px 2px 0;
  left: 3px;
  top: -0.8px;
}
.opt-vertical :deep(.el-radio__label),
.opt-vertical :deep(.el-checkbox__label) {
  padding-left: 0 !important;
}
.q-divider { margin: 8px 0 6px; }
.actions { display:flex; flex-direction: column; align-items:center; gap:12px; margin: 16px 8px 10px; }
.submit-btn { min-width: 120px; }
.msg { padding: 0; width: 100%; max-width: 560px; }

/* 关闭空态样式 */
.closed-block { margin-top: 40px; }
.closed-survey-title { text-align: center; font-size: 20px; font-weight: 700; color: #334155; margin-bottom: 6px; }
.closed-empty :deep(.el-empty__description) { margin-top: 6px; }
.closed-wrap { text-align: center; }
.closed-title { font-size: 16px; color: #64748b; }
.closed-meta { font-size: 13px; color: #94a3b8; margin-top: 4px; }
.closed-actions { margin-top: 10px; display: flex; gap: 8px; justify-content: center; }

/* 让填空块像一个选项一样占据一行并对齐缩进 */
.opt-fill-as-item {
  display: flex;
  align-items: center;
  margin: -1.2px; /* 与 opt-vertical 行距一致 */
  padding-left: 35px; /* 与 label 匹配的缩进（图标宽度 + 间距）*/
}

/* 让填空框显示在每个选项内的第二行 */
.opt-item :deep(.el-radio__label),
.opt-item :deep(.el-checkbox__label) {
  display: inline-block;
}
.opt-content { display: inline-flex; flex-direction: column; align-items: flex-start; gap: 6px; }

/* iframe 视频支持 - 与预览页面和编辑页面保持一致 */
.desc :deep(iframe),
.q-desc :deep(iframe),
.desc :deep(.qfe-iframe),
.q-desc :deep(.qfe-iframe),
.desc :deep(.embed-video-frame),
.q-desc :deep(.embed-video-frame) {
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

/* 响应式iframe */
@media (max-width: 768px) {
  .desc :deep(iframe),
  .q-desc :deep(iframe),
  .desc :deep(.qfe-iframe),
  .q-desc :deep(.qfe-iframe),
  .desc :deep(.embed-video-frame),
  .q-desc :deep(.embed-video-frame) {
    height: 300px !important;
  }
}

.opt-fill-line { margin-left: 0; }

/* 剩余配额显示样式（可通过 CSS 变量 --quota-remaining-color 自定义） */
.quota-remaining {
  color: var(--quota-remaining-color, #64748b); /* 默认柔和蓝灰色 */
  font-size: 12px;
  margin-left: 6px;
}


</style>
