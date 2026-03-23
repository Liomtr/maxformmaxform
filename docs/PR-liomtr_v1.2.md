# PR: liomtr_v1.2

## 标题

feat: 收口组织管理、文件夹/消息/审计日志、问卷回收站，并补齐系统冒烟入口与测试文档

## 分支信息

- 当前本地分支：`liomtr_v1`
- 本次 PR 文档版本：`liomtr_v1.2`
- 建议 PR 分支名：`liomtr_v1.2`
- 目标分支：`main`

说明：

- 当前仓库实际工作分支仍是 `liomtr_v1`。
- 本文档按“准备发起 v1.2 轮次 PR”整理，如需与文档保持一致，发起 PR 前可将分支整理为 `liomtr_v1.2`。

## 摘要

本次 PR 不是单点修复，而是对一批“前端已有入口、后端能力不完整”的模块做集中收口，主要包括：

1. 组织管理从仅可创建推进到可编辑、可删除、可清理成员归属。
2. 成员导入从前端伪逻辑改为真实后端导入接口，并补齐统计结果。
3. 文件夹、消息、审计日志从占位接口推进到真实后端接口与前端联通。
4. 问卷删除改为进入回收站，补齐恢复、彻底删除、清空回收站链路。
5. 为关键管理动作补轻量审计日志与消息通知。
6. 补齐后端自动化测试、系统冒烟脚本与前端 npm 冒烟入口，并更新当日测试报告。

## 主要改动

### 1. 组织管理与成员导入收口

后端：

- `backend/src/models/Dept.js`
- `backend/src/routes/depts.js`
- `backend/src/routes/users.js`

前端：

- `frontend/src/views/UserDashboard.vue`
- `frontend/src/api/userAdmin.ts`

主要内容：

- 工作台中的团队/部门区域接入真实部门与成员数据。
- 补齐部门创建、编辑、删除。
- 删除部门时增加后端保护：
  - 存在子部门时拒绝删除
  - 存在成员时先清空成员 `dept_id`
- 成员导入改为真实接口 `POST /api/users/import`
- 导入结果统一返回 `created / skipped / errors`
- 工作台补齐成员编辑、启停、重置密码、删除等动作

### 2. 文件夹、消息、审计日志去占位

后端：

- `backend/app.js`
- `backend/src/db/migrate.js`
- `backend/src/models/Folder.js`
- `backend/src/models/Message.js`
- `backend/src/models/AuditLog.js`
- `backend/src/routes/folders.js`
- `backend/src/routes/messages.js`
- `backend/src/routes/audits.js`
- `backend/src/services/activity.js`

前端：

- `frontend/src/api/folders.ts`
- `frontend/src/api/messages.ts`
- `frontend/src/api/audits.ts`
- `frontend/src/router/index.ts`
- `frontend/src/views/UserDashboard.vue`

主要内容：

- 新增 `folders`、`messages`、`audit_logs` 数据结构与对应模型。
- 接入真实文件夹列表、创建、重命名、删除能力。
- 删除文件夹时，将其下问卷迁回根目录，避免悬空归属。
- 接入真实消息列表、过滤、已读接口。
- 接入真实审计日志分页与筛选接口。
- 管理端补上 `/admin/messages`、`/admin/approval`、`/admin/positions` 路由入口。

### 3. 问卷回收站链路落地

后端：

- `backend/src/models/Answer.js`
- `backend/src/routes/surveys.js`

前端：

- `frontend/src/api/surveys.ts`
- `frontend/src/views/UserDashboard.vue`

主要内容：

- 问卷删除从物理删除改为软删除进入回收站。
- 补齐：
  - `GET /api/surveys/trash`
  - `POST /api/surveys/:id/restore`
  - `DELETE /api/surveys/:id/force`
  - `DELETE /api/surveys/trash`
- 清空回收站或彻底删除问卷时，同步清理答卷数据。
- 前端回收站改为真实 HTTP 调用，不再是纯展示壳。

### 4. 审计与消息通知补齐

相关文件：

