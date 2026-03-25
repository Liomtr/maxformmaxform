# PR: liomtr_v1.2

## 标题

`feat: 收口组织管理、文件夹/消息/审计、问卷回收站、上传校验，并补齐结果页统计与答卷管理链路`

## 分支信息

- 当前本地工作分支：`liomtr_v1`
- 本次 PR 文档版本：`liomtr_v1.2`
- 建议 PR 分支名：`liomtr_v1.2`
- 目标分支：`main`

说明：

- 当前仓库实际工作分支仍是 `liomtr_v1`。
- 本文档按“准备发起 v1.2 轮次 PR”的方式整理。

## 摘要

本次 PR 不是单点修复，而是一次面向“已有入口但能力未收口”模块的集中推进，主要包括：

1. 组织管理从仅能展示推进到可创建、编辑、删除，并补齐成员归属清理。
2. 成员导入从前端伪逻辑切换为真实后端导入接口。
3. 文件夹、消息、审计日志从占位接口推进到真实后端能力。
4. 问卷删除改为进入回收站，并补齐恢复、彻底删除、清空链路。
5. 上传题形成公共上传与提交校验闭环。
6. 问卷结果页补齐题目级统计与系统环境统计。
7. 结果页中的“查看答卷 / 导出数据”推进到真实答卷管理和导出链路。
8. 补齐系统冒烟入口、后端自动化测试和前端构建验证。

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
- 工作台补齐成员编辑、启停、重置密码、删除等操作

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

- 新增 `folders`、`messages`、`audit_logs` 数据结构与模型。
- 接入真实文件夹列表、创建、重命名、删除能力。
- 删除文件夹时将其中问卷迁回根目录，避免悬空归属。
- 接入真实消息列表、标记已读接口。
- 接入真实审计日志分页与筛选接口。
- 管理端补齐 `/admin/messages`、`/admin/approval` 等路由入口。

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
- 前端回收站改为真实 HTTP 调用，不再是展示壳。

### 4. 上传题与提交校验闭环

后端：

- `backend/src/models/File.js`
- `backend/src/routes/files.js`
- `backend/src/routes/surveys.js`
- `backend/src/utils/questionSchema.js`
- `backend/src/utils/uploadStorage.js`
- `backend/test/routes.test.js`

前端：

- `frontend/src/utils/uploadQuestion.ts`
- `frontend/src/views/survey/FillSurveyPage.vue`
- `frontend/src/views/survey/FillSurveyMobilePage.vue`
- `frontend/src/views/survey/CreateSurveyPage.vue`

主要内容：

- 为上传题补齐公共上传接口与文件元数据存储。
- 提交答卷时对上传 token、题号绑定、最大文件数进行校验。
- 前端统一上传题配置、帮助文案与本地校验逻辑。
- 后端自动化测试覆盖上传题的关键异常路径。

### 5. 问卷结果页统计与答卷管理收口

后端：

- `backend/src/routes/surveys.js`
- `backend/test/routes.test.js`

前端：

- `frontend/src/api/surveys.ts`
- `frontend/src/api/surveyAnswers.ts`
- `frontend/src/views/survey/ResultsPage.vue`
- `frontend/src/views/survey/SurveyAnswersPanel.vue`
- `frontend/src/views/survey/AnswerManagementPage.vue`

主要内容：

- `GET /api/surveys/:id/results` 补齐题目级统计，不再只有汇总值。
- 结果接口补充系统环境聚合：
  - `devices`
  - `browsers`
  - `operatingSystems`
- `SurveyAnswersPanel.vue` 改为消费真实 `questionStats` 与 `systemStats`。
- 结果页中的“查看答卷”按钮跳转到真实答卷管理页。
- 结果页中的“导出数据”按钮接通 `/answers/download/survey`。
- `AnswerManagementPage.vue` 重构为可用答卷管理页，支持：
  - 路由自动带入 `surveyId`
  - 分页查看答卷
  - 显示提交时间、状态、IP、耗时、答案预览
  - 单条删除
  - Excel 导出

当前边界：

- 附件批量下载尚未落地后端接口，本次仅保留显式待办提示。

### 6. 冒烟脚本、测试与构建入口补齐

相关文件：

- `scripts/system-smoke.mjs`
- `frontend/package.json`
- `frontend/package-lock.json`
- `docs/测试报告-2026-03-24.md`

主要内容：

- 保留并验证仓库级系统冒烟入口。
- 补齐前端目录可直接执行的 `npm run smoke:system`。
- 验证后端自动化测试与前端构建入口可稳定执行。
- Playwright 入口已具备，但仓库中尚无实际用例。

## 验证

### 1. 系统联调冒烟

结果：

- 通过
- runId：`20260324061018`
- `31 / 31` 通过

### 2. 前端 npm 冒烟入口

结果：

- 通过
- runId：`20260324061046`
- `31 / 31` 通过

### 3. 后端自动化测试

结果：

- 通过
- `11 / 11` 通过

覆盖重点：

- 部门删除保护与成员归属清理
- 成员导入统计
- 问卷回收站
- 结果接口题目级统计
- 上传题公共上传与提交校验

### 4. 前端构建

结果：

- 通过
- `vue-tsc --noEmit` 通过
- `vite build` 通过

### 5. Playwright 入口校验

结果：

- 未通过
- 错误：`Error: No tests found`

说明：

- 本次已补齐依赖与 npm 入口。
- 但仓库中仍无实际浏览器自动化测试用例。

## 风险与说明

- 前端构建仍存在大 chunk 警告，本次未处理拆包优化。
- `Playwright` 入口已存在，但还不能被视为“已具备 UI 自动化回归”。
- 附件批量下载仍未落地后端接口。
- `positions` 仍偏占位模块，本次未收口为完整业务能力。
- `rating / scale / matrix` 等高级题型仍未形成完整统计闭环。

## 建议评审重点

1. 部门删除、成员导入、回收站清理三条后端边界是否符合预期。
2. 文件夹、消息、审计日志是否已真正摆脱占位接口。
3. 上传题 token、数量、题号绑定校验是否足够稳妥。
4. 结果页统计输出结构是否与前端使用方式一致。
5. 结果页到答卷管理页、答卷导出的链路是否满足当前业务需求。
6. 是否需要在下一轮 PR 中优先补附件批量下载与首批 Playwright 用例。

## 关联文档

- `docs/开发日志-2026-03-24.md`
- `docs/测试报告-2026-03-24.md`
- `docs/题型现状评估与丰富题型阶段建议.md`
- `docs/项目功能清单与风险分析.md`
