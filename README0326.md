# 问易答调查系统

一个基于 `Vue 3 + TypeScript + Vite` 与 `Node.js + Express + MySQL` 的前后端分离调查问卷系统，覆盖问卷创建、发布、填写、回收、结果分析，以及基础的用户、角色、部门、职位、文件和审计能力。

当前仓库以真实可运行的社区版为目标，不是只展示页面的 Demo，也不是只开前端的半成品。项目主链路已经具备“创建问卷 -> 发布问卷 -> 公开填写 -> 查看结果 -> 导出答卷”的完整闭环，并保留持续扩展空间。

## 当前技术栈

- 前端：Vue 3、TypeScript、Vite、Element Plus、Pinia、Vue Router、Axios、ECharts
- 后端：Node.js、Express、Knex、MySQL、JWT、bcryptjs、multer、ExcelJS
- 测试：Node.js `node:test`、系统冒烟脚本、前端构建校验、Playwright 浏览器 E2E

## 当前能力概览

- 问卷创建、编辑、发布、关闭、回收站、彻底删除
- 公开分享、PC/移动端填写、截止时间控制、重复提交限制
- 题型校验、上传题两阶段提交、附件打包下载
- 结果页汇总指标、趋势图、题目统计、设备/浏览器/系统分布
- 答卷列表、Excel 导出、附件 zip 导出
- 用户、角色、部门、职位、文件夹、消息、审计日志

## 当前系统结构判断

当前系统已经不应再按早期“巨型页面 + 巨型路由”描述，更准确的口径是：

- 后端是 `Express + Knex + MySQL` 的模块化单体。
- 问卷域已形成 `route + policy + service + repository + transaction` 基本分层。
- 管理域已开始引入 `shared/management.contract.js`、service 与 repository，但整体分层强度仍低于问卷域。
- 前端编辑器已完成页面拆分和 composable 拆分两轮演进。
- `shared/questionTypeRegistry.js` 与 `shared/questionModel.js` 已是题型语义和统计口径的统一事实源。

## 仓库结构

```text
.
├─ backend/                 后端服务
│  ├─ server.js             启动入口
│  ├─ app.js                Express 装配层
│  ├─ initAdmin.js          初始化管理员脚本
│  ├─ scripts/              启动、迁移、种子脚本
│  ├─ src/config/           配置
│  ├─ src/db/               数据库连接、迁移、事务
│  ├─ src/models/           数据模型
│  ├─ src/routes/           API 路由
│  ├─ src/policies/         访问控制策略
│  ├─ src/services/         问卷域服务层
│  ├─ src/repositories/     聚合仓储
│  ├─ src/utils/            题型校验、上传存储等
│  └─ test/                 路由与服务测试
├─ frontend/                前端工程
│  └─ src/
│     ├─ api/               接口封装
│     ├─ components/        通用组件
│     ├─ composables/       组合式逻辑
│     ├─ layouts/           页面布局
│     ├─ router/            路由配置
│     ├─ stores/            Pinia 状态
│     ├─ styles/            全局样式
│     ├─ types/             类型定义
│     ├─ utils/             题型注册、导入、图表等
│     └─ views/             页面视图
├─ shared/                  前后端共享题型与统计模型
├─ scripts/                 联调与系统冒烟脚本
└─ docs/                    项目文档
```

## 环境要求

- Node.js 18+
- npm 9+
- MySQL 8.x

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. 配置环境变量

根目录提供了 `.env.example`，当前默认开发配置如下：

```env
DB_HOST=127.0.0.1
DB_PORT=3309
DB_USER=root
DB_PASSWORD=123456
DB_NAME=survey_system

JWT_SECRET=please-change-me
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://127.0.0.1:63000
PORT=63002
```

生产环境必须替换 `JWT_SECRET`。

### 3. 初始化数据库

后端启动不再自动执行 `migrate()` 或 `seed()`。首次启动前请手动执行：

```bash
cd backend
npm run db:migrate
npm run db:seed:dev
```

说明：

- `db:migrate`：确保表结构存在并补齐新增字段。
- `db:seed:dev`：只补建缺失的开发账号和基础数据，不会重置已有密码。
- `db:seed:init-admin`：单独补建管理员账号。

### 4. 启动后端

