# API 接口说明（对齐当前实现）

> 2026-03-28 注：本文档仍保留部分旧版双库架构描述，尚未完全迁移到当前 `backend/app.js + backend/server.js + Express + Knex + MySQL` 实现。阅读时请优先以 `backend/src/routes/*`、`README0326.md`、`backend/README.md` 与 `docs/系统结构评估与优化建议-2026-03-27.md` 为准。

本文档列出后端可用接口的用途、请求/响应示例与常见错误码，但个别“健康检查 / analytics / 数据库适配器”相关段落仍在校准中。

- 基础地址（开发默认）：http://127.0.0.1:63002
- 所有业务接口前缀：/api
- 健康检查：/health（无前缀，返回 `dbClient`、`dbOk`、`mongoOk`、`clickhouseOk` 等字段）
- 内容类型：application/json
- 鉴权方式：JWT Bearer（部分接口无需登录）

---

## 鉴权与通用说明

- 请求头：Authorization: Bearer <token>
- 登录相关接口会返回 `token` 与 `user`；登录后访问需要鉴权的接口。
- 常见响应结构（不同接口字段略有差异）：
  - 成功：
    ```json
    { "success": true, "data": { /*...*/ }, "message": "可选" }
    ```
  - 失败（示例）：
    ```json
    { "success": false, "message": "错误描述" }
    // 或 { "msg": "错误描述" }
    // 或 { "error": "接口不存在" } （全局 404）
    ```
- 数据库适配器：所有接口的数据读写均经由 `backend/src/database` 的适配层完成，运行时可通过 `.env` 中的 `DB_CLIENT` 切换主库（默认 `mongo`）。不同适配器可能对部分返回字段（如健康检查）带来额外子项。

---

## 健康检查

- GET /health
  - 说明：应用就绪探活；用于运维健康检查与联调排错。
  - 响应示例：
    ```json
    {
      "status": "OK",
      "dbClient": "mongo",
      "dbOk": true,
      "mongoOk": true,
      "clickhouseOk": true,
      "time": "2025-01-01T00:00:00.000Z"
    }
    ```
  - 说明字段：`dbClient` 表示当前启用的主库适配器，`dbOk` 是主库整体可用状态，其余为具体子项（不同适配器可能返回对应的 `<engine>Ok`）。

---

## 鉴权模块（/api/auth）

### 1) 用户注册
- POST /api/auth/register
- 是否鉴权：否
- 请求体：
  ```json
  { "username": "jerry", "email": "jerry@example.com", "password": "123456" }
  ```
- 成功响应：
  ```json
  { "success": true, "token": "<jwt>", "user": { "_id": "...", "username": "jerry", "email": "...", "role": "user" } }
  ```
- 失败情形：
  - 400 缺少必填项：`{ "msg": "缺少必填项" }`
  - 409 用户已存在：`{ "msg": "用户已存在" }`
  - 500 服务器错误：`{ "msg": "<错误信息>" }`

### 2) 用户登录
- POST /api/auth/login
- 是否鉴权：否
- 请求体：
  ```json
  { "username": "jerry", "password": "123456" }
  ```
- 成功响应：
  ```json
  { "success": true, "token": "<jwt>", "user": { "_id": "...", "username": "jerry", "role": "user" } }
  ```
- 失败情形：
  - 401 未授权：`{ "msg": "用户名或密码不正确" }`
  - 500 服务器错误：`{ "msg": "<错误信息>" }`

### 3) 获取当前用户信息
- GET /api/auth/me
- 是否鉴权：是（Authorization Bearer）
- 成功响应：
  ```json
  { "success": true, "user": { "_id": "...", "username": "jerry", "role": "user" } }
  ```
- 失败情形：
  - 401 未登录：`{ "msg": "未登录" }`
  - 401 无效令牌：`{ "msg": "无效令牌" }`

---

## 问卷模块（/api/surveys）

说明：除查看单个问卷、提交答卷、查询结果/分析外，其他写操作均需要登录鉴权。

### 1) 获取问卷列表
- GET /api/surveys
- 是否鉴权：是
- 查询参数：无
- 成功响应：
  ```json
  { "success": true, "data": [ { "_id": "...", "title": "...", "status": "..." } ] }
  ```

### 2) 创建问卷
- POST /api/surveys
- 是否鉴权：是
- 请求体（示例）：
  ```json
  {
    "title": "员工满意度调查",
    "description": "",
    "questions": [
      { "type": "radio", "title": "问题1", "options": [ {"label": "是"}, {"label": "否"} ] }
    ],
    "settings": { },
    "style": { }
  }
  ```
