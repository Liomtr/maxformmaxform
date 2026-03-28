<!--
  首页展示页面（HomePage.vue）
  展示产品介绍、功能、流程、场景等信息。
-->
<template>
  <div class="home-wrapper" :class="{ dark: isDark }">
    <!-- 导航 -->
    <header class="nav gloss">
      <div class="container nav-inner">
        <div class="brand" @click="scrollToTop" title="返回首页">
          <img v-if="!brandImgError" src="/brand-logo.png" alt="Logo" class="brand-logo" @error="brandImgError = true" />
          <svg v-else class="brand-logo" viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="hpBrand" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4f8bff"/>
                <stop offset="70%" stop-color="#6f62ff"/>
              </linearGradient>
            </defs>
            <rect x="1.5" y="3" width="23" height="28" rx="9" fill="url(#hpBrand)" opacity="0.95"/>
            <circle cx="9.5" cy="12" r="3.6" fill="#ffffff"/>
          </svg>
        </div>
        <nav class="links">
          <a href="#features">功能</a>
          <a href="#flow">流程</a>
          <a href="#scenarios">场景</a>
          <a href="#deployment">部署</a>
          <a href="#security">安全</a>
          <a href="#governance">治理</a>
          <a href="#architecture">架构</a>
          <a href="#cases">案例</a>
          <a href="#metrics">指标</a>
          <a href="#faq">FAQ</a>
          <a href="#tech">技术</a>
          <a href="#contact">联系</a>
          <el-switch v-model="isDark" inline-prompt active-text="🌙" inactive-text="☀️" class="mode-switch" />
          <template v-if="!isAuthed">
            <el-button size="small" type="primary" @click="goEntry">登录 / 注册</el-button>
          </template>
          <template v-else>
            <el-dropdown trigger="hover">
              <span class="user-entry" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                <el-avatar :size="26" class="nav-avatar">{{ userInitial }}</el-avatar>
                <span class="uname">{{ displayName }}</span>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="goDashboard">进入工作台</el-dropdown-item>
                  <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </nav>
      </div>
    </header>

    <!-- Hero -->
    <section class="hero hero-vertical">
      <div class="container hero-vert-inner">
        <div class="hero-text center-block">
          <h1 class="hero-title"><span class="grad">政企级调研平台，绝对安全，绝对可控</span></h1>
          <p class="subtitle large">告别云端风险，拥抱内网安心。<br/>从数据到决策，一站式闭环解决方案，为组织协同与数据洞察保驾护航</p>
          <div class="hero-cta center">
            <el-button type="primary" size="large" @click="goEntry">{{ isAuthed ? '进入工作台' : '立即体验' }}</el-button>
            <el-button size="large" plain @click="scrollTo('#features')">了解功能</el-button>
          </div>
          <ul class="hero-bullets center">
            <li v-for="b in bullets" :key="b" @click="clickBullet(b)" class="clickable" :class="{ active: activeBullet === b }" :aria-current="activeBullet===b ? 'true': undefined">{{ b }}</li>
          </ul>
        </div>
        <div class="hero-secure-wrap" role="group" aria-label="政企级安全与合规概览">
          <div class="secure-panel anim-safe">
            <div class="secure-head">
              <svg class="icon-shield" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.5 4.5 5v6.9c0 5.07 3.36 9.72 7.5 10.6 4.14-.88 7.5-5.53 7.5-10.6V5L12 2.5Zm0 2.05 5.5 1.87v5.48c0 4.13-2.7 7.96-5.5 8.77-2.8-.81-5.5-4.64-5.5-8.77V6.42L12 4.55Zm-1 5.95 4.24-4.24 1.06 1.06L11 12.66l-3.3-3.3 1.06-1.06L11 10.5Z"/></svg>
              <span class="head-text">政企级安全保障</span>
              <button class="more-safe" @click="scrollTo('#security')" aria-label="查看更多安全细节">详情</button>
            </div>
            <div class="secure-cards" aria-label="三大安全与合规能力概览">
              <div class="secure-card grad-blue" aria-label="加密与隔离">
                <div class="row-top">
                  <span class="s-title">加密与隔离</span>
                  <span class="badge-line" aria-label="加密覆盖率 100%">覆盖率 100%</span>
                </div>
                <span class="s-desc">字段级加密 · TLS1.2+ · 多租户隔离 · 审计留痕</span>
                <div class="row-meta">
                  <span class="meta-tag">KMS</span>
                  <span class="meta-tag">RBAC</span>
                  <span class="meta-tag">Audit</span>
                </div>
              </div>
              <div class="secure-card grad-mint" aria-label="合规支撑">
                <div class="row-top">
                  <span class="s-title">合规支撑</span>
                  <span class="mini-stats" aria-label="合规推进进度">
                    <em>ISO</em><span class="bar"><i style="--p:0.65"></i></span>
                    <em>等保</em><span class="bar"><i style="--p:0.40"></i></span>
                  </span>
                </div>
                <span class="s-desc">等保 / ISO 体系对标 · 操作与导出全留痕</span>
                <div class="row-meta">
                  <span class="meta-badge soon" title="计划内">ISO</span>
                  <span class="meta-badge soon" title="计划内">等保</span>
                  <span class="meta-tag">审计</span>
                </div>
              </div>
              <div class="secure-card pale sovereignty" aria-label="数据主权">
                <div class="row-top">
                  <span class="s-title">数据主权</span>
                  <span class="badge-line neutral" aria-label="主权能力全覆盖">主权能力 3/3</span>
                </div>
                <span class="s-desc">数据归属企业 · 可导出/脱敏/销毁 · 不锁定</span>
                <div class="row-meta dots">
                  <span class="dot on" title="导出能力"></span>
                  <span class="dot on" title="脱敏能力"></span>
                  <span class="dot on" title="销毁能力"></span>
                  <div class="tags">
                    <span class="meta-tag">Export</span>
                    <span class="meta-tag">Mask</span>
                    <span class="meta-tag">Wipe</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="hero-wave"></div>
    </section>

    <!-- 功能 -->
    <section id="features" class="section">
      <div class="container">
        <h2 class="section-title">核心功能</h2>
        <p class="section-desc">覆盖企业问卷全生命周期，支持灵活扩展与权限分级。</p>
        <el-row :gutter="20" class="cards-grid">
          <el-col :xs="24" :sm="12" :md="8" v-for="f in features" :key="f.title">
            <div class="card feature-card" :class="'anim-fade'">
              <div class="icon">{{ f.icon }}</div>
              <h3>{{ f.title }}</h3>
              <p>{{ f.desc }}</p>
            </div>
          </el-col>
        </el-row>
      </div>
    </section>

    <!-- 使用流程 -->
    <section id="flow" class="section alt">
      <div class="container">
        <h2 class="section-title">使用流程</h2>
        <el-row :gutter="30" class="flow-steps">
          <el-col :xs="24" :sm="12" :md="6" v-for="(s,i) in flow" :key="s.title">
            <div class="step">
              <div class="step-index">{{ i+1 }}</div>
              <h4>{{ s.title }}</h4>
              <p>{{ s.desc }}</p>
            </div>
          </el-col>
        </el-row>
      </div>
    </section>

    <!-- 场景 -->
    <section id="scenarios" class="section">
      <div class="container">
        <h2 class="section-title">典型场景</h2>
        <div class="scenario-wrap">
          <div class="scenario" v-for="s in scenarios" :key="s.title">
            <h4>{{ s.title }}</h4>
            <p class="muted">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 部署方案 -->
    <section id="deployment" class="section alt">
      <div class="container">
        <h2 class="section-title">企业级部署</h2>
        <div class="deployment-card anim-fade">
          <div class="deploy-content">
            <h3>统一企业版</h3>
            <p class="muted">所有能力一次性开放：题型全集 · 权限/审批 · 审计日志 · 安全加固 · 多租户隔离 · 插件扩展 · 数据分析 · 私有化交付。</p>
            <ul class="deploy-points">
              <li v-for="pt in deploymentPoints" :key="pt">{{ pt }}</li>
            </ul>
            <div class="deploy-cta">
              <el-button type="primary" @click="goEntry">{{ isAuthed ? '进入工作台' : '申请试用' }}</el-button>
              <el-button text @click="scrollTo('#contact')">商务咨询</el-button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 安全&合规 -->
    <section id="security" class="section">
      <div class="container">
        <h2 class="section-title">安全与合规</h2>
        <p class="section-desc">覆盖数据生命周期的多层防护与合规支撑。</p>
        <div class="security-grid">
          <div v-for="s in securityPoints" :key="s.title" class="security-item anim-fade">
            <div class="sec-icon">{{ s.icon }}</div>
            <h4>{{ s.title }}</h4>
            <p class="muted">{{ s.desc }}</p>
            <ul class="mini-list" v-if="s.extra">
              <li v-for="e in s.extra" :key="e">{{ e }}</li>
            </ul>
          </div>
        </div>
        <div class="assurance-banner anim-fade">
          <strong>数据主权承诺：</strong> 数据完全归属企业，可一键导出/脱敏/销毁，无供应商锁定。
        </div>
      </div>
    </section>

    <!-- 治理&审批流程 -->
    <section id="governance" class="section alt">
      <div class="container">
        <h2 class="section-title">治理 & 审批流程</h2>
        <p class="section-desc">确保每一次问卷上线都符合内部合规与安全标准。</p>
        <div class="gov-flow">
          <div v-for="(g,i) in governanceFlow" :key="g.title" class="gov-step anim-fade">
            <div class="gov-index">{{ i+1 }}</div>
            <h4>{{ g.title }}</h4>
            <p>{{ g.desc }}</p>
          </div>
        </div>
        <div class="gov-notes anim-fade">
          支持自定义审批节点、条件（数据敏感级别/受众范围），与权限体系、审计日志联动。可回滚已发布版本并保留统计口径。
        </div>
      </div>
    </section>

    <!-- 技术&优势 -->
    <section id="tech" class="section">
      <div class="container">
        <h2 class="section-title">技术优势</h2>
        <div class="tech-grid">
          <div v-for="t in tech" :key="t" class="tech-pill">{{ t }}</div>
        </div>
      </div>
    </section>

    <!-- 平台架构 -->
    <section id="architecture" class="section">
      <div class="container">
        <h2 class="section-title">平台架构</h2>
        <p class="section-desc">解耦 + 可扩展 + 多租户隔离的分层设计。</p>
        <div class="arch-wrap anim-fade">
          <div class="arch-diagram" aria-label="系统架构拓扑示意">
            <svg viewBox="0 0 600 280" class="arch-svg">
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0%" stop-color="#4f8bff"/>
                  <stop offset="60%" stop-color="#6f62ff"/>
                  <stop offset="100%" stop-color="#2dd9c5"/>
                </linearGradient>
              </defs>
              <rect x="20" y="20" width="560" height="60" rx="12" fill="url(#g1)" opacity="0.9"/>
              <text x="300" y="56" font-size="18" text-anchor="middle" fill="#fff">前端 (Web / 移动端 H5)</text>
              <rect x="20" y="100" width="560" height="60" rx="12" fill="#fff" stroke="#dbe3ef"/>
              <text x="300" y="136" font-size="16" text-anchor="middle" fill="#333">API Gateway / 认证 / 限流 / 日志</text>
              <rect x="20" y="180" width="180" height="80" rx="12" fill="#fff" stroke="#dbe3ef"/>
              <text x="110" y="216" font-size="14" text-anchor="middle" fill="#333">Survey 服务</text>
              <rect x="210" y="180" width="180" height="80" rx="12" fill="#fff" stroke="#dbe3ef"/>
              <text x="300" y="216" font-size="14" text-anchor="middle" fill="#333">分析/统计 服务</text>
              <rect x="400" y="180" width="180" height="80" rx="12" fill="#fff" stroke="#dbe3ef"/>
              <text x="490" y="216" font-size="14" text-anchor="middle" fill="#333">插件/扩展 服务</text>
            </svg>
          </div>
          <ul class="arch-layers">
            <li v-for="a in architectureLayers" :key="a.title">
              <strong>{{ a.title }}：</strong>{{ a.desc }}
            </li>
          </ul>
        </div>
      </div>
    </section>

    <!-- 指标 -->
    <section id="metrics" class="section alt metrics-modern">
      <div class="container metrics-flex">
        <div class="metrics-text anim-fade">
          <h2 class="section-title align-left">平台指标</h2>
          <p class="section-desc align-left small-desc">核心能力与效率指标为企业级稳定运行提供信心。</p>
          <ul class="metric-bullets">
            <li>高并发填答 & 自适应扩展</li>
            <li>毫秒级接口缓存与增量聚合</li>
            <li>多级监控 + 告警链路</li>
            <li>版本化回滚与数据口径稳定</li>
          </ul>
        </div>
        <div class="metrics-cards">
          <div v-for="m in metrics" :key="m.label" class="metric-card anim-fade">
            <div class="metric-value">{{ m.display }}</div>
            <div class="metric-label">{{ m.label }}</div>
          </div>
        </div>
      </div>
      <div class="data-sovereignty anim-fade modern-banner">
        <strong>数据主权：</strong> 全量导出 · 版本留存 · 可审计 · 可迁移，不锁定。
      </div>
    </section>

    <!-- 案例 -->
    <section id="cases" class="section">
      <div class="container">
        <h2 class="section-title">值得信赖的企业与机构</h2>
        <p class="section-desc">多行业客户通过平台实现数据驱动决策与流程优化（示例占位）。</p>
        <div class="case-logos">
          <div v-for="b in brandLogos" :key="b.name" class="case-logo anim-fade">
            <div class="logo-box" :title="b.name">{{ b.short }}</div>
            <span class="logo-name">{{ b.name }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-modern">
      <div class="container cta-inner anim-fade">
        <div class="cta-left">
          <h2>立即开启企业智能调研</h2>
          <p class="cta-sub">统一企业版 · 全功能开放 · 扩展可插拔 · 数据主权掌控</p>
          <ul class="cta-highlights">
            <li v-for="h in ctaHighlights" :key="h">{{ h }}</li>
          </ul>
          <div class="cta-actions">
            <el-button type="primary" size="large" @click="goEntry">{{ isAuthed ? '进入工作台' : '立即使用' }}</el-button>
            <el-button size="large" plain @click="scrollToTop">了解更多</el-button>
          </div>
        </div>
        <div class="cta-aside">
          <div class="mini-stat" v-for="s in ctaStats" :key="s.label">
            <div class="num">{{ s.value }}</div>
            <div class="lab">{{ s.label }}</div>
          </div>
        </div>
        <div class="cta-bg-shape"></div>
      </div>
      <div class="wave-sep"></div>
    </section>

    <!-- 联系 / 底部导航 -->
    <section id="contact" class="footer-extended">
      <div class="container">
        <div class="footer-cols">
          <div v-for="col in footerColumns" :key="col.title" class="f-col">
            <h4 class="f-title">{{ col.title }}</h4>
            <ul class="f-links">
              <li v-for="item in col.items" :key="item.label">
                <a :href="item.href" :aria-label="item.label">{{ item.label }}<span v-if="item.badge" class="badge" :class="item.badge.type">{{ item.badge.text }}</span></a>
              </li>
            </ul>
          </div>
        </div>
        <div class="footer-sep"></div>
        <div class="footer-bottom">
          <div class="fb-left">
            <div class="legal-line">
              <span class="legal-item"><a href="#" aria-label="免责声明">免责声明</a></span>
              <span class="dot">•</span>
              <span class="legal-item">Copyright © 2020-2025 日照广泰佳和网络科技有限公司.</span>
              <span class="dot">•</span>
              <span class="legal-item">鲁ICP备20000000000号</span>
            </div>
            <div class="slogan">保证政企数据安全 · 高效协作 · 智能分析</div>
          </div>
          <div class="fb-right" aria-label="社交与代码托管链接">
            <a href="#" class="icon-btn" title="GitHub" aria-label="GitHub"><span>GH</span></a>
            <a href="#" class="icon-btn" title="Gitee" aria-label="Gitee"><span>Gitee</span></a>
            <a href="#" class="icon-btn" title="社区" aria-label="社区"><span>💬</span></a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { reactive, ref, onMounted, watchEffect, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import '../styles/design-tokens.css'
const router = useRouter()
const authStore = useAuthStore()
const { isLoggedIn, user, username } = storeToRefs(authStore)
// 深色模式开关（带持久化），用于顶部导航右侧切换与整体配色
const isDark = ref(localStorage.getItem('home:isDark') === '1')
watchEffect(() => localStorage.setItem('home:isDark', isDark.value ? '1' : '0'))
// 顶部左侧品牌图片加载失败时，回退到内联 SVG
const brandImgError = ref(false)
const isAuthed = computed(() => isLoggedIn.value)
const displayName = computed(() => username.value || localStorage.getItem('rememberUser') || '用户')
const userInitial = computed(()=> displayName.value.substring(0,1).toUpperCase())
const goEntry = () => { if (isAuthed.value) return router.push('/user-dashboard'); router.push('/login') }
const goDashboard = () => router.push('/user-dashboard')
const logout = () => { authStore.logout(); router.replace('/login') }
const scrollTo = (sel: string) => document.querySelector(sel)?.scrollIntoView({ behavior:'smooth' })
const scrollToTop = () => window.scrollTo({ top:0, behavior:'smooth' })
const bulletMap:Record<string,string> = {
  '题型丰富':'#features',
  '权限精细':'#security',
  '流程可控':'#governance',
  '统计直观':'#metrics'
}
const bullets = Object.keys(bulletMap)
const activeBullet = ref<string>('')
const clickBullet = (b:string)=> {
  const sel = bulletMap[b]
  if(sel) {
    scrollTo(sel)
    activeBullet.value = b
  }
}

// 滚动时根据当前视口更新激活 bullet
const updateActiveBullet = () => {
  const sections = Object.entries(bulletMap).map(([k, sel])=>({ k, el: document.querySelector(sel) as HTMLElement | null }))
  const scrollY = window.scrollY + 120 // 提前一些
  let current = ''
  for(const s of sections){
    if(!s.el) continue
    const top = s.el.offsetTop
    if(scrollY >= top) current = s.k
  }
  if(current && current !== activeBullet.value) activeBullet.value = current
}
onMounted(()=> {
  if (isLoggedIn.value && !user.value) {
    authStore.fetchMe()
  }
  updateActiveBullet()
  window.addEventListener('scroll', updateActiveBullet, { passive:true })
  // feature detect for background-clip:text (some legacy browsers)
  try {
    const test = document.createElement('span')
    test.style.backgroundClip = 'text'
    if(!(test.style.backgroundClip === 'text')) {
      document.documentElement.classList.add('no-bgclip')
    }
  } catch(e) { document.documentElement.classList.add('no-bgclip') }
})

const features = reactive([
  { icon: '🔐', title: '数据安全', desc: '权限分级、日志审计、数据隔离策略' },
  { icon: '🧩', title: '灵活题型', desc: '支持矩阵/量表/排序/比重/上传等' },
  { icon: '🛠️', title: '可配置化', desc: '动态组件渲染与扩展插件机制' },
  { icon: '📈', title: '分析报表', desc: '多维统计、图表大屏、导出PDF/Excel' },
  { icon: '🚀', title: '高性能', desc: '前端按需加载，服务分层与缓存' },
  { icon: '⚙️', title: '私有化部署', desc: 'Docker / K8s 快速交付' }
])

const flow = reactive([
  { title: '创建问卷', desc: '选择模板或自定义题目结构' },
  { title: '配置发布', desc: '设置权限、渠道与回收策略' },
  { title: '数据收集', desc: '多端填写，实时防重复与校验' },
  { title: '分析决策', desc: '报表出具，导出共享推动改进' }
])

const scenarios = reactive([
  { title: '员工满意度', desc: '组织健康度诊断与提升' },
  { title: '客户调研', desc: '洞察用户画像与体验' },
  { title: '产品反馈', desc: '收集迭代线索与需求优先级' },
  { title: '流程优化', desc: '内部流程满意度与瓶颈分析' }
])

const deploymentPoints = [
  'Docker / K8s 一键部署',
  '多环境(DEV/STAGE/PROD) 配置与灰度',
  '内置 SSO / LDAP 可扩展接入',
  '多租户隔离与企业命名空间',
  '操作审计与安全告警',
  '灵活题型与插件扩展框架',
  '可观测性：日志/指标/追踪',
  '数据脱敏与导出权限管控'
]

const tech = ['多租户', '高并发', '数据加密', '审计追踪', '插件扩展', '可观测性', '缓存策略', '灰度发布']

const securityPoints = [
  { icon:'🔐', title:'加密体系', desc:'传输 HTTPS/TLS1.2+，存储敏感字段可选字段级加密。', extra:['可插拔 KMS','加盐哈希','密钥轮换策略'] },
  { icon:'🧾', title:'审计追踪', desc:'操作/导出/权限变更留痕，支持过滤检索与合规留存。', extra:['导出签名','时间线追踪'] },
  { icon:'🧱', title:'租户隔离', desc:'按 enterpriseId 严格逻辑隔离，预留物理隔离选项。', extra:['资源限额','名称空间策略'] },
  { icon:'🛡️', title:'访问控制', desc:'最小权限 RBAC + 细粒度数据访问控制。', extra:['审批联动','敏感字段脱敏'] },
  { icon:'📦', title:'备份恢复', desc:'多层快照 + 增量备份，支持演练与 RPO/RTO 目标。', extra:['异地副本','自动校验'] },
  { icon:'📜', title:'合规支持', desc:'支持等保/ISO 基线与内部安全审计抽查。', extra:['漏洞响应流程','安全白皮书(占位)'] }
]

const governanceFlow = [
  { title:'草稿编制', desc:'创建与配置题型、逻辑跳转、填答规则。' },
  { title:'内部评审', desc:'业务/产品确认内容准确性与覆盖面。' },
  { title:'安全检查', desc:'敏感字段、收集范围、权限配置校验。' },
  { title:'审批上线', desc:'多角色签署后发布链接与渠道。' },
  { title:'监控与回滚', desc:'监控异常/防刷，必要时快速下线回滚。' }
]

const architectureLayers = [
  { title:'访问层', desc:'统一入口：网关/认证/限流/审计接入层。' },
  { title:'业务服务层', desc:'问卷/题型/响应/分析拆分微服务或模块。' },
  { title:'扩展层', desc:'插件体系：题型扩展、导出器、校验钩子。' },
  { title:'数据层', desc:'MongoDB + 缓存(Redis) + 对象存储 + 队列。' },
  { title:'可观测性', desc:'日志/指标/Trace/告警统一聚合。' }
]

interface Metric { label:string; value:number; suffix?:string; display:string; }
const metrics = reactive<Metric[]>([
  { label:'最大并发填答/分钟', value:12000, display:'0+' },
  { label:'题型扩展组件', value:25, display:'0+' },
  { label:'平均页面加载(ms)', value:680, display:'0' },
  { label:'系统可用性(%)', value:99.9, display:'0%' }
])

const animateMetric = (m:Metric, duration=1600) => {
  const start = performance.now();
  const from = 0; const to = m.value;
  const suffix = m.suffix || (String(m.value).includes('%') ? '%' : (m.label.includes('%')? '%' : m.label.includes('ms')? '': '+'))
  const step = (now:number) => {
    const p = Math.min(1,(now-start)/duration);
    const cur = from + (to-from)*p;
    m.display = (m.label.includes('%')? cur.toFixed(1): m.label.includes('ms')? Math.round(cur).toString(): Math.round(cur).toString()+suffix)
    if(p<1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
}

onMounted(()=> {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e=> {
      if(e.isIntersecting) {
        e.target.classList.add('in-view')
        obs.unobserve(e.target)
      }
    })
  }, { threshold: 0.15 })
  document.querySelectorAll('.anim-fade, .step, .scenario, .tech-pill, .case-logo, .metric-card').forEach(el=> obs.observe(el))

  const obsMetrics = new IntersectionObserver(entries => {
    entries.forEach(e=> {
      if(e.isIntersecting){
        const idx = (e.target as HTMLElement).dataset['midx']
        if(idx) animateMetric(metrics[Number(idx)])
        obsMetrics.unobserve(e.target)
      }
    })
  },{ threshold:0.4 })
  document.querySelectorAll('.metric-card').forEach((el,i)=> { el.setAttribute('data-midx', String(i)); obsMetrics.observe(el) })

  // 安全面板进入视口动画
  const sp = document.querySelector('.secure-panel.anim-safe')
  if(sp){
    const spObs = new IntersectionObserver(es=> {
      es.forEach(en=> { if(en.isIntersecting){ sp.classList.add('in-view'); spObs.disconnect(); } })
    }, { threshold:0.25 })
    spObs.observe(sp)
  }
})

import { ref as vueRef } from 'vue'
const openFaq = vueRef<number | null>(null)
const toggleFaq = (i:number) => { openFaq.value = openFaq.value===i ? null : i }
const faqs = [
  { q:'数据是否属于我们企业？', a:'是。平台仅作为处理与呈现载体，数据所有权与处置权完全归属企业，可随时 <strong>导出/脱敏/销毁</strong>。' },
  { q:'是否支持私有化与离线环境部署？', a:'支持。在内网可通过 Docker / K8s 交付，支持封闭网络下镜像与离线依赖清单。' },
  { q:'安全与审计如何保障？', a:'操作审计、权限变更、导出行为全留痕；支持分级脱敏与最小权限模型。' },
  { q:'能否与现有统一身份系统集成？', a:'可扩展 LDAP / OIDC / SAML，提供回调与角色映射。' },
  { q:'如何防止重复或批量刷答？', a:'指纹/行为节奏/答题耗时阈值 + 题目随机化 + IP / UA 组合策略。' },
  { q:'问卷更新后历史统计会变吗？', a:'系统保留版本快照并按发布版本聚合，历史口径不被新题目影响。' }
]

const brandLogos = [
  { name:'人民数据', short:'人民' },
  { name:'同济大学', short:'同济' },
  { name:'科大讯飞', short:'讯飞' },
  { name:'中信证券', short:'中信' },
  { name:'粤都信息', short:'粤都' },
  { name:'深圳大学', short:'深大' },
  { name:'深圳技术大学', short:'技大' },
  { name:'北方工业大学', short:'北工' },
  { name:'中国地质大学', short:'地大' },
  { name:'交科院(北京)', short:'交科' },
  { name:'中讯邮电设计院', short:'中讯' },
  { name:'华曙数字', short:'华曙' },
  { name:'上海美迪西', short:'美迪' },
  { name:'北京车车', short:'车车' },
  { name:'中国联通', short:'联通' },
  { name:'中国移动', short:'移动' },
  { name:'北京航天总医院', short:'航医' },
  { name:'国家统计局', short:'国统' },
  { name:'数字广东', short:'数广' }
]

const ctaHighlights = [ '全量题型', '细粒度权限', '审批&审计', '字段级加密', '多租户隔离', '极速统计' ]
const ctaStats = [ { label:'并发/分钟', value:'12k+' }, { label:'题型扩展', value:'25+' }, { label:'可用性', value:'99.9%' } ]

// 底部多列导航数据
interface FooterItem { label:string; href:string; badge?:{ text:string; type:'hot'|'soon' } }
interface FooterColumn { title:string; items:FooterItem[] }
const footerColumns:FooterColumn[] = [
  { title:'产品列表', items:[
    { label:'社区开源版', href:'#' },
    { label:'企业版', href:'#' },
    { label:'政务版', href:'#' },
    { label:'科研版', href:'#' }
  ]},
  { title:'解决方案', items:[
    { label:'专业调研', href:'#' },
    { label:'在线考试', href:'#' },
    { label:'360度评估', href:'#' },
    { label:'投票评选', href:'#' },
    { label:'在线测评', href:'#' }
  ]},
  { title:'定价', items:[
    { label:'版本对比', href:'#' },
    { label:'私人定制', href:'#' }
  ]},
  { title:'品牌案例', items:[
    { label:'同济大学', href:'#' },
    { label:'温州医科大学附属第一医院', href:'#' }
  ]},
  { title:'友情链接', items:[
    { label:'榜单', href:'#' },
    { label:'交换友链', href:'#' }
  ]},
  { title:'生态合作', items:[
    { label:'宝塔面板', href:'#', badge:{ text:'🔥', type:'hot' } },
    { label:'企业微信', href:'#' }
  ]},
  { title:'支持', items:[
    { label:'帮助中心', href:'#' },
    { label:'开发文档', href:'#' },
    { label:'意见反馈', href:'#' },
    { label:'更新日志', href:'#' }
  ]}
]
</script>

<style scoped>
:root { --c-bg:#0f141c; --c-grad:linear-gradient(120deg,#4f8bff,#6f62ff 40%,#2dd9c5); --c-text:#1f2d3d; --c-alt:#f6f9fc; }
.home-wrapper { font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', Arial, sans-serif; color: var(--c-text); background: linear-gradient(180deg,var(--color-bg-base) 0%,#f4f8ff 60%,#eef4ff 100%); }
.container { max-width:1180px; margin:0 auto; padding:0 28px; }
/* 仅在头部导航缩小左侧留白，使 Logo 更靠左 */
header.nav .container { width:100%; max-width:none; padding-left: 42px; padding-right: 28px; }
.nav { position:sticky; top:0; z-index:100; }
.gloss { backdrop-filter: blur(10px); background:rgba(255,255,255,0.8); border-bottom:1px solid rgba(255,255,255,0.4); }
.nav-inner { display:flex; align-items:center; justify-content:space-between; height:64px; }
.brand { font-size:24px; font-weight:700; background:var(--c-grad); -webkit-background-clip:text; color:transparent; cursor:pointer; }
.brand-logo { height: var(--brand-logo-size, 90px); display:block; object-fit:contain; } 
.links { display:flex; gap:28px; align-items:center; }
.links a { text-decoration:none; color: var(--color-text-main); font-size:15px; position:relative; }
.links a::after { content:""; position:absolute; left:0; bottom:-6px; width:0; height:2px; background:#4f8bff; transition:.25s; }
.links a:hover::after { width:100%; }

.hero { position:relative; padding:80px 0 60px; overflow:hidden; }
.hero::before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 20% 20%,#d2e6ff,transparent 60%), radial-gradient(circle at 80% 40%,#e4d9ff,transparent 55%); opacity:.8; pointer-events:none; }
.hero-vert-inner, .hero-grid { position:relative; z-index:1; }
.hero-grid { position:relative; display:flex; gap:60px; align-items:center; }
.hero-text { flex:1; }
.hero-vertical { padding:120px 0 80px; }
.hero-vert-inner { display:flex; flex-direction:column; align-items:center; gap:70px; }
.center-block { max-width:880px; text-align:center; }
.hero-title { font-size:50px; }
.subtitle.large { font-size:20px; }
.hero-secure-wrap { width:100%; display:flex; justify-content:center; }
.hero-secure-wrap .secure-panel { width:1080px; max-width:100%; }
.secure-cards { display:flex; gap:34px; align-items:stretch; width:100%; }
.secure-card { flex:1; display:flex; flex-direction:column; gap:14px; border-radius:26px; padding:30px 28px 26px; position:relative; overflow:hidden; min-height:200px; }
.secure-card.grad-blue { background:linear-gradient(110deg,#5d6bff,#4866ff 48%, #cddaf6); }
.secure-card.grad-mint { background:linear-gradient(110deg,#27d5c7,#1cb0e6 55%, #cfe8f5); }
.secure-card.pale { background:linear-gradient(110deg,#f3f6fa,#ffffff); border:1px solid #dfe6ef; }
.secure-card .s-title { font-size:20px; font-weight:600; color:#fff; letter-spacing:.3px; }
.secure-card.pale .s-title { color:#2d3a50; }
.secure-card .s-desc { font-size:13px; color:#eef3ff; letter-spacing:.3px; line-height:1.55; }
.secure-card.pale .s-desc { color:#5b6775; }
.secure-card .row-meta { margin-top:auto; }
@media (max-width:1200px){ .hero-secure-wrap .secure-panel { width:100%; } }
@media (max-width:980px){
  .secure-cards { flex-direction:column; gap:24px; }
  .secure-card { min-height:auto; }
}
.hero-cta.center { justify-content:center; }
.hero-bullets.center { justify-content:center; }
.hero-text h1 { font-size:46px; line-height:1.15; margin:0 0 18px; }
.grad { background:var(--c-grad, linear-gradient(90deg,#2d5bff,#639bff)); -webkit-background-clip:text; color:transparent; }
.no-bgclip .grad { color:#2d5bff; background:none; }
.subtitle { font-size:18px; line-height:1.6; margin:0 0 24px; }
.hl { position:relative; font-weight:600; color:#246bff; background:linear-gradient(90deg,#4f8bff,#7faeff); -webkit-background-clip:text; color:transparent; }
.hl:after { content:''; position:absolute; left:0; right:0; bottom:-2px; height:6px; background:linear-gradient(90deg,rgba(79,139,255,.25),rgba(127,174,255,.05)); border-radius:3px; pointer-events:none; }
.hero-cta { display:flex; gap:16px; margin-bottom:18px; }
.hero-bullets { list-style:none; padding:0; margin:0; display:flex; gap:18px; flex-wrap:wrap; }
.hero-bullets li { background: var(--color-bg-base); border:1px solid var(--color-border); padding:6px 14px; border-radius:20px; font-size:13px; box-shadow:0 2px 6px rgba(0,0,0,0.04); }
.hero-bullets li.clickable { cursor:pointer; transition:.25s; }
.hero-bullets li.clickable:hover { background:#4f8bff; color:#fff; border-color:#4f8bff; box-shadow:0 4px 14px -4px rgba(79,139,255,.45); }
.hero-bullets li.active { background:#246bff; color:#fff; border-color:#246bff; box-shadow:0 4px 18px -4px rgba(36,107,255,.55); }
.dark .hero-bullets li { background:#1e2733; border-color:#2d3744; }
.dark .hero-bullets li.active { background:#367dff; border-color:#367dff; }
.hero-art { width:440px; max-width:480px; }
/* Refined security panel */
.secure-panel { background:#fff; border:1px solid #e6ecf5; border-radius:26px; padding:22px 24px 26px; box-shadow:0 20px 52px -18px rgba(54,83,148,.35); position:relative; animation:float 7s ease-in-out infinite; display:flex; flex-direction:column; gap:20px; }
.secure-panel::before { content:""; position:absolute; inset:-14px -18px -18px; background:radial-gradient(circle at 78% 12%,rgba(79,139,255,.20),transparent 62%), radial-gradient(circle at 8% 92%,rgba(45,217,197,.18),transparent 65%); z-index:-1; filter:blur(6px); }
.secure-head { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; letter-spacing:.5px; color:#2d3a50; margin-bottom:-4px; }
.icon-shield { width:16px; height:16px; color:#4f8bff; }
.more-safe { margin-left:auto; background:transparent; border:none; font-size:12px; color:#4f8bff; cursor:pointer; padding:4px 8px; border-radius:6px; }
.more-safe:hover { background:rgba(79,139,255,.08); }
.secure-row { border-radius:18px; padding:18px 18px 16px 18px; position:relative; overflow:hidden; display:flex; flex-direction:column; gap:10px; }
.secure-row.has-accent::before { content:""; position:absolute; left:0; top:0; bottom:0; width:4px; border-radius:4px; background:linear-gradient(180deg,#4f8bff,#6f62ff); opacity:.95; }
.secure-row.grad-blue { background:linear-gradient(110deg,#5d6bff,#4866ff 45%, #cddaf6); }
.secure-row.grad-mint { background:linear-gradient(110deg,#27d5c7,#1cb0e6 50%, #cfe8f5); }
.secure-row.grad-mint.has-accent::before { background:linear-gradient(180deg,#27d5c7,#1cb0e6); }
.secure-row.pale { background:linear-gradient(110deg,#f3f6fa,#ffffff); border:1px solid #dfe6ef; }
.secure-row.pale.has-accent::before { background:linear-gradient(180deg,#cfd7e2,#b9c4d3); opacity:.8; }
.row-top { display:flex; align-items:center; gap:12px; }
.s-title { font-size:16px; font-weight:600; color:#fff; letter-spacing:.5px; }
.secure-row.pale .s-title { color:#2d3a50; }
.badge-line { background:rgba(255,255,255,.28); color:#fff; font-size:11px; padding:4px 10px; border-radius:14px; line-height:1; letter-spacing:.3px; }
.badge-line.neutral { background:#eef2f6; color:#2d3a50; }
.s-desc { font-size:12px; letter-spacing:.2px; color:#eef3ff; opacity:.95; }
.secure-row.pale .s-desc { color:#5b6775; }
.row-meta { display:flex; gap:8px; flex-wrap:wrap; }
.meta-tag, .meta-badge { font-size:11px; padding:5px 10px; line-height:1; border-radius:14px; backdrop-filter:blur(4px); }
.meta-tag { background:rgba(255,255,255,.25); color:#fff; border:1px solid rgba(255,255,255,.35); }
.secure-row.pale .meta-tag { background:#f0f4f9; color:#2d3a50; border-color:#e0e7ef; }
.meta-badge { background:rgba(255,255,255,.38); color:#fff; border:1px solid rgba(255,255,255,.45); font-weight:600; }
.meta-badge.soon { background:rgba(255,255,255,.2); }
.mini-stats { display:flex; align-items:center; gap:6px; font-size:11px; color:#fff; }
.mini-stats em { font-style:normal; opacity:.85; }
.bar { width:50px; height:6px; background:rgba(255,255,255,.25); border-radius:4px; position:relative; overflow:hidden; }
.bar i { position:absolute; inset:0; background:linear-gradient(90deg,#fff,#e5f5ff); width:calc(var(--p)*100%); border-radius:4px; box-shadow:0 0 0 1px rgba(255,255,255,.35); }
.dots { display:flex; align-items:center; gap:6px; }
.dots .dot { width:10px; height:10px; border-radius:50%; background:#d0d8e2; }
.dots .dot.on { background:linear-gradient(135deg,#4f8bff,#6f62ff); box-shadow:0 0 0 3px rgba(79,139,255,.18); }
.dots .tags { display:flex; gap:6px; margin-left:8px; }
.anim-safe { opacity:0; transform:translateY(20px) scale(.96); transition:.7s cubic-bezier(.16,.8,.34,1); }
.anim-safe.in-view { opacity:1; transform:translateY(0) scale(1); }
@media (max-width:900px){ .secure-panel { margin-top:40px; } }
@media (max-width:520px){ .secure-panel { padding:24px 22px 22px; } .secure-row { padding:16px 16px 14px; } }
@keyframes shimmer { to { transform:translateX(100%);} }
@keyframes float { 0%,100% { transform:translateY(0);} 50% { transform:translateY(-10px);} }

.section { padding:70px 0; position:relative; }
.section.alt { background:var(--c-alt); }
.section-title { text-align:center; font-size:30px; margin:0 0 14px; }
.section-desc { text-align:center; margin:0 0 34px; color:#5b6775; }
.cards-grid { margin-top:20px; }
.feature-card { height:100%; display:flex; flex-direction:column; align-items:flex-start; gap:8px; }
.feature-card .icon { font-size:30px; }
.feature-card p { font-size:14px; line-height:1.6; color: var(--color-text-muted); }
.feature-card { transition:.35s; cursor:default; }
.feature-card:hover { transform:translateY(-6px); box-shadow:0 12px 28px -8px rgba(79,139,255,.25); }

.flow-steps .step { background:#fff; padding:22px 20px; border-radius:14px; box-shadow:0 4px 14px rgba(0,0,0,0.04); position:relative; height:100%; transition:.3s; }
.step-index { position:absolute; top:-14px; left:16px; background:linear-gradient(135deg,#4f8bff,#6f62ff); color:#fff; padding:6px 14px; font-size:14px; border-radius:20px; }
.step h4 { margin:12px 0 8px; font-size:16px; }
.step p { margin:0; font-size:13px; color:#5b6775; line-height:1.5; }
.step:hover { transform:translateY(-4px); box-shadow:0 10px 24px -6px rgba(0,0,0,0.12); }

.scenario-wrap { display:grid; gap:22px; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); margin-top:20px; }
.scenario { background:#fff; border:1px solid var(--color-border); border-radius:14px; padding:22px 20px; transition:.3s; }
.scenario:hover { border-color:#4f8bff; box-shadow:0 6px 18px -4px rgba(79,139,255,.25); }
.scenario h4 { margin:0 0 8px; font-size:16px; }
.scenario .muted { font-size:13px; color:#5b6775; margin:0; }

.deployment-card { background:#fff; border:1px solid var(--color-border); border-radius:24px; padding:46px 50px; position:relative; overflow:hidden; box-shadow:0 18px 48px -14px rgba(54,83,148,.25); }
.deployment-card::before { content:""; position:absolute; inset:0; background:radial-gradient(circle at 85% 15%,rgba(79,139,255,.18),transparent 60%), radial-gradient(circle at 10% 80%,rgba(45,217,197,.18),transparent 55%); pointer-events:none; }
.deploy-content { position:relative; z-index:1; max-width:760px; }
.deploy-points { margin:22px 0 28px; padding:0; list-style:none; display:grid; gap:10px 24px; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); font-size:14px; color:var(--color-text-muted); }
.deploy-points li { position:relative; padding-left:18px; }
.deploy-points li::before { content:""; position:absolute; left:0; top:8px; width:8px; height:8px; border-radius:50%; background:linear-gradient(135deg,var(--color-brand-primary),var(--color-brand-mint)); }
.deploy-cta { display:flex; gap:16px; }
@media (max-width:800px){
  .deployment-card { padding:34px 32px; }
}
@media (max-width:520px){
  .deployment-card { padding:28px 24px; }
  .deploy-cta { flex-direction:column; align-items:flex-start; }
}

.security-grid { display:grid; gap:26px; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); margin-top:30px; }
.security-item { background:#fff; border:1px solid var(--color-border); border-radius:18px; padding:22px 20px 24px; position:relative; overflow:hidden; transition:var(--transition-base); }
.security-item:hover { box-shadow:0 14px 42px -12px rgba(79,139,255,.35); transform:translateY(-6px); }
.dark .security-item { background:#18212b; }
.sec-icon { font-size:30px; margin-bottom:6px; }
.security-item h4 { margin:4px 0 6px; font-size:16px; }
.security-item p { margin:0 0 8px; font-size:13px; }
.mini-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--color-text-muted); }
.assurance-banner { margin-top:40px; background:linear-gradient(110deg,#4f8bff,#6f62ff); color:#fff; padding:18px 28px; border-radius:16px; font-size:14px; box-shadow:0 10px 30px -12px rgba(79,139,255,.5); }

.gov-flow { display:grid; gap:26px; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); margin-top:34px; }
.gov-step { background:#fff; border:1px solid var(--color-border); border-radius:18px; padding:22px 18px 26px; position:relative; transition:var(--transition-base); }
.dark .gov-step { background:#18212b; }
.gov-step:hover { transform:translateY(-6px); box-shadow:0 14px 36px -12px rgba(79,139,255,.3); }
.gov-index { position:absolute; top:-14px; left:16px; background:linear-gradient(135deg,#4f8bff,#6f62ff); color:#fff; padding:6px 14px; font-size:13px; border-radius:20px; font-weight:600; }
.gov-step h4 { margin:10px 0 6px; font-size:15px; }
.gov-step p { margin:0; font-size:13px; color:var(--color-text-muted); line-height:1.5; }
.gov-notes { margin-top:40px; background:#fff; border:1px dashed var(--color-border); padding:20px 24px; border-radius:14px; font-size:13px; line-height:1.6; color:var(--color-text-muted); }
.dark .gov-notes { background:#18212b; border-color:#2a3643; }

.tech-grid { display:flex; flex-wrap:wrap; gap:14px; margin-top:24px; }
.tech-pill { background:#fff; border:1px solid var(--color-border); padding:10px 18px; font-size:13px; border-radius:28px; box-shadow:0 4px 10px rgba(0,0,0,0.05); transition:.3s; }
.tech-pill:hover { background:#4f8bff; color:#fff; border-color:#4f8bff; }

.arch-wrap { display:flex; flex-direction:column; gap:34px; }
.arch-diagram { background:#fff; border:1px solid var(--color-border); border-radius:22px; padding:18px; box-shadow:0 10px 32px -14px rgba(79,139,255,.25); }
.dark .arch-diagram { background:#18212b; }
.arch-svg { width:100%; height:auto; }
.arch-layers { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:10px; font-size:14px; color:var(--color-text-muted); }
.arch-layers strong { color:var(--color-text-main); }

.cta-modern { position:relative; background:linear-gradient(135deg,#4f8bff 0%,#6f62ff 55%, #2dd9c5); color:#fff; padding:90px 0 40px; overflow:hidden; }
.cta-inner { position:relative; display:flex; gap:60px; align-items:flex-start; }
.cta-left { flex:1; position:relative; z-index:2; }
.cta-left h2 { margin:0 0 14px; font-size:40px; line-height:1.15; }
.cta-sub { margin:0 0 22px; font-size:16px; opacity:.9; }
.cta-highlights { list-style:none; padding:0; margin:0 0 26px; display:flex; flex-wrap:wrap; gap:10px 14px; }
.cta-highlights li { background:rgba(255,255,255,.12); padding:6px 14px; border-radius:22px; font-size:13px; backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,.25); }
.cta-aside { display:flex; flex-direction:column; gap:18px; position:relative; z-index:2; }
.mini-stat { background:rgba(255,255,255,.14); padding:18px 22px; border-radius:18px; min-width:140px; text-align:left; border:1px solid rgba(255,255,255,.28); backdrop-filter:blur(6px); }
.mini-stat .num { font-size:30px; font-weight:600; line-height:1; }
.mini-stat .lab { font-size:12px; margin-top:6px; opacity:.85; }
.cta-actions { display:flex; gap:16px; }
.cta-bg-shape { position:absolute; inset:0; background:radial-gradient(circle at 85% 20%,rgba(255,255,255,.35),transparent 60%), radial-gradient(circle at 15% 80%,rgba(255,255,255,.25),transparent 55%); opacity:.6; }
.wave-sep { height:50px; margin-top:40px; background:linear-gradient(to bottom,rgba(255,255,255,0.15),transparent); }

/* Footer Extended */
.footer-extended { background:#f7f9fb; padding:70px 0 40px; }
.dark .footer-extended { background:#121a23; }
.footer-cols { display:grid; gap:34px 60px; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); }
.f-col { min-width:140px; }
.f-title { margin:0 0 16px; font-size:15px; font-weight:600; color:var(--color-text-main); }
.f-links { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
.f-links li a { font-size:13px; color:var(--color-text-muted); text-decoration:none; position:relative; padding-right:24px; display:inline-flex; align-items:center; gap:4px; }
.f-links li a:hover { color:#4f8bff; }
.badge { font-size:11px; line-height:1; padding:3px 6px; border-radius:10px; background:#ffe4e4; color:#d94646; position:absolute; right:0; top:2px; }
.badge.hot { background:#ffefe2; color:#ff7a00; }
.badge.soon { background:#e7eef9; color:#4f6fad; }
.footer-sep { height:1px; background:rgba(0,0,0,0.06); margin:50px 0 28px; }
.dark .footer-sep { background:rgba(255,255,255,0.08); }
.footer-bottom { display:flex; justify-content:space-between; gap:40px; align-items:flex-start; flex-wrap:wrap; }
.legal-line { font-size:12px; color:var(--color-text-muted); display:flex; flex-wrap:wrap; gap:6px 10px; align-items:center; }
.legal-item a { color:inherit; text-decoration:none; }
.legal-item a:hover { color:#4f8bff; }
.dot { opacity:.5; }
.slogan { font-size:12px; color:var(--color-text-muted); margin-top:10px; }
.fb-right { display:flex; gap:12px; }
.icon-btn { width:34px; height:34px; border-radius:50%; border:1px solid var(--color-border); display:flex; align-items:center; justify-content:center; font-size:12px; color:var(--color-text-muted); text-decoration:none; background:#fff; box-shadow:0 2px 6px rgba(0,0,0,.05); }
.dark .icon-btn { background:#1d2833; }
.icon-btn:hover { color:#4f8bff; border-color:#4f8bff; }
@media (max-width:720px){
  .footer-cols { gap:30px 40px; }
  .footer-bottom { flex-direction:column; align-items:flex-start; }
  .fb-right { order:-1; }
}

@media (max-width:900px) {
  .cta-inner { flex-direction:column; gap:40px; }
  .cta-left h2 { font-size:34px; }
  .cta-modern { padding:70px 0 30px; }
  .cta-aside { flex-direction:row; flex-wrap:wrap; }
  .mini-stat { flex:1 1 120px; }
}
@media (max-width:520px) {
  .cta-left h2 { font-size:30px; }
  .cta-actions { flex-direction:column; }
}
.metrics-modern { position:relative; }
.metrics-flex { display:flex; gap:64px; align-items:stretch; flex-wrap:wrap; }
.metrics-text { flex:1 1 320px; max-width:420px; }
.align-left { text-align:left; }
.small-desc { margin-top:-8px; }
.metric-bullets { list-style:none; padding:0; margin:30px 0 0; display:flex; flex-direction:column; gap:10px; font-size:14px; color:var(--color-text-muted); }
.metric-bullets li { position:relative; padding-left:16px; }
.metric-bullets li::before { content:""; position:absolute; left:0; top:8px; width:8px; height:8px; border-radius:50%; background:linear-gradient(135deg,#4f8bff,#6f62ff); }
.metrics-cards { flex:1 1 440px; display:grid; gap:26px; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); position:relative; }
.metric-card { position:relative; background:rgba(255,255,255,.55); backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,.6); border-radius:22px; padding:34px 22px 30px; text-align:left; box-shadow:0 8px 28px -10px rgba(54,83,148,.25); overflow:hidden; }
.dark .metric-card { background:rgba(24,33,43,.55); border-color:rgba(255,255,255,.08); }
.metric-card::after { content:""; position:absolute; inset:0; background:radial-gradient(circle at 85% 20%,rgba(79,139,255,.35),transparent 55%); opacity:.55; }
.metric-card .metric-value { font-size:38px; font-weight:600; line-height:1; background:var(--gradient-brand); -webkit-background-clip:text; color:transparent; position:relative; z-index:1; }
.metric-card .metric-label { margin-top:10px; font-size:12px; letter-spacing:.5px; text-transform:uppercase; color:var(--color-text-muted); position:relative; z-index:1; }
.modern-banner { margin:50px auto 0; max-width:1000px; border-radius:18px; background:linear-gradient(120deg,#4f8bff,#6f62ff 55%,#2dd9c5); color:#fff; padding:18px 26px; font-size:14px; box-shadow:0 10px 32px -14px rgba(79,139,255,.45); }
@media (max-width:900px){ .metrics-flex { flex-direction:column; } .metrics-cards { grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); } }
.case-logos { margin-top:34px; display:grid; gap:28px 40px; grid-template-columns:repeat(auto-fit,minmax(110px,1fr)); align-items:center; }
.logo-box { width:110px; height:50px; background:#fff; border:1px solid var(--color-border); border-radius:14px; display:flex; align-items:center; justify-content:center; font-weight:600; color:#2c3950; font-size:16px; letter-spacing:1px; box-shadow:0 4px 14px -6px rgba(54,83,148,.18); transition:var(--transition-base); position:relative; overflow:hidden; }
.logo-box::after { content:""; position:absolute; inset:0; background:linear-gradient(120deg,rgba(79,139,255,.0),rgba(79,139,255,.15)); opacity:0; transition:var(--transition-base); }
.case-logo:hover .logo-box { transform:translateY(-4px); box-shadow:0 10px 28px -10px rgba(79,139,255,.35); }
.case-logo:hover .logo-box::after { opacity:1; }
.logo-name { font-size:11px; color:var(--color-text-muted); margin-top:4px; }
</style>
