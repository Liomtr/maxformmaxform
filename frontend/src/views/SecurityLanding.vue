<!--
  安全落地页（SecurityLanding.vue）
  展示安全相关功能、产品优势等内容。
-->
<template>
  <div class="sec-landing">
    <header class="sl-nav">
      <div class="inner">
  <div class="logo" @click="goHome">TrustForm信任表单</div>
        <nav class="nav-links">
          <a @click.prevent="scrollTo('#features')">能力</a>
          <a @click.prevent="scrollTo('#why')">优势</a>
          <a @click.prevent="scrollTo('#process')">流程</a>
          <a @click.prevent="scrollTo('#contact')">联系</a>
          <el-button size="small" type="primary" @click="goLogin">登录</el-button>
        </nav>
      </div>
    </header>

    <!-- Full hero like reference -->
    <section class="hero-full">
      <div class="hero-bg"></div>
      <div class="hero-inner">
        <div class="hero-left">
          <h1>政企级安全 · 数据主权可控</h1>
          <p class="sub">端到端加密 · 合规对标 · 多租户隔离 · 审计追踪 · 自主导出与销毁</p>
          <div class="cta-row">
            <el-button type="warning" size="large" class="focus-btn" @click="goLogin">免费试用</el-button>
            <el-button size="large" plain @click="scrollTo('#features')">查看更多</el-button>
          </div>
          <ul class="selling-points">
            <li v-for="s in selling" :key="s">{{ s }}</li>
          </ul>
        </div>
        <div class="hero-visual" aria-label="安全与反馈可视化示意">
          <div class="panel stack panel-a">
            <div class="gauge">
              <svg viewBox="0 0 120 60"><path d="M10 50 A50 50 0 0 1 110 50" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.25"/><path :d="gaugePath" fill="none" stroke="url(#g)" stroke-width="10" stroke-linecap="round"/><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#fff"/><stop offset="100%" stop-color="#e2f9ff"/></linearGradient></defs></svg>
              <div class="gauge-val">{{ gauge }}%</div>
            </div>
          </div>
          <div class="panel stack panel-b">
            <ul class="face-scale">
              <li v-for="f in faces" :key="f.icon" :class="f.color">{{ f.icon }}</li>
            </ul>
          </div>
          <div class="panel main panel-c">
            <div class="question-line" v-for="n in 3" :key="n">
              <div class="q-check" :class="{ on: n===1 }"></div>
              <div class="q-bar" :style="{ width: (60 + n*15) + '%' }"></div>
            </div>
            <div class="emoji-row">
              <span v-for="f in faces" :key="f.icon" class="e" :class="f.color">{{ f.icon }}</span>
            </div>
            <div class="progress-line">
              <div class="p-track"><div class="p-fill" :style="{ width: progress+'%' }"></div></div>
            </div>
          </div>
          <div class="illustration-person" aria-hidden="true"></div>
        </div>
      </div>
      <div class="hero-bottom-cards">
        <div class="mini-card" v-for="c in mini" :key="c.title">
          <div class="m-icon" :class="c.color">{{ c.icon }}</div>
          <h3>{{ c.title }}</h3>
          <p>{{ c.desc }}</p>
        </div>
      </div>
    </section>

    <section id="features" class="section light">
      <h2 class="sec-title">核心安全与治理能力</h2>
      <ul class="feature-grid">
        <li v-for="f in features" :key="f.title">
          <h4>{{ f.title }}</h4>
          <p>{{ f.desc }}</p>
        </li>
      </ul>
    </section>

    <section id="why" class="section alt">
      <h2 class="sec-title">为什么选择我们</h2>
      <div class="why-grid">
        <div v-for="w in why" :key="w.title" class="why-item">
          <h4>{{ w.title }}</h4>
          <p>{{ w.desc }}</p>
        </div>
      </div>
    </section>

    <section id="process" class="section light">
      <h2 class="sec-title">部署与对接流程</h2>
      <ol class="process-line">
        <li v-for="(p,i) in process" :key="p" :data-step="i+1">{{ p }}</li>
      </ol>
    </section>

    <section id="contact" class="section alt final-cta">
      <h2 class="sec-title">私有化 / 政企部署咨询</h2>
      <p class="center">留下企业邮箱，我们将在 1 个工作日内联系您。</p>
      <div class="mail-capture">
        <el-input v-model="mail" placeholder="name@company.com" />
        <el-button type="primary" @click="submitMail" :disabled="!validMail">获取资料</el-button>
      </div>
      <p v-if="submitted" class="thanks">已收到，我们会尽快联系。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const goHome = ()=> router.push('/')
const goLogin = ()=> router.push('/login')
const scrollTo = (sel:string)=> document.querySelector(sel)?.scrollIntoView({ behavior:'smooth' })

const selling = ['字段级加密','操作审计','多租户隔离','合规对标','可观测','数据主权']
const faces = [
  { icon:'😠', color:'bad' },{ icon:'😣', color:'mid' },{ icon:'😐', color:'neutral' },{ icon:'😊', color:'good' },{ icon:'😄', color:'great' }
]
const mini = [
  { icon:'🔒', title:'免费', desc:'所有高级题型与扩展设置免费使用', color:'c1' },
  { icon:'☁️', title:'易用', desc:'全新UI设计，操作简单 三步即可完成创建', color:'c2' },
  { icon:'⚡', title:'快速', desc:'海量认证模板, 智能推荐 快速构建专属应用', color:'c3' }
]
const features = [
  { title:'字段级加密', desc:'敏感字段单独加密与密钥轮换策略。' },
  { title:'操作审计', desc:'导出/权限/配置变更全留痕，可检索。' },
  { title:'多租户隔离', desc:'逻辑隔离 + 资源配额，支持物理隔离演进。' },
  { title:'统一权限模型', desc:'RBAC + 资源/字段级控制 + 审批联动。' },
  { title:'可观测性', desc:'日志/指标/Tracing 统一聚合告警。' },
  { title:'数据主权', desc:'随时导出/脱敏/销毁，不锁定。' }
]
const why = [
  { title:'开箱生产级', desc:'企业特性默认内建，减少自研成本。' },
  { title:'插件扩展', desc:'题型/导出/校验钩子生态化。' },
  { title:'部署快捷', desc:'Docker / K8s 5 分钟即起。' },
  { title:'安全内生', desc:'设计之初即考虑合规与审计链路。' }
]
const process = ['需求沟通','镜像交付','环境部署','集成对接','安全校验','试运行','正式上线']

// 动态 gauge & 进度模拟
const gauge = ref(60)
const progress = ref(30)
const gaugePath = ref('')
const calcArc = (val:number)=>{
  const end = 10 + (val/100)*100
  return `M10 50 A50 50 0 0 1 ${end} 50`
}

onMounted(()=>{
  gaugePath.value = calcArc(gauge.value)
  setInterval(()=> {
    gauge.value = 55 + Math.round(Math.random()*10)
    progress.value = 25 + Math.round(Math.random()*50)
    gaugePath.value = calcArc(gauge.value)
  }, 3000)
})

const mail = ref('')
const submitted = ref(false)
const validMail = computed(()=> /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail.value))
const submitMail = ()=> { if(validMail.value){ submitted.value = true; console.log('mail-capture', mail.value) } }
</script>

