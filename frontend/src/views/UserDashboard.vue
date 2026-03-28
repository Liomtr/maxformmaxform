<!--
  用户个人后台页面（UserDashboard.vue）
  仅管理当前用户自己的问卷、数据和个人信息。
-->
<template>
  <div class="user-dashboard-shell">
    <!-- 顶部导航条 -->
    <header class="topbar">
      <div class="tb-left">
        <div class="logo" @click="goTopNav('workspace')" title="返回工作台" aria-label="返回工作台">
          <!-- 首选：外部品牌图片；若加载失败则回退到内联图标 -->
          <img v-if="!brandImgError" :src="brandImgSrc" alt="Logo" class="logo-img" @error="brandImgError = true" />
          <svg v-else class="logo-img" viewBox="0 0 36 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <defs>
              <linearGradient id="uxBrand" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4f8bff"/>
                <stop offset="70%" stop-color="#6f62ff"/>
              </linearGradient>
            </defs>
            <rect x="1.5" y="3" width="33" height="18" rx="9" fill="url(#uxBrand)" opacity="0.95"/>
            <circle cx="9.5" cy="12" r="3.6" fill="#ffffff"/>
          </svg>
        </div>
        <nav class="main-nav" aria-label="主导航">
          <a href="#" :class="{on: topNav==='workspace'}" @click.prevent="goTopNav('workspace')">工作台</a>
          <a href="#" :class="{on: topNav==='contacts'}" @click.prevent="goTopNav('contacts')">联系人</a>
          <a href="#" :class="{on: topNav==='templates'}" @click.prevent="goTopNav('templates')">模板中心</a>
          <a v-if="isAdminUser" href="#" :class="{on: topNav==='admin'}" @click.prevent="goTopNav('admin')">管理后台</a>
        </nav>
      </div>
      <div class="tb-right">
        <!-- 消息通知：点击铃铛打开右侧抽屉 -->
        <el-badge :value="unreadCount" :hidden="!unreadCount" type="danger">
          <button class="notif-btn" title="消息通知" @click="openNotif">
            <el-icon><Bell /></el-icon>
          </button>
        </el-badge>
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
    <div class="survey-list-page">
    <aside class="sidebar">
      <button class="create-btn" @click="createSurvey">+ 创建问卷</button>
      <ul class="nav">
        <li :class="{active: activeMenu==='all'}" @click="setMenu('all')">全部问卷</li>
        <li :class="{active: activeMenu==='trash'}" @click="setMenu('trash')">回收站</li>
        <li :class="{active: activeMenu==='folder'}" @click="setMenu('folder')">文件夹</li>
        <li :class="{active: activeMenu==='team'}" @click="setMenu('team')">协作</li>
        <li :class="{active: activeMenu==='department'}" @click="setMenu('department')">团队/部门</li>
        <li :class="{active: activeMenu==='profile'}" @click="setMenu('profile')">个人中心</li>
      </ul>
    </aside>
  <main class="main-content">
      <div class="content-inner">
        <!-- 统计概览移除：保留实际列表主体，提高聚焦度 -->
        <header class="toolbar">
          <div class="toolbar-left" v-if="['all','folder'].includes(activeMenu)">
            <input v-model="search" placeholder="搜索问卷..." class="search-input" />
            <button class="search-btn" @click="searchSurvey">搜索</button>
          </div>
          <div class="toolbar-right">
            <button class="search-btn" v-if="['all','folder'].includes(activeMenu)" @click="refresh" title="刷新列表">刷新</button>
            <!-- 视图切换（排序控件已移除） -->
            <div class="view-switch" v-if="['all','folder'].includes(activeMenu)">
              <button :class="['view-btn', {active: viewMode==='list'}]" @click="viewMode='list'" title="列表视图">☰</button>
              <button :class="['view-btn', {active: viewMode==='grid'}]" @click="viewMode='grid'" title="网格视图">▦</button>
            </div>
          </div>
        </header>
        <section class="survey-list" :class="viewMode">
          <div v-if="activeMenu==='folder'" class="folder-area">
            <div class="folder-toolbar">
              <button class="team-btn" @click="openCreateFolderDialog">+ 新建文件夹</button>
              <nav class="crumb crumb-hero" aria-label="当前位置">
                <span class="crumb-label">当前位置：</span>
                <a href="#" @click.prevent="enterFolder(null)">全部</a>
                <template v-for="p in breadcrumb" :key="p.id">
                  <span class="sep"> / </span>
                  <a href="#" @click.prevent="enterFolder(p.id)">{{ p.name }}</a>
                </template>
              </nav>
            </div>
            <div class="folder-grid">
              <div v-for="f in childFolders" :key="f.id" class="folder-card" @click="enterFolder(f.id)" :title="`进入 ${f.name}`">
                <div class="f-ico">📁</div>
                <div class="f-name">{{ f.name }}</div>
                <div class="f-meta">{{ f.surveyCount || 0 }} 个问卷</div>
                <div class="f-ops">
                  <a href="#" @click.stop.prevent="renameFolderPrompt(f)">重命名</a>
                  <a href="#" @click.stop.prevent="deleteFolderConfirm(f)">删除</a>
                </div>
              </div>
              <div v-if="!childFolders.length" class="muted">暂无子文件夹</div>
            </div>
            <div class="divider" />
          </div>
          <!-- 协作团队视图占位 -->
          <template v-if="activeMenu==='team'">
            <div class="team-placeholder">
              <h3>协作空间</h3>
              <p class="desc">当前版本将团队协作先收敛到部门与成员模型中，优先复用现有权限与组织数据。你可以在这里查看协作概览，并跳转到部门管理执行实际操作。</p>
              <div class="actions">
                <button class="team-btn" @click="handleTeamAction('create')">+ 创建协作组</button>
                <button class="team-btn secondary" @click="handleTeamAction('join')">查看加入方式</button>
                <button class="team-btn tertiary" @click="setMenu('department')">进入部门管理</button>
              </div>
              <div class="team-stats">
                <div class="team-stat-card">
                  <span class="label">协作部门</span>
                  <strong>{{ departments.length }}</strong>
                </div>
                <div class="team-stat-card">
                  <span class="label">成员总数</span>
                  <strong>{{ dashboardMembers.length }}</strong>
                </div>
                <div class="team-stat-card">
                  <span class="label">启用成员</span>
                  <strong>{{ activeMemberCount }}</strong>
                </div>
              </div>
              <div v-if="!isAdminUser" class="team-inline-note">
                当前账号不是管理员，只展示协作概览。需要创建部门或导入成员时，请使用管理员账号登录。
              </div>
              <ul class="feature-hints">
                <li>当前协作组织以部门为单位，便于直接复用现有 RBAC 与成员接口。</li>
                <li>创建协作组会落到部门数据中，后续若独立 Team 模型成熟可再平滑迁移。</li>
                <li>成员新增支持批量导入，可直接指定邮箱与所属部门。</li>
                <li>普通账号暂不开放组织写操作，避免在未收口的权限模型下继续放大边界。</li>
              </ul>
            </div>
          </template>
          <template v-else-if="activeMenu==='department'">
            <div class="team-placeholder">
              <h3>团队 / 部门管理</h3>
              <p class="desc">这里接入当前后端已可用的部门与成员接口，先提供最小可用的组织管理面板。管理员可以直接新建部门、批量导入成员；普通用户则只读查看组织概览。</p>
              <div class="actions">
                <button class="team-btn" @click="openDeptDialog" :disabled="!isAdminUser">+ 新建部门</button>
                <button class="team-btn secondary" @click="openImportMembersDialog" :disabled="!isAdminUser">导入成员</button>
                <button class="team-btn tertiary" @click="loadOrgData" :disabled="orgLoading">刷新组织数据</button>
              </div>
              <div v-if="!isAdminUser" class="team-inline-note">
                当前账号不是管理员，因此组织数据只读展示，写操作按钮已禁用。
              </div>
              <div class="team-stats">
                <div class="team-stat-card">
                  <span class="label">部门数量</span>
                  <strong>{{ departments.length }}</strong>
                </div>
                <div class="team-stat-card">
                  <span class="label">成员数量</span>
                  <strong>{{ dashboardMembers.length }}</strong>
                </div>
                <div class="team-stat-card">
                  <span class="label">未分配部门</span>
                  <strong>{{ unassignedMemberCount }}</strong>
                </div>
              </div>
              <div class="department-panels">
                <section class="department-panel">
                  <div class="panel-head">
                    <h4>部门列表</h4>
                    <span>{{ departments.length }} 个</span>
                  </div>
                  <el-table :data="departments" size="small" v-loading="orgLoading" empty-text="暂无部门数据">
                    <el-table-column prop="id" label="ID" width="80" />
                    <el-table-column prop="name" label="部门名称" min-width="180" />
                    <el-table-column prop="parent_id" label="上级部门" width="100">
                      <template #default="{ row }">{{ row.parent_id ?? '-' }}</template>
                    </el-table-column>
                    <el-table-column label="成员数" width="100">
                      <template #default="{ row }">{{ memberCountByDept[row.id] ?? 0 }}</template>
                    </el-table-column>
                    <el-table-column v-if="isAdminUser" label="操作" width="160" fixed="right">
                      <template #default="{ row }">
                        <div class="member-actions">
                          <el-button link type="primary" @click="openEditDeptDialog(row)">编辑</el-button>
                          <el-button link type="danger" @click="removeDept(row)">删除</el-button>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </section>
                <section class="department-panel">
                  <div class="panel-head">
                    <h4>最近成员</h4>
                    <span>{{ recentMembers.length }} 人</span>
                  </div>
                  <el-table :data="recentMembers" size="small" v-loading="orgLoading" empty-text="暂无成员数据">
                    <el-table-column prop="username" label="账号" min-width="140" />
                    <el-table-column prop="email" label="邮箱" min-width="180">
                      <template #default="{ row }">{{ row.email || '-' }}</template>
                    </el-table-column>
                    <el-table-column label="部门" min-width="120">
                      <template #default="{ row }">{{ deptNameById[row.dept_id || row.deptId || 0] || '未分配' }}</template>
                    </el-table-column>
                    <el-table-column label="状态" width="90">
                      <template #default="{ row }">{{ isUserActive(row) ? '启用' : '禁用' }}</template>
                    </el-table-column>
                    <el-table-column v-if="isAdminUser" label="操作" width="220" fixed="right">
                      <template #default="{ row }">
                        <div class="member-actions">
                          <el-button link type="primary" @click="openMemberDialog(row)">编辑</el-button>
                          <el-button link :type="isUserActive(row) ? 'warning' : 'success'" @click="toggleMemberStatus(row)">
                            {{ isUserActive(row) ? '禁用' : '启用' }}
                          </el-button>
                          <el-button link type="primary" @click="resetMemberPassword(row)">重置密码</el-button>
                          <el-button link type="danger" @click="removeMember(row)">删除</el-button>
                        </div>
                      </template>
                    </el-table-column>
                  </el-table>
                </section>
              </div>
              <ul class="feature-hints">
                <li>当前版本先以“部门”承接团队能力，避免前后端再引入一套未落地的新领域模型。</li>
                <li>部门列表与最近成员直接来自现有后端数据，便于后续继续扩展编辑、停用和分配逻辑。</li>
                <li>导入成员采用逐条创建策略，避免依赖后端尚未提供的批量导入接口。</li>
                <li>若后续要开放普通用户协作申请，可在此基础上增加邀请码或审批流。</li>
              </ul>
            </div>
          </template>
          <!-- 回收站 -->
          <template v-else-if="activeMenu==='trash'">
            <div class="trash-list">
              <div class="trash-tipbar">
                <div class="tip-text">回收站保留30天，30天后自动彻底删除，您也可以手动删除。删除后无法恢复，请谨慎操作！</div>
                <el-button size="small" type="danger" plain @click="onClearTrash">清空全部</el-button>
              </div>
              <div class="trash-batchbar" v-if="hasTrashSelection">
                <span>已选 {{ selectedTrashRows.length }} 项</span>
                <div class="spacer" />
                <el-button size="small" @click="onBatchRestore" type="primary" plain>批量恢复</el-button>
                <el-button size="small" @click="onBatchForceDelete" type="danger" plain>批量彻底删除</el-button>
              </div>
              <div v-if="trashLoading" class="skeleton-wrapper" aria-label="加载中">
                <div class="skeleton-card" v-for="n in 3" :key="n">
                  <div class="skeleton-title shimmer" />
                  <div class="skeleton-meta shimmer" />
                </div>
              </div>
              <template v-else>
                <div v-if="trashList.length===0" class="empty">回收站为空</div>
                <div v-else>
                  <el-table :data="trashTableSorted" border style="width: 100%" size="small">
                    <el-table-column prop="id" label="ID" width="90" align="center" />
                    <el-table-column prop="title" label="标题" min-width="320" show-overflow-tooltip />
                    <el-table-column prop="collects" label="收集次数" width="100" align="center" />
                    <el-table-column prop="createdAt" label="创建时间" width="180">
                      <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
                    </el-table-column>
                    <el-table-column prop="deletedAt" label="删除时间" width="180">
                      <template #default="{ row }">{{ formatDateTime(row.deletedAt) }}</template>
                    </el-table-column>
                    <el-table-column prop="daysLeft" label="剩余天数" width="90" align="center">
                      <template #default="{ row }">
                        <el-tag :type="row.daysLeft <= 3 ? 'danger' : row.daysLeft <=7 ? 'warning' : 'info'" effect="plain">{{ row.daysLeft }}</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column label="操作" width="180" align="center" fixed="right">
                      <template #default="{ row }">
                        <el-button type="primary" text @click="onRestore(row)">恢复</el-button>
                        <el-button type="danger" text @click="onForceDelete(row)">彻底删除</el-button>
                      </template>
                    </el-table-column>
                    <!-- 自定义最右侧选择框列 -->
                    <el-table-column label="选择" width="80" align="center" fixed="right">
                      <template #header>
                        <el-checkbox :model-value="allTrashSelected" @change="toggleSelectAllTrash" />
                      </template>
                      <template #default="{ row }">
                        <el-checkbox :model-value="selectedTrashIds.has(row.id)" @change="(v:any)=> toggleTrash(row, v)" />
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
              </template>
            </div>
          </template>
          <!-- 个人中心 -->
          <template v-else-if="activeMenu==='profile'">
            <div class="profile-center">
              <el-tabs v-model="profileTab">
                <el-tab-pane label="我的账号" name="account">
                  <el-descriptions title="账号信息" :column="2" border>
                    <el-descriptions-item label="账号">{{ displayUser }}</el-descriptions-item>
                    <el-descriptions-item label="状态"><span class="state active">激活</span></el-descriptions-item>
                    <el-descriptions-item label="创建时间">{{ createdAtDisp }}</el-descriptions-item>
                    <el-descriptions-item label="最后登录时间">{{ lastLoginAtDisp }}</el-descriptions-item>
                    <el-descriptions-item label="所在企业">{{ enterpriseName }}</el-descriptions-item>
                    <el-descriptions-item label="所在部门">{{ departmentName }}</el-descriptions-item>
                    <el-descriptions-item label="权限">{{ roleLabel }}</el-descriptions-item>
                    <el-descriptions-item label="身份编码">{{ identityCode }}</el-descriptions-item>
                  </el-descriptions>
                </el-tab-pane>
                <el-tab-pane label="绑定手机号" name="bind">
                  <el-form label-width="120px" class="form-block">
                    <el-form-item label="手机号">
                      <el-input v-model="phone" placeholder="请输入手机号" maxlength="11" />
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="bindPhone">保存</el-button>
                    </el-form-item>
                  </el-form>
                </el-tab-pane>
                <el-tab-pane label="修改密码" name="password">
                  <el-form label-width="120px" class="form-block">
                    <el-form-item label="当前密码">
                      <el-input v-model="pwdOld" type="password" show-password />
                    </el-form-item>
                    <el-form-item label="新密码">
                      <el-input v-model="pwdNew" type="password" show-password />
                    </el-form-item>
                    <el-form-item label="确认新密码">
                      <el-input v-model="pwdNew2" type="password" show-password />
                    </el-form-item>
                    <el-form-item>
                      <el-button type="primary" @click="changePwd">保存</el-button>
                    </el-form-item>
                  </el-form>
                </el-tab-pane>
              </el-tabs>
            </div>
          </template>
          <template v-else-if="delayedLoading">
            <div class="skeleton-wrapper" aria-label="加载中">
              <div class="skeleton-card" v-for="n in 3" :key="n">
                <div class="skeleton-title shimmer" />
                <div class="skeleton-meta shimmer" />
                <div class="skeleton-actions">
                  <div class="skeleton-btn shimmer" v-for="m in 5" :key="m" />
                </div>
              </div>
            </div>
          </template>
        <template v-else-if="activeMenu!=='folder' && filteredSurveys.length === 0 && !loading">
          <div class="empty">
            <img src="https://img.js.design/assets/img/64f0e7e7b7b7a7b7b7b7b7b7.png" alt="暂无问卷" style="width:180px;" />
            <div class="tip">暂无问卷，点击“创建问卷”开始吧！</div>
          </div>
        </template>
        <template v-else-if="activeMenu!=='folder' || (currentFolderId !== null && filteredSurveys.length > 0)">
             <div v-for="survey in filteredSurveys" :key="survey.id" class="survey-card" :class="viewMode">
               <!-- 列表模式 card -->
               <template v-if="viewMode==='list'">
               <div class="card-head-row">
                 <div class="head-left">
                   <span class="title" :title="survey.title">{{ survey.title }}</span>
                   <span class="badge type">调查</span>
                   <span class="badge status" :class="survey.status">{{ statusLabel(survey.status) }}</span>
                 </div>
                 <div class="head-right">
                   <span class="meta share-id" :title="`问卷ID: ${survey.shareId || survey.id}`">
                     ID: {{ survey.shareId || survey.id }}
                   </span>
                   <span class="dot" />
                   <span class="answers-emphasis" :data-count="survey.answerCount || 0">
                     <strong class="answers-number">{{ survey.answerCount || 0 }}</strong>
                     <span class="answers-label">答卷</span>
                   </span>
                   <span class="dot" />
                   <span class="meta time">{{ survey.createdAt }}</span>
                 </div>
               </div>
               <div class="divider" />
               <div class="card-actions split">
                 <div class="actions-left">
                   <el-dropdown @command="onDesignMenu" trigger="hover">
                     <button class="action-btn primary">
                       <span>✏️ 设计问卷</span>
                       <el-icon class="caret-small"><ArrowDown /></el-icon>
                     </button>
                     <template #dropdown>
                       <el-dropdown-menu>
                         <el-dropdown-item :command="{ type: 'edit', id: survey.id }">编辑问卷</el-dropdown-item>
                         <el-dropdown-item :command="{ type: 'settings', id: survey.id }">问卷设置</el-dropdown-item>
                         <el-dropdown-item :command="{ type: 'appearance', id: survey.id }">问卷外观</el-dropdown-item>
                       </el-dropdown-menu>
                     </template>
                   </el-dropdown>
                   <button class="action-btn primary" @click="onSend(survey)">✈️ 发送问卷</button>
                   <button class="action-btn primary" @click="onAnalyze(survey)">📊 分析&下载</button>
                 </div>
                 <div class="actions-right">
                   <button class="action-btn" @click="onTogglePublishOrStop(survey)">
                     <template v-if="survey.status==='published'">⏸ 停止</template>
                     <template v-else>▶ 发布</template>
                   </button>
                   <button class="action-btn" @click="onDuplicate(survey)">⎘ 复制</button>
                   <button class="action-btn" @click="onDelete(survey)">🗑 删除</button>
                   <el-dropdown @command="onFolderCommand" trigger="hover">
                     <button class="action-btn"><span>📁 文件夹</span></button>
                     <template #dropdown>
                       <el-dropdown-menu>
                         <el-dropdown-item :command="{ type: 'move', id: survey.id, folderId: null }">移出文件夹</el-dropdown-item>
                         <el-dropdown-item v-for="f in allFolders" :key="f.id" :command="{ type: 'move', id: survey.id, folderId: f.id }">移动到：{{ f.name }}</el-dropdown-item>
                       </el-dropdown-menu>
                     </template>
                   </el-dropdown>
                   <button class="action-btn">🔔 提醒</button>
                 </div>
               </div>
               </template>
               <!-- 网格模式 card（简洁卡片，多行信息 + 菜单） -->
               <template v-else>
                 <div class="g-card">
                   <div class="g-top">
                     <div class="g-type-line">
                       <span class="g-badge type">问卷</span>
                       <span class="g-menu-trigger" @click.stop="toggleMenu(survey.id)">⋯</span>
                     </div>
                     <h3 class="g-title" :title="survey.title">{{ survey.title }}</h3>
                   </div>
                   <div class="g-middle">
                     <span class="g-status" :class="survey.status">{{ statusLabel(survey.status) }}</span>
                     <span class="g-dot" />
                     <span class="g-answers">{{ survey.answerCount || 0 }} 答卷</span>
                   </div>
                   <div class="g-id-row">
                     <span class="g-share-id" :title="`问卷ID: ${survey.shareId || survey.id}`">
                       ID: {{ survey.shareId || survey.id }}
                     </span>
                   </div>
                   <div class="g-bottom">
                     <span class="g-updated">{{ survey.createdAt }}</span>
                   </div>
                   <div class="g-menu" v-if="showMoreId===survey.id" @click.stop>
                     <ul>
                       <li @click="action('design',survey)">在新标签页打开</li>
                       <li @click="action('preview',survey)">预览</li>
                       <li class="sep" />
                       <li @click="action('createLike',survey)">创建副本</li>
                       <li @click="action('template',survey)">另存为模板</li>
                       <li @click="action('share',survey)">以链接分享给他人</li>
                       <li @click="action('collab',survey)">协作</li>
                       <li class="sep" />
                       <li @click="action('export',survey)">导出项目 (word)</li>
                       <li @click="action('clean',survey)">清空数据</li>
                       <li class="danger" @click="action('delete',survey)">删除项目</li>
                     </ul>
                   </div>
                 </div>
               </template>
          </div>
        </template>
        </section>
      </div>
    </main>
    </div>
  </div>
  <!-- 新建文件夹弹窗 -->
  <el-dialog v-model="createFolderVisible" title="新建文件夹" width="520px">
    <el-form :model="createFolderForm" label-width="100px">
      <el-form-item label="文件夹名称" required>
        <el-input v-model="createFolderForm.name" placeholder="文件夹名称" autofocus />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="createFolderVisible=false">取消</el-button>
        <el-button type="primary" @click="handleCreateFolder">确认</el-button>
      </span>
    </template>
  </el-dialog>
  <!-- 右侧消息抽屉 -->
  <el-dialog v-model="deptDialogVisible" :title="deptForm.id ? '编辑部门' : '新建部门'" width="520px">
    <el-form :model="deptForm" label-width="100px">
      <el-form-item label="部门名称" required>
        <el-input v-model="deptForm.name" placeholder="请输入部门名称" />
      </el-form-item>
      <el-form-item label="上级部门">
        <el-select v-model="deptForm.parent_id" placeholder="可选，默认创建顶级部门" clearable style="width: 100%">
          <el-option v-for="dept in departments.filter(item => item.id !== deptForm.id)" :key="dept.id" :label="dept.name" :value="dept.id" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="deptDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="deptSubmitting" @click="submitDept">{{ deptForm.id ? '保存' : '创建' }}</el-button>
      </span>
    </template>
  </el-dialog>
  <el-dialog v-model="importMembersVisible" title="导入成员" width="720px">
    <el-form :model="importMembersForm" label-width="120px">
      <el-form-item label="默认密码">
        <el-input v-model="importMembersForm.defaultPassword" placeholder="默认 123456" />
      </el-form-item>
      <el-form-item label="默认部门">
        <el-select v-model="importMembersForm.dept_id" placeholder="留空则使用每行内的部门 ID" clearable style="width: 100%">
          <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="成员清单" required>
        <el-input
          v-model="importMembersForm.rows"
          type="textarea"
          :rows="10"
          placeholder="每行一个成员，格式：username,email,deptId&#10;例如：zhangsan,zhangsan@example.com,2"
        />
      </el-form-item>
    </el-form>
    <div class="import-help">
      <strong>说明：</strong>
      每行支持 `账号,邮箱,部门ID` 三列；邮箱和部门 ID 可省略。若省略部门 ID，则使用上方“默认部门”。
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="importMembersVisible = false">取消</el-button>
        <el-button type="primary" :loading="importSubmitting" @click="submitImportMembers">开始导入</el-button>
      </span>
    </template>
  </el-dialog>
  <el-dialog v-model="memberDialogVisible" title="编辑成员" width="560px">
    <el-form :model="memberForm" label-width="100px">
      <el-form-item label="账号">
        <el-input :model-value="memberForm.username" disabled />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="memberForm.email" placeholder="可选" />
      </el-form-item>
      <el-form-item label="所属部门">
        <el-select v-model="memberForm.dept_id" placeholder="未分配部门" clearable style="width: 100%">
          <el-option v-for="dept in departments" :key="dept.id" :label="dept.name" :value="dept.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="成员状态">
        <el-switch v-model="memberForm.is_active" inline-prompt active-text="启用" inactive-text="禁用" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button :loading="memberPasswordSubmitting" @click="resetEditingMemberPassword">重置密码</el-button>
        <el-button type="danger" plain :loading="memberDeleteSubmitting" @click="removeEditingMember">删除</el-button>
        <el-button type="primary" :loading="memberSubmitting" @click="submitMemberUpdate">保存</el-button>
      </span>
    </template>
  </el-dialog>
  <el-drawer v-model="notifOpen" title="消息通知" direction="rtl" size="420px" @open="onNotifOpen" @closed="onNotifClosed">
    <div class="notif-drawer">
      <div class="notif-toolbar">
        <el-radio-group v-model="msgUnreadOnly" size="small" @change="onMsgFilterChange">
          <el-radio-button :label="true">未读</el-radio-button>
          <el-radio-button :label="false">全部</el-radio-button>
        </el-radio-group>
        <div class="spacer" />
        <el-button size="small" text :loading="msgLoading" @click="refreshMessages">刷新</el-button>
        <el-button size="small" text @click="markAllRead" :disabled="!messages.length">全部已读</el-button>
      </div>
      <el-scrollbar height="60vh">
        <div v-if="msgLoading" class="notif-loading">
          <div class="bar shimmer"></div>
          <div class="bar shimmer"></div>
          <div class="bar shimmer"></div>
        </div>
        <div v-else-if="!messagesView.length" class="notif-empty">{{ msgUnreadOnly? '暂无未读消息' : '暂无消息' }}</div>
        <ul v-else class="notif-list drawer">
          <li v-for="m in messagesView" :key="m.id" class="notif-item" :class="[{ unread: !m.read }, 'lvl-'+(m.level||'info')]" @click="openMessage(m)">
            <div class="notif-title">
              <el-tag :type="levelTag(m.level)" size="small" style="margin-right:6px;">{{ levelText(m.level) }}</el-tag>
              <span class="t">{{ m.title }}</span>
            </div>
            <div class="notif-content">{{ m.content || '' }}</div>
            <div class="notif-meta">
              <span class="time" :title="m.createdAt">{{ timeAgo(m.createdAt) }}</span>
              <div class="spacer" />
              <template v-if="m.entityId">
                <el-button size="small" text type="primary" @click.stop="goSurvey(m)">去处理</el-button>
                <span class="dot"></span>
              </template>
              <el-button size="small" text @click.stop="markRead(m)" :disabled="m.read">{{ m.read ? '已读' : '标为已读' }}</el-button>
            </div>
          </li>
        </ul>
      </el-scrollbar>
    </div>
  </el-drawer>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter, onBeforeRouteUpdate } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Bell } from '@element-plus/icons-vue'
