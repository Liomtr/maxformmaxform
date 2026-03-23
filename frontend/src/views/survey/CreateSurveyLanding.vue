<!--
  创建引导页
  参考问卷星等专业问卷平台设计
-->
<template>
  <div class="create-landing">
    <!-- 顶部导航条（与工作台一致） -->
    <header class="topbar">
      <div class="tb-left">
  <div class="logo" @click="goTopNav('workspace')">TrustForm信任表单</div>
        <nav class="main-nav" aria-label="主导航">
          <a href="#" :class="{on: topNav==='workspace'}" @click.prevent="goTopNav('workspace')">工作台</a>
          <a href="#" :class="{on: topNav==='contacts'}" @click.prevent="goTopNav('contacts')">联系人</a>
          <a href="#" :class="{on: topNav==='templates'}" @click.prevent="goTopNav('templates')">模板中心</a>
          <a href="#" :class="{on: topNav==='admin'}" @click.prevent="goTopNav('admin')">管理后台</a>
        </nav>
      </div>
      <div class="tb-right">
        <el-dropdown @command="handleUserCommand">
          <span class="user-entry" role="button" aria-haspopup="menu">
            <span class="avatar" aria-hidden="true">{{ (displayUser || 'U').toString().slice(0,1) }}</span>
            <span class="uname">{{ displayUser }}</span>
            <el-icon class="caret"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="account">我的账号</el-dropdown-item>
              <el-dropdown-item command="password">修改密码</el-dropdown-item>
              <el-dropdown-item divided command="logout">退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>
    <div class="content-wrap">
      <aside class="left">
        <h3>选择应用场景</h3>
        <ul class="scene-list">
          <li v-for="s in scenes" :key="s.key" :class="{ active: s.key===scene }" @click="scene = s.key">
            <span class="dot" />
            <span class="name">{{ s.name }}</span>
            <span v-if="s.isNew" class="badge">新</span>
          </li>
        </ul>
      </aside>

      <main class="main">
        <section class="from-scratch">
          <div class="head">
            <h2>从空白创建{{ currentSceneName }}</h2>
            <small class="tips">支持丰富题型与强大逻辑，后续可导出数据</small>
          </div>
          <div class="create-box">
            <input v-model.trim="title" class="title-input" :placeholder="`请输入${currentSceneName}标题`" @keyup.enter="onCreate" />
            <button class="btn-primary" :disabled="!canCreate" @click="onCreate">创建{{ currentSceneName }}</button>
            <button class="btn-ghost" @click="onCreateAI">AI创建{{ currentSceneName }}</button>
          </div>
          <div class="shortcuts">
            <div class="card" @click="todo('文本导入调查')">
              <div class="icon">✍️</div>
              <div class="title">文本导入调查</div>
              <div class="desc">粘贴文本自动生成题目</div>
            </div>
            <div class="card" @click="todo('Excel导入答卷')">
              <div class="icon">📊</div>
              <div class="title">Excel导入答卷</div>
              <div class="desc">批量导入历史数据</div>
            </div>
            <div class="card" @click="todo('人工录入服务')">
              <div class="icon">👩‍💻</div>
              <div class="title">人工录入服务</div>
              <div class="desc">辅助整理录入，便捷省心</div>
            </div>
          </div>
        </section>

        <section class="templates">
          <div class="tpl-head">
            <h3>复制模板问卷</h3>
            <div class="tabs">
              <button v-for="c in tplCategories" :key="c.key" :class="['tab', { active: c.key===tplCat }]" @click="tplCat=c.key">{{ c.name }}</button>
            </div>
            <div class="search">
              <input v-model.trim="tplKeyword" placeholder="搜索模板…" />
            </div>
          </div>
          <div class="tpl-grid">
            <div v-for="tpl in filteredTemplates" :key="tpl.id" class="tpl-card">
              <div class="tpl-title" :title="tpl.title">{{ tpl.title }}</div>
              <div class="tpl-meta">共{{ tpl.count }}题 · {{ tpl.catName }}</div>
              <div class="tpl-actions">
                <button class="btn-link" @click="useTemplate(tpl)">引用</button>
              </div>
            </div>
            <div v-if="filteredTemplates.length===0" class="empty">暂无匹配模板</div>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createSurvey } from '@/api/surveys'

const router = useRouter()
const route = useRoute()

