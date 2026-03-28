# Survey 问卷模块说明

## 模块定位

`frontend/src/views/survey/` 是当前问卷业务前端主模块，覆盖：

- 创建入口
- 编辑器
- 预览
- 填写
- 结果分析
- 答卷管理
- 分享与发布

当前模块的组织方式已经不是早期的“单页面堆功能”，而是：

- 入口页
- 页面壳
- 子面板
- 领域 composable
- 填写页 hook

## 当前文件结构

```text
survey/
├─ CreateSurveyLanding.vue             创建引导页
├─ CreateSurveyPage.vue                编辑页入口
├─ CreateSurveyPageShell.vue           编辑器页面壳与 tab 布局
├─ CreateSurveyQuestionConfigPanel.vue 左侧题型/题库/大纲面板
├─ CreateSurveyQuestionListPanel.vue   中部题目编辑区
├─ CreateSurveyLogicSettings.vue       逻辑、批量编辑、分组、配额弹层
├─ CreateSurveyPublishPanel.vue        设置/分享面板
├─ FillSurveyPage.vue                  PC 填写页
├─ FillSurveyMobilePage.vue            移动端填写页
├─ SurveyPreviewEmbed.vue              编辑器内嵌预览
├─ SurveyTopToolbar.vue                顶部工具栏
├─ SurveySharePanel.vue                分享面板
├─ SurveyAnswersPanel.vue              结果分析主面板
├─ QuestionAnalyticsChart.vue          题目统计图表
├─ ResultsPage.vue                     独立结果页
├─ AnswerManagementPage.vue            答卷管理页
├─ AnswerDetailsPanel.vue              答卷详情
├─ SuccessPage.vue                     提交成功页
├─ useFillSurveyVisibility.ts          填写页可见性逻辑
├─ useFillSurveyJumpLogic.ts           填写页跳题逻辑
├─ useFillSurveyQuota.ts               填写页配额逻辑
├─ useFillSurveyUpload.ts              填写页上传逻辑
├─ usePreviewSurveyMapping.ts          预览映射
└─ createSurveyPage.css                编辑器共享样式
```

## 关键依赖关系

### 编辑器

当前编辑器的主链路是：

```text
CreateSurveyPage
  -> useSurveyEditor
    -> editor-core
    -> editor-logic
    -> editor-batch
    -> editor-quota
    -> editor-richtext
  -> CreateSurveyPageShell
    -> CreateSurveyQuestionConfigPanel
    -> CreateSurveyQuestionListPanel
    -> CreateSurveyLogicSettings
    -> CreateSurveyPublishPanel
    -> SurveyPreviewEmbed / SurveyAnswersPanel
```

说明：

- `CreateSurveyPage.vue` 现在只是薄入口。
- `useSurveyEditor.ts` 已收缩为装配层，负责聚合子 composable 并暴露稳定的 `editorContext`。
- 编辑器的核心职责已拆到 `frontend/src/composables/editor/` 下。

### 填写页

填写页当前核心关系是：

```text
FillSurveyPage
  -> useFillSurveyVisibility
  -> useFillSurveyJumpLogic
  -> useFillSurveyQuota
  -> useFillSurveyUpload
```

这意味着填写页已完成第一轮按能力拆分。

## 当前模块事实

### 已完成的结构化改进

- 编辑器不再由单个页面文件承担全部 UI。
- 页面壳、题型面板、题目列表、逻辑弹层、发布面板已经拆开。
- `useSurveyEditor.ts` 已从巨型实现收缩为装配层。
- 编辑器核心状态、逻辑、批量操作、配额、富文本已拆到独立 `editor-*` composable。
- 填写页的可见性、跳题、配额、上传已拆成独立 hook。
- 预览与结果分析都能在编辑器上下文中复用问卷结构。

### 当前仍然存在的主要问题

- `editorContext` 暴露字段仍然很多，页面壳与子面板对上下文的依赖面偏大。
- 左侧题型面板仍展示少量未完全落地的 legacy 入口。
- 发布面板、预览、结果分析与编辑态之间仍存在进一步收敛边界的空间。
- 模块文档必须持续跟随真实文件结构，不能再沿用早期 `EditSurveyPage.vue / PreviewSurveyPage.vue` 的旧口径。

## 维护原则

更新问卷模块时，优先遵循：

1. 新题型先补共享注册表和共享统计模型，再补 UI。
2. 新编辑能力优先拆进 `composables/editor/` 或子面板，不回流到单个巨型页面。
3. 填写页新能力优先独立成 hook，不直接堆进 `FillSurveyPage.vue`。
4. 页面壳与面板之间尽量通过最小上下文字段通信，避免无限扩张 `editorContext`。
5. README 必须同步真实文件结构，避免文档继续滞后于代码。

## 当前边界判断

当前编辑器能力边界可按下面理解：

```text
useSurveyEditor
  -> editor-core
  -> editor-logic
  -> editor-batch
  -> editor-quota
  -> editor-richtext
```

后续继续拆分时，应优先在 `frontend/src/composables/editor/` 内按能力扩展，而不是把逻辑重新回流到 `useSurveyEditor.ts` 或页面组件。