import { listSurveys, deleteSurvey as apiDeleteSurvey, publishSurvey, closeSurvey, getSurvey, createSurvey as apiCreateSurvey, moveSurvey, listTrash, restoreSurvey, forceDeleteSurvey, clearTrash } from '@/api/surveys'
import { listFolders, listAllFolders, createFolder, renameFolder, deleteFolder, type FolderDTO } from '@/api/folders'
import { listDepts, createDept, updateDept, deleteDept } from '@/api/depts'
import { fetchUsers, createUser, updateUser, updatePassword, enableUser, disableUser, deleteUser, importUsers } from '@/api/userAdmin'
import http from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type { Dept, User } from '@/types/user'
// 已移除编码逻辑，直接使用数字ID
const router = useRouter()
const authStore = useAuthStore()
const { user: currentUser, username, isAdmin, roleLabel: authRoleLabel, identityCode: authIdentityCode } = storeToRefs(authStore)
// 顶栏品牌图片：若存在 public/brand-logo.png 则优先显示；否则回退内联图标
const brandImgSrc = '/brand-logo.png'
const brandImgError = ref(false)
// 顶部导航激活状态
const topNav = ref<'workspace'|'contacts'|'templates'|'admin'>('workspace')
const displayUser = computed(() => username.value || localStorage.getItem('rememberUser') || '用户')
// 避免在模板中直接访问 localStorage，改为受控的计算属性
const isAdminUser = computed(() => isAdmin.value)
const goTopNav = (k: 'workspace'|'contacts'|'templates'|'admin') => {
  topNav.value = k
  if (k === 'workspace') router.push('/user-dashboard')
  else if (k === 'admin') router.push('/admin')
  else {
    // 其他导航为占位，可根据需要补充路由
  }
}
// 右上角用户菜单
const handleUserCommand = (cmd: 'account'|'password'|'logout') => {
  if (cmd === 'logout') {
    authStore.logout()
    router.push('/login')
  } else if (cmd === 'account') {
    setMenu('profile')
    profileTab.value = 'account'
  } else if (cmd === 'password') {
    setMenu('profile')
    profileTab.value = 'password'
  }
}
const search = ref('')
const loading = ref(false)
// 避免闪烁：仅当 loading 持续超过阈值才展示骨架屏
const delayedLoading = ref(false)
let loadingTimer: number | null = null
const surveys = ref<any[]>([])
const activeMenu = ref('all')
// 文件夹相关状态
const allFolders = ref<FolderDTO[]>([])
const childFolders = ref<FolderDTO[]>([])
const currentFolderId = ref<number|null>(null)
const breadcrumb = ref<FolderDTO[]>([])
const orgLoading = ref(false)
const departments = ref<Dept[]>([])
const dashboardMembers = ref<User[]>([])
const deptDialogVisible = ref(false)
const deptSubmitting = ref(false)
const deptForm = ref<{ id: number | null; name: string; parent_id: number | null }>({ id: null, name: '', parent_id: null })
const importMembersVisible = ref(false)
const importSubmitting = ref(false)
const importMembersForm = ref<{ rows: string; dept_id: number | null; defaultPassword: string }>({
  rows: '',
  dept_id: null,
  defaultPassword: '123456'
})
const memberDialogVisible = ref(false)
const memberSubmitting = ref(false)
const memberPasswordSubmitting = ref(false)
const memberDeleteSubmitting = ref(false)
const memberForm = ref<{ id: number | string | null; username: string; email: string; dept_id: number | null; is_active: boolean }>({
  id: null,
  username: '',
  email: '',
  dept_id: null,
  is_active: true
})
const isUserActive = (user: Partial<User>) => {
  if (typeof user.is_active === 'boolean') return user.is_active
  if (typeof user.isActive === 'boolean') return user.isActive
  return true
}
const deptNameById = computed<Record<number, string>>(() => {
  return departments.value.reduce((acc, dept) => {
    acc[dept.id] = dept.name
    return acc
  }, {} as Record<number, string>)
})
const memberCountByDept = computed<Record<number, number>>(() => {
  return dashboardMembers.value.reduce((acc, user) => {
    const deptId = Number(user.dept_id ?? user.deptId ?? 0)
    if (!deptId) return acc
    acc[deptId] = (acc[deptId] || 0) + 1
    return acc
  }, {} as Record<number, number>)
})
const activeMemberCount = computed(() => dashboardMembers.value.filter(isUserActive).length)
const unassignedMemberCount = computed(() => {
  return dashboardMembers.value.filter(user => !Number(user.dept_id ?? user.deptId ?? 0)).length
})
const recentMembers = computed(() => {
  const getTime = (user: Partial<User>) => {
    const raw = user.created_at || user.createdAt || ''
    const parsed = Date.parse(String(raw))
    return Number.isNaN(parsed) ? 0 : parsed
  }
  return [...dashboardMembers.value].sort((a, b) => getTime(b) - getTime(a)).slice(0, 8)
})
const ensureAdminAction = () => {
  if (isAdminUser.value) return true
  ElMessage.warning('当前账号不是管理员，无法执行组织写操作')
  return false
}
const loadOrgData = async () => {
  if (!isAdminUser.value) {
    departments.value = []
    dashboardMembers.value = []
    return
  }
  orgLoading.value = true
  try {
    const [deptList, userPage] = await Promise.all([
      listDepts(),
      fetchUsers({ page: 1, pageSize: 200 })
    ])
    departments.value = deptList
    dashboardMembers.value = userPage.list || []
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error?.message || e?.response?.data?.message || '加载组织数据失败')
  } finally {
    orgLoading.value = false
  }
}
const openDeptDialog = async () => {
  if (!ensureAdminAction()) return
  await loadOrgData()
  deptForm.value = { id: null, name: '', parent_id: null }
  deptDialogVisible.value = true
}
const openEditDeptDialog = async (dept: Dept) => {
  if (!ensureAdminAction()) return
  await loadOrgData()
  deptForm.value = {
    id: dept.id,
    name: dept.name,
    parent_id: dept.parent_id ?? null
  }
  deptDialogVisible.value = true
}
const submitDept = async () => {
  const name = deptForm.value.name.trim()
  if (!name) {
    ElMessage.warning('请输入部门名称')
    return
  }
  if (deptForm.value.id && deptForm.value.parent_id === deptForm.value.id) {
    ElMessage.warning('上级部门不能选择自己')
    return
  }
  deptSubmitting.value = true
  try {
    if (deptForm.value.id) {
      await updateDept(deptForm.value.id, {
        name,
        parent_id: deptForm.value.parent_id ?? undefined
      })
    } else {
      await createDept({
        name,
        parent_id: deptForm.value.parent_id ?? undefined
      })
    }
    deptDialogVisible.value = false
    ElMessage.success(deptForm.value.id ? '部门更新成功' : '部门创建成功')
    await loadOrgData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error?.message || e?.response?.data?.message || (deptForm.value.id ? '部门更新失败' : '部门创建失败'))
  } finally {
    deptSubmitting.value = false
  }
}
const removeDept = async (dept: Dept) => {
  if (!ensureAdminAction()) return
  try {
    const memberCount = memberCountByDept.value[dept.id] ?? 0
    const hint = memberCount > 0 ? `该部门下有 ${memberCount} 名成员，删除时会自动清空其部门归属。` : '删除后不可恢复。'
    await ElMessageBox.confirm(`确认删除部门 ${dept.name} 吗？${hint}`, '删除部门', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await deleteDept(dept.id)
    ElMessage.success('部门已删除')
    await loadOrgData()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.error?.message || e?.response?.data?.message || '部门删除失败')
  }
}
const openImportMembersDialog = async () => {
  if (!ensureAdminAction()) return
  await loadOrgData()
  importMembersForm.value = { rows: '', dept_id: null, defaultPassword: '123456' }
  importMembersVisible.value = true
}
const parseImportRows = () => {
  return importMembersForm.value.rows
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [usernameRaw = '', emailRaw = '', deptIdRaw = ''] = line.split(',').map(part => part.trim())
      return {
        index: index + 1,
        username: usernameRaw,
        email: emailRaw || undefined,
        dept_id: deptIdRaw ? Number(deptIdRaw) : (importMembersForm.value.dept_id ?? undefined)
      }
    })
}
const submitImportMembers = async () => {
  const rows = parseImportRows()
  const password = (importMembersForm.value.defaultPassword || '123456').trim()
  if (!rows.length) {
    ElMessage.warning('请至少输入一条成员记录')
    return
  }
  if (!password) {
    ElMessage.warning('默认密码不能为空')
    return
  }
  const invalid = rows.find(row => !row.username)
  if (invalid) {
    ElMessage.warning(`第 ${invalid.index} 行缺少账号`)
    return
  }
  importSubmitting.value = true
  try {
    const result = await importUsers(rows.map(row => ({
      username: row.username,
      email: row.email,
      dept_id: row.dept_id,
      password
    })))
    if (result.created > 0) ElMessage.success(`成功导入 ${result.created} 位成员`)
    if (result.errors.length) {
      await ElMessageBox.alert(
        result.errors.slice(0, 10).map(item => `第 ${item.row ?? (item.index ?? 0) + 1} 行 ${item.username || ''}: ${item.reason}`).join('\n'),
        `有 ${result.errors.length} 条导入失败`,
        {
        type: 'warning'
        }
      )
    } else {
      importMembersVisible.value = false
    }
    await loadOrgData()
  } finally {
    importSubmitting.value = false
  }
}
const openMemberDialog = (user: User) => {
  if (!ensureAdminAction()) return
  memberForm.value = {
    id: user.id,
    username: user.username,
    email: user.email || '',
    dept_id: (user.dept_id ?? user.deptId ?? null) as number | null,
    is_active: isUserActive(user)
  }
  memberDialogVisible.value = true
}
const submitMemberUpdate = async () => {
  if (!memberForm.value.id) return
  memberSubmitting.value = true
  try {
    await updateUser(memberForm.value.id, {
      email: memberForm.value.email.trim() || undefined,
      dept_id: memberForm.value.dept_id,
      is_active: memberForm.value.is_active
    })
    memberDialogVisible.value = false
    ElMessage.success('成员信息已更新')
    await loadOrgData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error?.message || e?.response?.data?.message || '成员更新失败')
  } finally {
    memberSubmitting.value = false
  }
}
const toggleMemberStatus = async (user: User) => {
  if (!ensureAdminAction()) return
  try {
    if (isUserActive(user)) await disableUser(user.id)
    else await enableUser(user.id)
    ElMessage.success(isUserActive(user) ? '成员已禁用' : '成员已启用')
    await loadOrgData()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.error?.message || e?.response?.data?.message || '状态更新失败')
  }
}
const resetMemberPassword = async (user: User) => {
  if (!ensureAdminAction()) return
  memberPasswordSubmitting.value = true
  try {
    await ElMessageBox.confirm(`确认将 ${user.username} 的密码重置为 123456 吗？`, '重置密码', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await updatePassword(user.id, '123456')
    ElMessage.success('密码已重置为 123456')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.error?.message || e?.response?.data?.message || '密码重置失败')
  } finally {
    memberPasswordSubmitting.value = false
  }
}
const removeMember = async (user: User) => {
  if (!ensureAdminAction()) return
  memberDeleteSubmitting.value = true
  try {
    await ElMessageBox.confirm(`确认删除成员 ${user.username} 吗？该操作不可恢复。`, '删除成员', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    await deleteUser(user.id)
    ElMessage.success('成员已删除')
    if (memberForm.value.id === user.id) memberDialogVisible.value = false
    await loadOrgData()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.error?.message || e?.response?.data?.message || '成员删除失败')
  } finally {
    memberDeleteSubmitting.value = false
  }
}
const resetEditingMemberPassword = async () => {
  if (!memberForm.value.id) return
  await resetMemberPassword({ id: memberForm.value.id, username: memberForm.value.username } as User)
}
const removeEditingMember = async () => {
  if (!memberForm.value.id) return
  await removeMember({ id: memberForm.value.id, username: memberForm.value.username } as User)
}
const handleTeamAction = async (action: 'create' | 'join') => {
  if (action === 'create') {
    if (!ensureAdminAction()) return
    await openDeptDialog()
    return
  }
  await ElMessageBox.alert('当前版本尚未独立实现团队邀请码与加入流程，协作组织暂由部门承载。你可以进入“团队/部门”页查看当前组织结构。', '协作说明', {
    confirmButtonText: '进入部门页'
  })
  await setMenu('department')
}
const setMenu = async (menu:string) => {
  activeMenu.value = menu
  if (menu === 'folder') {
    // 点击“文件夹”时，重置为根目录（全部）
    await enterFolder(null)
  } else if (menu === 'trash') {
    await loadTrash()
  } else if (menu === 'team' || menu === 'department') {
    await loadOrgData()
  } else {
    await fetchSurveys()
  }
}

