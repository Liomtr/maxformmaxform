# PR: liomtr_v1.3

## 标题

`feat: 收口职位管理、上传/附件下载链路、结果统计增强与 55 项系统冒烟覆盖`

## 分支信息

- 当前本地工作分支：`liomtr_v1.2`
- 本次 PR 文档版本：`liomtr_v1.3`
- 建议 PR 分支名：`liomtr_v1.3`
- 目标分支：`main`

说明：

- 当前工作区是在 `liomtr_v1.2` 基础上继续推进形成的增量。
- 本文档用于整理 v1.3 轮次 PR 的变更范围与验证结果。

## 摘要

本次 PR 继续沿“把已有入口收口成真实能力”的方向推进，重点集中在四块：

1. 新增职位管理后端接口与管理端页面，补齐职位增删改查。
2. 收口上传题链路，补齐公共上传、提交校验、附件打包下载与答卷导出链路。
3. 增强结果页统计，补齐地区、设备、浏览器、操作系统与题目级统计输出，并打通答卷管理页。
4. 重写系统冒烟脚本，将系统联调覆盖从 `31 / 31` 扩展到 `55 / 55`，同时扩展后端自动化测试到 `15 / 15`。

## 主要改动

### 1. 职位管理从占位到可用

后端：

- `backend/src/models/Position.js`
- `backend/src/routes/positions.js`
- `backend/src/db/migrate.js`
- `backend/app.js`

前端：

- `frontend/src/api/positions.ts`
- `frontend/src/views/admin/Positions.vue`

主要内容：

- 新增 `positions` 数据模型与迁移。
- 提供真实职位管理接口：
  - `GET /api/positions`
  - `POST /api/positions`
  - `PUT /api/positions/:id`
  - `DELETE /api/positions/:id`
- 创建和更新职位时校验 `code` 唯一性。
- 管理端职位页面接入真实接口，不再停留在空壳页面。

### 2. 上传题与附件下载链路收口

后端：

- `backend/src/models/File.js`
- `backend/src/routes/files.js`
- `backend/src/routes/answers.js`
- `backend/src/routes/surveys.js`
- `backend/src/utils/questionSchema.js`
- `backend/src/utils/uploadStorage.js`

前端：

- `frontend/src/api/surveyAnswers.ts`
- `frontend/src/views/survey/FillSurveyPage.vue`
- `frontend/src/views/survey/FillSurveyMobilePage.vue`
- `frontend/src/views/survey/SurveyAnswersPanel.vue`
- `frontend/src/views/survey/AnswerManagementPage.vue`
- `frontend/src/utils/uploadQuestion.ts`

主要内容：

- 上传题继续沿真实文件存储链路推进，完善文件元数据和提交校验。
- 公共上传接口已能为已发布问卷提供上传能力。
- 提交答卷时继续校验：
  - upload token 是否有效
  - 文件是否绑定到正确题号
  - 是否超过题目 `maxFiles`
- 新增答卷附件打包下载接口：
  - `POST /api/answers/download/attachments`
- 现有答卷 Excel 导出接口继续复用：
  - `POST /api/answers/download/survey`
- 前端结果页与答卷管理页都已接入附件 zip 下载与 Excel 导出能力。

当前边界：

- 上传题正向提交流程当前仍依赖答案里携带 `name / type / size / id / uploadToken` 这组文件元数据。
- 如果后续希望进一步降低前端负担，可考虑服务端先按 file id 解出文件信息，再做类型校验。

### 3. 结果统计与答卷管理增强

后端：

- `backend/src/routes/surveys.js`
- `backend/src/routes/answers.js`
- `backend/test/routes.test.js`

前端：

- `frontend/src/api/surveys.ts`
- `frontend/src/api/surveyAnswers.ts`
- `frontend/src/views/survey/ResultsPage.vue`
- `frontend/src/views/survey/SurveyAnswersPanel.vue`
- `frontend/src/views/survey/AnswerManagementPage.vue`

主要内容：

- `GET /api/surveys/:id/results` 继续增强，补齐：
  - 题目级统计
  - 地区聚合结果
  - 设备统计
  - 浏览器统计
  - 操作系统统计