- `backend/src/services/activity.js`
- `backend/src/routes/depts.js`
- `backend/src/routes/users.js`
- `backend/src/routes/surveys.js`
- `backend/src/routes/folders.js`

主要内容：

- 抽出统一活动服务，集中写入审计日志与用户消息。
- 以下操作纳入审计：
  - 部门创建、编辑、删除
  - 用户创建、导入、编辑、重置密码、删除
  - 问卷创建、发布、关闭、移动文件夹、回收站操作
  - 文件夹创建、编辑、删除
- 以下操作可生成用户可见消息：
  - 部门创建、删除
  - 用户导入完成
  - 问卷发布、关闭
  - 文件夹创建、删除
  - 问卷收到新提交

### 5. 冒烟脚本与前端测试入口补齐

相关文件：

- `scripts/system-smoke.mjs`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/测试报告-2026-03-23.md`

主要内容：

- 新增前端 npm 脚本：
  - `npm run smoke:system`
  - `npm run test:e2e`
- 补充 `playwright` 依赖与入口占位。
- 修复 `system-smoke.mjs` 初始化顺序问题：
  - 先写入默认环境变量到 `process.env`
  - 再动态加载数据库相关模块
- 修复后，`frontend/` 目录下可直接执行 `npm run smoke:system`

## 验证

### 1. 系统联调冒烟

执行命令：

```bash
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='3309'
$env:DB_USER='root'
$env:DB_PASSWORD='123456'
$env:DB_NAME='survey_system'
$env:FRONTEND_URL='http://127.0.0.1:63000'
$env:PORT='63102'
node scripts/system-smoke.mjs
```

结果：

- 通过
- runId：`20260323083958`
- 31 / 31 通过

### 2. 前端 npm 冒烟入口

执行命令：

```bash
cmd /c npm run smoke:system
```

执行目录：

- `frontend/`

结果：

- 通过
- runId：`20260323084318`
- 31 / 31 通过

### 3. 后端自动化测试

执行命令：

```bash
cmd /c npm test
```

执行目录：

- `backend/`

结果：

- 通过
- 5 / 5 通过

覆盖重点：

- 删除有子部门的部门
- 删除部门时清理成员归属
- 用户导入统计
- 问卷进入回收站
- 清空回收站时级联清理答卷

### 4. 前端构建

执行命令：

```bash
cmd /c npm run build
```

执行目录：

- `frontend/`

结果：

- 通过
- `vue-tsc --noEmit` 通过
- `vite build` 通过

### 5. Playwright 入口校验

执行命令：

```bash
cmd /c npm run test:e2e
```

执行目录：

- `frontend/`

结果：

- 当前未通过
- 错误：`Error: No tests found`

说明：

- 本次已补齐依赖和 npm 入口。
- 但仓库中尚无实际浏览器自动化测试用例。

## 风险与说明

- 前端构建仍存在大 chunk 告警，本次未处理拆包优化。
- `Playwright` 入口已存在，但还未形成实际 e2e 覆盖，不应将其误判为“自动化 UI 测试已完成”。
- `positions` 仍偏占位模块，本次未收口为完整领域能力。
- 当前数据库迁移仍偏初始化脚本风格，后续 schema 演进成本仍需关注。

## 不建议纳入本次 PR 的内容

- `frontend/test-results/.last-run.json`

说明：

- 该文件是本地执行 `Playwright` 后生成的测试产物，不属于源码变更。

## 建议评审重点

1. 部门删除、成员导入、回收站清理三条后端边界是否符合预期。
2. 文件夹、消息、审计日志是否已真正摆脱占位接口。
3. 工作台 `UserDashboard` 中新增的组织管理、文件夹、回收站交互是否与后端契约一致。
4. `system-smoke.mjs` 的初始化顺序调整是否足够稳健。
5. 是否需要在下一轮 PR 中补首批 Playwright 用例，而不是只保留入口。

## 关联文档

- `docs/开发日志-2026-03-23.md`
- `docs/测试报告-2026-03-23.md`
- `docs/项目功能清单与风险分析.md`