// ===== 消息通知 =====
const messages = ref<any[]>([])
const unreadCount = ref<number>(0)
let msgTimer: number | null = null
const levelText = (lvl?: string) => lvl==='success'?'成功':lvl==='warning'?'提醒':lvl==='error'?'错误':'信息'
const levelTag = (lvl?: string) => lvl==='success'?'success':lvl==='warning'?'warning':lvl==='error'?'danger':'info'
const notifOpen = ref(false)
const msgUnreadOnly = ref<boolean>(true)
const msgLoading = ref(false)
const openNotif = async () => { notifOpen.value = true }
const onNotifOpen = async () => { await loadMessages(msgUnreadOnly.value) }
const onMsgFilterChange = async () => { await loadMessages(msgUnreadOnly.value) }
const refreshMessages = async () => { await loadMessages(msgUnreadOnly.value) }
const loadUnreadCount = async () => {
  try {
    const { data } = await http.get('/messages', { params: { unread: 1, types: 'audit,system' } })
    unreadCount.value = (data?.data || []).length
  } catch {}
}
const loadMessages = async (unreadOnly = true) => {
  try {
    msgLoading.value = true
    const base = { types: 'audit,system' }
    const params = unreadOnly ? { ...base, unread: 1 } : base
    const { data } = await http.get('/messages', { params })
    const list = (data?.data || [])
    const getTime = (x:any) => {
      const t = Date.parse(x?.createdAt || x?.time || '')
      return isNaN(t) ? (Number(x?.id)||0) : t
    }
    messages.value = [...list].sort((a:any,b:any)=> getTime(b) - getTime(a))
    // 无论当前筛选是“未读”还是“全部”，都要把角标设置为真正的未读数量
    unreadCount.value = unreadOnly
      ? messages.value.length
      : messages.value.filter((m:any)=>!m.read).length
  } catch {}
  finally { msgLoading.value = false }
}
const messagesView = computed(() => messages.value)
const markRead = async (m: any) => {
  try {
    await http.post(`/messages/${m.id}/read`)
    // 本地先行更新，交互更顺滑
    m.read = true
    // 依据当前筛选刷新列表，并同步角标
    await loadMessages(msgUnreadOnly.value)
  } catch {}
}
const markAllRead = async () => {
  const list = [...messages.value]
  for (const m of list) {
    try { await http.post(`/messages/${m.id}/read`) } catch {}
  }
  await loadMessages(msgUnreadOnly.value)
}
const goSurvey = (m:any) => {
  if (!m?.entityId) return
  notifOpen.value = false
  router.push({ name: 'EditSurvey', params: { id: m.entityId } })
}
const openMessage = async (m:any) => { if (!m.read) await markRead(m) }
const timeAgo = (t?: string) => {
  if (!t) return ''
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  const s = Math.floor((Date.now() - d.getTime())/1000)
  if (s < 60) return `${s}s 前`
  const m = Math.floor(s/60)
  if (m < 60) return `${m} 分钟前`
  const h = Math.floor(m/60)
  if (h < 24) return `${h} 小时前`
  const day = Math.floor(h/24)
  if (day === 1) return '昨天'
  if (day < 7) return `${day} 天前`
  return d.toLocaleString('zh-CN', { hour12: false })
}
// 通用时间格式化：YYYY-MM-DD HH:mm:ss
const formatDateTime = (v: any) => {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  const pad = (n:number) => (n < 10 ? '0' + n : '' + n)
  const Y = d.getFullYear()
  const M = pad(d.getMonth() + 1)
  const D = pad(d.getDate())
  const h = pad(d.getHours())
  const m = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}