- 排序题、评分题、上传题等统计结构继续向前端消费方式收口。
- 结果页中的“查看答卷 / 导出数据 / 下载附件”已经接到真实接口。
- `AnswerManagementPage.vue` 现已支持：
  - 按问卷查看答卷列表
  - 分页查看
  - 删除单条答卷
  - 导出 Excel
  - 下载附件 zip

### 4. 编辑器与填答链路继续收口

相关文件：

- `frontend/src/constants/questionTypes.ts`
- `frontend/src/constants/survey.ts`
- `frontend/src/mappers/surveyMappers.ts`
- `frontend/src/types/survey.ts`
- `frontend/src/views/survey/CreateSurveyPage.vue`
- `frontend/src/views/survey/FillSurveyPage.vue`
- `frontend/src/views/survey/FillSurveyMobilePage.vue`
- `frontend/src/views/survey/usePreviewSurveyMapping.ts`
- `frontend/src/utils/questionTypeRegistry.ts`
- `shared/`

主要内容：

- 继续统一前后端题型映射，减少 legacy 编码与服务端字符串类型之间的散落映射。
- 将编辑器、预览、填答、提交校验进一步对齐到同一套题型注册表与配置。
- 移动端答题页继续复用桌面端稳定逻辑，减少重复实现。

### 5. 系统冒烟、自动化测试与验证入口扩容

相关文件：

- `scripts/system-smoke.mjs`
- `backend/test/routes.test.js`
- `frontend/vite.config.ts`
- `backend/package.json`
- `backend/package-lock.json`
- `frontend/package.json`

主要内容：

- 重写 `scripts/system-smoke.mjs`，统一封装 JSON、multipart、二进制下载请求。
- 将系统冒烟覆盖从 `31` 项扩展到 `55` 项。
- 新增系统冒烟覆盖：
  - 职位管理链路
  - 上传题公共上传与负向校验
  - 答卷列表查询
  - 问卷 Excel 导出
  - 附件 zip 下载
  - 结果统计增强断言
- 后端自动化测试从 `11` 扩展到 `15`。
- 当前后端自动化测试新增覆盖：
  - `GET /api/positions`
  - `POST /api/positions` 重复编码拦截
  - `GET /api/surveys/:id/results` 地区聚合
  - `POST /api/answers/download/attachments`

## 验证

### 1. 系统联调冒烟

结果：

- 通过
- runId：`20260325060823`
- `55 / 55` 通过

### 2. 前端 npm 冒烟入口

结果：

- 通过
- runId：`20260325060946`
- `55 / 55` 通过

### 3. 后端自动化测试

结果：

- 通过
- `15 / 15` 通过

当前覆盖重点：

- 部门删除保护与成员归属清理
- 成员导入统计
- 职位列表与重复编码校验
- 问卷回收站
- 结果接口题目级统计与地区聚合
- 附件 zip 下载
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

- Playwright 依赖和入口仍存在。
- 但仓库中当前仍无实际浏览器级自动化用例文件。

## 风险与说明

- 当前浏览器级 E2E 仍未落地，结果页到答卷管理页的点击、跳转、下载仍缺少自动化回归。
- 上传题正向提交流程仍对文件元数据输入结构有依赖，服务端契约可继续收敛。
- 前端构建仍存在大 chunk 警告，本次未处理拆包优化。
- `backend/uploads/` 目录包含运行期文件，不应作为功能源码的一部分进入 PR。

## 建议评审重点

1. 职位管理接口和管理端页面是否满足当前权限与业务预期。
2. 附件 zip 打包下载的权限边界、文件命名与目录结构是否合理。
3. 结果接口的地区、系统环境和题目统计结构是否足够稳定。
4. 上传题 token、题号绑定、文件数限制校验是否还有缺口。
5. 系统冒烟扩容到 `55 / 55` 后，是否已经覆盖当前主链路的关键回归点。

## 关联文档

- `docs/开发日志-2026-03-25.md`
- `docs/测试报告-2026-03-25.md`
- `docs/PR-liomtr_v1.2.md`
- `docs/项目功能清单与风险分析.md`