// 顶部导航激活与用户信息（保持与工作台一致）
const topNav = ref<'workspace'|'contacts'|'templates'|'admin'>('workspace')
const displayUser = computed(()=> localStorage.getItem('rememberUser') || '用户')
const goTopNav = (k: 'workspace'|'contacts'|'templates'|'admin') => {
  topNav.value = k
  if (k === 'workspace') router.push('/user-dashboard')
  else if (k === 'admin') router.push('/admin')
  else {
    // 其他导航为占位，可根据需要补充路由
  }
}
const handleUserCommand = (cmd: 'account'|'password'|'logout') => {
  if (cmd === 'logout') {
    localStorage.removeItem('token')
    router.push('/login')
  } else if (cmd === 'account') {
    // 可跳转到用户中心页；此处暂保持在当前页
  } else if (cmd === 'password') {
    // 可跳转到修改密码入口；此处暂保持在当前页
  }
}

const scenes: ReadonlyArray<{ key: 'survey'|'exam'|'vote'|'form'|'360'|'nps'|'satisfaction'; name: string; isNew?: boolean }> = [
  { key: 'survey', name: '调查' },
  { key: 'exam', name: '考试' },
  { key: 'vote', name: '投票' },
  { key: 'form', name: '表单流程' },
  { key: '360', name: '360度评估' },
  { key: 'nps', name: 'NPS问卷', isNew: true },
  { key: 'satisfaction', name: '满意度调查' },
]

const scene = ref<'survey'|'exam'|'vote'|'form'|'360'|'nps'|'satisfaction'>((route.query.scene as any) || 'survey')
const title = ref<string>((route.query.title as any) || '')
const canCreate = computed(() => !!title.value && title.value.trim().length > 0)
const currentSceneName = computed(() => scenes.find(s => s.key===scene.value)?.name || '问卷')

const onCreate = async () => {
  if (!canCreate.value) return
  try {
    const created = await createSurvey({ title: title.value, description: '', questions: [] })
    if (created?.id) {
      // 跳转到编辑页时把标题通过 query 同步过去，保证编辑器立即显示
      router.push({ name: 'EditSurvey', params: { id: created.id }, query: { title: title.value } })
    } else {
      ElMessage.error('创建失败')
    }
  } catch (e:any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '创建失败')
  }
}

const onCreateAI = () => {
  ElMessage.info('AI 创建功能将于后续版本提供')
}

const todo = (name: string) => {
  ElMessage.info(`${name} 功能将于后续版本提供`)
}

type TemplateCard = { id: string; title: string; count: number; cat: string; catName: string }
const tplCategories = [
  { key: 'all', name: '全部' },
  { key: 'college', name: '大学生' },
  { key: 'enterprise', name: '企业问卷' },
  { key: 'market', name: '市场调查' },
] as const
const tplCat = ref<'all'|'college'|'enterprise'|'market'>('all')
const tplKeyword = ref('')
const templates = ref<TemplateCard[]>([
  { id: 'tpl1', title: '大学生消费情况调查问卷', count: 21, cat: 'college', catName: '大学生' },
  { id: 'tpl2', title: '企业员工满意度调查问卷', count: 18, cat: 'enterprise', catName: '企业问卷' },
  { id: 'tpl3', title: '产品市场调研问卷', count: 16, cat: 'market', catName: '市场调查' },
  { id: 'tpl4', title: '大学生就业意向调查', count: 14, cat: 'college', catName: '大学生' },
])

const filteredTemplates = computed(() => {
  let list = templates.value
  if (tplCat.value !== 'all') list = list.filter(t => t.cat === tplCat.value)
  if (tplKeyword.value) list = list.filter(t => t.title.includes(tplKeyword.value))
  return list
})

const useTemplate = async (tpl: TemplateCard) => {
  // 现阶段：直接使用模板标题创建一份空白问卷，后续再扩展为带题库的模板
  try {
    const created = await createSurvey({ title: tpl.title, description: '', questions: [] })
    if (created?.id) {
      ElMessage.success('已基于模板创建，前往编辑')
      // 同样将模板标题带到编辑页，避免短暂的“未命名问卷”
      router.push({ name: 'EditSurvey', params: { id: created.id }, query: { title: tpl.title } })
    }
  } catch (e:any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '创建失败')
  }
}

// 返回工作台（已由顶部导航承担，保留函数以兼容可能的调用）
const goBackToDashboard = () => {
  router.push({ name: 'UserDashboard' })
}
</script>