// 抽屉关闭时再拉一次未读数，避免用户在“全部”页签标记后角标不同步
const onNotifClosed = async () => { await loadUnreadCount() }
const createSurvey = () => { router.push({ name: 'CreateSurvey' }) }
const searchSurvey = () => { /* 可扩展为后端搜索 */ }
const fetchSurveys = async () => {
  loading.value = true
  if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null }
  // 超过 200ms 才显示骨架屏，避免闪一下
  loadingTimer = window.setTimeout(() => { delayedLoading.value = true }, 200)
  try {
    const result = await listSurveys(
      activeMenu.value === 'folder' && currentFolderId.value !== null
        ? { folder_id: currentFolderId.value }
        : undefined
    )
    const list = Array.isArray(result) ? result : (result as any).list || []
    surveys.value = list.map((s: any) => ({
      ...s,
      id: s.id || s._id,
      displayStatus: s.status,
      // 兼容多种后端：优先完整版的 responseCount；其次旧字段 answerCount；最后演示版 simple-server 的 submitCount
      answerCount: (s as any).responseCount ?? (s as any).answerCount ?? (s as any).submitCount ?? 0
    }))
  } catch (e) {
    ElMessage.error('加载问卷列表失败')
  } finally {
    loading.value = false
    if (loadingTimer) { clearTimeout(loadingTimer); loadingTimer = null }
    delayedLoading.value = false
  }
}

