# 问易答调查系统

一个基于 `Vue 3 + TypeScript + Vite` 与 `Node.js + Express + MySQL` 的前后端分离调查问卷系统，覆盖问卷创建、发布、填写、回收、结果分析，以及基础的用户、角色、部门、职位、文件和审计能力。

当前仓库以真实可运行的社区版为目标，不是只展示页面的 Demo，也不是只开前端的半成品。项目主链路已经具备“创建问卷 -> 发布问卷 -> 公开填写 -> 查看结果 -> 导出答卷”的完整闭环，并保留持续扩展空间。

## 当前技术栈

- 前端：Vue 3、TypeScript、Vite、Element Plus、Pinia、Vue Router、Axios、ECharts
- 后端：Node.js、Express、Knex、MySQL、JWT、bcryptjs、multer、ExcelJS
- 测试：Node.js `node:test`、系统冒烟脚本、前端构建校验、预留 Playwright 入口

## 当前能力概览

- 问卷创建、编辑、发布、关闭、回收站、彻底删除
- 公开分享、PC/移动端填写、截止时间控制、重复提交限制
- 题型校验、上传题两阶段提交、附件打包下载
- 结果页汇总指标、趋势图、题目统计、设备/浏览器/系统分布
- 答卷列表、Excel 导出、附件 zip 导出
- 用户、角色、部门、职位、文件夹、消息、审计日志

## 仓库结构

```text
.
├─ backend/                 后端服务
│  ├─ server.js             启动入口
│  ├─ initAdmin.js          初始化管理员脚本
│  ├─ src/config/           配置
│  ├─ src/db/               建表与种子
│  ├─ src/models/           数据模型
│  ├─ src/routes/           API 路由
│  ├─ src/utils/            题型校验、上传存储等
│  └─ test/                 路由级测试
├─ frontend/                前端工程
│  └─ src/
│     ├─ api/               接口封装
│     ├─ components/        通用组件
│     ├─ router/            路由配置
│     ├─ utils/             题型注册、图表等
│     └─ views/             页面视图
├─ shared/                  前后端共享题型与统计模型
├─ scripts/                 联调与冒烟脚本
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

### 3. 启动后端

```bash
cd backend
npm run dev
```

后端默认地址：

- `http://127.0.0.1:63002`
- 健康检查：`http://127.0.0.1:63002/health`

启动时会自动执行：

- MySQL 连通性检查
- `migrate()` 建表/补齐字段
- `seed()` 初始化默认角色与测试账号

### 4. 初始化管理员

如需补建管理员，可执行：

```bash
cd backend
node initAdmin.js
```

默认管理员信息：

- 用户名：`admin`
- 默认密码：`123456`
- 可通过环境变量覆盖：
  - `ADMIN_INIT_PASSWORD`
  - `ADMIN_INIT_EMAIL`

### 5. 启动前端

```bash
cd frontend
npm run dev
```

前端默认地址：

- `http://localhost:63000`

开发代理：

- `/api` -> `http://127.0.0.1:63002`
- `/uploads` -> `http://127.0.0.1:63002`

## 常用脚本

### backend

- `npm run dev`
- `npm start`
- `npm test`

### frontend

- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`
- `npm run smoke:system`
- `npm run test:e2e`

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
- 题型单一事实源位于 `shared/questionTypeRegistry.js`。
- 上传题提交契约已收敛为最小文件引用：`id + uploadToken`。
- 历史文档中仍有 MongoDB / ClickHouse 等旧方案描述，开发时请以当前源码和下列文档为准。

## 推荐阅读

- `docs/开发指南.md`
- `docs/题型规范.md`
- `docs/API接口说明.md`
- `docs/项目功能清单与风险分析.md`
- `docs/测试报告-2026-03-25.md`

## 联系与交流

- QQ 群：`982865864`

欢迎提交 Issue、PR 或交流建议。
