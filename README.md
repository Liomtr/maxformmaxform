# 问易答调查系统

一个基于 `Vue 3 + TypeScript + Vite` 与 `Node.js + Express + MySQL` 的前后端分离调查问卷系统，支持问卷创建、发布、填写、回收、结果查看，以及基础的用户、角色、部门和文件管理。

## 项目特点

- 前后端分离，开发与部署清晰
- 支持用户注册、登录、JWT 鉴权
- 支持问卷创建、编辑、发布、关闭、回收站
- 支持公开填写、移动端填写、截止时间控制、重复提交限制
- 支持答卷统计、答卷管理、Excel 导出
- 支持用户、角色、部门管理
- 支持文件上传与富文本资源管理
- 支持基础审计消息与系统通知能力

## 技术栈

### 前端

- Vue 3
- TypeScript
- Vite
- Element Plus
- Pinia
- Vue Router
- Axios

### 后端

- Node.js
- Express
- Knex
- MySQL
- JWT
- bcryptjs
- multer

## 当前实现说明

当前仓库主线代码以 `MySQL` 为准。

仓库中部分历史文档仍提到 MongoDB / ClickHouse 等旧方案，这些内容可作为历史参考，但本项目当前实际运行方式请以根目录 `README.md`、根目录 `.env.example`、`backend/server.js` 与 `backend/src/db/` 下实现为准。

## 目录结构

```text
.
├─ backend/                 后端服务
│  ├─ server.js             后端启动入口
│  ├─ initAdmin.js          初始化管理员脚本
│  └─ src/
│     ├─ config/            配置
│     ├─ db/                Knex 与表结构初始化
│     ├─ middlewares/       鉴权与错误处理中间件
│     ├─ models/            数据模型
│     ├─ routes/            API 路由
│     └─ services/          审计/消息等服务
├─ frontend/                前端工程
│  └─ src/
│     ├─ api/               接口封装
│     ├─ router/            路由配置
│     ├─ views/             页面视图
│     ├─ components/        通用组件
│     └─ types/             类型定义
├─ docs/                    补充文档
└─ scripts/                 脚本工具
```

## 环境要求

- Node.js 18+
- npm 9+
- MySQL 8.x

## 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd 问易答-调查系统
```

### 2. 配置环境变量

根目录已提供 `.env.example`，后端启动主要读取环境变量中的数据库和 JWT 配置。

可参考以下示例：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=123456
DB_NAME=survey_system
JWT_SECRET=please-change-me
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://127.0.0.1:63000
PORT=63002
```

### 3. 安装依赖

```bash
cd backend
npm install
cd ../frontend
npm install
```

### 4. 启动后端

```bash
cd backend
npm run dev
```

后端默认地址：

- `http://127.0.0.1:63002`
- 健康检查：`http://127.0.0.1:63002/health`

说明：

- 首次启动会自动检测 MySQL 连接
- 会自动执行表结构初始化与基础角色种子写入

### 5. 初始化管理员账号

如果需要创建默认管理员，可执行：

```bash
cd backend
node initAdmin.js
```

默认行为：

- 用户名：`admin`
- 默认密码：`admin123`
- 可通过环境变量覆盖：
  - `ADMIN_INIT_PASSWORD`
  - `ADMIN_INIT_EMAIL`

### 6. 启动前端

```bash
cd frontend
npm run dev
```

前端默认地址：

- `http://localhost:63000`

开发代理已配置：

- `/api` -> `http://127.0.0.1:63002`
- `/uploads` -> `http://127.0.0.1:63002`

## 常用脚本

### backend

- `npm run dev`：启动后端服务
- `npm start`：启动后端服务
- `npm test`：运行后端测试

### frontend

- `npm run dev`：启动前端开发环境
- `npm run build`：构建前端
- `npm run preview`：预览构建产物
- `npm run lint`：执行 ESLint
- `npm run smoke:system`：执行系统冒烟脚本
- `npm run test:e2e`：运行 Playwright E2E

## 核心功能

### 问卷能力

- 创建问卷
- 编辑题目与问卷设置
- 发布问卷与关闭问卷
- 公开分享填写
- PC / 移动端填写页
- 重复提交限制
- 截止时间控制
- 回收站恢复与彻底删除

### 管理能力

- 用户管理
- 角色管理
- 部门管理
- 文件管理
- 基础消息与审计记录

## 接口概览

主要 API 前缀如下：

- `/api/auth`：注册、登录、当前用户
- `/api/surveys`：问卷管理、发布、填写、结果
- `/api/answers`：答卷管理
- `/api/users`：用户管理与批量导入
- `/api/depts`：部门管理
- `/api/roles`：角色管理
- `/api/files`：文件上传与管理
- `/api/folders`：文件夹/归档相关
- `/api/messages`：消息相关
- `/api/audits`：审计相关

## 开发建议

- 前端开发以 `frontend/src/router/index.ts` 与 `frontend/src/views/` 为页面入口参考
- 后端开发以 `backend/server.js`、`backend/app.js`、`backend/src/routes/` 为主入口参考
- 数据结构调整时，优先同步修改 `backend/src/db/migrate.js`

## 已知说明

- 当前主链路已经可以支撑“创建 -> 发布 -> 填写 -> 查看结果”
- 一些企业化模块仍在持续完善中，部分页面和接口属于基础可用或持续收口状态
- 历史方案文档较多，开发时请优先参考当前源码而不是旧草稿

## 相关文档

- `docs/环境安装指南.md`
- `docs/开发指南.md`
- `docs/API接口说明.md`
- `docs/项目功能清单与风险分析.md`
- `docs/题型规范.md`

## 联系与交流

- QQ 群：`982865864`

欢迎提交 Issue、PR 或交流建议。