onMounted(async () => {
  await loadUnreadCount()
  if (msgTimer) { clearInterval(msgTimer); msgTimer = null }
  msgTimer = window.setInterval(loadUnreadCount, 30000) // 30s 轮询未读数
})
onUnmounted(() => { if (msgTimer) { clearInterval(msgTimer); msgTimer = null } })
onMounted(fetchSurveys)
onMounted(async ()=>{ try { allFolders.value = await listAllFolders() } catch {} })
onMounted(async () => { if (isAdminUser.value) await loadOrgData() })

// 文件夹：加载并生成面包屑
const loadFolders = async () => {
  allFolders.value = await listAllFolders()
  childFolders.value = await listFolders(currentFolderId.value ?? null)
  const crumbs: FolderDTO[] = []
  let fid = currentFolderId.value
  while (fid != null) {
    const f = allFolders.value.find(x=>x.id===fid)
    if (!f) break
    crumbs.unshift(f)
    fid = (f.parentId ?? null) as any
  }
  breadcrumb.value = crumbs
}
const enterFolder = async (id: number | null) => {
  currentFolderId.value = id ?? null
  await Promise.all([loadFolders(), fetchSurveys()])
}

// 当从编辑页返回或切换路由时，刷新列表
onBeforeRouteUpdate((to, from, next) => {
  fetchSurveys().finally(() => next())
})

// 页面重新获得焦点时自动刷新
const handleVisibility = () => {
  if (document.visibilityState === 'visible') fetchSurveys()
}
onMounted(() => document.addEventListener('visibilitychange', handleVisibility))
onUnmounted(() => document.removeEventListener('visibilitychange', handleVisibility))
onMounted(async () => { if (activeMenu.value==='folder') await loadFolders() })
const sortBy = ref('createdAt_desc')
const viewMode = ref<'list'|'grid'>('list')
const showMoreId = ref<string>('')
const toggleMenu = (id:string) => { showMoreId.value = showMoreId.value === id ? '' : id }
const action = async (type:string, survey:any) => {
  showMoreId.value = ''
  switch (type) {
    case 'design':
      onDesign(survey)
      break
    case 'preview':
      // 独立 PreviewSurvey 路由已移除：直接进入编辑页的 preview Tab 内嵌实时预览
      router.push({ name: 'EditSurvey', params: { id: survey.id }, query: { tab: 'preview' } })
      break
    case 'createLike':
      await onDuplicate(survey)
      break
    case 'share':
      await onSend(survey)
      break
    case 'export':
      onAnalyze(survey)
      break
    case 'clean':
      ElMessage.info('清空数据功能待实现')
      break
    case 'delete':
      await onDelete(survey)
      break
    default:
      ElMessage.info('功能开发中')
  }
}