<style scoped>
.sec-landing { font-family: var(--font-base, 'Segoe UI', system-ui); color:#24303f; }
.sl-nav { position:fixed; top:0; left:0; right:0; height:64px; backdrop-filter:blur(10px); background:rgba(255,255,255,.55); border-bottom:1px solid rgba(255,255,255,.5); z-index:50; }
.sl-nav .inner { max-width:1180px; margin:0 auto; padding:0 28px; height:100%; display:flex; align-items:center; justify-content:space-between; }
.logo { font-size:22px; font-weight:700; background:var(--gradient-brand,linear-gradient(120deg,#4f8bff,#6f62ff 40%,#2dd9c5)); -webkit-background-clip:text; color:transparent; cursor:pointer; }
.nav-links { display:flex; gap:30px; align-items:center; }
.nav-links a { text-decoration:none; color:#1e2d3c; font-size:14px; cursor:pointer; position:relative; }
.nav-links a::after { content:""; position:absolute; left:0; bottom:-6px; height:2px; background:#4f8bff; width:0; transition:.3s; }
.nav-links a:hover::after { width:100%; }

.hero-full { position:relative; padding:140px 0 120px; overflow:hidden; }
.hero-bg { position:absolute; inset:0; background:linear-gradient(135deg,#ff7040,#ff4d46 35%,#ffb347); }
.hero-inner { position:relative; max-width:1180px; margin:0 auto; padding:0 28px; display:flex; gap:80px; align-items:flex-start; }
.hero-left { flex:1; }
.hero-left h1 { font-size:44px; line-height:1.15; margin:0 0 20px; color:#fff; }
.hero-left .sub { font-size:16px; line-height:1.7; color:#ffe6db; margin:0 0 34px; }
.cta-row { display:flex; gap:18px; margin-bottom:26px; }
.focus-btn { font-weight:600; background:linear-gradient(90deg,#ffd944,#ffb100); border:none; color:#8a3700; }
.focus-btn:hover { filter:brightness(1.05); }
.selling-points { list-style:none; padding:0; margin:0; display:flex; flex-wrap:wrap; gap:14px; }
.selling-points li { background:rgba(255,255,255,.18); color:#fff; padding:8px 16px; font-size:13px; border-radius:20px; border:1px solid rgba(255,255,255,.35); backdrop-filter:blur(4px); }

.hero-visual { flex:1; position:relative; min-height:360px; }
.panel { position:absolute; background:rgba(255,255,255,.28); backdrop-filter:blur(8px); border:1px solid rgba(255,255,255,.5); border-radius:14px; box-shadow:0 8px 32px -12px rgba(0,0,0,.25); }
.panel-a { width:240px; height:180px; top:0; left:60px; }
.panel-b { width:260px; height:190px; top:40px; left:220px; }
.panel-c { width:360px; min-height:250px; top:110px; left:140px; background:#fff; color:#2d3a50; padding:26px 24px 30px; }
.panel.stack { animation:float 7s ease-in-out infinite; }
.gauge { position:relative; width:120px; margin:40px auto; }
.gauge svg { width:120px; height:60px; }
.gauge-val { position:absolute; left:50%; top:34%; transform:translate(-50%,-50%); font-size:20px; font-weight:600; color:#fff; }
.face-scale { list-style:none; padding:0; margin:30px 0 0; display:flex; gap:10px; justify-content:center; }
.face-scale li { font-size:26px; filter:grayscale(.2); }
.question-line { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
.q-check { width:18px; height:18px; border:2px solid #d1d8e3; border-radius:4px; }
.q-check.on { background:#ff5252; border-color:#ff5252; position:relative; }
.q-check.on::after { content:""; position:absolute; inset:4px; background:#fff; border-radius:2px; }
.q-bar { height:10px; background:linear-gradient(90deg,#ffd5d5,#ff5252); border-radius:6px; }
.emoji-row { display:flex; gap:14px; font-size:30px; margin:16px 0 24px; }
.progress-line { }
.p-track { height:8px; background:#eef2f6; border-radius:6px; overflow:hidden; }
.p-fill { height:100%; background:linear-gradient(90deg,#ff7a42,#ffb347); }
.illustration-person { position:absolute; right:-40px; bottom:-10px; width:160px; height:300px; background:linear-gradient(#ffe9d2,#ffd2b2); border-radius:80px 80px 0 0; opacity:.55; filter:blur(2px); }

.hero-bottom-cards { position:relative; max-width:1180px; margin:-60px auto 0; padding:0 28px; display:flex; gap:40px; justify-content:center; }
.mini-card { flex:1 1 240px; background:#fff; padding:40px 34px 46px; border-radius:20px; box-shadow:0 30px 70px -26px rgba(0,0,0,.16); text-align:center; display:flex; flex-direction:column; gap:16px; }
.mini-card h3 { margin:0; font-size:18px; }
.mini-card p { margin:0; font-size:13px; line-height:1.6; color:#5b6672; }
.m-icon { width:64px; height:64px; border-radius:18px; display:flex; align-items:center; justify-content:center; font-size:32px; margin:0 auto; color:#fff; font-weight:600; }
.m-icon.c1 { background:linear-gradient(135deg,#7ed957,#4caf50); }
.m-icon.c2 { background:linear-gradient(135deg,#ff8fb5,#ff5f85); }
.m-icon.c3 { background:linear-gradient(135deg,#4f8bff,#6f62ff); }

.section { padding:90px 0 90px; max-width:1180px; margin:0 auto; padding-left:28px; padding-right:28px; }
.section.alt { background:linear-gradient(180deg,#f9fbfd,#f1f5fa); width:100%; }
.section.light { width:100%; }
.sec-title { text-align:center; font-size:30px; margin:0 0 40px; }
.feature-grid { list-style:none; margin:0; padding:0; display:grid; gap:28px 40px; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); font-size:14px; }
.feature-grid h4 { margin:0 0 8px; font-size:16px; }
.why-grid { display:grid; gap:26px 40px; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); }
.why-item { background:#fff; border:1px solid #e2e9f2; border-radius:18px; padding:26px 24px 30px; box-shadow:0 14px 40px -18px rgba(54,83,148,.25); }
.why-item h4 { margin:0 0 10px; font-size:16px; }
.process-line { list-style:none; display:flex; flex-wrap:wrap; gap:34px 70px; justify-content:center; counter-reset:step; padding:0; margin:0; }
.process-line li { position:relative; padding-left:34px; font-size:14px; }
.process-line li::before { content:attr(data-step); position:absolute; left:0; top:-4px; width:24px; height:24px; background:linear-gradient(135deg,#4f8bff,#6f62ff); color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; }
.final-cta { text-align:center; }
.mail-capture { display:flex; gap:14px; justify-content:center; max-width:540px; margin:30px auto 10px; }
.mail-capture .el-input { flex:1; }
.thanks { font-size:13px; color:#4f8bff; }
.center { text-align:center; margin-top:-10px; color:#5b6672; }

@media (max-width:1080px){
  .hero-inner { flex-direction:column; gap:60px; }
  .hero-visual { order:-1; min-height:320px; }
  .hero-bottom-cards { flex-direction:column; margin-top:24px; }
  .panel-a { left:20px; }
  .panel-b { left:140px; }
  .panel-c { left:60px; width:min(360px, calc(100% - 80px)); }
}

@media (max-width:768px){
  .sl-nav .inner { padding:0 16px; }
  .nav-links { gap:12px; }
  .nav-links a { display:none; }
  .hero-full { padding:110px 0 80px; }
  .hero-inner { padding:0 16px; gap:32px; }
  .hero-left h1 { font-size:32px; }
  .hero-left .sub { font-size:14px; }
  .cta-row { flex-wrap:wrap; }
  .hero-visual { min-height:260px; width:100%; }
  .panel-a { width:180px; height:140px; left:0; }
  .panel-b { width:180px; height:140px; left:auto; right:0; top:24px; }
  .panel-c { width:100%; left:0; top:96px; min-height:180px; }
  .hero-bottom-cards { padding:0 16px; }
  .section { padding:70px 16px; }
  .mail-capture { flex-direction:column; }
}

@keyframes float {
  0% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0); }
}
</style>