```bash
cd backend
npm run dev
```

模式差异：

- `npm run dev`：开发模式，带 `watch`
- `npm run dev:once`：开发配置，单次运行
- `npm start` / `npm run start:prod`：生产模式，单次运行
- 生产模式会拒绝使用默认 `JWT_SECRET`

根目录脚本：

- `后端-启动.cmd`：开发模式
- `后端-生产-启动.cmd`：生产模式
- `后端-启动-完整版.cmd`：兼容别名，当前重定向到生产模式

后端默认地址：

- `http://127.0.0.1:63002`
- 健康检查：`http://127.0.0.1:63002/health`

当前启动行为：

- 执行一次 MySQL 连通性检查
- 启动 HTTP 服务
- 不自动执行迁移、种子或任何历史双库同步逻辑

### 5. 初始化管理员

如需补建管理员，可执行：

```bash
cd backend
npm run db:seed:init-admin
```

默认管理员信息：

- 用户名：`admin`
- 默认密码：`123456`
- 可通过环境变量覆盖：
  - `ADMIN_INIT_PASSWORD`
  - `ADMIN_INIT_EMAIL`

### 6. 启动前端

```bash
cd frontend
npm run dev
```

本地生产预览：

```bash
cd frontend
npm run build
npm run start:prod
```

模式差异：

- `npm run dev`：Vite 开发服务器，带 HMR 和 `/api` 代理
- `npm run build && npm run start:prod`：构建后预览，无 HMR

根目录脚本：

- `前端-启动.cmd`：开发模式
- `前端-生产-预览.cmd`：生产预览

前端默认地址：

- `http://localhost:63000`

开发代理：

- `/api` -> `http://127.0.0.1:63002`
- `/uploads` -> `http://127.0.0.1:63002`

## 常用脚本

### backend

- `npm run dev`
- `npm run dev:once`
- `npm start`
- `npm run start:prod`
- `npm test`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:seed:dev`
- `npm run db:seed:init-admin`

### frontend

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run start:prod`
- `npm run lint`
- `npm run smoke:system`
- `npm run test:e2e`

## 当前验证状态

- `cmd /c npm test` 于 `backend/` 通过，`66 / 66`
- `node scripts/system-smoke.mjs` 于仓库根目录通过，`64 / 64`
- `cmd /c npm run build` 于 `frontend/` 通过
- `cmd /c npm run test:e2e` 于 `frontend/` 通过，`3 / 3`
- `scripts/system-smoke.mjs` 使用固定端口与共享测试库，验收时应单实例顺序运行，不要并行启动多个冒烟进程

## 主要接口前缀

- `/api/auth`：注册、登录、当前用户
- `/api/surveys`：问卷管理、公开读取、填写、结果
- `/api/answers`：答卷列表、明细、导出、附件下载
- `/api/users`：用户与批量导入
- `/api/depts`：部门管理
- `/api/roles`：角色管理
- `/api/positions`：职位管理
- `/api/files`：后台文件上传与管理
- `/api/folders`：文件夹与问卷归档
- `/api/messages`：消息中心
- `/api/audits`：审计日志

## 当前实现说明

- 当前主线以 `MySQL + JSON 字段` 为准。
- `surveys.questions` 存题目定义，`answers.answers_data` 存答卷内容。
- 结果统计来自当前后端服务层实时聚合，而不是外部分析库。
- 题型单一事实源位于 `shared/questionTypeRegistry.js`。
- 题目统计口径位于 `shared/questionModel.js`。
- 上传题提交契约已收敛为最小文件引用：`id + uploadToken`。
- 前端编辑器已经拆成 `useSurveyEditor.ts` 装配层与 `composables/editor/*` 子模块。
- 历史文档中仍有 MongoDB / ClickHouse / `app.cjs` 等旧方案描述，开发时请以当前源码和下列文档为准。

## 推荐阅读

- `目录速览.md`
- `backend/README.md`
- `docs/系统结构评估与优化建议-2026-03-27.md`
- `docs/测试报告-2026-03-28.md`
- `frontend/src/views/survey/README.md`
- `docs/开发指南.md`
- `docs/题型规范.md`

## 联系与交流

- QQ 群：`982865864`

欢迎提交 Issue、PR 或交流建议。