// 按钮行为：设计/发送/分析/发布或停止/复制/删除
const onDesign = (survey:any) => router.push({ name: 'EditSurvey', params: { id: survey.id } })
const onDesignMenu = (cmd: { type: 'edit'|'settings'|'appearance', id: string|number }) => {
  const id = String(cmd.id)
  if (cmd.type === 'edit') {
    router.push({ name: 'EditSurvey', params: { id }, query: { tab: 'edit' } })
  } else if (cmd.type === 'settings') {
    router.push({ name: 'EditSurvey', params: { id }, query: { tab: 'settings' } })
  } else if (cmd.type === 'appearance') {
    router.push({ name: 'EditSurvey', params: { id }, query: { tab: 'settings', sub: 'appearance' } })
  }
}
const onAnalyze = (survey:any) => router.push({ name: 'SurveyResults', params: { id: survey.id } })
const onSend = async (survey:any) => {
  const shareId = survey.shareId || survey.id
  // 直接使用9位数字ID作为URL后缀，不再使用8字符编码
  const link = `${location.origin}/s/${shareId}`
  try {
    await navigator.clipboard.writeText(link)
    ElMessage.success('已复制问卷链接到剪贴板')
  } catch {
    window.prompt('复制以下链接', link)
  }
}
// 文件夹移动命令
const onFolderCommand = async (cmd: { type: 'move', id: string|number, folderId: number|null }) => {
  try {
    await moveSurvey(cmd.id, cmd.folderId)
    ElMessage.success('已移动')
    await Promise.all([fetchSurveys(), loadFolders()])
  } catch (e:any) {
    ElMessage.error(e?.response?.data?.message || '移动失败')
  }
}
const onTogglePublishOrStop = async (survey:any) => {
  try {
    if (survey.status === 'published') {
      await closeSurvey(survey.id)
      ElMessage.success('已停止收集')
    } else {
      // 允许 draft 或 closed 状态再次发布
      await publishSurvey(survey.id)
      ElMessage.success('已发布')
    }
    await fetchSurveys()
  } catch (e:any) {
    ElMessage.error(e?.response?.data?.msg || '操作失败')
  }
}
// 新建/重命名/删除 文件夹
const promptCreateFolder = async () => {
  const name = window.prompt('文件夹名称')
  if (!name) return
  await createFolder({ name, parentId: currentFolderId.value ?? null })
  await loadFolders()
}
const renameFolderPrompt = async (f: FolderDTO) => {
  try {
    const { value } = await ElMessageBox.prompt('重命名为：', '重命名文件夹', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: f.name,
      inputPlaceholder: '请输入新名称',
      inputValidator: (val: string) => {
        if (!val || !val.trim()) return '名称不能为空'
        if (val.trim() === f.name) return '名称未变化'
        return true
      }
    })
    const name = (value || '').trim()
    if (!name || name === f.name) return
    await renameFolder(f.id, name)
    ElMessage.success('已重命名')
    await loadFolders()
  } catch (e: any) {
    // 点击取消不提示错误
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.message || '重命名失败')
  }
}
const deleteFolderConfirm = async (f: FolderDTO) => {
  try {
    await ElMessageBox.confirm(`确认删除文件夹“${f.name}”？其中问卷将被移至“全部”`, '删除确认', {
      type: 'warning',
      confirmButtonText: '确定',
      cancelButtonText: '取消'
    })
    // 先释放文件夹内问卷到根目录
    const surveysInFolder = surveys.value.filter((s:any) => Number(s.folderId) === Number(f.id))
    if (surveysInFolder.length) {
      await Promise.all(
        surveysInFolder.map((s:any) => moveSurvey(String(s.id ?? s._id), null))
      )
    }
    await deleteFolder(f.id)
    if (surveysInFolder?.length) {
      ElMessage.success(`已删除文件夹，并将 ${surveysInFolder.length} 份问卷移至“全部”`)
    } else {
      ElMessage.success('已删除文件夹')
    }
    await enterFolder(f.parentId ?? null)
  } catch(e:any) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.message || '删除失败')
  }
}
const onDuplicate = async (survey:any) => {
  try {
    const src = await getSurvey(survey.id)
    // 生成新问卷 payload：去掉标识符
    const payload = {
      title: `副本 - ${src.title}`,
      description: src.description || '',
      questions: (src.questions || []).map((q:any, idx:number) => ({
        id: String(q.id ?? `q${idx + 1}`),
        // 后端会 normalize type/options
        type: q.type,
        title: q.title,
        required: !!q.required,
        order: typeof q.order === 'number' ? q.order : idx,
        options: (q.options || []).map((op:any, j:number) => ({
          label: op.label ?? op.text ?? '',
          value: op.value ?? String(j),
          order: typeof op.order === 'number' ? op.order : j
        }))
      }))
    }
    const created = await apiCreateSurvey(payload)
    ElMessage.success('已创建副本，前往编辑')
    router.push({ name: 'EditSurvey', params: { id: created.id } })
  } catch (e:any) {
    ElMessage.error(e?.response?.data?.msg || '复制失败')
  }
}
const onDelete = async (survey:any) => {
  try {
    await ElMessageBox.confirm(`确认删除“${survey.title}”？将移入回收站，30 天后自动彻底删除`, '删除确认', { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' })
    await apiDeleteSurvey(survey.id)
    ElMessage.success('已移入回收站')
    if (activeMenu.value === 'trash') await loadTrash()
    else await fetchSurveys()
  } catch (e:any) {
    if (e !== 'cancel') {
      ElMessage.error(e?.response?.data?.msg || '删除失败')
    }
  }
}
// 回收站逻辑
const trashList = ref<any[]>([])
const trashLoading = ref(false)
const selectedTrashIds = ref<Set<string|number>>(new Set())
const selectedTrashRows = computed(()=> trashTable.value.filter(r=> selectedTrashIds.value.has(r.id)))
const hasTrashSelection = computed(()=> selectedTrashIds.value.size > 0)
const loadTrash = async () => {
  trashLoading.value = true
  try {
    trashList.value = await listTrash()
  } catch (e) {
    ElMessage.error('加载回收站失败')
  } finally {
    trashLoading.value = false
  }
}
// 回收站表格数据：补齐收集次数
const trashTable = computed(() => {
  return trashList.value.map((s:any) => {
    const collects = (s.responseCount ?? s.answerCount ?? s.submitCount ?? 0)
    const deletedTs = Date.parse(s.deletedAt || '')
    const daysLeft = isNaN(deletedTs) ? 30 : Math.max(0, 30 - Math.floor((Date.now() - deletedTs)/86400000))
    return {
      ...s,
      collects,
      daysLeft,
    }
  })
})
const trashTableSorted = computed(()=> {
  const getTime = (x:any) => {
    const t = Date.parse(x.deletedAt || '')
    return isNaN(t) ? 0 : t
  }
  return [...trashTable.value].sort((a,b)=> getTime(b) - getTime(a))
})
const toggleTrash = (row:any, val:boolean) => {
  const set = selectedTrashIds.value
  if (val) set.add(row.id)
  else set.delete(row.id)
}
const allTrashSelected = computed(()=> trashTable.value.length>0 && selectedTrashIds.value.size === trashTable.value.length)
const toggleSelectAllTrash = (val:boolean) => {
  const set = selectedTrashIds.value
  set.clear()
  if (val) trashTable.value.forEach(r=> set.add(r.id))
}
const onBatchRestore = async () => {
  const rows = selectedTrashRows.value
  if (!rows.length) return
  try {
    await ElMessageBox.confirm(`确定要恢复所选 ${rows.length} 项吗？`, '批量恢复', { type: 'warning' })
    for (const r of rows) { try { await restoreSurvey(r.id) } catch {} }
    ElMessage.success('批量恢复完成')
    selectedTrashIds.value.clear()
    await loadTrash()
  } catch(e:any) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}
const onBatchForceDelete = async () => {
  const rows = selectedTrashRows.value
  if (!rows.length) return
  try {
    await ElMessageBox.confirm(`确定要彻底删除所选 ${rows.length} 项吗？该操作不可恢复！`, '批量彻底删除', { type: 'warning' })
    for (const r of rows) { try { await forceDeleteSurvey(r.id) } catch {} }
    ElMessage.success('批量彻底删除完成')
    selectedTrashIds.value.clear()
    await loadTrash()
  } catch(e:any) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}
const onRestore = async (survey:any) => {
  try {
    await restoreSurvey(survey.id)
    ElMessage.success('已还原')
    selectedTrashIds.value.delete(survey.id)
    await loadTrash()
  } catch (e:any) {
    ElMessage.error(e?.response?.data?.message || '还原失败')
  }
}
const onForceDelete = async (survey:any) => {
  try {
    await ElMessageBox.confirm(`确定要彻底删除“${survey.title}”？该操作不可恢复`, '彻底删除', { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' })
    await forceDeleteSurvey(survey.id)
    ElMessage.success('已彻底删除')
    selectedTrashIds.value.delete(survey.id)
    await loadTrash()
  } catch (e:any) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.message || '彻底删除失败')
  }
}
const onClearTrash = async () => {
  try {
    await ElMessageBox.confirm('确定要清空回收站中的全部问卷？该操作不可恢复！', '清空回收站', { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' })
    const r = await clearTrash()
    ElMessage.success(`已清空回收站（删除 ${r?.deleted ?? 0} 项）`)
    await loadTrash()
  } catch (e:any) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.message || '清空失败')
  }
}
// 新建文件夹弹窗状态
const createFolderVisible = ref(false)
const createFolderForm = ref<{ name: string }>({ name: '' })
const openCreateFolderDialog = async () => {
  createFolderForm.value = { name: '' }
  createFolderVisible.value = true
  await nextTick()
}
// 顶部刷新，根据不同菜单刷新对应数据
const refresh = async () => {
  if (activeMenu.value === 'trash') return loadTrash()
  if (activeMenu.value === 'folder') return enterFolder(currentFolderId.value)
  return fetchSurveys()
}
const handleCreateFolder = async () => {
  const name = (createFolderForm.value.name || '').trim()
  if (!name) return ElMessage.warning('请输入文件夹名称')
  try {
    await createFolder({ name, parentId: currentFolderId.value ?? null })
    createFolderVisible.value = false
    await loadFolders()
  } catch (e:any) {
    ElMessage.error(e?.response?.data?.message || '创建失败')
  }
}
const filteredSurveys = computed(() => {
  let list = !search.value ? surveys.value : surveys.value.filter(s => s.title.includes(search.value))
  const getTime = (x:any) => {
    const c = x.createdAt || x.updatedAt || x.publishedAt || ''
    const t = Date.parse(c)
    return isNaN(t) ? 0 : t
  }
  const byIdDesc = (a:any,b:any) => ((Number(b.id)||0) - (Number(a.id)||0))
  switch (sortBy.value) {
    case 'createdAt_asc':
      list = [...list].sort((a,b)=> {
        const d = getTime(a) - getTime(b)
        return d !== 0 ? d : byIdDesc(a,b)
      })
      break
    case 'title_asc':
      list = [...list].sort((a,b)=> a.title.localeCompare(b.title))
      break
    case 'title_desc':
      list = [...list].sort((a,b)=> b.title.localeCompare(a.title))
      break
    default: // createdAt_desc
      list = [...list].sort((a,b)=> {
        const d = getTime(b) - getTime(a)
        return d !== 0 ? d : byIdDesc(a,b)
      })
  }
  return list
})
// 显示用状态文案
const statusLabel = (s: string | undefined) => {
  switch (s) {
    case 'draft': return '草稿'
    case 'published': return '收集中'
    case 'closed': return '已结束'
    default: return s || ''
  }
}
// 个人中心：状态与动作（示例）
const profileTab = ref<'account'|'bind'|'password'>('account')
const phone = ref('')
const pwdOld = ref('')
const pwdNew = ref('')
const pwdNew2 = ref('')
const bindPhone = () => { window.alert('已保存（示例）') }
const changePwd = () => {
  if (!pwdNew.value || pwdNew.value !== pwdNew2.value) return window.alert('两次输入的新密码不一致')
  window.alert('密码已修改（示例）')
  pwdOld.value = pwdNew.value = pwdNew2.value = ''
}
// 账号信息展示字段（示例：可从 /api/auth/me 替换为真实数据）
const enterpriseName = computed(() => localStorage.getItem('enterpriseName') || '——')
const departmentName = computed(() => localStorage.getItem('departmentName') || '——')
// 权限展示统一从 auth store 输出
const roleLabel = computed(() => authRoleLabel.value)
const identityCode = computed(() => authIdentityCode.value)
const createdAtDisp = computed(() => currentUser.value?.created_at || currentUser.value?.createdAt || localStorage.getItem('createdAt') || '--')
const lastLoginAtDisp = computed(() => currentUser.value?.last_login_at || currentUser.value?.lastLoginAt || localStorage.getItem('lastLoginAt') || '--')
</script>
<style scoped>
.user-dashboard-shell { display:flex; flex-direction:column; min-height:100vh; }
/* 顶部导航条样式 */
.topbar { position:sticky; top:0; z-index:50; height:56px; background:#ffffff; border-bottom:1px solid #e5e8ef; display:flex; align-items:center; justify-content:space-between; padding:0 18px; }
.tb-left { display:flex; align-items:center; gap:20px; }
.logo { display:flex; align-items:center; gap:8px; font-size:18px; font-weight:700; letter-spacing:.5px; color:#1f2d3d; cursor:pointer; }
.logo:hover { color:#2563eb; }
/* 顶栏TrustForm品牌图标尺寸 */
.logo-img{ height:60px; width:auto; display:block; }
.logo-title{ line-height:1; }
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

.survey-list-page { display: flex; min-height: calc(100vh - 56px); background: linear-gradient(115deg,#eef3ff,#f8faff 60%,#f0f4ff); }
.sidebar { width: 230px; background: #fff; padding: 32px 20px 40px; border-right: 1px solid #e5e8ef; box-shadow: 4px 0 18px -8px rgba(64,158,255,.12); display:flex; flex-direction:column; }
.create-btn { width: 100%; margin-bottom: 24px; padding: 12px; background: linear-gradient(90deg,#409eff,#66b1ff); color: #fff; border: none; border-radius: 8px; font-size: 18px; font-weight: 500; cursor: pointer; box-shadow: 0 2px 8px rgba(64,158,255,.08); transition: background .2s; }
.create-btn:hover { background: linear-gradient(90deg,#66b1ff,#409eff); }
.nav { list-style: none; padding: 0; margin: 0; display:flex; flex-direction:column; gap:6px; }
.nav li { display:flex; align-items:center; gap:10px; padding:10px 12px; color:#334155; cursor:pointer; font-size:15px; border-radius:10px; transition: background .18s, color .18s, box-shadow .18s, border-color .18s; border:1px solid transparent; position:relative; }
.nav li:hover { background:#f1f5f9; color:#1f2937; border-color:#e5e7eb; }
.nav li:before { content:""; width:6px; height:6px; border-radius:50%; background:#cbd5e1; flex:0 0 auto; }
.nav li.active { background:#eef2ff; color:#1d4ed8; font-weight:600; border-color:#c7d2fe; box-shadow: inset 0 0 0 1px #e0e7ff; }
.nav li.active:before { background:#1d4ed8; box-shadow:0 0 0 4px rgba(29,78,216,.15); border-radius:50%; }
.main-content { flex: 1; padding: 48px 56px 80px; overflow-y:auto; }
.content-inner { max-width: 1280px; margin: 0 auto; }
.toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom: 28px; gap:32px; flex-wrap:wrap; }
.toolbar-left { display:flex; align-items:center; gap:16px; flex-wrap:wrap; }
.toolbar-right { display:flex; align-items:center; gap:12px; }
.search-input { width: 340px; padding: 10px 16px; border: 1px solid #dcdfe6; border-radius: 8px; font-size: 16px; background: #f8fbff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.4); }
.search-input:focus { outline: none; border-color:#409eff; background:#fff; box-shadow:0 0 0 3px rgba(64,158,255,.15); }
.search-btn { padding: 10px 24px; background: linear-gradient(90deg,#409eff,#66b1ff); color: #fff; border: none; border-radius: 8px; font-size: 16px; font-weight: 500; cursor: pointer; box-shadow: 0 2px 8px rgba(64,158,255,.20); transition: background .25s, transform .25s; }
.search-btn:hover { background: linear-gradient(90deg,#66b1ff,#409eff); }
.search-btn:active { transform:translateY(2px); }
.sort-select { padding: 10px 14px; border:1px solid #dcdfe6; border-radius:8px; background:#fff; font-size:14px; cursor:pointer; min-width:140px; }
.sort-select:focus { outline:none; border-color:#409eff; box-shadow:0 0 0 3px rgba(64,158,255,.15); }
.survey-list { display: flex; flex-direction: column; gap: 12px; }
.survey-list.grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(360px,1fr)); gap:28px; }
.survey-list.grid .survey-card { margin:0; height:100%; display:flex; flex-direction:column; }
.view-switch { display:flex; border:1px solid #dcdfe6; border-radius:10px; overflow:hidden; }
.view-btn { background:#fff; border:0; padding:8px 14px; cursor:pointer; font-size:16px; line-height:1; color:#5b6775; transition:.25s; }
.view-btn:hover { background:#f1f6ff; color:#409eff; }
.view-btn.active { background:linear-gradient(90deg,#409eff,#66b1ff); color:#fff; box-shadow:0 2px 6px rgba(64,158,255,.35); }
.survey-card { background:#fff; border-radius:10px; border:1px solid #e2e8f0; padding:16px 26px 18px; margin-bottom:0; transition:background .2s,border-color .2s; }
.survey-card:hover { background:#fcfdff; border-color:#d5dde7; }
.skeleton-wrapper { display:flex; flex-direction:column; gap:24px; }
.skeleton-card { background:#fff; border-radius:12px; padding:26px 32px 30px; box-shadow:0 4px 18px rgba(64,158,255,.05); }
.shimmer { position:relative; overflow:hidden; background:linear-gradient(90deg,#eef3f9 8%,#f5f9ff 18%,#eef3f9 33%); background-size:200% 100%; animation:shimmer 1.3s linear infinite; }
@keyframes shimmer { 0% { background-position:200% 0;} 100% { background-position:-200% 0;} }
.skeleton-title { height:26px; width:38%; border-radius:8px; margin-bottom:18px; }
.skeleton-meta { height:14px; width:55%; border-radius:6px; }
.skeleton-actions { margin-top:28px; display:flex; gap:14px; }
.skeleton-btn { height:34px; width:96px; border-radius:10px; }
.card-head-row { display:flex; justify-content:space-between; align-items:flex-start; gap:24px; padding:2px 0 0; }
.head-left { display:flex; align-items:center; gap:8px; min-width:0; }
.head-right { display:flex; align-items:center; gap:12px; flex-wrap:wrap; font-size:12px; color:#5b6775; }
.title { font-size:16px; font-weight:600; color:#1f2d3d; max-width:420px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.answers-emphasis { position:relative; display:inline-flex; align-items:baseline; gap:4px; background:rgba(37,99,235,.08); border:1px solid rgba(37,99,235,.25); padding:2px 10px 3px; border-radius:999px; line-height:1; font-weight:500; color:#1e3a8a; font-size:12px; }
.answers-number { font-size:15px; font-weight:600; letter-spacing:.5px; color:#1d4ed8; }
.answers-emphasis:hover { background:rgba(37,99,235,.12); }
.answers-emphasis:after { content:attr(data-count); position:absolute; inset:0; opacity:0; pointer-events:none; }
.badge { display:inline-flex; align-items:center; line-height:1; font-size:12px; padding:4px 10px 5px; border-radius:20px; font-weight:500; letter-spacing:.5px; }
.badge.status { background:#eaf6ff; color:#409eff; }
.badge.status.已结束 { background:#ffecec; color:#e74c3c; }
.badge.status.已发布 { background:#eaf6ff; color:#409eff; }
.badge.type { background:#f2f1ff; color:#6f62ff; }
.meta { line-height:1.4; }
.meta.share-id { 
  background: #f0f9ff; 
  color: #0284c7; 
  padding: 2px 6px; 
  border-radius: 4px; 
  font-size: 12px; 
  font-weight: 500;
  cursor: default;
}
.g-share-id { 
  background: #f0f9ff; 
  color: #0284c7; 
  padding: 2px 6px; 
  border-radius: 4px; 
  font-size: 11px; 
  font-weight: 500;
  cursor: default;
}
.g-id-row { 
  margin-top: 4px; 
  display: flex; 
  justify-content: flex-start; 
}
.dot { width:4px; height:4px; border-radius:50%; background:#c0ccda; display:inline-block; }
.divider { height:1px; background:#e5e8ef; margin:10px 0 12px; }
.card-actions { display:flex; flex-wrap:wrap; gap:10px; }
.card-actions.split { justify-content:space-between; align-items:flex-start; gap:24px; }
.actions-left, .actions-right { display:flex; flex-wrap:wrap; gap:10px; }
.actions-right { justify-content:flex-end; }
.action-btn.primary { background:#eaf2ff; border-color:#c3d9f8; color:#1d4ed8; }
.action-btn.primary:hover { background:#d9e9ff; }
.action-btn { background:#f5f7fb; border:1px solid #e5e8ef; border-radius:6px; padding:6px 18px; font-size:13px; cursor:pointer; color:#2563eb; font-weight:500; line-height:1; display:inline-flex; align-items:center; gap:6px; transition:background .18s,border-color .18s,color .18s; }
.action-btn:hover { background:#eaf2ff; border-color:#c3d9f8; }
.action-btn:active { background:#d7e9ff; }
/* 设计问卷右侧下三角 */
.action-btn .caret-small { font-size: 14px; line-height: 1; color: #2563eb; opacity: .9; }
.survey-list.grid { grid-template-columns: repeat(auto-fill,minmax(240px,1fr)); gap:20px; }
.survey-card.grid { padding:0; background:transparent; border:none; }
.g-card { position:relative; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px 16px; display:flex; flex-direction:column; gap:8px; min-height:170px; }
.g-card:hover { border-color:#cfd8e3; }
.g-top { display:flex; flex-direction:column; gap:6px; }
.g-type-line { display:flex; justify-content:space-between; align-items:center; }
.g-badge { background:#eef2ff; color:#1d4ed8; font-size:12px; padding:2px 8px 3px; border-radius:6px; font-weight:500; }
.g-menu-trigger { cursor:pointer; padding:2px 6px; border-radius:6px; color:#64748b; font-size:18px; line-height:1; }
.g-menu-trigger:hover { background:#f1f5f9; color:#1f2d3d; }
.g-title { font-size:15px; font-weight:600; line-height:1.4; max-height:3.0em; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; }
.g-middle { display:flex; align-items:center; gap:6px; font-size:12px; color:#64748b; }
.g-status { font-weight:500; }
.g-status.已结束 { color:#dc2626; }
.g-status.已发布 { color:#16a34a; }
.g-dot { width:4px; height:4px; border-radius:50%; background:#cbd5e1; }
.g-answers { font-weight:500; color:#1d4ed8; }
.g-bottom { margin-top:auto; font-size:12px; color:#94a3b8; }
.g-menu { position:absolute; top:34px; right:8px; width:160px; background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:6px 0; box-shadow:0 8px 24px -4px rgba(15,23,42,.12); z-index:20; animation:fadeInScale .18s ease; }
.g-menu ul { list-style:none; margin:0; padding:0; }
.g-menu li { padding:8px 14px; font-size:13px; cursor:pointer; display:flex; align-items:center; color:#334155; }
.g-menu li:hover { background:#f1f5f9; }
.g-menu li.sep { height:1px; padding:0; margin:4px 0; background:#e2e8f0; cursor:default; }
.g-menu li.danger { color:#dc2626; }
.g-menu li.danger:hover { background:#fef2f2; }
@keyframes fadeInScale { from { opacity:0; transform:translateY(-4px) scale(.96);} to { opacity:1; transform:translateY(0) scale(1);} }
.loading { text-align: center; color: #888; font-size: 18px; margin: 60px 0; }
.empty { text-align: center; color: #888; font-size: 18px; margin: 60px 0; }
.tip { margin-top: 16px; font-size: 16px; color: #409eff; }
.team-placeholder { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:36px 40px 44px; box-shadow:0 2px 6px rgba(0,0,0,.03); }
.team-placeholder h3 { margin:0 0 14px; font-size:20px; font-weight:600; }
.team-placeholder .desc { margin:0 0 20px; font-size:14px; color:#5b6775; line-height:1.6; }
.team-placeholder .actions { display:flex; gap:14px; margin-bottom:26px; }
.team-btn { background:#2563eb; color:#fff; border:none; padding:10px 22px; font-size:14px; border-radius:8px; cursor:pointer; font-weight:500; box-shadow:0 2px 6px rgba(37,99,235,.25); }
.team-btn.secondary { background:#f1f5f9; color:#1e3a8a; box-shadow:none; border:1px solid #d8e2ec; }
.team-btn.secondary:hover { background:#e2e8f0; }
.team-btn:hover { filter:brightness(1.05); }
.team-btn.tertiary { background:#eef2ff; color:#1d4ed8; border:1px solid #c7d2fe; box-shadow:none; }
.team-btn:disabled { cursor:not-allowed; opacity:.55; filter:none; }
.team-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin-bottom:18px; }
.team-stat-card { background:linear-gradient(180deg,#f8fbff,#eef4ff); border:1px solid #d9e6ff; border-radius:12px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; }
.team-stat-card .label { font-size:12px; color:#64748b; }
.team-stat-card strong { font-size:24px; line-height:1; color:#0f172a; }
.team-inline-note { margin-bottom:18px; padding:12px 14px; border-radius:10px; background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; font-size:13px; line-height:1.6; }
.department-panels { display:grid; grid-template-columns:repeat(auto-fit,minmax(360px,1fr)); gap:18px; margin-bottom:22px; }
.department-panel { border:1px solid #e2e8f0; border-radius:12px; background:#f8fbff; padding:14px; }
.panel-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; gap:12px; }
.panel-head h4 { margin:0; font-size:15px; color:#0f172a; }
.panel-head span { font-size:12px; color:#64748b; }
.member-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.import-help { margin-top:6px; padding:12px 14px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:10px; color:#475569; font-size:13px; line-height:1.7; }

/* ===== 通知抽屉样式优化 ===== */
.notif-btn { border:none; background:transparent; cursor:pointer; padding:6px; border-radius:6px; }
.notif-btn:hover { background: rgba(0,0,0,0.05); }
.notif-drawer { display:flex; flex-direction:column; gap:8px; }
.notif-toolbar { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
.notif-toolbar :deep(.el-radio-button__inner) { font-size:14px; padding:6px 12px; }
.notif-toolbar :deep(.el-button.is-text) { font-size:14px; }
.notif-list { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
.notif-item { border:1px solid var(--el-border-color-light); border-left:3px solid transparent; border-radius:8px; padding:10px 12px; cursor:default; transition: background .2s, box-shadow .2s; }
.notif-item:hover { background: var(--el-fill-color-light); box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
.notif-item.unread { background:#fff; box-shadow: 0 1px 6px rgba(0,0,0,0.06); }
.notif-item.lvl-success { border-left-color: var(--el-color-success); }
.notif-item.lvl-warning { border-left-color: var(--el-color-warning); }
.notif-item.lvl-error { border-left-color: var(--el-color-danger); }
.notif-item.lvl-info { border-left-color: var(--el-color-info); }
.notif-title { display:flex; align-items:center; gap:6px; font-weight:700; font-size:15px; }
.notif-content { color: var(--el-text-color-secondary); margin-top:4px; font-size:14px; }
.notif-meta { display:flex; align-items:center; gap:6px; margin-top:6px; font-size:12px; color: var(--el-text-color-secondary); }
.notif-meta .dot { width:4px; height:4px; background: var(--el-text-color-secondary); border-radius:50%; display:inline-block; }
.notif-empty { text-align:center; color: var(--el-text-color-secondary); padding:20px 0; }
.notif-loading { padding: 8px 0; }
.notif-loading .bar { height: 42px; border-radius:8px; background: var(--el-fill-color-light); margin-bottom:8px; }
.shimmer { position:relative; overflow:hidden; }
.shimmer::after { content:''; position:absolute; inset:0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent); animation: shimmer 1.2s infinite; transform: translateX(-100%); }
@keyframes shimmer { 0%{ transform: translateX(-100%);} 100%{ transform: translateX(100%);} }
.profile-center { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:20px; }
.form-block { max-width:520px; padding-top:10px; }
.state.active { display:inline-block; background:#e7f6ec; color:#16a34a; border:1px solid #b7e2c3; padding:2px 8px; border-radius:999px; font-size:12px; font-weight:600; }
.feature-hints { list-style:disc; padding-left:20px; margin:0; display:grid; gap:6px; font-size:13px; color:#475569; }
/* 面包屑与文件夹 */
.crumb { color:#64748b; font-size:13px; }
.crumb a { color:#2563eb; text-decoration:none; }
.crumb .sep { color:#94a3b8; }
.folder-area { margin-bottom:8px; }
.folder-toolbar { display:flex; gap:10px; margin:8px 0 6px; align-items:center; }
.folder-grid { display:flex; flex-wrap:wrap; gap:14px; }
.folder-card { width:200px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; cursor:pointer; transition:box-shadow .18s, transform .12s, border-color .18s, background .18s; box-shadow:0 2px 10px rgba(15,23,42,.04); }
.folder-card:hover { border-color:#cfd8e3; background:#fbfdff; box-shadow:0 8px 22px -6px rgba(15,23,42,.12); transform: translateY(-1px); }
.folder-card .f-ico { font-size:22px; color:#f59e0b; text-shadow:0 1px 0 rgba(0,0,0,.02); }
.folder-card .f-name { font-weight:700; margin-top:6px; color:#0f172a; letter-spacing:.2px; }
.folder-card .f-meta { color:#64748b; font-size:12px; margin-top:4px; }
.folder-card .f-ops { display:flex; gap:12px; margin-top:10px; }
.folder-card .f-ops a { color:#2563eb; font-size:12px; text-decoration:none; }
.folder-card .f-ops a:hover { text-decoration:underline; }
/* 更醒目的“当前位置”样式，显示在新建按钮的右侧 */
.crumb-hero { font-size:18px; font-weight:700; color:#0f172a; background:linear-gradient(180deg,#ffffff,#f8fbff); padding:8px 12px; border-radius:10px; border:1px solid #e2e8f0; box-shadow:0 2px 6px rgba(15,23,42,.06); display:inline-flex; align-items:center; }
.crumb-hero .crumb-label { color:#64748b; font-weight:600; margin-right:4px; }
.crumb-hero a { color:#1d4ed8; text-decoration:none; font-weight:600; }
.crumb-hero a:hover { text-decoration:underline; }
.crumb-hero .sep { color:#94a3b8; padding:0 6px; }
/* 回收站 */
.trash-list { background:transparent; }
.trash-tipbar { display:flex; justify-content:space-between; align-items:center; gap:12px; background:#fff7ed; border:1px solid #fed7aa; color:#9a3412; padding:10px 12px; border-radius:10px; margin-bottom:12px; }
.trash-tipbar .tip-text { font-size:13px; }
.trash-batchbar { display:flex; align-items:center; gap:10px; background:#eff6ff; border:1px solid #bfdbfe; color:#0c4a6e; padding:8px 12px; border-radius:10px; margin:8px 0; }
.trash-batchbar .spacer { flex:1; }
.trash-grid { display:grid; grid-template-columns: repeat(auto-fill,minmax(320px,1fr)); gap:16px; }
.trash-card { background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:14px 16px; box-shadow:0 2px 10px rgba(15,23,42,.04); }
.trash-card:hover { border-color:#cfd8e3; }
.trash-card .t-head { display:flex; justify-content:space-between; align-items:center; gap:10px; }
.trash-card .t-title { font-weight:600; color:#0f172a; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.trash-card .t-badge { background:#fee2e2; color:#b91c1c; font-size:12px; padding:2px 8px; border-radius:999px; font-weight:600; }
.trash-card .t-meta { margin-top:6px; color:#64748b; display:flex; gap:8px; align-items:center; font-size:12px; }
.trash-card .t-dot { width:4px; height:4px; border-radius:50%; background:#cbd5e1; display:inline-block; }
.trash-card .t-actions { margin-top:10px; display:flex; gap:10px; }
</style>