- 成功响应：`{ "success": true, "data": { "_id": "...", "title": "..." } }`

### 3) 获取问卷详情
- GET /api/surveys/:id
- 是否鉴权：否
- 说明：返回 questions，并按 `order` 排序，同时为前端方便新增自增 `id`（从 1 开始）。
- 成功响应：`{ "success": true, "data": { "_id": "...", "questions": [ { "id": 1, "type": "radio", ... } ] } }`
- 失败情形：
  - 404 问卷不存在：`{ "success": false, "message": "问卷不存在" }`

### 4) 更新问卷
- PUT /api/surveys/:id
- 是否鉴权：是
- 说明：会删除旧 questions 并用新 questions 全量覆盖。
- 成功响应：`{ "success": true, "data": { /* 更新后的问卷 */ } }`
- 失败情形：
  - 404 问卷不存在

### 5) 删除问卷
- DELETE /api/surveys/:id
- 是否鉴权：是
- 说明：会同时删除该问卷下的题目。
- 成功响应：`{ "success": true }`
- 失败情形：
  - 404 问卷不存在

### 6) 发布问卷
- POST /api/surveys/:id/publish
- 是否鉴权：是
- 最小校验：
  - 标题非空
  - 至少 1 题
  - 单/多选题至少 2 个非空选项
- 成功响应：`{ "success": true, "data": { "status": "published", ... } }`
- 失败情形：
  - 400 标题不能为空 / 至少需要一题 / 选项不能为空
  - 404 问卷不存在

### 7) 关闭问卷
- POST /api/surveys/:id/close
- 是否鉴权：是
- 成功响应：`{ "success": true, "data": { "status": "closed", ... } }`
- 失败情形：
  - 404 问卷不存在

### 8) 提交答卷
- POST /api/surveys/:id/responses
- 是否鉴权：否
- 说明：默认通过主库适配器写入答卷（当前实现为 MongoDB 的 Answer 集合），ClickHouse 由后台复制器异步写入。
- 请求体（示例）：
  ```json
  {
    "answers": [
      { "questionId": 1, "value": "A" },
      { "questionId": 2, "value": ["A","B"] }
    ]
  }
  ```
- 成功响应：`{ "success": true, "message": "提交成功，感谢您的参与！", "responseId": "..." }`
- 失败情形：
  - 404 问卷不存在
  - 400 问卷未发布或已关闭
  - 500 服务器错误（保存失败）

### 9) 简要结果（Mongo 聚合）
- GET /api/surveys/:id/results
- 是否鉴权：否
- 说明：返回总提交数与最近一次提交时间（默认来自 Mongo 主库，可按适配器扩展）。
- 成功响应：
  ```json
  { "success": true, "data": { "totalSubmissions": 123, "lastSubmitAt": "2025-01-01T00:00:00.000Z" } }
  ```

### 10) 分析（ClickHouse 聚合）
- GET /api/surveys/:id/analytics
- 是否鉴权：否
- 说明：直接从 ClickHouse 聚合；需要 Mongo→CH 的异步复制有效且 CH 可达。
- 响应示例：
  ```json
  { "success": true, "data": [ { "questionId": "...", "questionType": "radio", "cnt": 100 } ] }
  ```
- 失败情形：
  - 400 非法的ID（ObjectId 校验未通过）
  - 500 服务端错误（ClickHouse 未就绪或查询异常）

---

## 常见状态码与含义

- 200 OK：请求成功
- 400 Bad Request：参数缺失/非法（如 ObjectId 校验失败、发布校验不通过）
- 401 Unauthorized：未登录或令牌无效
- 404 Not Found：
  - 接口不存在（全局 404）：`{ "error": "接口不存在" }`
  - 资源不存在（如问卷不存在）：`{ "success": false, "message": "问卷不存在" }`
- 409 Conflict：资源冲突（如注册用户已存在）
- 500 Internal Server Error：服务器内部错误（返回 `msg` 或 `message` 描述）

---

## 其他说明

- 时间字段统一为 ISO 8601（UTC）字符串。
- 生产环境建议开启 HTTPS、CORS 白名单、速率限制与审计日志。
- 完整版后端默认启用 MongoDB 适配器（需副本集）与 ClickHouse；如需切换其他主库，请在 `.env` 设置 `DB_CLIENT` 并确保已实现对应适配器；健康检查以 `/health` 为准。
- 适配器门面详见 `backend/src/database`，控制器统一通过 `database.getModel('<ModelName>')` 获取模型实例。
- 更详细的数据模型与题型说明请参考：`backend/src/models/*` 与 `docs/题型规范.md`。
