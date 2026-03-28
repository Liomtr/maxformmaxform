# 后端说明

本文档只对应当前 `backend/` 目录源码。

当前后端不是旧版的 MongoDB / ClickHouse / 适配器架构，而是：

- `Node.js + Express`
- `Knex + MySQL`
- `JWT + bcryptjs`
- `multer + ExcelJS`

## 启动方式

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 配置环境变量

参考根目录 `.env.example`，至少确认：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=survey_system

JWT_SECRET=please-change-me
JWT_EXPIRES_IN=7d

FRONTEND_URL=http://127.0.0.1:63000
PORT=63002
```

生产环境必须显式设置 `JWT_SECRET`。

### 3. 初始化数据库

当前启动流程不会自动执行迁移和种子。

首次启动前请手动执行：

```bash
cd backend
npm run db:migrate
npm run db:seed:dev
```

说明：

- `db:migrate`：确保表结构存在并补齐新增字段。
- `db:seed:dev`：补建开发账号和基础字典，不会重置已有账号密码。
- `db:seed:init-admin`：单独补建管理员账号。

### 4. 启动服务

开发模式：

```bash
cd backend
npm run dev
```

单次运行开发配置：

```bash
cd backend
npm run dev:once
```

生产模式：

```bash
cd backend
npm start
```

## 运行行为

- 实际启动入口：`server.js`
- Express 装配层：`app.js`
- 默认端口：`63002`
- 健康检查：`GET /health`

`server.js` 当前只做两件事：

1. 执行一次 MySQL 连通性检查。
2. 启动 HTTP 服务并注册优雅退出。

它不会自动执行 `migrate()`、`seed()` 或任何历史双库同步逻辑。

## 目录结构

```text
backend/
├─ server.js
├─ app.js
├─ initAdmin.js
├─ scripts/
│  ├─ start-dev.js
│  ├─ start-prod.js
│  ├─ db-migrate.js
│  └─ db-seed.js
├─ src/
│  ├─ config/
│  ├─ constants/
│  ├─ db/
│  ├─ middlewares/
│  ├─ models/
│  ├─ policies/
│  ├─ repositories/
│  ├─ routes/
│  ├─ services/
│  └─ utils/
└─ test/
```

## 当前分层

### 问卷域

问卷域是目前分层最完整的模块：

- 路由：`src/routes/surveys.js`
- 查询服务：`src/services/surveyQueryService.js`
- 命令服务：`src/services/surveyCommandService.js`
- 上传服务：`src/services/surveyUploadService.js`
- 结果服务：`src/services/surveyResultsService.js`
- 聚合仓储：`src/repositories/surveyAggregateRepository.js`
- 事务封装：`src/db/transaction.js`
- 访问策略：`src/policies/surveyPolicy.js`
- 题型校验：`src/utils/questionSchema.js`

当前调用链可理解为：

```text
route
  -> policy / access check
    -> service
      -> repository + transaction
        -> model
```

### 其他后台模块

用户、部门、角色、职位、消息、审计等模块当前仍更接近：

```text
route
  -> model
    -> JSON response
```

这不是错误，但意味着当前分层深度在模块间还不完全一致。

## 数据模型

当前数据库主线为 `MySQL + JSON 写模型`：

- `surveys.questions`：题目定义
- `surveys.settings`：问卷设置
- `surveys.style`：样式配置
- `answers.answers_data`：答卷内容
- `files`：上传文件、附件、答卷文件绑定
- `messages`：系统/审计消息
- `audit_logs`：操作审计

上传文件存放在 `backend/uploads/`，通过 `/uploads/*` 静态暴露。

## 共享层协作

问卷题型不是后端单独维护的：

- `../shared/questionTypeRegistry.js`：题型定义与提交语义
- `../shared/questionModel.js`：题目统计逻辑

后端会复用这层做：

- 题型结构校验
- 上传题约束校验
- 结果统计口径统一

## 测试

后端单测：

```bash
cd backend
npm test
```

系统冒烟：

```bash
cd ..
node scripts/system-smoke.mjs

cd frontend
npm run smoke:system
```

说明：

- 仓库级入口与前端 npm 入口最终都调用根目录 `scripts/system-smoke.mjs`
- 当前系统冒烟口径已更新到 `64 / 64`
- 覆盖登录、问卷创建、上传、提交、结果、导出、答卷删除、关闭问卷与回收清理等主链路
- `runId` 已改为毫秒时间戳 + pid + 随机后缀，可并发执行

## 当前结论

- 后端已经不是“所有逻辑都堆在路由里”的早期状态。
- 问卷域已形成 `route + policy + service + repository + transaction` 基本分层。
- 结果统计当前来自 MySQL 中的答卷数据实时聚合，而不是 ClickHouse。
- 继续演进时，应优先把 `answers.js` 和其他后台模块按问卷域模式进一步收敛。