<style scoped>
.create-landing { display:flex; flex-direction:column; min-height:100vh; background: linear-gradient(115deg,#eef3ff,#f8faff 60%,#f0f4ff); }
/* 顶部导航条样式（与工作台保持一致） */
.topbar { position:sticky; top:0; z-index:50; height:56px; background:#ffffff; border-bottom:1px solid #e5e8ef; display:flex; align-items:center; justify-content:space-between; padding:0 18px; }
.tb-left { display:flex; align-items:center; gap:20px; }
.logo { font-size:18px; font-weight:700; letter-spacing:.5px; color:#1f2d3d; cursor:pointer; }
.logo:hover { color:#2563eb; }
.main-nav { display:flex; align-items:center; gap:2px; }
.main-nav a { display:inline-flex; align-items:center; height:36px; padding:0 14px; color:#475569; text-decoration:none; font-size:14px; border-radius:8px; position:relative; }
.main-nav a:hover { background:#f1f5f9; color:#1f2d3d; }
.main-nav a.on { color:#1d4ed8; font-weight:600; }
.main-nav a.on:after { content:""; position:absolute; left:12px; right:12px; bottom:-9px; height:2px; background:#1d4ed8; border-radius:2px; }
.tb-right { display:flex; align-items:center; gap:12px; }
.user-entry { display:inline-flex; align-items:center; gap:8px; padding:4px 8px; border:1px solid #e2e8f0; border-radius:999px; background:#ffffff; color:#1f2d3d; box-shadow:0 1px 2px rgba(0,0,0,.03); }
.user-entry:hover { background:#f8fafc; }
.avatar { width:22px; height:22px; border-radius:50%; background:#cbd5e1; display:inline-flex; align-items:center; justify-content:center; font-size:12px; color:#334155; font-weight:700; }
.uname { font-size:12px; }
.caret { color:#94a3b8; }

/* 页面主体布局 */
.content-wrap { display:flex; gap:24px; padding:24px; flex:1; }
.left { width:240px; background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; }
.left h3 { margin:0 0 10px; font-size:16px; }
.scene-list { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px; }
.scene-list li { display:flex; align-items:center; gap:10px; padding:10px 12px; border-radius:8px; cursor:pointer; color:#334155; }
.scene-list li:hover { background:#f1f5f9; }
.scene-list li.active { background:#eef2ff; color:#1d4ed8; font-weight:600; }
.scene-list .dot { width:6px; height:6px; border-radius:50%; background:#cbd5e1; }
.scene-list .badge { margin-left:auto; font-size:12px; background:#22c55e; color:#fff; padding:2px 6px; border-radius:999px; }
.main { flex:1; display:flex; flex-direction:column; gap:24px; }
.from-scratch { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:20px; }
.from-scratch .head { display:flex; align-items:end; gap:12px; }
.from-scratch .head h2 { margin:0; font-size:20px; }
.from-scratch .tips { color:#64748b; }
.create-box { margin-top:12px; display:flex; gap:12px; flex-wrap:wrap; }
.title-input { flex:1; min-width:260px; border:1px solid #d1d5db; border-radius:10px; padding:10px 14px; font-size:16px; }
.btn-primary { background:linear-gradient(90deg,#409eff,#66b1ff); border:0; color:#fff; padding:10px 16px; border-radius:10px; cursor:pointer; }
.btn-primary:disabled { opacity:.6; cursor:not-allowed; }
.btn-ghost { background:#fff; border:1px solid #d1d5db; color:#334155; padding:10px 16px; border-radius:10px; cursor:pointer; }
.shortcuts { margin-top:14px; display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:12px; }
.shortcuts .card { border:1px solid #e5e7eb; border-radius:12px; padding:16px; cursor:pointer; background:#f9fafb; }
.shortcuts .icon { font-size:22px; }
.shortcuts .title { font-weight:600; margin-top:6px; }
.shortcuts .desc { color:#64748b; font-size:13px; }

.templates { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; }
.tpl-head { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.tabs { display:flex; gap:8px; }
.tab { border:1px solid #d1d5db; padding:6px 12px; border-radius:8px; background:#fff; cursor:pointer; }
.tab.active { background:#eef2ff; color:#1d4ed8; border-color:#c7d2fe; }
.search input { border:1px solid #d1d5db; border-radius:8px; padding:6px 10px; }
.tpl-grid { margin-top:12px; display:grid; grid-template-columns: repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
.tpl-card { border:1px solid #e5e7eb; border-radius:12px; padding:12px; background:#fff; }
.tpl-title { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tpl-meta { color:#64748b; font-size:13px; margin-top:6px; }
.tpl-actions { margin-top:10px; }
.btn-link { background:transparent; border:0; color:#1d4ed8; cursor:pointer; padding:0; }
.empty { color:#94a3b8; padding:12px; }
</style>
