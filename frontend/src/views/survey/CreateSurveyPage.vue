<!--
  创建问卷页面（CreateSurveyPage.vue） - 专业版
  参考问卷星等专业问卷平台设计

  维护说明：
  - 题型的唯一事实源在 `shared/questionTypeRegistry.js`
  - 本页保留 legacy 数字编码，仅作为编辑器层表示；提交/读取时统一通过共享注册表映射
  - 默认题目配置、题型语义判断、特殊渲染分支应优先复用共享注册表 helper
-->
<template>
  <div class="survey-editor">
    <!-- 顶部工具栏（抽离为独立组件） -->
    <SurveyTopToolbar
      :title="surveyForm.title"
      v-model:currentTab="currentTab"
      :saving="saving"
      :canPublish="canPublish"
      @goBack="goBack"
      @save="saveDraft"
      @publish="publishSurveyAction"
    />

    <!-- 主编辑区域 -->
    <div class="editor-container">
      <!-- 中央编辑区域 -->
      <div class="main-editor">
        <!-- 编辑模式 -->
        <div v-if="currentTab === 'edit'" class="edit-area" @click.self="closeQuestionEdit">
          <div class="editor-utility-row" aria-label="编辑快捷操作">
            <div class="editor-utility-bar editor-utility-bar--left" role="toolbar">
              <button
                type="button"
                :class="['utility-btn', 'utility-btn--icon', 'utility-tooltip', { 'is-active': areAllNumbersHidden }]"
                :disabled="surveyForm.questions.length === 0"
                aria-label="隐藏题号"
                @click.stop="triggerQuickAction('toggleNumbers')"
                data-tooltip="隐藏题号"
              >
                <span class="utility-icon" aria-hidden="true">
                  <svg viewBox="0 0 14 14" focusable="false">
                    <path d="M2 2.25h10v1H2zM2 6h6v1H2zM2 9.75h10v1H2z" />
                    <path d="M10.95 2.05 2.05 10.95l.707.707 8.9-8.9z" />
                  </svg>
                </span>
              </button>
              <button
                type="button"
                class="utility-btn utility-btn--icon utility-tooltip"
                aria-label="批量添加题目"
                @click.stop="triggerQuickAction('batchAdd')"
                data-tooltip="批量添加题目"
              >
                <span class="utility-icon" aria-hidden="true">
                  <svg viewBox="0 0 16 16" focusable="false">
                    <path d="M2.5 2.5h11a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Zm0 1v9h11v-9h-11Z" />
                    <path d="M4.5 4.75h5v1.5h-5v-1.5Zm0 3h5v1.5h-5v-1.5Zm0 3H7v1.5H4.5v-1.5Zm5.5 0h1.75v1.75h1.75v1.5h-1.75v1.75h-1.5v-1.75H8.5v-1.5h1.5v-1.75Z" />
                  </svg>
                </span>
              </button>
            </div>
            <div class="editor-utility-bar editor-utility-bar--mirrored" role="toolbar">
              <button
                type="button"
                class="utility-btn"
                aria-label="预览"
                :aria-pressed="false"
                @click.stop="switchEditorTab('preview')"
              >
                <span class="utility-icon" aria-hidden="true">
                  <svg viewBox="0 0 20 20" focusable="false">
                    <path d="M10 4C5.5 4 2 7.5 1 10c1 2.5 4.5 6 9 6s8-3.5 9-6c-1-2.5-4.5-6-9-6Zm0 10c-3.05 0-5.5-2.45-6.42-4 0.93-1.55 3.37-4 6.42-4s5.49 2.45 6.42 4c-0.93 1.55-3.37 4-6.42 4Zm0-7a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm0 4.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
                  </svg>
                </span>
                <span class="utility-label">预览</span>
              </button>
            </div>
          </div>
          <div class="edit-layout" @click.self="closeQuestionEdit">
            <div class="edit-main" @click.self="closeQuestionEdit">
              <!-- 问卷头部信息 -->
              <div class="survey-header-editor" @click="closeQuestionEdit">
                <div class="title-editor">
                  <input 
                    v-model="surveyForm.title" 
                    class="survey-title-input" 
                    placeholder="标题" 
                    @input="validateForm"
                    @click.stop
                  />
                  <div v-if="errors.title" class="error-tip">{{ errors.title }}</div>
                </div>
                
                <!-- 问卷说明：使用 Quill 浮动工具栏富文本组件 -->
                <div class="survey-desc-inline">
                  <QuillFloatingEditor
                    v-model="surveyForm.description"
                    placeholder="添加问卷说明"
                    :floating="true"
                    :auto-hide="true"
                    :panel-offset-y="-46"
                  />
                </div>
                
                <div class="header-actions">
                  <button class="btn btn-link" @click="showHeaderSettings = !showHeaderSettings">
                    📄 问卷设置表明 | 🎨 效果设置
                  </button>
                </div>

                <!-- 头部设置面板 -->
                <div v-if="showHeaderSettings" class="header-settings">
                  <div class="setting-group">
                    <label>问卷类型：</label>
                    <select v-model="surveyForm.type" class="form-select">
                      <option value="normal">普通问卷</option>
                      <option value="anonymous">匿名问卷</option>
                      <option value="limited">限定问卷</option>
                    </select>
                  </div>
                  
                  <div class="setting-group">
                    <label>截止时间：</label>
                    <input v-model="surveyForm.endTime" type="datetime-local" class="form-input" />
                  </div>
                  
                  <div class="setting-row">
                    <label class="checkbox-label">
                      <input v-model="surveyForm.settings.showProgress" type="checkbox" />
                      显示进度条
                    </label>
                    <label class="checkbox-label">
                      <input v-model="surveyForm.settings.allowMultipleSubmissions" type="checkbox" />
                      允许重复提交
                    </label>
                  </div>
                </div>
              </div>

              <!-- 题目列表 -->
              <div class="questions-editor" @click.self="closeQuestionEdit">
                <div v-if="surveyForm.questions.length === 0" class="empty-state">
                  <div class="empty-icon">📝</div>
                  <h3>开始设计您的问卷</h3>
                  <p>从左侧选择题型添加到问卷中，或者使用AI助手快速生成</p>
                  <button class="btn btn-primary" @click="showAIHelper = true">
                    🤖 使用AI助手
                  </button>
                </div>

                <div v-else class="questions-list" @click.self="closeQuestionEdit">
                  <div 
                    v-for="(question, index) in surveyForm.questions" 
                    :key="question.id" 
                    class="question-editor"
                    :class="{ active: editingIndex === index }"
                    @click.stop
                  >
                    <div class="question-toolbar">
                      <span v-if="!question.hideSystemNumber" class="question-number">{{ index + 1 }}</span>
                      <span class="question-type-label">{{ getQuestionTypeLabel(question.type) }}</span>
                      <div class="question-actions">
                        <button class="btn-icon" @click="moveQuestionUp(index)" :disabled="index === 0" title="上移">
                          ↑
                        </button>
                        <button class="btn-icon" @click="moveQuestionDown(index)" :disabled="index === surveyForm.questions.length - 1" title="下移">
                          ↓
                        </button>
                        <button class="btn-icon" @click="duplicateQuestion(index)" title="复制">
                          📋
                        </button>
                        <button class="btn-icon btn-danger" @click="deleteQuestion(index)" title="删除">
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    <div class="question-content" @click.stop="editingIndex = index">
                      <div class="question-title-editor">
                        <div class="title-input-wrap">
                          <div class="title-input-shell">
                            <template v-if="ensureTitleRich(index).rich || question.titleHtml">
                              <div
                                class="title-rich-preview"
                                :data-q="`q${index}`"
                                v-html="(question.titleHtml && String(question.titleHtml).length ? question.titleHtml : ensureTitleRich(index).html) || asPlain(question.title)"
                              ></div>
                            </template>
                            <template v-else>
                              <input 
                                v-model="question.title" 
                                class="question-title-input" 
                                :placeholder="`请输入${getQuestionTypeLabel(question.type)}标题`"
                                @focus="onTitleFocus(index)"
                                @blur="(e)=>onTitleBlur(index, e)"
                              />
                            </template>
                            <span class="title-rich-btn-wrap" v-show="shouldShowTitleBtn(index)">
                              <el-tooltip effect="dark" content="富文本" placement="top" :show-after="200">
                                <button class="icon-btn title-rich-btn inside" :class="{ active: !!question.titleHtml || ensureTitleRich(index).rich }" @mousedown.prevent @click.stop="openTitleRichEditor(index)" aria-label="富文本编辑" tabindex="0">
                                  <svg class="icon" viewBox="0 0 1024 1024" width="16" height="16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                    <path d="M128 204.8a76.8 76.8 0 0 1 76.8-76.8h486.4a76.8 76.8 0 0 1 76.8 76.8v225.0624a76.8 76.8 0 0 1-21.44 53.2352L470.656 770.0352A76.8 76.8 0 0 1 415.296 793.6H204.8a76.8 76.8 0 0 1-76.8-76.8V204.8z" fill="#1677FF"></path>
                                    <path d="M230.4 307.2a76.8 76.8 0 0 1 76.8-76.8h486.4a76.8 76.8 0 0 1 76.8 76.8v179.2L460.8 896H307.2a76.8 76.8 0 0 1-76.8-76.8V307.2z" fill="#FFFFFF" fill-opacity=".35"></path>
                                    <path d="M332.8 358.4h307.2v51.2H332.8v-51.2z" fill="#FFFFFF"></path>
                                    <path d="M332.8 486.4h307.2v51.2H332.8v-51.2z" fill="#FFFFFF"></path>
                                    <path d="M332.8 614.4h179.2v51.2H332.8v-51.2z" fill="#FFFFFF"></path>
                                    <path d="M806.4 608l72.4096 72.4096L627.2 934.4l-86.336 8.5504 13.9264-80.96L806.4 608zM883.2 527.1808l72.4096 72.4096-51.2 55.2192L832 582.4l51.2-55.2192z" fill="#1677FF"></path>
                                  </svg>
                                </button>
                              </el-tooltip>
                            </span>
                          </div>
                        </div>
                      </div>
                      <!-- 填写提示编辑框：由底部工具条的“填写提示”复选框控制显示 -->
                      <div v-if="editingIndex === index && isHintOpen(question)" class="hint-editor">
                        <input 
                          v-model="question.description" 
                          class="hint-input" 
                          type="text"
                          placeholder="填写提示（显示在标题下方，作为副标题）"
                        />
                      </div>
                      
                      <!-- 编辑状态：选择题选项编辑 -->
                      <div v-if="editingIndex === index && hasOptions(question.type)" class="question-options-editor compact">
                        <!-- 顶部操作栏 -->
                        <div class="options-toolbar">
                          <button class="btn btn-sm btn-add-option" @click.stop="addOption(question)">+ 添加选项</button>
                          <button class="btn btn-link-sm" @click.stop="openBatchEdit(index)">批量编辑</button>
                          <button :class="['btn','btn-link-sm', { active: isGroupConfigured(surveyForm.questions[index]) }]" @click.stop="openGroupDialog(index)">分组设置</button>
                          <button :class="['btn','btn-link-sm', { active: isScoreConfigured(surveyForm.questions[index]) }]">分数</button>
                          <button :class="['btn','btn-link-sm', { active: isQuotaConfigured(surveyForm.questions[index]) }]" @click.stop="openQuotaDialog(index)">配额设置</button>
                        </div>
                        
                        <!-- 选项列表（支持分组预览） -->
                        <div class="options-list">
                          <template v-for="(option, optIndex) in question.options" :key="optIndex">
                            <div v-if="groupHeaderFor(question, optIndex)" class="group-header">{{ groupHeaderFor(question, optIndex) }}</div>
                            <div class="option-item with-tools">
                              <div class="opt-left">
                                <!-- 单选显示圆形， 多选显示方形 -->
                                <span v-if="question.type === 3" class="option-radio el-radio-sim">
                                  <el-radio :model-value="false" disabled />
                                </span>
                                <span v-else-if="question.type === 4" class="option-radio el-checkbox-sim">
                                  <el-checkbox :model-value="false" disabled />
                                </span>
                                <div class="opt-input-wrap">
                                  <template v-if="ensureOptionExtras(question, optIndex).rich">
                                    <div
                                      class="option-input-preview"
                                      :data-opt="`q${index}-o${optIndex}`"
                                      v-html="(question.options as string[])[optIndex]"
                                    ></div>
                                  </template>
                                  <template v-else>
                                    <input
                                      :data-opt="`q${index}-o${optIndex}`"
                                      v-model="(question.options as string[])[optIndex]"
                                      class="option-input"
                                      :placeholder="`选项${optIndex + 1}`"
                                    />
                                  </template>
                                </div>
                                  <span
                                    class="quota-remaining"
                                    v-if="(surveyForm.questions[index] as any)?.quotasEnabled && optionRemaining(question, optIndex) != null"
                                  >（剩余{{ optionRemaining(question, optIndex) }}）</span>
                                <span class="option-logic-hint" v-if="optionSummary(index, optIndex)">（{{ optionSummary(index, optIndex) }}）</span>
                                <span class="option-logic-hint" v-if="jumpSummary(index, optIndex)">（{{ jumpSummary(index, optIndex) }}）</span>
                                <span class="option-logic-hint" v-if="ensureOptionExtras(question, optIndex).hidden">（已隐藏）</span>
                              </div>
                              <div class="opt-tools">
                                <!-- 图标工具：富文本、加号圆、减号圆、文档、隐藏 -->
                                <el-tooltip effect="dark" content="富文本" placement="top" :show-after="200">
                                  <button class="icon-btn" :class="{ active: !!ensureOptionExtras(question, optIndex).rich }" @click.stop="openOptionRichEditor(index, optIndex)"><EditPen class="icon" /></button>
                                </el-tooltip>
                                <el-tooltip effect="dark" content="在下方插入选项" placement="top" :show-after="200">
                                  <button class="icon-btn" @click.stop="addOptionAt(question, optIndex + 1)"><CirclePlus class="icon" /></button>
                                </el-tooltip>
                                <el-tooltip effect="dark" content="删除该选项" placement="top" :show-after="200">
                                  <button class="icon-btn" @click.stop="removeOption(question, optIndex)"><Remove class="icon" /></button>
                                </el-tooltip>
                                <el-tooltip effect="dark" content="添加说明" placement="top" :show-after="200">
                                  <button class="icon-btn" :class="{ active: !!ensureOptionExtras(question, optIndex).hasDesc }" @click.stop="toggleDesc(question, optIndex)"><Document class="icon" /></button>
                                </el-tooltip>
                                <el-tooltip effect="dark" content="隐藏选项" placement="top" :show-after="200">
                                  <button class="icon-btn" :class="{ active: !!ensureOptionExtras(question, optIndex).hidden }" @click.stop="toggleHidden(question, optIndex)"><Hide class="icon" /></button>
                                </el-tooltip>
                                <!-- 复选开关：互斥、默认 -->
                                <label class="chk mini" v-if="question.type === 4"><input type="checkbox" v-model="ensureOptionExtras(question, optIndex).exclusive" /> 互斥</label>
                                <label class="chk mini"><input type="checkbox" v-model="ensureOptionExtras(question, optIndex).defaultSelected" /> 默认</label>
                                <!-- 填空：仅开关（必填直接放第二行预览旁边） -->
                                <label class="chk mini"><input type="checkbox" v-model="ensureOptionExtras(question, optIndex).fillEnabled" /> 填空</label>
                              </div>
                              <!-- 预览：当开启“填空”时，在编辑界面下方展示一个只读输入框提示 -->
                              <div v-if="ensureOptionExtras(question, optIndex).fillEnabled" class="opt-fill-preview">
                                <!-- 可编辑：作为填写页的 placeholder 提示语 -->
                                <input
                                  class="opt-fill-input"
                                  v-model="ensureOptionExtras(question, optIndex).fillPlaceholder"
                                  placeholder="设置该填空的提示语（可选）"
                                />
                                <label class="chk mini" style="white-space:nowrap;">
                                  <input type="checkbox" v-model="ensureOptionExtras(question, optIndex).fillRequired" /> 必填
                                </label>
                              </div>
                              <div v-if="ensureOptionExtras(question, optIndex).hasDesc" class="opt-desc-edit">
                                <input class="opt-desc-input" v-model="ensureOptionExtras(question, optIndex).desc" placeholder="输入该选项的说明（可选）" />
                              </div>
                            </div>
                          </template>
                        </div>
                        <div v-if="isMatrixLegacyQuestion(question.type)" class="matrix-rows-editor">
                          <div class="matrix-rows-editor__header">
                            <span>矩阵行</span>
                            <button class="btn btn-link-sm" @click.stop="addMatrixRow(question)">+ 添加行</button>
                          </div>
                          <div class="matrix-rows-editor__list">
                            <div
                              v-for="(row, rowIndex) in ensureMatrixConfig(question).rows"
                              :key="`row-${rowIndex}`"
                              class="matrix-rows-editor__item"
                            >
                              <span class="matrix-rows-editor__index">{{ rowIndex + 1 }}</span>
                              <input
                                v-model="ensureMatrixConfig(question).rows[rowIndex]"
                                class="matrix-rows-editor__input"
                                :placeholder="`维度${rowIndex + 1}`"
                              />
                              <button class="icon-btn" @click.stop="removeMatrixRow(question, rowIndex)">
                                <Remove class="icon" />
                              </button>
                            </div>
                          </div>
                        </div>
                      <!-- 高级功能链接 -->
                        <div class="advanced-options">
                          <template v-if="index > 0 && selectablePrevQs(index).length > 0">
                            <a href="#" class="link-action" :class="{ active: !!questionLogicSummary(index) }" @click.stop.prevent="openLogicDialog(index)">题目关联</a>
                          </template>
                          <template v-else>
                            <span class="link-disabled" title="需要前面有可选择的题目，且第1题无法设置">题目关联</span>
                          </template>
                          <a href="#" class="link-action" :class="{ active: !!(surveyForm.questions[index] && (surveyForm.questions[index] as any).jumpLogic) }" @click.stop.prevent="openJumpDialog(index)">跳题逻辑</a>
                          <a href="#" class="link-action" :class="{ active: Array.isArray((surveyForm.questions[index] as any)?.optionLogic) && ((surveyForm.questions[index] as any).optionLogic || []).some((g:any)=> Array.isArray(g) && g.length>0) }" @click.stop.prevent="openOptionLogicDialog(index)">选项关联</a>
                          
                          <!-- 左侧设置项：选项顺序和排列 -->
                          <template v-if="hasOptions(question.type)">
                            <span class="separator">|</span>
                            <span class="label">选项顺序</span>
                            <select class="mini-select" v-model="question.optionOrder">
                              <option value="none">选项不随机</option>
                              <option value="all">全部项随机</option>
                              <option value="flip">选项正倒序随机</option>
                              <option value="firstFixed">第1项不随机</option>
                              <option value="lastFixed">最后1项不随机</option>
                            </select>
                            <span class="label">排列</span>
                            <select class="mini-select">
                              <option>竖向排列</option>
                            </select>
                          </template>
                          
                          <!-- 右侧控制项：填写提示、必答、完成编辑 -->
                          <div class="right-controls-inline">
                            <label class="checkbox-mini">
                              <input type="checkbox" :checked="isHintOpen(question)" @change.stop="onHintCheckboxChange(question, $event)" /> 填写提示
                            </label>
                            <label class="checkbox-mini">
                              <input v-model="question.required" type="checkbox" /> 必答
                            </label>
                            <button class="btn btn-primary btn-sm" @click.stop="finishEdit(index)">完成编辑</button>
                          </div>
                        </div>
                        
                        <!-- 题目关联摘要（显示在该题的选项的最下面） -->
                        <div v-if="questionLogicSummary(index)" class="question-logic-hint">（{{ questionLogicSummary(index) }}）</div>
                      </div>
                      <!-- 若非选择题，仍在题目下方显示摘要 -->
                      <div v-else-if="editingIndex === index && questionLogicSummary(index)" class="question-logic-hint">（{{ questionLogicSummary(index) }}）</div>

                      <div v-else-if="editingIndex === index && isStandaloneConfigType(question.type)" class="standalone-editor">
                        <template v-if="isSliderLegacyQuestion(question.type)">
                          <div class="standalone-editor__row">
                            <label class="standalone-editor__label">最小值</label>
                            <input v-model.number="ensureSliderValidation(question).min" class="standalone-editor__input standalone-editor__input--sm" type="number" @change="normalizeSliderValidation(question)" />
                            <label class="standalone-editor__label">最大值</label>
                            <input v-model.number="ensureSliderValidation(question).max" class="standalone-editor__input standalone-editor__input--sm" type="number" @change="normalizeSliderValidation(question)" />
                            <label class="standalone-editor__label">步长</label>
                            <input v-model.number="ensureSliderValidation(question).step" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" @change="normalizeSliderValidation(question)" />
                          </div>
                          <div class="standalone-editor__preview">
                            <el-slider
                              :model-value="ensureSliderValidation(question).min"
                              :min="ensureSliderValidation(question).min"
                              :max="ensureSliderValidation(question).max"
                              :step="ensureSliderValidation(question).step"
                              disabled
                            />
                            <div class="standalone-editor__meta">
                              <span>{{ ensureSliderValidation(question).min }}</span>
                              <span>步长 {{ ensureSliderValidation(question).step }}</span>
                              <span>{{ ensureSliderValidation(question).max }}</span>
                            </div>
                          </div>
                        </template>
                        <template v-else-if="isUploadLegacyQuestion(question.type)">
                          <div class="standalone-editor__upload">
                            <div class="standalone-editor__upload-box">点击或拖拽上传附件</div>
                            <div class="standalone-editor__row">
                              <label class="standalone-editor__label">最多文件</label>
                              <input
                                v-model.number="ensureUploadConfig(question).maxFiles"
                                class="standalone-editor__input standalone-editor__input--sm"
                                type="number"
                                min="1"
                                max="20"
                                @change="normalizeUploadConfig(question)"
                              />
                              <label class="standalone-editor__label">单文件大小 MB</label>
                              <input
                                v-model.number="ensureUploadConfig(question).maxSizeMb"
                                class="standalone-editor__input standalone-editor__input--sm"
                                type="number"
                                min="1"
                                max="10"
                                @change="normalizeUploadConfig(question)"
                              />
                            </div>
                            <div class="standalone-editor__column">
                              <label class="standalone-editor__label">允许格式</label>
                              <input
                                v-model="ensureUploadConfig(question).accept"
                                class="standalone-editor__input standalone-editor__input--lg"
                                type="text"
                                placeholder=".jpg,.png,.pdf"
                                @change="normalizeUploadConfig(question)"
                              />
                            </div>
                            <div class="standalone-editor__tip">{{ uploadConfigSummary(question) }}</div>
                          </div>
                        </template>
                        <template v-else-if="isRatingLegacyQuestion(question.type)">
                          <div class="standalone-editor__column">
                            <div class="standalone-editor__row">
                              <label class="standalone-editor__label">最小分</label>
                              <input v-model.number="ensureRatingValidation(question).min" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" max="10" @change="normalizeRatingValidation(question)" />
                              <label class="standalone-editor__label">最大分</label>
                              <input v-model.number="ensureRatingValidation(question).max" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" max="10" @change="normalizeRatingValidation(question)" />
                            </div>
                            <div class="standalone-editor__preview">
                              <div class="star-rating">
                                <span v-for="star in ensureRatingValidation(question).max" :key="`rating-${star}`" class="star">★</span>
                              </div>
                              <div class="standalone-editor__tip">填写页会按星级评分展示。</div>
                            </div>
                          </div>
                        </template>
                        <template v-else-if="isScaleLegacyQuestion(question.type)">
                          <div class="standalone-editor__column">
                            <div class="standalone-editor__row">
                              <label class="standalone-editor__label">最小值</label>
                              <input v-model.number="ensureScaleValidation(question).min" class="standalone-editor__input standalone-editor__input--sm" type="number" min="0" @change="normalizeScaleValidation(question)" />
                              <label class="standalone-editor__label">最大值</label>
                              <input v-model.number="ensureScaleValidation(question).max" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" @change="normalizeScaleValidation(question)" />
                              <label class="standalone-editor__label">步长</label>
                              <input v-model.number="ensureScaleValidation(question).step" class="standalone-editor__input standalone-editor__input--sm" type="number" min="1" @change="normalizeScaleValidation(question)" />
                            </div>
                            <div class="standalone-editor__row">
                              <label class="standalone-editor__label">左侧标签</label>
                              <input v-model="ensureScaleValidation(question).minLabel" class="standalone-editor__input standalone-editor__input--lg" type="text" placeholder="最低" />
                            </div>
                            <div class="standalone-editor__row">
                              <label class="standalone-editor__label">右侧标签</label>
                              <input v-model="ensureScaleValidation(question).maxLabel" class="standalone-editor__input standalone-editor__input--lg" type="text" placeholder="最高" />
                            </div>
                            <div class="standalone-editor__preview">
                              <div class="scale-labels">
                                <span>{{ ensureScaleValidation(question).minLabel }}</span>
                                <span>{{ ensureScaleValidation(question).maxLabel }}</span>
                              </div>
                              <div class="scale-numbers">
                                <button
                                  v-for="value in getScalePreviewValues(question)"
                                  :key="`scale-${value}`"
                                  class="scale-btn"
                                  type="button"
                                  disabled
                                >
                                  {{ value }}
                                </button>
                              </div>
                            </div>
                          </div>
                        </template>
                        <template v-else-if="question.type === 14">
                          <div class="standalone-editor__date">
                            <input class="standalone-editor__input" type="date" disabled />
                            <div class="standalone-editor__tip">填写页将使用原生日期选择器。</div>
                          </div>
                        </template>
                        <template v-else-if="question.type === 18">
                          <div class="standalone-editor__tip">该题型在填写页以说明块展示，不收集答案。</div>
                        </template>
                        <div v-if="questionLogicSummary(index)" class="question-logic-hint">（{{ questionLogicSummary(index) }}）</div>
                      </div>

                      <!-- 通用底部设置栏（编辑时显示，统一“必答”入口） -->
                      <!-- 已合并到 advanced-options 中 -->
                      
                      
                      
                      <!-- 完成编辑后的紧凑预览 -->
                      <div v-else class="question-compact-preview">
                        <template v-if="isMatrixLegacyQuestion(question.type)">
                          <div class="matrix-preview">
                            <div class="matrix-preview__table">
                              <div class="matrix-preview__head">
                                <span class="matrix-preview__corner">维度</span>
                                <span v-for="(option, i) in question.options" :key="`matrix-col-${i}`" class="matrix-preview__cell matrix-preview__cell--head">
                                  {{ option }}
                                </span>
                              </div>
                              <div v-for="(row, rowIndex) in ensureMatrixConfig(question).rows" :key="`matrix-row-${rowIndex}`" class="matrix-preview__row">
                                <span class="matrix-preview__cell matrix-preview__cell--row">{{ row }}</span>
                                <span v-for="(_, i) in question.options" :key="`matrix-dot-${rowIndex}-${i}`" class="matrix-preview__cell">
                                  <span v-if="isMatrixDropdownLegacyQuestion(question.type)" class="matrix-preview__select">请选择</span>
                                  <span v-else-if="isMatrixMultipleLegacyQuestion(question.type)" class="matrix-preview__check"></span>
                                  <span v-else class="matrix-preview__dot"></span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div v-if="questionLogicSummary(index)" class="question-logic-hint">（{{ questionLogicSummary(index) }}）</div>
                        </template>
                        <template v-else-if="hasOptions(question.type)">
                          <div class="options-preview">
                            <template v-for="(opt, i) in question.options" :key="i">
                              <div v-if="groupHeaderFor(question, i)" class="group-header">{{ groupHeaderFor(question, i) }}</div>
                              <div class="option-preview">
                              <span class="radio-circle" v-if="question.type===3">
                                <el-radio :model-value="false" disabled class="preview-radio-sim" />
                              </span>
                              <span class="radio-circle" v-else-if="question.type===4">
                                <el-checkbox :model-value="false" disabled class="preview-checkbox-sim" />
                              </span>
                              <template v-if="ensureOptionExtras(question, i).rich">
                                <div class="option-text" v-html="opt"></div>
                              </template>
                              <template v-else>
                                <span class="option-text">{{ opt }}</span>
                              </template>
                              <span
                                class="quota-remaining"
                                v-if="(surveyForm.questions[index] as any)?.quotasEnabled && optionRemaining(question, i) != null"
                              >（剩余{{ optionRemaining(question, i) }}）</span>
                              <span class="option-logic-hint" v-if="optionSummary(index, i)">（{{ optionSummary(index, i) }}）</span>
                              <span class="option-logic-hint" v-if="jumpSummary(index, i)">（{{ jumpSummary(index, i) }}）</span>
                              <span class="option-logic-hint" v-if="ensureOptionExtras(question, i).hidden">（已隐藏）</span>
                              </div>
                            </template>
                          </div>
                          <!-- 题目关联摘要（紧凑预览：选项列表的最下面） -->
                          <div v-if="questionLogicSummary(index)" class="question-logic-hint">（{{ questionLogicSummary(index) }}）</div>
                        </template>
                        <template v-else>
                          <div class="input-preview">
                            <span v-if="question.type === 1">填空题输入框</span>
                            <span v-else-if="question.type === 2">简答题输入框</span>
                            <span v-else-if="isSliderLegacyQuestion(question.type)">滑动条：{{ ensureSliderValidation(question).min }} - {{ ensureSliderValidation(question).max }}</span>
                            <span v-else-if="isRatingLegacyQuestion(question.type)">评分：{{ ensureRatingValidation(question).min }} - {{ ensureRatingValidation(question).max }} 星</span>
                            <span v-else-if="isScaleLegacyQuestion(question.type)">量表：{{ ensureScaleValidation(question).min }} - {{ ensureScaleValidation(question).max }}</span>
                            <span v-else-if="isUploadLegacyQuestion(question.type)">文件上传：{{ ensureUploadConfig(question).maxFiles }} 个以内</span>
                            <span v-else-if="question.type === 14">日期选择器</span>
                            <span v-else-if="question.type === 18">说明文字块</span>
                            <span v-else>{{ getQuestionTypeLabel(question.type) }}</span>
                          </div>
                          <div v-if="questionLogicSummary(index)" class="question-logic-hint">（{{ questionLogicSummary(index) }}）</div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- 批量添加题目按钮 -->
                <div class="batch-add-questions-wrapper">
                  <button class="btn-batch-add-questions" @click="openBatchAddDialog">
                    <el-icon class="btn-icon"><DocumentAdd /></el-icon>
                    <span class="btn-text">批量添加题目</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 左侧：题型面板（并入编辑区） -->
            <aside class="question-types-panel in-editor">
              <div class="panel-header">
                <div class="panel-tabs" role="tablist" aria-label="题型面板切换">
                  <button class="panel-tab" :class="{ active: panelTab === 'types' }" role="tab" :aria-selected="panelTab==='types'" @click="panelTab = 'types'">题型</button>
                  <button class="panel-tab" :class="{ active: panelTab === 'repo' }" role="tab" :aria-selected="panelTab==='repo'" @click="panelTab = 'repo'">题库</button>
                  <button class="panel-tab" :class="{ active: panelTab === 'outline' }" role="tab" :aria-selected="panelTab==='outline'" @click="panelTab = 'outline'">大纲</button>
                </div>
              </div>
              
              <!-- 题型页签：原有分类与题型列表 -->
              <template v-if="panelTab === 'types'">
              <div class="question-categories">
                <!-- 选择题 -->
                <div class="category-compact">
                  <div class="category-title" @click="toggleCategory('choice')">
                    <span class="category-arrow" :class="{ collapsed: !categoryExpanded.choice }">▼</span>
                    <span>选择题</span>
                  </div>
                  <div class="type-list" v-show="categoryExpanded.choice">
                    <div class="type-item" @click="addQuestionByType(3)"><el-icon class="type-icon"><CircleCheck /></el-icon><span>单选</span></div>
                    <div class="type-item" @click="addQuestionByType(4)"><el-icon class="type-icon"><Finished /></el-icon><span>多选</span></div>
                    <div class="type-item" @click="addQuestionByType(7)"><el-icon class="type-icon"><ArrowDown /></el-icon><span>下拉题</span></div>
                    <div class="type-item" @click="addQuestionByType(13)"><el-icon class="type-icon"><UploadFilled /></el-icon><span>文件上传</span></div>
                    <div class="type-item" @click="addQuestionByType(11)"><el-icon class="type-icon"><Sort /></el-icon><span>排序</span></div>
                    <div class="type-item" @click="addQuestionByType(29)"><el-icon class="type-icon"><StarFilled /></el-icon><span>星亮题</span></div>
                  </div>
                </div>

                <!-- 填空题 -->
                <div class="category-compact">
                  <div class="category-title" @click="toggleCategory('fillblank')">
                    <span class="category-arrow" :class="{ collapsed: !categoryExpanded.fillblank }">▼</span>
                    <span>填空题</span>
                  </div>
                  <div class="type-list" v-show="categoryExpanded.fillblank">
                    <div class="type-item" @click="addQuestionByType(1)"><el-icon class="type-icon"><Edit /></el-icon><span>单项填空</span></div>
                    <div class="type-item" @click="addQuestionByType(9)"><el-icon class="type-icon"><EditPen /></el-icon><span>多项填空</span></div>
                    <div class="type-item" @click="addQuestionByType(2)"><el-icon class="type-icon"><EditPen /></el-icon><span>简答题</span></div>
                    <div class="type-item" @click="addQuestionByType(27)"><el-icon class="type-icon"><Document /></el-icon><span>表格填空</span></div>
                    <div class="type-item" @click="addQuestionByType(28)"><el-icon class="type-icon"><Collection /></el-icon><span>表格量表</span></div>
                    <div class="type-item" @click="addQuestionByType(4)"><el-icon class="type-icon"><EditPen /></el-icon><span>签名题</span></div>
                    <div class="type-item" @click="addQuestionByType(14)"><el-icon class="type-icon"><Calendar /></el-icon><span>日期</span></div>
                    <div class="type-item" @click="addQuestionByType(15)"><el-icon class="type-icon"><HelpFilled /></el-icon><span>AI 协助</span></div>
                    <div class="type-item" @click="addQuestionByType(16)"><el-icon class="type-icon"><ChatLineRound /></el-icon><span>AI 问答</span></div>
                  </div>
                </div>

                <!-- 分页说明 -->
                <div class="category-compact">
                  <div class="category-title" @click="toggleCategory('paging')">
                    <span class="category-arrow" :class="{ collapsed: !categoryExpanded.paging }">▼</span>
                    <span>分页说明</span>
                  </div>
                  <div class="type-list" v-show="categoryExpanded.paging">
                    <div class="type-item" @click="addQuestionByType(17)"><el-icon class="type-icon"><Document /></el-icon><span>分页符</span></div>
                    <div class="type-item" @click="addQuestionByType(18)"><el-icon class="type-icon"><Document /></el-icon><span>段落说明</span></div>
                    <div class="type-item" @click="addQuestionByType(18)"><el-icon class="type-icon"><Timer /></el-icon><span>分页计时器</span></div>
                    <div class="type-item" @click="addQuestionByType(19)"><el-icon class="type-icon"><Fold /></el-icon><span>折叠分组</span></div>
                  </div>
                </div>

                <!-- 矩阵题 -->
                <div class="category-compact">
                  <div class="category-title" @click="toggleCategory('matrix')">
                    <span class="category-arrow" :class="{ collapsed: !categoryExpanded.matrix }">▼</span>
                    <span>矩阵题</span>
                  </div>
                  <div class="type-list" v-show="categoryExpanded.matrix">
                    <div class="type-item" @click="addQuestionByType(20)"><el-icon class="type-icon"><Collection /></el-icon><span>矩阵单选</span></div>
                    <div class="type-item" @click="addQuestionByType(21)"><el-icon class="type-icon"><Collection /></el-icon><span>矩阵多选</span></div>
                    <div class="type-item" @click="addQuestionByType(22)"><el-icon class="type-icon"><DataLine /></el-icon><span>矩阵量表</span></div>
                    <div class="type-item" @click="addQuestionByType(25)"><el-icon class="type-icon"><Collection /></el-icon><span>矩阵填空</span></div>
                    <div class="type-item" @click="addQuestionByType(23)"><el-icon class="type-icon"><DataLine /></el-icon><span>矩阵滑动条</span></div>
                    <div class="type-item" @click="addQuestionByType(24)"><el-icon class="type-icon"><List /></el-icon><span>矩阵下拉题</span></div>
                    <div class="type-item" @click="addQuestionByType(26)"><el-icon class="type-icon"><Collection /></el-icon><span>矩阵组合</span></div>
                    <div class="type-item" @click="addQuestionByType(28)"><el-icon class="type-icon"><Collection /></el-icon><span>表格组合</span></div>
                    <div class="type-item" @click="addQuestionByType(28)"><el-icon class="type-icon"><Document /></el-icon><span>自填表格</span></div>
                  </div>
                </div>

                <!-- 评分题 -->
                <div class="category-compact">
                  <div class="category-title" @click="toggleCategory('rating')">
                    <span class="category-arrow" :class="{ collapsed: !categoryExpanded.rating }">▼</span>
                    <span>评分题</span>
                  </div>
                  <div class="type-list" v-show="categoryExpanded.rating">
                    <div class="type-item" @click="addQuestionByType(29)"><el-icon class="type-icon"><StarFilled /></el-icon><span>星亮题</span></div>
                    <div class="type-item" @click="addQuestionByType(30)"><el-icon class="type-icon"><Histogram /></el-icon><span>NPS 量表</span></div>
                    <div class="type-item" @click="addQuestionByType(31)"><el-icon class="type-icon"><Star /></el-icon><span>评分单选</span></div>
                    <div class="type-item" @click="addQuestionByType(32)"><el-icon class="type-icon"><Star /></el-icon><span>评分多选</span></div>
                    <div class="type-item" @click="addQuestionByType(33)"><el-icon class="type-icon"><Histogram /></el-icon><span>评分矩阵</span></div>
                    <div class="type-item" @click="addQuestionByType(34)"><el-icon class="type-icon"><Tickets /></el-icon><span>评价题</span></div>
                  </div>
                </div>

                <!-- 高级题型 -->
                <div class="category-compact">
                  <div class="category-title" @click="toggleCategory('advanced')">
                    <span class="category-arrow" :class="{ collapsed: !categoryExpanded.advanced }">▼</span>
                    <span>高级题型</span>
                  </div>
                  <div class="type-list" v-show="categoryExpanded.advanced">
                    <div class="type-item" @click="addQuestionByType(11)"><el-icon class="type-icon"><Sort /></el-icon><span>排序</span></div>
                    <div class="type-item" @click="addQuestionByType(36)"><el-icon class="type-icon"><DataLine /></el-icon><span>比重题</span></div>
                    <div class="type-item" @click="addQuestionByType(8)"><el-icon class="type-icon"><DataLine /></el-icon><span>滑动条</span></div>
                    <div class="type-item" @click="addQuestionByType(37)"><el-icon class="type-icon"><Picture /></el-icon><span>图像 OCR</span></div>
                    <div class="type-item" @click="addQuestionByType(39)"><el-icon class="type-icon"><Picture /></el-icon><span>图像题</span></div>
                    <div class="type-item" @click="addQuestionByType(38)"><el-icon class="type-icon"><Microphone /></el-icon><span>答题录音</span></div>
                    <div class="type-item" @click="addQuestionByType(40)"><el-icon class="type-icon"><Calendar /></el-icon><span>预约</span></div>
                    <div class="type-item" @click="addQuestionByType(41)"><el-icon class="type-icon"><VideoCamera /></el-icon><span>视频题</span></div>
                    <div class="type-item" @click="addQuestionByType(42)"><el-icon class="type-icon"><Link /></el-icon><span>VlookUp 问卷关联</span></div>
                  </div>
                </div>
              </div>
              <!-- AI助手面板（并入题型页签内部） -->
              <div v-if="showAIHelper" class="ai-helper-panel">
                <h4>🤖 AI助手</h4>
                <p class="ai-tip">提示：输入您的需求，AI将为您自动生成问题。可以轻松生成问卷和文档分析内容。</p>
                <textarea 
                  v-model="aiPrompt" 
                  class="ai-input" 
                  placeholder="例如：帮我生成一套关于员工满意度的调查问卷"
                ></textarea>
                <button class="btn btn-primary btn-block" @click="generateByAI">
                  ✨ 立即生成
                </button>
              </div>
              </template>


              <!-- 题库页签：占位（可扩展搜索与模板） -->
              <div v-else-if="panelTab === 'repo'" class="question-bank">
                <div class="bank-empty">
                  <div class="bank-tip">题库功能开发中…（可在此放常用题模板、搜索与分类）</div>
                </div>
              </div>

              <!-- 大纲页签：根据当前问题生成的简要目录 -->
              <div v-else class="outline-list" ref="outlineListEl">
                <div v-if="showOutlineTip" class="outline-tip">
                  <span class="tip-icon">i</span>
                  <span class="tip-text">拖动目录可修改题目排序</span>
                  <button class="tip-close" @click="showOutlineTip=false">×</button>
                </div>
                <template v-if="surveyForm.questions.length">
                  <div class="outline-item"
                       v-for="(q, i) in surveyForm.questions"
                       :key="q.id"
                       :class="{ dragging: draggingIndex===i, over: dragOverIndex===i, 'over-before': dragOverIndex===i && dragOverPos==='before', 'over-after': dragOverIndex===i && dragOverPos==='after' }"
                       @dragover.prevent="onOutlineDragOver(i, $event)"
                       @drop="onOutlineDrop(i)"
                       @dragend="onOutlineDragEnd"
                       @click="editingIndex = i; currentTab = 'edit'"
                       @dblclick="startRename(i, q)">
                    <span class="drag-handle" draggable="true" @dragstart="onOutlineDragStart(i, $event)">≡</span>
                    <span class="num">{{ i + 1 }}.</span>
                    <template v-if="renamingIndex===i">
                      <input class="rename-input" v-model="renameText" ref="renameInputEl" @keydown.enter.prevent="confirmRename" @blur="confirmRename" />
                    </template>
                    <template v-else>
                      <span class="title">{{ q.title || getQuestionTypeLabel(q.type) }}</span>
                    </template>
                    <span class="meta">{{ getQuestionTypeLabel(q.type) }}</span>
                  </div>
                  <!-- 列表末尾的放置区域，用于拖动到最后一位 -->
                  <div class="outline-end-drop" :class="{ over: dragOverIndex==='end' }"
                       @dragover.prevent="onOutlineDragOver('end', $event)"
                       @drop="onOutlineDrop('end')"></div>
                </template>
                <div v-else class="outline-empty">暂无题目，先到“题型”页签添加题目</div>
              </div>
            </aside>
          </div>
        </div>

        <!-- 答卷详情（已解耦到 SurveyAnswersPanel 组件） -->
        <div v-else-if="currentTab === 'answers'" class="answers-area">
          <SurveyAnswersPanel 
            :stats="answerStats" 
            :survey-id="currentSurveyId" 
            :questions="surveyForm.questions" 
          />
        </div>

        <!-- 预览模式（内嵌实时渲染，代码已解耦到 SurveyPreviewEmbed 组件） -->
        <div v-else-if="currentTab === 'preview'" class="preview-area embedded">
          <SurveyPreviewEmbed :survey-form="surveyForm" />
        </div>

  <!-- 设置模式 -->
  <div v-else-if="currentTab === 'settings'" class="settings-area">
          <div class="settings-container">
            <h3>问卷设置</h3>
            
            <div class="settings-section">
              <h4>基本设置</h4>
              <div class="setting-item">
                <label>问卷类型</label>
                <select v-model="surveyForm.type" class="form-select">
                  <option value="normal">普通问卷</option>
                  <option value="anonymous">匿名问卷</option>
                  <option value="limited">限定问卷</option>
                </select>
              </div>
              
              <div class="setting-item">
                <label>收集截止时间</label>
                <input v-model="surveyForm.endTime" type="datetime-local" class="form-input" />
              </div>
            </div>
            
            <div class="settings-section">
              <h4>显示设置</h4>
              <div class="setting-item">
                <label class="checkbox-label">
                  <input v-model="surveyForm.settings.showProgress" type="checkbox" />
                  显示进度条
                </label>
              </div>
              
              <div class="setting-item">
                <label class="checkbox-label">
                  <input v-model="surveyForm.settings.randomizeQuestions" type="checkbox" />
                  随机排列题目
                </label>
              </div>
            </div>
            
            <div class="settings-section">
              <h4>提交设置</h4>
              <div class="setting-item">
                <label class="checkbox-label">
                  <input v-model="surveyForm.settings.allowMultipleSubmissions" type="checkbox" />
                  允许重复提交
                </label>
              </div>
              
              <div class="setting-item">
                <label class="checkbox-label">
                  <input v-model="surveyForm.settings.collectIP" type="checkbox" />
                  收集IP地址
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 问卷分享 -->
        <div v-else-if="currentTab === 'share'" class="share-area">
          <SurveySharePanel :title="surveyForm.title" :shareLink="computedShareLink" />
        </div>
      </div>
    </div>

    <!-- 题目关联弹窗（大众友好版，居中显示，Teleport到body避免被父级裁剪） -->
    <teleport to="body">
      <div v-if="showLogicDialog" class="logic-mask" @click.self="closeLogicDialog()">
        <div class="logic-dialog">
          <div class="logic-hd">
            <div class="logic-tt">题目关联逻辑</div>
            <button class="btn btn-link" @click="closeLogicDialog">✕</button>
          </div>
          <div class="logic-bd">
            <div class="logic-bar">
              <div class="logic-bar-title">当满足以下任意条件时，显示当前题目：</div>
            </div>
            <div v-for="(row, ri) in logicRows" :key="'row-'+ri" class="logic-rowbox q-logic-rowbox">
              <div class="logic-line">
                <span>如果</span>
                <select class="logic-select" v-model.number="row.depIdx">
                  <option v-for="(q2, qi) in (logicTargetIndex!=null? selectablePrevQs(logicTargetIndex):[])" :key="q2.id" :value="qi">第{{ qi+1 }}题：{{ q2.title || getQuestionTypeLabel(q2.type) }}</option>
                </select>
                <template v-if="(logicTargetIndex!=null? selectablePrevQs(logicTargetIndex):[])[row.depIdx]?.options?.length">
                  <span>选中了以下任意选项：</span>
                </template>
                <template v-else>
                  <select class="logic-select mini" v-model="row.op">
                    <option value="eq">等于</option>
                    <option value="neq">不等于</option>
                    <option value="gt">大于</option>
                    <option value="gte">大于等于</option>
                    <option value="lt">小于</option>
                    <option value="lte">小于等于</option>
                    <option value="includes">包含</option>
                    <option value="notIncludes">不包含</option>
                    <option value="regex">匹配正则</option>
                  </select>
                  <input class="logic-input" v-model="row.text" placeholder="请输入条件值" />
                </template>
                <button class="btn btn-link danger" @click="removeLogicRow(ri)" v-if="logicRows.length>1">删除</button>
              </div>
              <div class="chip-list" v-if="(logicTargetIndex!=null? selectablePrevQs(logicTargetIndex):[])[row.depIdx]?.options?.length">
                <span 
                  v-for="(opt, i) in ((logicTargetIndex!=null? selectablePrevQs(logicTargetIndex):[])[row.depIdx]?.options || [])" 
                  :key="i" 
                  class="chip" 
                  :class="{ active: (row.picked||[]).includes(String(opt)) }"
                  @click="togglePick(ri, String(opt))">
                  <span class="chip-text">{{ asPlain(opt) }}</span>
                  <span v-if="(row.picked||[]).includes(String(opt))" class="chip-x" @click.stop="togglePick(ri, String(opt))">×</span>
                </span>
              </div>
            </div>
            <button class="btn btn-link" @click="addLogicRow">+ 再加一条条件</button>
          </div>
          <div class="logic-ft">
            <div class="logic-left-block">
              <div class="logic-left-actions">
                  <button class="btn btn-link danger" @click="clearCurrentQuestionLogic">🗑 删除本题关联</button>
                <button class="btn btn-link danger" @click="clearAllLogicAssociations">🗑 删除所有题目关联</button>
              </div>
              <div class="logic-tip">说明：以下条件满足任意一条，本题就会显示。</div>
            </div>
            <div>
              <button class="btn btn-outline" @click="closeLogicDialog">取消</button>
              <button class="btn btn-primary" @click="saveLogicDialog">保存</button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 选项关联弹窗（左侧当前题的选项，右侧为该选项的出现条件） -->
    <teleport to="body">
      <div v-if="showOptionDialog" class="logic-mask" @click.self="closeOptionDialog()">
        <div class="logic-dialog">
          <div class="logic-hd">
            <div class="logic-titlebar">
              <div class="logic-tt">选项关联逻辑</div>
              <div class="logic-subtip">说明：以下条件满足任意一条，该选项才会显示。</div>
            </div>
            <button class="btn btn-link" @click="closeOptionDialog">✕</button>
          </div>
          <div class="logic-bd">
            <div class="opt-logic-head">
              <div class="row1">
                当前题目：
                <span class="qname">
                  {{ optionTargetIndex!=null ? (surveyForm.questions[optionTargetIndex].title || getQuestionTypeLabel(surveyForm.questions[optionTargetIndex].type)) : '' }}
                </span>
              </div>
            </div>
            <div class="opt-logic-layout">
              <div class="opt-logic-left">
                <div class="opt-head">当前选项</div>
                <div class="opt-rows">
                  <div
                    v-for="(opt, i) in (optionTargetIndex!=null? (surveyForm.questions[optionTargetIndex].options||[]):[])"
                    :key="'left-opt-'+i"
                    :class="['opt-row', { active: i===activeOptIdx }]"
                    @click="onPickLeftOption(i)"
                  >
                    <div class="opt-title">{{ optionLabelPlain(opt, i) }}</div>
                    <div class="opt-actions">
                      <span class="opt-status" :class="{ on: hasOptionLogic(i) }">{{ hasOptionLogic(i) ? '已设置' : '未设置' }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="opt-logic-right">
                <div class="opt-head">选项出现条件</div>
                <div class="opt-rows">
                  <div class="logic-rowbox">
                    <div class="logic-line" style="flex-wrap:wrap; gap:10px 12px; align-items: baseline;">
                      <span class="label">正在编辑：</span>
                      <span class="badge">{{ optionLabelPlain((optionTargetIndex!=null? (surveyForm.questions[optionTargetIndex].options||[]):[])[activeOptIdx], activeOptIdx) }}</span>
                      <span class="summary-text" v-if="currentOptionSummary">（{{ currentOptionSummary }}）</span>
                      <button class="btn btn-link danger" @click="clearCurrentOptionLogic">🗑 清除此选项关联</button>
                    </div>
                  </div>

                  <div v-for="(row, ri) in optionLogicRows" :key="'oprow-'+ri" class="logic-rowbox">
                    <div class="logic-line">
                      <select class="logic-select" v-model.number="row.depIdx">
                        <option v-for="(q2, qi) in (optionTargetIndex!=null? selectablePrevQs(optionTargetIndex):[])" :key="'dep-'+qi" :value="qi">第{{ qi+1 }}题：{{ q2.title || getQuestionTypeLabel(q2.type) }}</option>
                      </select>

                      <template v-if="(optionTargetIndex!=null? selectablePrevQs(optionTargetIndex):[])[row.depIdx]?.options?.length">
                        <div class="chip-list">
                          <span
                            class="chip"
                            v-for="(opt, i) in ((optionTargetIndex!=null? selectablePrevQs(optionTargetIndex):[])[row.depIdx]?.options || [])"
                            :key="'v-'+i"
                            :class="{ active: (row.picked||[]).includes(String(opt)) }"
                            @click="toggleOptionPick(ri, String(opt))"
                          >{{ asPlain(opt) }}</span>
                        </div>
                      </template>
                      <template v-else>
                        <select class="logic-select mini" v-model="row.op">
                          <option value="eq">等于</option>
                          <option value="neq">不等于</option>
                          <option value="gt">大于</option>
                          <option value="gte">大于等于</option>
                          <option value="lt">小于</option>
                          <option value="lte">小于等于</option>
                          <option value="regex">匹配正则</option>
                        </select>
                        <input class="logic-input" v-model="row.text" placeholder="请输入条件值" />
                      </template>

                      <button class="btn btn-link danger" @click="removeOptionLogicRow(ri)" v-if="optionLogicRows.length>1">删除</button>
                    </div>
                  </div>
                  <div class="right-actions-line">
                    <button class="btn btn-link" @click="addOptionLogicRow">+ 再加一条条件</button>
                    <button class="btn btn-primary btn-sm" @click="saveOptionDialogOne">确定</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="logic-ft">
            <div class="logic-left-block">
              <div class="logic-left-actions">
                <button class="btn btn-link danger" @click="clearAllOptionLogicForThisQuestion">🗑 清空本题全部关联</button>
              </div>
              <label class="checkbox-mini" style="margin-top:6px;">
                <input type="checkbox" v-model="(surveyForm.questions[optionTargetIndex||0] as any).autoSelectOnAppear" />
                选项出现时默认选中（设置了选项关联）
              </label>
              
            </div>
            <div>
              <button class="btn btn-outline" @click="closeOptionDialog">取消</button>
              <button class="btn btn-primary" @click="saveOptionDialog">保存</button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

    <!-- 跳题逻辑弹窗 -->
    <teleport to="body">
      <div v-if="showJumpDialog" class="logic-mask" @click.self="closeJumpDialog()">
        <div class="logic-dialog jump-dialog">
          <div class="logic-hd">
            <div class="logic-tt">跳题逻辑</div>
            <button class="btn btn-link" @click="closeJumpDialog">✕</button>
          </div>
          <div class="logic-bd">
            <div class="logic-bar">
              <label class="checkbox-mini">
                <input type="checkbox" v-model="jumpByOptionEnabled" /> 按选项跳题
              </label>
            </div>
            <div v-if="jumpByOptionEnabled" class="jump-table">
              <div class="jump-head">
                <div class="col col-a">选择</div>
                <div class="col col-b">选项</div>
                <div class="col col-c">跳转到</div>
              </div>
              <div class="jump-body">
                <div class="jump-row" v-for="(opt, i) in (jumpTargetIndex!=null ? (surveyForm.questions[jumpTargetIndex].options || []) : [])" :key="'jp-'+i">
                  <div class="col col-a"><span class="radio-circle">○</span></div>
                  <div class="col col-b">{{ asPlain(opt || ('选项'+(i+1))) }}</div>
                  <div class="col col-c">
                    <select class="logic-select" v-model="jumpByOption[String(i+1)]">
                      <option value="">不跳转，继续回答下一题</option>
                      <option v-for="(q2, qi) in surveyForm.questions" :key="'to-'+qi" :value="String(qi+1)" :disabled="qi <= (jumpTargetIndex||0)">跳转到 第{{ qi+1 }}题：{{ q2.title || getQuestionTypeLabel(q2.type) }}</option>
                      <option value="end">跳到问卷末尾结束作答</option>
                      <option value="invalid">直接提交为无效问卷</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <el-divider />
            <label class="checkbox-mini" style="display:block;margin-bottom:8px;">
              <input type="checkbox" v-model="jumpUnconditionalEnabled" /> 无条件跳题
            </label>
            <div v-if="jumpUnconditionalEnabled" class="logic-rowbox">
              <div class="logic-line">
                <span class="logic-bar-title">填写此题后跳转到</span>
                <select class="logic-select wide" v-model="jumpUnconditionalTarget">
                  <option value="">请选择要跳转到的题目</option>
                  <option v-for="(q2, qi) in surveyForm.questions" :key="'uto-'+qi" :value="String(qi+1)" :disabled="qi <= (jumpTargetIndex||0)">跳转到 第{{ qi+1 }}题：{{ q2.title || getQuestionTypeLabel(q2.type) }}</option>
                  <option value="end">跳到问卷末尾结束作答</option>
                  <option value="invalid">直接提交为无效问卷</option>
                </select>
              </div>
            </div>
          </div>
          <div class="logic-ft">
            <div>
              <div class="tip-muted">
                <div>提示：跳题逻辑适用于控制答题路径（例如调查问卷末尾），筛选无效人群。</div>
                <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;若需要控制题目显示/隐藏，请使用 题目关联。</div>
              </div>
            </div>
            <div>
              <button class="btn btn-outline" @click="closeJumpDialog">取消</button>
              <button class="btn btn-primary" @click="saveJumpDialog">确定</button>
            </div>
          </div>
        </div>
      </div>
    </teleport>

  </div>
  <!-- 通用富文本编辑对话框实例（页面级，按需打开） -->
  <QuillRichTextDialog
    v-model="showRteDialog"
    v-model:content="rteContent"
    title="编辑选项富文本"
    :max-length="2000"
    limit-mode="block"
    @confirm="applyRteContent"
  />
  <!-- 标题富文本编辑对话框 -->
  <QuillRichTextDialog
    v-model="showTitleRte"
    v-model:content="titleRteContent"
    title="编辑标题富文本"
    :max-length="2000"
    limit-mode="block"
    @confirm="applyTitleRteContent"
  />
  <!-- 问卷说明已改为内联富文本，不再使用弹窗 -->

  <!-- 批量添加题目 -->
  <teleport to="body">
    <div v-if="showBatchAddDialog" class="logic-mask" @click.self="closeBatchAddDialog">
      <div class="logic-dialog batch-add-questions-dialog">
        <div class="logic-hd">
          <div class="logic-tt">批量添加</div>
          <button class="btn btn-link" @click="closeBatchAddDialog">✕</button>
        </div>
        
        <!-- 标签页切换 -->
        <div class="batch-tabs">
          <button 
            class="batch-tab" 
            :class="{ active: batchAddTab === 'manual' }"
            @click="batchAddTab = 'manual'"
          >
            导入示例题目
          </button>
          <button 
            class="batch-tab" 
            :class="{ active: batchAddTab === 'paste' }"
            @click="batchAddTab = 'paste'"
          >
            清空文本框
          </button>
          <button class="batch-tab-help" title="帮助说明">
            <el-icon><QuestionFilled /></el-icon>
          </button>
          <a href="#" class="batch-tab-link">查找问卷题单入问卷</a>
        </div>
        
        <!-- 左右分栏布局 -->
        <div class="batch-add-content">
          <!-- 左侧：输入区 -->
          <div class="batch-add-left">
            <!-- 文本输入区 -->
            <div class="batch-add-textarea-wrapper">
              <textarea 
                v-model="batchAddText" 
                class="batch-add-textarea" 
                placeholder="请将准备好的文档复制粘贴到这里&#10;&#10;格式说明：&#10;1、题目与题目之间需要一行，题目可以不加题号；题号中间不得填我号&#10;2、题干与选项，及各选项之间需回车换行，选项不得以数字开头（会被识别为题干）&#10;3、题目无选项直接空一行，会默认识别为文本型题目"
              ></textarea>
            </div>
          </div>
          
          <!-- 右侧：实时预览 -->
          <div class="batch-add-right">
            <div class="preview-header">
              <span class="preview-title">预览</span>
              <span class="preview-count">{{ parsedQuestions.length }} 个题目</span>
            </div>
            <div class="preview-content">
              <div v-if="parsedQuestions.length === 0" class="preview-empty">
                <div class="empty-icon">📝</div>
                <div class="empty-text">在左侧输入题目后，这里将显示预览</div>
              </div>
              <div v-else class="preview-list">
                <div 
                  v-for="(q, index) in parsedQuestions" 
                  :key="index" 
                  class="preview-question-item"
                >
                  <div class="preview-q-number">{{ index + 1 }}</div>
                  <div class="preview-q-content">
                    <div class="preview-q-title">{{ q.title }}</div>
                    <div v-if="q.options && q.options.length > 0" class="preview-q-options">
                      <div 
                        v-for="(opt, optIndex) in q.options" 
                        :key="optIndex"
                        class="preview-q-option"
                      >
                        <span class="option-marker">{{ String.fromCharCode(65 + optIndex) }}.</span>
                        <span class="option-text">{{ opt }}</span>
                      </div>
                    </div>
                    <div v-else class="preview-q-type">
                      <span class="type-badge">文本题</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 底部按钮 -->
        <div class="logic-ft batch-add-footer">
          <div class="batch-add-left">
            <button class="btn-text-link" @click="showAISuggestion">AI自动生成答案</button>
          </div>
          <div class="batch-add-right">
            <button class="btn btn-primary btn-import" @click="saveBatchAddQuestions">
              确定导入
            </button>
          </div>
        </div>
      </div>
    </div>
  </teleport>

  <!-- 批量编辑选项 -->
  <teleport to="body">
    <div v-if="showBatchDialog" class="logic-mask" @click.self="closeBatchDialog()">
      <div class="logic-dialog batch-dialog">
        <div class="logic-hd">
          <div class="logic-tt">批量编辑选项</div>
          <button class="btn btn-link" @click="closeBatchDialog">✕</button>
        </div>
        <div class="logic-bd batch-body">
          <div class="batch-left">
            <textarea v-model="batchText" class="batch-textarea" placeholder="每行一个选项；空行自动忽略；可直接粘贴Excel的一列" rows="18"></textarea>
            <div class="tip-muted" style="margin-top:8px;">共 {{ batchLineCount }} 行</div>
          </div>
          <div class="batch-right">
            <div class="preset-title">预设选项</div>
            <div class="preset-list">
              <button class="chip" v-for="p in presetNames" :key="p" @click="usePreset(p)">{{ p }}</button>
            </div>
          </div>
        </div>
        <div class="logic-ft">
          <div class="tip-muted">保存后将覆盖当前题目的选项；原有“选项关联/跳题(按选项)”会被清理。</div>
          <div>
            <button class="btn btn-outline" @click="closeBatchDialog">取消</button>
            <button class="btn btn-primary" @click="saveBatchEdit">确定</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>

  <!-- 分组设置 -->
  <teleport to="body">
    <div v-if="showGroupDialog" class="logic-mask" @click.self="closeGroupDialog">
      <div class="logic-dialog group-dialog">
        <div class="logic-hd">
          <div class="logic-tt">分组设置</div>
          <button class="btn btn-link" @click="closeGroupDialog">✕</button>
        </div>
        <div class="logic-bd">
          <div v-if="!groupRows.length" style="text-align:center;color:#64748b;padding:40px 0;">
            还没有分组，赶快添加吧~
            <div class="add-group-center" style="margin-top:16px;"><button class="btn btn-primary add-group-btn" @click="addGroupRow">+ 添加分组</button></div>
          </div>
          <div v-else class="group-table">
            <div class="group-head">
              <div class="col name">分组名称</div>
              <div class="col range">组内选项</div>
              <div class="col rnd">是否随机</div>
            </div>
            <div class="group-row" v-for="(g, gi) in groupRows" :key="'gr-'+gi">
              <div class="col name">
                <span class="gname" @click="editGroupName(gi)">{{ g.name || ('分组'+(gi+1)) }}</span>
                <div class="name-actions">
                  <el-tooltip effect="dark" content="重命名" placement="top" :show-after="200">
                    <button class="btn-icon-mini" @click="editGroupName(gi)"><EditPen class="icon-mini" /></button>
                  </el-tooltip>
                  <el-tooltip effect="dark" content="删除" placement="top" :show-after="200">
                    <button class="btn-icon-mini danger" @click="removeGroupRow(gi)"><Remove class="icon-mini" /></button>
                  </el-tooltip>
                </div>
              </div>
              <div class="col range">
                <select v-model.number="g.from" :class="['logic-select','mini', { invalid: (g.to>0 && g.from>0 && g.to < g.from) }]" @change="normalizeGroupRow(gi)">
                  <option :value="0">请选择</option>
                  <option v-for="(o, i) in (groupSourceOptions||[])" :key="'f-'+i" :value="i+1" :title="asPlain(o)" :disabled="(i+1) < minStartFor(gi)">{{ (i+1) + '：' + (asPlain(o) || ('选项'+(i+1))) }}</option>
                </select>
                <span style="margin:0 6px;">到</span>
                <select v-model.number="g.to" :class="['logic-select','mini', { invalid: (g.to>0 && g.from>0 && g.to < g.from) }]" @change="normalizeGroupRow(gi)">
                  <option :value="0">请选择</option>
                  <option v-for="(o, i) in (groupSourceOptions||[])" :key="'t-'+i" :value="i+1" :title="asPlain(o)" :disabled="(i+1) < Math.max(minStartFor(gi), g.from || minStartFor(gi))">{{ (i+1) + '：' + (asPlain(o) || ('选项'+(i+1))) }}</option>
                </select>
                <div v-if="g.to>0 && g.from>0 && g.to < g.from" class="range-error">范围有误：结束不得小于开始</div>
                <div v-else-if="minStartFor(gi) > 1 && (g.from||0) < minStartFor(gi)" class="range-tip">提示：本组起始至少为 第{{ minStartFor(gi) }}项</div>
              </div>
              <div class="col rnd">
                <el-switch v-model="g.random" size="small" />
              </div>
            </div>
            <div class="add-group-center" style="margin-top:12px;"><button class="btn btn-primary add-group-btn" @click="addGroupRow">+ 添加分组</button></div>
          </div>
          <div class="tip-muted" style="margin-top:10px;">
            在分组名称前加“#”号可不向作答者展示分组名称，如“#分组一”。
          </div>
          <div class="tip-muted" style="margin-top:6px;">如果开启“分组顺序随机”，则分组显示顺序随机。</div>
        </div>
        <div class="logic-ft">
          <div class="logic-left-actions">
            <label class="checkbox-mini"><input type="checkbox" v-model="groupOrderRandom" /> 分组顺序随机</label>

          </div>
          <div>
            <button class="btn btn-outline" @click="closeGroupDialog">取消</button>
            <button class="btn btn-primary" @click="saveGroupDialog">确定</button>
          </div>
        </div>
      </div>
      <!-- 分组名称子弹窗 -->
      <div v-if="showGroupNameDialog" class="logic-submask" @click.self="cancelGroupName">
        <div class="logic-dialog" style="width: 460px;">
          <div class="logic-hd">
            <div class="logic-tt">分组名称</div>
            <button class="btn btn-link" @click="cancelGroupName">✕</button>
          </div>
          <div class="logic-bd">
            <input v-model="groupNameInput" class="logic-input" placeholder="请输入分组名称，如：分组1" style="width:100%;" />
            <div class="tip-muted" style="margin-top:8px;">在分组名称前加“#”号可不向作答者展示分组名称，如“#分组一”。</div>
          </div>
          <div class="logic-ft" style="justify-content:flex-end;">
            <button class="btn btn-outline" @click="cancelGroupName">取消</button>
            <button class="btn btn-primary" @click="confirmGroupName">确定</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>

  <!-- 配额设置 -->
  <teleport to="body">
    <div v-if="showQuotaDialog" class="logic-mask" @click.self="closeQuotaDialog">
      <div class="logic-dialog group-dialog">
        <div class="logic-hd">
          <div class="logic-tt">配额设置</div>
          <div class="hd-right" style="display:flex; align-items:center; gap:10px;">
            <label class="tip-muted" style="font-size:12px;">启用配额</label>
            <el-switch v-model="quotaEnabled" size="small" />
            <button class="btn btn-link" @click="closeQuotaDialog">✕</button>
          </div>
        </div>
        <div class="logic-bd">
          <el-tabs v-model="quotaActiveTab">
            <el-tab-pane label="数量设置" name="count">
              <div class="tip-muted" style="margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div>
                  为每个选项设置可被选择的名额。选项每次被选择并成功提交后，将减少1个名额；名额为0时该选项不可再被选择。
                  <a href="#" @click.prevent="showQuotaExample">示例</a>
                </div>
                <div class="quota-actions">
                  <button class="btn btn-link-sm" @click="quotaClearAll" :disabled="!quotaEnabled">清零</button>
                  <i class="divider" aria-hidden="true"></i>
                  <button class="btn btn-link-sm" @click="quotaBatchIncrease(1)" :disabled="!quotaEnabled">全部+1</button>
                  <button class="btn btn-link-sm" @click="quotaBatchIncrease(10)" :disabled="!quotaEnabled">+10</button>
                </div>
              </div>
              <div class="quota-table quota-scroll">
                <div class="quota-head sticky">
                  <div class="col name">选项</div>
                  <div class="col limit">名额</div>
                  <div class="col on">启用</div>
                </div>
                <div class="quota-row" v-for="(r, i) in quotaRows" :key="'qr-'+i">
                  <div class="col name" :title="asPlain(r.label)">
                    <span class="text-ellipsis">{{ asPlain(r.label) || ('选项'+(i+1)) }}</span>
                  </div>
                  <div class="col limit">
                    <input class="logic-input mini right" type="number" min="0" step="1"
                      v-model.number="r.quotaLimit"
                      @input="sanitizeQuota(i)"
                      :disabled="!quotaEnabled || !r.quotaEnabled"
                      placeholder="0（不限）" />
                  </div>
                  <div class="col on">
                    <el-switch v-model="r.quotaEnabled" size="small" :disabled="!quotaEnabled" />
                  </div>
                </div>
              </div>
              <div class="tip-muted" style="margin-top:8px;">总名额（不含不限）：{{ quotaTotal }}</div>
            </el-tab-pane>
            <el-tab-pane label="提示信息" name="tips">
              <div class="quota-tips">
                <div class="row">
                  <label class="form-label" style="min-width:72px;">配额模式</label>
                  <el-radio-group v-model="quotaMode">
                    <el-radio label="explicit">显性配额（作答过程中禁选已满）</el-radio>
                    <el-radio label="implicit">隐性配额（提交后检查，超限记为无效）</el-radio>
                  </el-radio-group>
                </div>
                <div class="row" v-if="quotaMode==='explicit'">
                  <label class="form-label" style="min-width:72px;">提示文案</label>
                  <el-input v-model="quotaFullText" placeholder="配额已满（限10字）" maxlength="20" show-word-limit style="width:280px;" />
                </div>
                <div class="row" v-if="quotaMode==='explicit'">
                  <label class="form-label" style="min-width:72px;">显示余量</label>
                  <el-switch v-model="quotaShowRemaining" />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
        <div class="logic-ft">
          <div></div>
          <div>
            <button class="btn btn-outline" @click="closeQuotaDialog">取消</button>
            <button class="btn btn-primary" @click="saveQuotaDialog">确定</button>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
import { EditPen, CirclePlus, Remove, Picture, Document, Hide, QuestionFilled, DocumentAdd } from '@element-plus/icons-vue'
import { ref, computed, reactive, nextTick, watch } from 'vue'
import QuillFloatingEditor from '@/components/QuillFloatingEditor.vue'
import QuillRichTextDialog from '@/components/QuillRichTextDialog.vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { createSurvey, updateSurvey, publishSurvey, getSurvey as getSurveyRaw } from '@/api/surveys'
import { getResults as getSurveyDetailStats } from '@/api/surveys'
import SurveyTopToolbar from './SurveyTopToolbar.vue'
import SurveySharePanel from './SurveySharePanel.vue'
import SurveyPreviewEmbed from './SurveyPreviewEmbed.vue'
import SurveyAnswersPanel from './SurveyAnswersPanel.vue'
// 新增：解耦的通用模块
import { escapeHtml as escapeHtmlUtil, stripHtmlSimple as stripHtmlSimpleUtil, safeHtml as safeHtmlUtil } from '@/utils/html'
import { generateQuestionId as generateQuestionIdUtil } from '@/utils/uid'
import { mapLegacyTypeToServer, mapServerTypeToLegacy } from '@/mappers/surveyMappers'
import {
  getLegacyQuestionConfigPanel,
  getLegacyQuestionTypeLabel,
  legacyQuestionTypeHasOptions
} from '@/utils/questionTypeRegistry'
import { buildUploadQuestionHelpText, DEFAULT_UPLOAD_ACCEPT, normalizeUploadQuestionConfig, sanitizeUploadAccept } from '@/utils/uploadQuestion'
import {
  buildLegacyQuestionDraft,
  getImplementedLegacyQuestionNames as getImplementedLegacyQuestionNamesFromEditorModel,
  getLegacyQuestionEditorConfig,
  getLegacyQuestionOptionSuffix,
  isLegacyQuestionOfServerType
} from '@/utils/questionEditorModel'

const router = useRouter()
// 问卷说明：改为内联富文本组件，实时写入 surveyForm.description
// 题目关联（通用弹窗，支持全部题型）
const showLogicDialog = ref(false)
const logicTargetIndex = ref<number | null>(null)
type UiCond = { depIdx: number; picked?: string[]; op?: string; text?: string }
const logicRows = reactive<UiCond[]>([])

// 跳题逻辑（按选项跳转/无条件跳转）
const showJumpDialog = ref(false)
const jumpTargetIndex = ref<number | null>(null)
const jumpByOptionEnabled = ref(true)
const jumpUnconditionalEnabled = ref(false)
// 选择题：为每个选项提供跳转目标（字符串：序号，或 'end'，或 '' 表示不跳）
const jumpByOption = ref<Record<string, string>>({})
const jumpUnconditionalTarget = ref<string>('')

function openJumpDialog(index:number){
  jumpTargetIndex.value = index
  const q:any = surveyForm.questions[index]
  // 初始化数据
  jumpByOptionEnabled.value = true
  jumpUnconditionalEnabled.value = false
  jumpByOption.value = {}
  jumpUnconditionalTarget.value = ''
  const j:any = (q as any).jumpLogic
  if (j) {
    if (j.byOption && typeof j.byOption === 'object') {
      jumpByOptionEnabled.value = true
      jumpByOption.value = { ...j.byOption }
    }
    if (j.unconditional) {
      jumpUnconditionalEnabled.value = true
      jumpUnconditionalTarget.value = String(j.unconditional)
    }
  }
  showJumpDialog.value = true
}
function closeJumpDialog(){ showJumpDialog.value = false }
function saveJumpDialog(){
  const idx = jumpTargetIndex.value
  if (idx==null) return
  const q:any = surveyForm.questions[idx]
  const data:any = {}
  if (jumpByOptionEnabled.value) data.byOption = Object.fromEntries(Object.entries(jumpByOption.value||{}).filter(([_,v])=> String(v||'')!==''))
  if (jumpUnconditionalEnabled.value && String(jumpUnconditionalTarget.value||'')!=='') data.unconditional = String(jumpUnconditionalTarget.value)
  ;(q as any).jumpLogic = (data.byOption || data.unconditional) ? data : undefined
  showJumpDialog.value = false
}

async function clearAllLogicAssociations(){
  try {
    await ElMessageBox.confirm('确定要删除“所有题目”的关联吗？此操作不可恢复。', '删除确认', { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' })
  } catch (e) {
    return
  }
  (surveyForm.questions||[]).forEach((q:any) => { if (q.logic) q.logic.visibleWhen = undefined })
  ElMessage.success('已清除所有题目的“题目关联”。')
}

async function clearCurrentQuestionLogic(){
  const idx = logicTargetIndex.value
  if (idx == null) return
  try {
    await ElMessageBox.confirm('确定要删除“本题”的关联吗？此操作不可恢复。', '删除确认', { type: 'warning', confirmButtonText: '确定', cancelButtonText: '取消' })
  } catch (e) {
    return
  }
  const q:any = surveyForm.questions[idx]
  if (!q.logic) q.logic = {}
  q.logic.visibleWhen = undefined
  // 重置当前编辑UI为一条空条件，避免用户误解仍有条件
  const prev = selectablePrevQs(idx)
  logicRows.splice(0, logicRows.length)
  logicRows.push({ depIdx: Math.max(0, prev.length-1), picked: [], op: 'eq', text: '' })
  ElMessage.success('已清除本题的“题目关联”。')
}

function selectablePrevQs(targetIdx:number){
  return (surveyForm.questions||[]).slice(0, targetIdx)
}

function openLogicDialog(index:number){
  // 第1题不允许设置题目关联；或者前面没有可依赖的选择题时也不允许
  if (index <= 0) return
  const prev0 = selectablePrevQs(index)
  logicTargetIndex.value = index
  editingIndex.value = index
  logicRows.splice(0, logicRows.length)
  const q:any = surveyForm.questions[index]
  const prev = prev0
  const groups:any[] = q?.logic?.visibleWhen || []
  if (Array.isArray(groups) && groups.length>0) {
    groups.forEach(g => {
      const c = Array.isArray(g) && g[0] ? g[0] : null
      if (!c) return
      const depIdx = prev.findIndex(p => {
        const byId = String(p.id) === String(c.qid)
        if (byId) return true
        const globalIndex = surveyForm.questions.findIndex(x => String(x.id) === String(p.id))
        const globalOrder = globalIndex >= 0 ? String(globalIndex + 1) : ''
        return globalOrder === String(c.qid)
      })
      if (depIdx < 0) return
      const dep = prev[depIdx]
      const hasOptions = Array.isArray(dep?.options) && dep.options.length > 0
      if (hasOptions) {
        // 将后端存储的“选项值(1/2/3…)”回显为本地的“选项文字”，用于 Chip 展示
        const opts: string[] = (dep?.options || []).map((o:any)=>String(o))
        const rawVals: string[] = Array.isArray(c.value) ? c.value.map(String) : [String(c.value)]
        const picked = rawVals.map(v => {
          const n = Number(v)
          if (!Number.isNaN(n) && n>=1 && n<=opts.length) return String(opts[n-1])
          return String(v)
        })
        logicRows.push({ depIdx, picked })
      } else {
        logicRows.push({ depIdx, op: String(c.op || 'eq'), text: Array.isArray(c.value) ? String(c.value[0]??'') : String(c.value ?? '') })
      }
    })
  }
  if (logicRows.length === 0) logicRows.push({ depIdx: Math.max(0, prev.length-1), picked: [], op: 'eq', text: '' })
  showLogicDialog.value = true
}

// ===== 富文本通用对话框（通用组件） =====
const showRteDialog = ref(false)
const rteContent = ref('')
let _rteTarget: { qIndex: number; optIndex: number } | null = null

function openOptionRichEditor(qIndex:number, optIndex:number){
  const q:any = surveyForm.questions[qIndex]
  const raw = String(q.options?.[optIndex] ?? '')
  // 如果该选项已有富文本内容（我们约定：当 rich 为 true 时，选项内容存储为 HTML），直接展示，否则使用纯文本包装为段落
  const ex = ensureOptionExtras(q, optIndex)
  rteContent.value = ex.rich ? raw : (raw ? `<p>${escapeHtml(raw)}</p>` : '')
  _rteTarget = { qIndex, optIndex }
  // 等数据流更新一帧再打开弹窗，避免弹窗初始渲染拿到旧 content
  nextTick(() => { showRteDialog.value = true })
}

function applyRteContent(html:string){
  if (!_rteTarget) return
  const { qIndex, optIndex } = _rteTarget
  const q:any = surveyForm.questions[qIndex]
  // 回写为 HTML，并开启 rich 标记
  q.options[optIndex] = html
  const ex = ensureOptionExtras(q, optIndex)
  ex.rich = true
  // 清空一次性状态
  _rteTarget = null
}

// 使用解耦的工具函数
// 保留名称以最小化改动
function escapeHtml(s:string){ return escapeHtmlUtil(s) }

// ===== 标题富文本 =====
const showTitleRte = ref(false)
const titleRteContent = ref('')
const _titleIndex = ref<number | null>(null)
const titleRichMap = reactive<Record<string, { rich: boolean; html: string }>>({})
// 控制标题富文本按钮的显示（仅在当前题目标题获得焦点或被点中时显示）
const titleBtnVisibleIndex = ref<number | null>(null)
function onTitleFocus(i:number){
  editingIndex.value = i
  titleBtnVisibleIndex.value = i
}
function onTitleBlur(i:number, e?: FocusEvent){
  // 若仍在该题的按钮上，保持显示；否则延迟隐藏
  const toEl = (e?.relatedTarget as HTMLElement) || null
  if (toEl && toEl.closest && toEl.closest('.title-rich-btn-wrap')) return
  setTimeout(()=>{
    if (titleBtnVisibleIndex.value === i) titleBtnVisibleIndex.value = null
  }, 120)
}
function shouldShowTitleBtn(i:number){
  const info = ensureTitleRich(i)
  // 1) 输入框聚焦时显示 2) 富文本模式下且当前题处于编辑态也显示
  return titleBtnVisibleIndex.value === i || (info.rich && editingIndex.value === i)
}

function ensureTitleRich(qIndex:number){
  const q:any = surveyForm.questions[qIndex]
  const key = String(q?.id ?? qIndex)
  if(!titleRichMap[key]) titleRichMap[key] = { rich: !!q?.titleHtml, html: String(q?.titleHtml || '') }
  return titleRichMap[key]
}

function openTitleRichEditor(qIndex:number){
  // 确保切换到当前题目的编辑态，便于右侧按钮/工具随之显示
  editingIndex.value = qIndex
  titleBtnVisibleIndex.value = qIndex
  const info = ensureTitleRich(qIndex)
  const raw = surveyForm.questions[qIndex]?.title || ''
  titleRteContent.value = info.rich ? (info.html || '') : (raw ? `<p>${escapeHtml(raw)}</p>` : '')
  _titleIndex.value = qIndex
  nextTick(()=> showTitleRte.value = true)
}

function applyTitleRteContent(html:string){
  if(_titleIndex.value==null) return
  const q:any = surveyForm.questions[_titleIndex.value]
  const key = String(q?.id ?? _titleIndex.value)
  const info = ensureTitleRich(_titleIndex.value)
  if(!html || !html.replace(/<[^>]+>/g,'').trim()){
    info.rich = false
    info.html = ''
  }else{
    info.rich = true
    info.html = html
  }
  // 同步纯文本标题用于列表/导出等场景
  const text = (html || '').replace(/<[^>]+>/g,'').trim()
  q.title = text || q.title
  // 供预览/填写页识别的富文本字段
  q.titleHtml = info.html
  // 同步缓存映射
  titleRichMap[key] = { rich: info.rich, html: info.html }
  _titleIndex.value = null
}
// ===== 批量添加题目 =====
const showBatchAddDialog = ref(false)
const batchAddText = ref('')
const batchAddTab = ref<'manual' | 'paste'>('manual') // 标签页：manual=导入示例, paste=清空文本框
const batchAddQuestionType = ref<number>(3) // 默认单选题
const batchAddLineCount = computed(() => (batchAddText.value.split(/\r?\n/).filter(l=>l.trim()!=='').length))

// 实时解析题目用于预览
const parsedQuestions = computed(() => {
  const text = batchAddText.value.trim()
  if (!text) return []
  
  const lines = text.split(/\r?\n/)
  const questions: Array<{title: string; options: string[]}> = []
  let currentQuestion: {title: string; options: string[]} | null = null
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // 空行表示题目结束
    if (!line) {
      if (currentQuestion) {
        questions.push(currentQuestion)
        currentQuestion = null
      }
      continue
    }
    
    // 判断是否是题目（包含数字题号或是第一行）
    const isQuestionLine = /^\d+[、.]/.test(line) || !currentQuestion
    
    if (isQuestionLine) {
      // 保存上一题
      if (currentQuestion) {
        questions.push(currentQuestion)
      }
      // 开始新题（去掉题号）
      const title = line.replace(/^\d+[、.]\s*/, '')
      currentQuestion = { title, options: [] }
    } else if (currentQuestion) {
      // 选项行（去掉选项标记如A、B、C或1、2、3）
      const option = line.replace(/^[A-Za-z][\)、.]?\s*/, '').replace(/^\d+[\)、.]?\s*/, '')
      if (option && !/^\d+$/.test(line)) { // 不是纯数字开头的才算选项
        currentQuestion.options.push(option)
      }
    }
  }
  
  // 添加最后一题
  if (currentQuestion) {
    questions.push(currentQuestion)
  }
  
  return questions
})

function openBatchAddDialog() {
  batchAddText.value = ''
  batchAddTab.value = 'manual'
  batchAddQuestionType.value = 3
  showBatchAddDialog.value = true
}

function closeBatchAddDialog() {
  showBatchAddDialog.value = false
}

// 切换到"清空文本框"标签时清空内容
watch(batchAddTab, (newTab) => {
  if (newTab === 'paste') {
    batchAddText.value = ''
  }
})

function showAISuggestion() {
  ElMessage.info('AI自动生成答案功能开发中...')
}

function isMatrixLegacyQuestion(type: number | string): boolean {
  return isLegacyQuestionOfServerType(type, 'matrix')
}

function isSliderLegacyQuestion(type: number | string): boolean {
  return isLegacyQuestionOfServerType(type, 'slider')
}

function isUploadLegacyQuestion(type: number | string): boolean {
  return isLegacyQuestionOfServerType(type, 'upload')
}

function isRatingLegacyQuestion(type: number | string): boolean {
  return isLegacyQuestionOfServerType(type, 'rating')
}

function isScaleLegacyQuestion(type: number | string): boolean {
  return isLegacyQuestionOfServerType(type, 'scale')
}

function buildLegacyQuestion(type: number): Question {
  return buildLegacyQuestionDraft(type, {
    id: generateQuestionId(),
    hideSystemNumber: areAllNumbersHidden.value
  })
}

// 批量添加时构建默认题目：遵循“隐藏题号”的全局状态
function createDefaultQuestion(type:number): Question {
  return buildLegacyQuestion(type)
}

function saveBatchAddQuestions() {
  if (parsedQuestions.value.length === 0) {
    ElMessage.warning('请输入题目内容')
    return
  }
  
  // 创建题目
  parsedQuestions.value.forEach(q => {
    let type = 1 // 默认填空题
    if (q.options && q.options.length > 0) {
      type = 3 // 有选项就是单选题
    }
    
    const newQ = createDefaultQuestion(type)
    newQ.title = q.title
    
    if (q.options && q.options.length > 0) {
      newQ.options = q.options
    }
    
    surveyForm.questions.push(newQ)
  })
  
  ElMessage.success(`成功导入 ${parsedQuestions.value.length} 个题目`)
  closeBatchAddDialog()
}

// ===== 批量编辑选项 =====
const showBatchDialog = ref(false)
const batchTargetIndex = ref<number | null>(null)
const batchText = ref('')
const batchLineCount = computed(() => (batchText.value.split(/\r?\n/).filter(l=>l.trim()!=='').length))

const presetDefs: Record<string, string[]> = {
  '性别': ['男','女','其他','保密'],
  '年龄(常用)': ['18岁以下','18-24岁','25-34岁','35-44岁','45-54岁','55岁及以上'],
  '年龄(细分)': ['0-17岁','18-24岁','25-29岁','30-34岁','35-39岁','40-44岁','45-49岁','50-59岁','60岁及以上'],
  '学历': ['小学','初中','高中/中专','大专','本科','硕士','博士'],
  '是否': ['是','否'],
  '是/否/不确定': ['是','否','不确定'],
  '满意度(5点)': ['非常满意','满意','一般','不满意','非常不满意'],
  '满意度(7点)': ['非常满意','比较满意','满意','一般','不满意','比较不满意','非常不满意'],
  'Likert(5点)': ['非常不同意','不同意','一般','同意','非常同意'],
  'Likert(7点)': ['非常不同意','比较不同意','不同意','一般','同意','比较同意','非常同意'],
  '使用频率': ['每天','每周多次','每周一次','每月几次','偶尔','从不'],
  '重要性(5点)': ['非常不重要','不重要','一般','重要','非常重要'],
  '数字1-10': ['1','2','3','4','5','6','7','8','9','10'],
  '星期': ['周一','周二','周三','周四','周五','周六','周日'],
  '省份(中国)': ['北京','天津','上海','重庆','河北','山西','辽宁','吉林','黑龙江','江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东','广西','海南','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏','新疆','香港','澳门','台湾'],
  '民族(常用)': ['汉族','壮族','满族','回族','苗族','维吾尔族','土家族','彝族','蒙古族','藏族','布依族','侗族','瑶族','朝鲜族','白族','哈尼族','哈萨克族','黎族','傣族','畲族','傈僳族','仡佬族','东乡族','高山族','拉祜族','水族','佤族','纳西族','羌族','土族','仫佬族','锡伯族','柯尔克孜族','达斡尔族','景颇族','撒拉族','布朗族','毛南族','塔吉克族','普米族','阿昌族','怒族','鄂温克族','京族','基诺族','德昂族','保安族','俄罗斯族','裕固族','乌孜别克族','门巴族','鄂伦春族','独龙族','塔塔尔族','赫哲族','珞巴族','其他'],
  '婚姻状况': ['未婚','已婚','离异','丧偶'],
  '职业': ['学生','公务员','事业单位','国企员工','民企员工','外企员工','个体经营','自由职业者','家庭主妇/夫','退休','待业','其他'],
  '行业': ['IT/互联网','制造业','建筑/房地产','金融','教育','医疗','政府/公共服务','物流/运输','传媒/广告','农林牧渔','餐饮/酒店','旅游','零售/批发','能源/化工','文化/体育/娱乐','其他'],
  '月收入(税前)': ['3000以下','3000-4999','5000-7999','8000-11999','12000-19999','20000-29999','30000及以上'],
  '子女个数': ['0','1','2','3','4','5及以上'],
  '星座': ['白羊座','金牛座','双子座','巨蟹座','狮子座','处女座','天秤座','天蝎座','射手座','摩羯座','水瓶座','双鱼座'],
  '血型': ['A型','B型','AB型','O型','不清楚'],
  '政治面貌': ['中共党员','共青团员','群众','其他'],
  '工作年限': ['在校/无工作经验','1年以内','1-3年','3-5年','5-10年','10年以上'],
  '大学年级': ['大一','大二','大三','大四','研一','研二','研三'],
}
const presetNames = Object.keys(presetDefs)

function usePreset(name:string){
  const list = presetDefs[name] || []
  batchText.value = list.join('\n')
}

function stripHtmlSimple(html:string){ return stripHtmlSimpleUtil(html) }

function openBatchEdit(index:number){
  batchTargetIndex.value = index
  const q:any = surveyForm.questions[index]
  const lines = (Array.isArray(q.options)? q.options:[]).map((v:any, i:number)=>{
    const ex = ensureOptionExtras(q, i)
    if (ex && ex.rich) return stripHtmlSimple(String(v||''))
    return String(v||'')
  })
  batchText.value = lines.join('\n')
  showBatchDialog.value = true
}

// ===== 分组设置 =====
const showGroupDialog = ref(false)
const groupTargetIndex = ref<number | null>(null)
const groupRows = ref<Array<{ name: string; from: number; to: number; random?: boolean }>>([])
const groupOrderRandom = ref(false)
const groupSourceOptions = ref<any[]>([])
// 子弹窗：分组名称
const showGroupNameDialog = ref(false)
const groupNameInput = ref('')
let _pendingGroupIndex: number | null = null

function openGroupDialog(index:number){
  groupTargetIndex.value = index
  const q:any = surveyForm.questions[index]
  const opts = Array.isArray(q.options) ? q.options : []
  groupSourceOptions.value = opts
  // 回显
  const src:any[] = Array.isArray(q.optionGroups) ? q.optionGroups : []
  groupRows.value = src.map((g:any) => ({
    name: String(g.name || ''),
    from: Number(g.from || NaN),
    to: Number(g.to || NaN),
    random: !!g.random
  }))
  groupOrderRandom.value = !!q.groupOrderRandom
  showGroupDialog.value = true
}

function closeGroupDialog(){ showGroupDialog.value = false }
function addGroupRow(){
  // 先弹出命名弹窗
  _pendingGroupIndex = null
  groupNameInput.value = ''
  showGroupNameDialog.value = true
}
function removeGroupRow(i:number){ groupRows.value.splice(i,1) }
function editGroupName(i:number){
  _pendingGroupIndex = i
  groupNameInput.value = groupRows.value[i]?.name || ''
  showGroupNameDialog.value = true
}
function cancelGroupName(){
  showGroupNameDialog.value = false
  _pendingGroupIndex = null
}
function confirmGroupName(){
  const name = groupNameInput.value.trim()
  if (_pendingGroupIndex == null){
    // 新增分组
    const total = (groupSourceOptions.value||[]).length
    const start = minStartFor(groupRows.value.length)
    if (start > total){
      ElMessage.warning('没有可用的选项了，无法再添加分组')
      showGroupNameDialog.value = false
      _pendingGroupIndex = null
      return
    }
    groupRows.value.push({ name, from: start, to: start, random: false })
    // 设定 pending 为刚插入项，方便用户继续设置范围
    _pendingGroupIndex = groupRows.value.length - 1
  } else {
    // 重命名
    if (groupRows.value[_pendingGroupIndex]){
      groupRows.value[_pendingGroupIndex].name = name
    }
  }
  showGroupNameDialog.value = false
  _pendingGroupIndex = null
}
function saveGroupDialog(){
  if (groupTargetIndex.value==null) return
  const q:any = surveyForm.questions[groupTargetIndex.value]
  const cleaned = groupRows.value
    .map(r=>({ name: r.name.trim(), from: Math.min(r.from||0, r.to||0), to: Math.max(r.from||0, r.to||0), random: !!r.random }))
    .filter(r=> r.from>0 && r.to>0 && r.to>=r.from)
  q.optionGroups = cleaned
  q.groupOrderRandom = !!groupOrderRandom.value
  
  showGroupDialog.value = false
}

// ===== 配额设置 =====
const showQuotaDialog = ref(false)
const quotaTargetIndex = ref<number | null>(null)
const quotaEnabled = ref<boolean>(false)
const quotaActiveTab = ref<'count'|'tips'>('count')
const quotaRows = ref<Array<{ label: any; quotaLimit: number; quotaEnabled: boolean }>>([])
const quotaTotal = computed(() => quotaRows.value.reduce((s, r) => s + ((r.quotaEnabled && Number(r.quotaLimit)>0) ? Number(r.quotaLimit) : 0), 0))
const quotaAnyPositive = computed(() => quotaRows.value.some(r => r.quotaEnabled && Number(r.quotaLimit||0) > 0))
const quotaMode = ref<'explicit'|'implicit'>('explicit')
const quotaFullText = ref<string>('名额已满')
const quotaShowRemaining = ref<boolean>(false)
function syncQuotaEnabledFromNumbers(){
  // 若任一名额>0，则默认启用；全部为0则关闭
  quotaEnabled.value = quotaAnyPositive.value
}

function openQuotaDialog(index:number){
  quotaTargetIndex.value = index
  const q:any = surveyForm.questions[index]
  const opts = Array.isArray(q.options) ? q.options : []
  const extras = Array.isArray(q.optionExtras) ? q.optionExtras : []
  // 回显：从 optionExtras 或后端映射中取 quotaLimit
  quotaRows.value = opts.map((label:any, i:number) => ({
    label,
    quotaLimit: Number((extras[i]?.quotaLimit) || 0),
    quotaEnabled: extras[i]?.quotaEnabled !== false // 默认启用，显式 false 时关闭
  }))
  // 开窗时与数字联动：若任一>0则默认启用；否则关闭
  const anyPos = quotaRows.value.some(r => Number(r.quotaLimit||0) > 0)
  quotaEnabled.value = (q as any).quotasEnabled != null ? !!(q as any).quotasEnabled : anyPos
  // 回显提示配置
  quotaActiveTab.value = 'count'
  quotaMode.value = (q as any).quotaMode || 'explicit'
  quotaFullText.value = (q as any).quotaFullText || '名额已满'
  quotaShowRemaining.value = !!(q as any).quotaShowRemaining
  showQuotaDialog.value = true
}
function sanitizeQuota(i:number){
  const r = quotaRows.value[i]
  if (!r) return
  let n = Number(r.quotaLimit)
  if (!Number.isFinite(n) || n < 0) n = 0
  r.quotaLimit = Math.floor(n)
  syncQuotaEnabledFromNumbers()
}
function quotaBatchIncrease(delta:number){
  quotaRows.value = quotaRows.value.map(r => ({ ...r, quotaLimit: Math.floor(Math.max(0, Number(r.quotaLimit)||0) + delta) }))
  syncQuotaEnabledFromNumbers()
}
function quotaClearAll(){
  quotaRows.value = quotaRows.value.map(r => ({ ...r, quotaLimit: 0 }))
  syncQuotaEnabledFromNumbers()
}
function showQuotaExample(){
  ElMessage.info('示例：\n非常满意 50；满意 30；一般 15；不满意 5；非常不满意 0（不限）')
}
function closeQuotaDialog(){ showQuotaDialog.value = false }
function saveQuotaDialog(){
  if (quotaTargetIndex.value==null) return
  const q:any = surveyForm.questions[quotaTargetIndex.value]
  q.optionExtras = Array.isArray(q.optionExtras) ? q.optionExtras : []
  // 保存时与数字联动：若任一名额>0则启用，否则关闭
  ;(q as any).quotasEnabled = quotaRows.value.some(r => Number(r.quotaLimit||0) > 0)
  ;(q as any).quotaMode = quotaMode.value
  ;(q as any).quotaFullText = quotaFullText.value
  ;(q as any).quotaShowRemaining = !!quotaShowRemaining.value
  quotaRows.value.forEach((r, i) => {
    q.optionExtras[i] = q.optionExtras[i] || {}
    q.optionExtras[i].quotaLimit = Number(r.quotaLimit || 0)
    q.optionExtras[i].quotaEnabled = !!r.quotaEnabled
  })
  showQuotaDialog.value = false
}

function displayGroupName(name?:string){
  const s = String(name||'')
  if (s.startsWith('#')) return s.slice(1)
  return s
}

// 计算编辑页每个选项的“剩余名额”（仅在 quotasEnabled 时显示）
function optionRemaining(q:any, optIndex:number){
  try{
    const extras = Array.isArray(q.optionExtras) ? q.optionExtras : []
    const limit = Number(extras?.[optIndex]?.quotaLimit || 0)
    if (!(q as any)?.quotasEnabled || !Number.isFinite(limit) || limit <= 0) return null
    // 后端在 raw=true 的详情里，给每个 options[i] 附带了 quotaUsed
    const used = Number((q.options?.[optIndex] as any)?.quotaUsed || 0)
    return Math.max(0, limit - used)
  }catch{ return null }
}

// 计算第 gi 组允许的最小起始选项序号：要求分组顺序不重叠、连续往后排
function minStartFor(gi:number){
  const rows = groupRows.value
  let maxEnd = 1
  for (let i=0;i<gi;i++){
    const r = rows[i]
    const from = Number(r?.from||0)
    const to = Number(r?.to||0)
    if (from>0 && to>0 && to>=from){
      maxEnd = Math.max(maxEnd, to+1)
    }
  }
  return maxEnd
}

// 当选择变化时自动纠正范围到合法区间
function normalizeGroupRow(gi:number){
  const r = groupRows.value[gi]
  if (!r) return
  const minStart = minStartFor(gi)
  if ((r.from||0) < minStart) r.from = minStart
  if ((r.to||0) && (r.to < r.from)) r.to = r.from
}

// 根据题目的 optionGroups 计算给定 optIndex 是否需要显示组标题
function groupHeaderFor(q:any, optIndex:number): string | ''{
  const groups:any[] = Array.isArray(q?.optionGroups) ? q.optionGroups : []
  if (!groups.length) return ''
  // 显示规则：当 optIndex 恰好是某组的起始（from-1）时，显示该组标题
  for (const g of groups){
    const from = Number(g?.from || 0)
    const to = Number(g?.to || 0)
    if (from>0 && to>0 && to>=from && optIndex === (from-1)){
      return displayGroupName(g?.name)
    }
  }
  return ''
}

function closeBatchDialog(){ showBatchDialog.value = false }

async function saveBatchEdit(){
  const idx = batchTargetIndex.value
  if (idx==null) return
  const q:any = surveyForm.questions[idx]
  // 解析行
  const cleanLine = (s:string) => s
    .replace(/^\s*[A-Za-z]\s*[\.|、]\s*/,'')
    .replace(/^\s*\d+\s*[\.|、]\s*/,'')
    .replace(/^\s*[（(][一二三四五六七八九十0-9A-Za-z]+[)）]\s*/,'')
    .trim()
  const next = batchText.value.split(/\r?\n/).map(s=>cleanLine(s)).filter(s=> s!=='')
  if (next.length===0){
    await ElMessageBox.alert('请至少填写一行选项', '无法保存', { type:'warning' })
    return
  }
  // 如存在选项关联或按选项跳题，提示会被清理
  const hasOptLogic = Array.isArray(q.optionLogic) && q.optionLogic.some((g:any)=> Array.isArray(g) && g.length>0)
  const hasJumpByOpt = !!(q?.jumpLogic?.byOption && Object.keys(q.jumpLogic.byOption).length>0)
  if (hasOptLogic || hasJumpByOpt){
    try {
      await ElMessageBox.confirm('批量保存将覆盖选项，并清空当前题目的“选项关联/按选项跳题”。是否继续？','提示',{type:'warning'})
    } catch { return }
  }
  // 回写 options
  q.options = [...next]
  // 重置 extras 与相关逻辑
  q.optionExtras = next.map(()=>({ rich:false, hasDesc:false, desc:'', exclusive:false, defaultSelected:false, hidden:false, fillEnabled:false, fillRequired:false, fillPlaceholder:'' }))
  if (q.optionLogic) q.optionLogic = []
  if (q.jumpLogic && q.jumpLogic.byOption) q.jumpLogic.byOption = {}
  showBatchDialog.value = false
  ElMessage.success('已批量更新选项')
}
function closeLogicDialog(){ showLogicDialog.value = false }
function addLogicRow(){
  const idx = logicTargetIndex.value ?? 0
  const prev = selectablePrevQs(idx)
  logicRows.push({ depIdx: Math.max(0, prev.length-1), picked: [], op: 'eq', text: '' })
}
function removeLogicRow(i:number){ logicRows.splice(i,1) }
function togglePick(i:number, val:string){
  const arr = logicRows[i].picked
  if (!arr) return
  const s = String(val)
  const k = arr.indexOf(s)
  if (k>=0) arr.splice(k,1); else arr.push(s)
}
function saveLogicDialog(){
  const idx = logicTargetIndex.value
  if (idx==null) return
  const q:any = surveyForm.questions[idx]
  const prev = selectablePrevQs(idx)
  const groups:any[] = []
  for (const row of logicRows) {
    const dep = prev[row.depIdx]
    if (!dep) continue
    const hasOptions = Array.isArray(dep.options) && dep.options.length>0
    if (hasOptions) {
      if (!row.picked || row.picked.length===0) continue
      const isMulti = Number(dep.type) === 4
      groups.push([{ qid: dep.id, op: isMulti ? 'overlap' : 'in', value: [...row.picked] }])
    } else {
      const op = row.op || 'eq'
      const text = (row.text ?? '').trim()
      if (!text) continue
      groups.push([{ qid: dep.id, op, value: text }])
    }
  }
  if (!q.logic) q.logic = {}
  q.logic.visibleWhen = groups.length ? groups : undefined
  showLogicDialog.value = false
}

// 选项关联（每个选项可单独配置显示条件）
const showOptionDialog = ref(false)
const optionTargetIndex = ref<number | null>(null)
const activeOptIdx = ref<number>(0)
type UiOptCond = { depIdx: number; picked?: string[]; op?: string; text?: string }
const optionLogicRows = reactive<UiOptCond[]>([])

function optionLabelForDisplay(opt:any, i:number){
  const t = String(opt ?? '')
  return t || `选项${i+1}`
}

// 将可能的富文本（HTML 字符串或对象形式）转为纯文本显示
function stripTags(html: string): string {
  if (!html) return ''
  try {
    // 移除 script/style 块
    let s = String(html)
      .replace(/<\/(?:script|style)>/gi, '')
      .replace(/<(?:script|style)[^>]*>[\s\S]*?<\/(?:script|style)>/gi, '')
    // 替换换行与块级标签为空格，其他标签剥离
    s = s.replace(/<\s*br\s*\/?>/gi, '\n')
         .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
         .replace(/<[^>]+>/g, '')
    // 反转常见实体
    s = decodeHtml(s)
    // 收尾与压缩空白
    return s.replace(/\u00A0/g, ' ').replace(/[\t\r ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  } catch { return String(html) }
}

function decodeHtml(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function asPlain(opt: any): string {
  if (opt == null) return ''
  if (typeof opt === 'object') {
    const raw = String((opt as any).label ?? (opt as any).text ?? (opt as any).value ?? '')
    return stripTags(raw) || raw
  }
  const raw = String(opt)
  // 若像是 HTML，去标签
  if (/[<>]/.test(raw)) return stripTags(raw)
  return raw
}

function optionLabelPlain(opt: any, i: number): string {
  const t = asPlain(opt)
  return t || `选项${i+1}`
}

function openOptionLogicDialog(index:number){
  if (index <= 0) return // 第1题无需做选项关联场景，通常依赖前题
  const q:any = surveyForm.questions[index]
  if (!Array.isArray(q.options) || q.options.length===0) return
  optionTargetIndex.value = index
  editingIndex.value = index
  activeOptIdx.value = 0
  initOptionLogicRowsFromQuestion(index, 0)
  showOptionDialog.value = true
}

function onPickLeftOption(i:number){
  if (optionTargetIndex.value==null) return
  activeOptIdx.value = i
  onSwitchActiveOption()
}

function hasOptionLogic(i:number){
  const qi = optionTargetIndex.value
  if (qi==null) return false
  const q:any = surveyForm.questions[qi]
  return Array.isArray(q?.optionLogic?.[i]) && (q.optionLogic[i]?.length>0)
}

function initOptionLogicRowsFromQuestion(qIndex:number, optIndex:number){
  optionLogicRows.splice(0, optionLogicRows.length)
  const prev = selectablePrevQs(qIndex)
  const optGroups:any[] = (surveyForm.questions[qIndex] as any)?.optionLogic?.[optIndex] || []
  if (Array.isArray(optGroups) && optGroups.length>0){
    optGroups.forEach(g => {
      const c = Array.isArray(g) && g[0] ? g[0] : null
      if (!c) return
      const depIdx = prev.findIndex(p => String(p.id) === String(c.qid) || String(surveyForm.questions.findIndex(x => String(x.id)===String(p.id))+1) === String(c.qid))
      if (depIdx<0) return
      const dep = prev[depIdx]
      const hasOptions = Array.isArray(dep?.options) && dep.options.length > 0
      if (hasOptions){
        const opts:string[] = (dep.options||[]).map((o:any)=>String(o))
        const rawVals:string[] = Array.isArray(c.value)? c.value.map(String) : [String(c.value)]
        const picked = rawVals.map(v=>{ const n=Number(v); return (!Number.isNaN(n)&&n>=1&&n<=opts.length) ? String(opts[n-1]) : String(v) })
        optionLogicRows.push({ depIdx, picked })
      } else {
        optionLogicRows.push({ depIdx, op: String(c.op||'eq'), text: Array.isArray(c.value)? String(c.value[0]??'') : String(c.value??'') })
      }
    })
  }
  if (optionLogicRows.length===0){
    optionLogicRows.push({ depIdx: Math.max(0, prev.length-1), picked: [], op: 'eq', text: '' })
  }
}

function closeOptionDialog(){ showOptionDialog.value = false }
function onSwitchActiveOption(){
  const qi = optionTargetIndex.value ?? 0
  initOptionLogicRowsFromQuestion(qi, activeOptIdx.value)
}
function addOptionLogicRow(){
  const qi = optionTargetIndex.value ?? 0
  const prev = selectablePrevQs(qi)
  optionLogicRows.push({ depIdx: Math.max(0, prev.length-1), picked: [], op: 'eq', text: '' })
}
function removeOptionLogicRow(i:number){ optionLogicRows.splice(i,1) }
function toggleOptionPick(i:number, val:string){
  const arr = optionLogicRows[i].picked || (optionLogicRows[i].picked = [])
  const s = String(val)
  const k = arr.indexOf(s)
  if (k>=0) arr.splice(k,1); else arr.push(s)
}
async function clearCurrentOptionLogic(){
  const qi = optionTargetIndex.value
  if (qi==null) return
  const idx = activeOptIdx.value
  try {
    await ElMessageBox.confirm('确定要清除此选项的关联吗？', '删除确认', { type:'warning', confirmButtonText: '确定', cancelButtonText: '取消' })
  } catch { return }
  const q:any = surveyForm.questions[qi]
  if (!q.optionLogic) q.optionLogic = []
  q.optionLogic[idx] = undefined
  optionLogicRows.splice(0, optionLogicRows.length)
  const prev = selectablePrevQs(qi)
  optionLogicRows.push({ depIdx: Math.max(0, prev.length-1), picked: [], op: 'eq', text: '' })
  ElMessage.success('已清除该选项的关联。')
}

// 清空“本题所有选项”的关联
async function clearAllOptionLogicForThisQuestion(){
  const qi = optionTargetIndex.value
  if (qi==null) return
  try {
    await ElMessageBox.confirm('确定要清空本题所有选项的关联吗？此操作不可恢复。', '删除确认', { type:'warning', confirmButtonText: '确定', cancelButtonText: '取消' })
  } catch { return }
  const q:any = surveyForm.questions[qi]
  if (!Array.isArray(q.options)) q.options = []
  q.optionLogic = new Array(q.options.length).fill(undefined)
  // 重置右侧编辑区为初始一条空条件
  optionLogicRows.splice(0, optionLogicRows.length)
  const prev = selectablePrevQs(qi)
  optionLogicRows.push({ depIdx: Math.max(0, prev.length-1), picked: [], op: 'eq', text: '' })
  ElMessage.success('已清空本题的“选项关联”。')
}

function saveOptionDialog(){
  const qi = optionTargetIndex.value
  if (qi==null) return
  const q:any = surveyForm.questions[qi]
  const prev = selectablePrevQs(qi)
  const groups:any[] = []
  for (const row of optionLogicRows){
    const dep = prev[row.depIdx]
    if (!dep) continue
    const hasOptions = Array.isArray(dep.options) && dep.options.length>0
    if (hasOptions){
      if (!row.picked || row.picked.length===0) continue
      const isMulti = Number(dep.type) === 4
      groups.push([{ qid: dep.id, op: isMulti ? 'overlap' : 'in', value: [...row.picked] }])
    } else {
      const op = row.op || 'eq'
      const text = (row.text ?? '').trim()
      if (!text) continue
      groups.push([{ qid: dep.id, op, value: text }])
    }
  }
  if (!q.optionLogic) q.optionLogic = []
  q.optionLogic[activeOptIdx.value] = groups.length ? groups : undefined
  showOptionDialog.value = false
}

// 生成当前选项关联条件的摘要文本，例如：依赖于[1.上一个问题]第1、2个选项；多个条件用“或”连接
const currentOptionSummary = computed(() => {
  const qi = optionTargetIndex.value
  if (qi==null) return ''
  const prev = selectablePrevQs(qi)
  const opCn:Record<string,string> = { eq:'等于', neq:'不等于', gt:'大于', gte:'大于等于', lt:'小于', lte:'小于等于', regex:'匹配正则', in:'等于其一', overlap:'包含其一' }
  const parts:string[] = []
  for (const row of optionLogicRows) {
    const dep = prev[row.depIdx]
    if (!dep) continue
    const order = surveyForm.questions.findIndex(x=>String(x.id)===String(dep.id)) + 1
    const depTitle = dep.title || getQuestionTypeLabel(dep.type)
    const hasOptions = Array.isArray(dep.options) && dep.options.length>0
    if (hasOptions) {
      const picks = (row.picked||[])
      if (!picks.length) continue
      const idxs:number[] = []
      picks.forEach((lbl:any) => {
        const i = (dep.options||[]).findIndex((t:any)=> String(t)===String(lbl))
        if (i>=0) idxs.push(i+1)
      })
      if (!idxs.length) continue
      const seq = idxs.sort((a,b)=>a-b).map(n=>`第${n}个选项`).join('、')
      parts.push(`依赖于[${order}.${depTitle}]${seq}`)
    } else {
      const op = row.op || 'eq'
      const text = (row.text||'').trim()
      if (!text) continue
      parts.push(`依赖于[${order}.${depTitle}]${opCn[op]||op} ${text}`)
    }
  }
  return parts.join(' 或 ')
})

function saveOptionDialogOne(){
  // 保存当前右侧条件到该选项，但不关闭弹窗
  const qi = optionTargetIndex.value
  if (qi==null) return
  const q:any = surveyForm.questions[qi]
  const prev = selectablePrevQs(qi)
  const groups:any[] = []
  for (const row of optionLogicRows){
    const dep = prev[row.depIdx]
    if (!dep) continue
    const hasOptions = Array.isArray(dep.options) && dep.options.length>0
    if (hasOptions){
      if (!row.picked || row.picked.length===0) continue
      const isMulti = Number(dep.type) === 4
      groups.push([{ qid: dep.id, op: isMulti ? 'overlap' : 'in', value: [...row.picked] }])
    } else {
      const op = row.op || 'eq'
      const text = (row.text ?? '').trim()
      if (!text) continue
      groups.push([{ qid: dep.id, op, value: text }])
    }
  }
  if (!q.optionLogic) q.optionLogic = []
  q.optionLogic[activeOptIdx.value] = groups.length ? groups : undefined
  ElMessage.success('已保存当前选项的关联')
}

// 题目数据类型
interface Question {
  id: string
  type: number
  title: string
  titleHtml?: string
  description?: string
  required: boolean
  options?: string[]
  matrix?: {
    rows?: string[]
    selectionType?: 'single' | 'multiple'
  }
  optionOrder?: 'none' | 'all' | 'flip' | 'firstFixed' | 'lastFixed'
  hideSystemNumber?: boolean
  validation?: Record<string, unknown>
  upload?: {
    maxFiles?: number
    maxSizeMb?: number
    accept?: string
  }
}

// 响应式数据
const saving = ref(false)
// 左侧面板页签：题型 / 题库 / 大纲
const panelTab = ref<'types'|'repo'|'outline'>('types')

// 大纲拖拽排序状态
const draggingIndex = ref<number | null>(null)
const dragOverIndex = ref<number | 'end' | null>(null)
const dragOverPos = ref<'before'|'after'>('after')
const outlineListEl = ref<HTMLElement | null>(null)
const showOutlineTip = ref(true)
// 重命名
const renamingIndex = ref<number | null>(null)
const renameText = ref('')
const renameInputEl = ref<HTMLInputElement | null>(null)

function onOutlineDragStart(i:number, e:DragEvent){
  draggingIndex.value = i
  dragOverIndex.value = null
  try{ e.dataTransfer?.setData('text/plain', String(i)) }catch{}
  e.dataTransfer && (e.dataTransfer.effectAllowed = 'move')
}
function onOutlineDragOver(i:number|'end', e:DragEvent){
  if (draggingIndex.value==null) return
  dragOverIndex.value = i
  // 计算前/后插入位置
  if (typeof i === 'number'){
    const target = (e.currentTarget as HTMLElement)
    const rect = target.getBoundingClientRect()
    const mid = rect.top + rect.height/2
    dragOverPos.value = (e.clientY < mid) ? 'before' : 'after'
  } else {
    dragOverPos.value = 'after'
  }
  e.dataTransfer && (e.dataTransfer.dropEffect = 'move')
  // 自动滚动：靠近列表顶部/底部时滚动
  const host = outlineListEl.value
  if (host){
    const bounds = host.getBoundingClientRect()
    const margin = 30
    const speed = 8
    if (e.clientY < bounds.top + margin) host.scrollTop -= speed
    else if (e.clientY > bounds.bottom - margin) host.scrollTop += speed
  }
}
function onOutlineDrop(i:number|'end'){
  const from = draggingIndex.value
  if (from==null) return
  let to = (i==='end') ? surveyForm.questions.length : Number(i)
  if (!Number.isFinite(to)) return
  // 计算最终插入点（before/after）
  let insertPos = to
  if (i!=='end') insertPos = (dragOverPos.value === 'before') ? to : to + 1
  // 自身到位则略过
  if (insertPos === from || insertPos === from + 1){ draggingIndex.value = null; dragOverIndex.value = null; return }
  const list = [...surveyForm.questions]
  const [moved] = list.splice(from, 1)
  // 因移除后索引变化，若原位置在插入点之前，需要将插入点-1
  const adj = insertPos > from ? insertPos - 1 : insertPos
  list.splice(adj, 0, moved)
  // 回写
  surveyForm.questions.splice(0, surveyForm.questions.length, ...list)
  // 更新当前编辑索引：若正在编辑的题被移动，修正其新索引
  if (editingIndex.value === from){
    editingIndex.value = adj
  } else {
    if (editingIndex.value > from && editingIndex.value <= adj) editingIndex.value -= 1
    else if (editingIndex.value < from && editingIndex.value >= adj) editingIndex.value += 1
  }
  draggingIndex.value = null
  dragOverIndex.value = null
  showOutlineTip.value = false
  ElMessage.success('已调整题目顺序')
}
function onOutlineDragEnd(){
  draggingIndex.value = null
  dragOverIndex.value = null
}

function startRename(i:number, q:any){
  renamingIndex.value = i
  renameText.value = String(q?.title || '')
  nextTick(()=>{ renameInputEl.value?.focus() })
}
function confirmRename(){
  const i = renamingIndex.value
  if (i==null) return
  const t = renameText.value.trim()
  if (t){
    ;(surveyForm.questions[i] as any).title = t
  }
  renamingIndex.value = null
}
const showAddQuestionModal = ref(false)
const showEditQuestionModal = ref(false)
const editingQuestion = ref<Question | null>(null)
const editingIndex = ref(-1)

// 关闭题目编辑状态
const closeQuestionEdit = () => {
  editingIndex.value = -1
}

// UI状态
const currentTab = ref<'edit'|'preview'|'settings'|'share'|'answers'>('edit')
const showAIHelper = ref(false)
const showHeaderSettings = ref(false)
const aiPrompt = ref('')

// 答案管理数据
const answerStats = reactive({
  total: 0,
  today: 0,
  avgScore: 0
})

// 分类展开状态
const categoryExpanded = reactive({
  choice: true,      // 选择题
  fillblank: true,   // 填空题
  paging: true,      // 分页说明
  matrix: true,      // 矩阵题
  rating: true,      // 评分题
  advanced: true     // 高级题型
})

// 问卷表单数据
const surveyForm = reactive({
  title: '',
  description: '',
  type: 'normal' as 'normal' | 'anonymous' | 'limited',
  endTime: '',
  settings: {
    allowMultipleSubmissions: false,
    showProgress: true,
    randomizeQuestions: false,
    collectIP: false,
    submitOnce: true
  },
  questions: [] as Question[]
})

// 分享所用的9位短码（后端返回的 shareId）；若后端无该字段则兜底使用 id
const shareId = ref<string>('')

// 当前问卷的真实ID（数字，用于API调用）
const currentSurveyId = ref<string>('')

// 表单验证错误
const errors = reactive({
  title: ''
})

// 计算属性
const canPreview = computed(() => {
  return surveyForm.title.trim() !== '' && surveyForm.questions.length > 0
})

const canPublish = computed(() => canPreview.value && !Object.values(errors).some(error => error !== ''))

const areAllNumbersHidden = computed(() => {
  return surveyForm.questions.length > 0 && surveyForm.questions.every(question => question.hideSystemNumber)
})

// 分享链接：优先使用后端返回的 9 位 shareId，保证与前台 /s/:id 路由匹配
const computedShareLink = computed(() => {
  const host = location?.origin || ''
  const code = (shareId.value || '').trim()
  // 仅当 code 为 9 位数字时返回有效链接，否则返回空字符串并在界面上提示
  return /^\d{9}$/.test(code) ? `${host}/s/${code}` : ''
})

function copyShareLink(){
  const text = computedShareLink.value
  navigator.clipboard?.writeText(text)
}

// 方法
const validateForm = () => {
  errors.title = ''
  if (!surveyForm.title.trim()) {
    errors.title = '请输入问卷标题'
  } else if (surveyForm.title.length > 100) {
    errors.title = '标题不能超过100个字符'
  }
}

const getQuestionTypeLabel = (type: number | string): string => {
  return getLegacyQuestionTypeLabel(type)
}

// 答卷详情动作在下方“答案管理方法”处实现

// 读取路由参数中的标题（从 CreateSurveyLanding 传入），用于初次展示时同步标题
import { useRoute } from 'vue-router'
import { onMounted } from 'vue'
const route = useRoute()
onMounted(async () => {
  const initTitle = (route.query?.title as string) || ''
  if (initTitle && !surveyForm.title) {
    surveyForm.title = initTitle
  }
  // 根据路由 query 指定初始 Tab
  const initTab = (route.query?.tab as string) || ''
  if (['edit', 'preview', 'answers', 'settings'].includes(initTab)) {
    currentTab.value = initTab as 'edit' | 'preview' | 'answers' | 'settings'
  }
  // 如果有路由参数 id，视为编辑已存在问卷：从后端读取并填充
  const editingId = route.params?.id as string | undefined
  if (editingId) {
    try {
      const s = await getSurveyRaw(String(editingId))
      // 基本信息
      surveyForm.title = s.title || ''
      surveyForm.description = s.description || ''
      surveyForm.settings = {
        ...surveyForm.settings,
        ...(s.settings || {}),
        showProgress: s?.settings?.showProgress !== false,
        allowMultipleSubmissions: !!s?.settings?.allowMultipleSubmissions,
        randomizeQuestions: !!(s as any)?.settings?.randomizeQuestions || !!(s as any)?.settings?.randomOrder,
        collectIP: !!(s as any)?.settings?.collectIP,
        submitOnce: (s as any)?.settings?.submitOnce !== false
      }
      surveyForm.endTime = s?.settings?.endTime || ''
      // 保存真实ID（用于API调用）
      currentSurveyId.value = String(s.id || editingId)
      // 回填 shareId（或以 id 兜底），用于分享链接与二维码
      shareId.value = String((s as any).shareId || s.id || '')
      
      // 加载答案统计数据
      try {
        const statsData = await getSurveyDetailStats(currentSurveyId.value)
        if (statsData) {
          Object.assign(answerStats, {
            total: statsData.total || 0,
            today: statsData.today || 0,
            avgScore: statsData.avgScore || 0,
            completionRate: statsData.completionRate || 0,
            completed: statsData.completed || 0,
            incomplete: statsData.incomplete || 0,
            avgTime: statsData.avgTime || '-'
          })
        }
      } catch (err) {
        console.warn('加载答案统计失败，使用默认值:', err)
      }
      
      const qs = Array.isArray(s.questions) ? s.questions : []
      surveyForm.questions = qs.map((q: any, __i:number) => ({
        id: q.id ? String(q.id) : generateQuestionId(),
        type: mapServerTypeToLegacy(q.type || 'input', q.uiType),
        title: q.title || '',
        // 将后端的富文本标题一并挂到本地 question 上，供保存及预览使用
        ...(q.titleHtml ? { titleHtml: q.titleHtml } : {}),
        description: q.description || '',
        required: !!q.required,
        validation: q.validation || undefined,
        matrix: q.matrix
          ? {
              rows: Array.isArray(q.matrix.rows) ? q.matrix.rows.map((row: any) => row.label ?? String(row)) : [],
              selectionType: q.matrix.selectionType === 'multiple' ? 'multiple' : 'single'
            }
          : undefined,
        hideSystemNumber: !!q.hideSystemNumber,
        quotasEnabled: !!q.quotasEnabled,
        quotaMode: (q as any).quotaMode || 'explicit',
        quotaFullText: (q as any).quotaFullText || '名额已满',
        quotaShowRemaining: !!(q as any).quotaShowRemaining,
        options: Array.isArray(q.options) ? q.options.map((o: any) => o.label ?? String(o)) : undefined,
        optionOrder: (q.optionOrder as any) || 'none',
        // 分组设置回显
        optionGroups: Array.isArray(q.optionGroups)
          ? q.optionGroups
              .map((g:any)=>({
                name: String(g?.name ?? ''),
                from: Number(g?.from ?? NaN),
                to: Number(g?.to ?? NaN),
                random: !!g?.random
              }))
              .filter((g:any)=> Number.isFinite(g.from) && Number.isFinite(g.to) && g.from>=1 && g.to>=g.from)
          : [],
        groupOrderRandom: !!q.groupOrderRandom,
        
        autoSelectOnAppear: !!q.autoSelectOnAppear,
        jumpLogic: q.jumpLogic,
        optionLogic: [],
        optionExtras: Array.isArray(q.options) ? q.options.map((o:any)=>({
          quotaLimit: Number(o.quotaLimit || 0),
          quotaEnabled: o.quotaEnabled !== false,
          rich: !!o.rich,
          hasDesc: !!o.desc,
          desc: o.desc || '',
          exclusive: !!o.exclusive,
          defaultSelected: !!o.defaultSelected,
          hidden: !!o.hidden,
          fillEnabled: !!o.fillEnabled,
          fillRequired: !!o.fillRequired,
          fillPlaceholder: o.fillPlaceholder || ''
        })) : []
      }))
      // 回填富文本标题的编辑态状态（titleRichMap，以题目 id 为 key），用于按钮高亮与预览
      surveyForm.questions.forEach((qq:any) => {
        const key = String(qq.id)
        if (qq.titleHtml) {
          titleRichMap[key] = { rich: true, html: String(qq.titleHtml || '') }
        } else if (!titleRichMap[key]) {
          titleRichMap[key] = { rich: false, html: '' }
        }
      })
      // 回显可见性：将后端 logic.visibleWhen 中的 qid（可能是题号字符串）映射回本地 question.id
      const orderToLocalId: Record<string,string> = {}
      surveyForm.questions.forEach((qq:any, i:number) => { orderToLocalId[String((qs[i]?.order) || (i+1))] = String(qq.id) })
      qs.forEach((q:any, i:number) => {
        const vw = q?.logic?.visibleWhen
        if (!Array.isArray(vw) || vw.length === 0) return
        const mapped = vw.map((group:any[]) => (group||[]).map((c:any) => {
          const localQid = orderToLocalId[String(c.qid)] || String(c.qid)
          // 还原 value: 如果依赖题是选项题，需要把服务器存的“序号字符串(1/2/3)”还原成“选项文本”
          const depIdx = surveyForm.questions.findIndex((x:any)=> String(x.id)===localQid)
          const depQ:any = surveyForm.questions[depIdx]
          let value = c.value
          if (depQ && Array.isArray(depQ.options) && depQ.options.length>0) {
            const valToLabel = new Map<string,string>()
            depQ.options.forEach((lbl:string, ii:number) => valToLabel.set(String(ii+1), String(lbl)))
            const back = (v:any) => valToLabel.get(String(v)) || String(v)
            value = Array.isArray(c.value) ? c.value.map(back) : back(c.value)
          }
          return { qid: localQid, op: c.op, value }
        }))
        ;(surveyForm.questions[i] as any).logic = { visibleWhen: mapped }
      })

      // 回显每个选项的 visibleWhen 到本地 optionLogic（结构同题目级别）
      // 需要先建立 id -> 当前题目序号 的映射，供条件里的 qid 统一转换
      // 映射题号串 -> 本地 id（orderToLocalId 已有），以及本地 id -> 题号备用
      const idToOrder: Record<string,string> = {}
      surveyForm.questions.forEach((qq:any, i:number) => { idToOrder[String(qq.id)] = String(i+1) })
      qs.forEach((q:any, i:number) => {
        const opts = Array.isArray(q.options) ? q.options : []
        if (!opts.length) return
        const localQ:any = surveyForm.questions[i]
        localQ.optionLogic = localQ.optionLogic || []
        opts.forEach((opt:any, oi:number) => {
          const groups = opt?.visibleWhen
          if (!Array.isArray(groups) || groups.length===0) return
          const mapped = groups.map((group:any[]) => (group||[]).map((c:any) => {
            // 从服务器结构还原：c.qid 是题号字符串，需要转回本地题 id
            const localQid = orderToLocalId[String(c.qid)] || String(c.qid)
            const depIdx = surveyForm.questions.findIndex(xx => String(xx.id) === localQid)
            const depQ = surveyForm.questions[depIdx]
            let value = c.value
            if (depQ && Array.isArray(depQ.options) && depQ.options.length>0) {
              // 服务器存的是序号值(1/2/3)，这里转回“选项文本”数组供 UI 摘要函数使用
              const valToLabel = new Map<string,string>()
              depQ.options.forEach((label:string, ii:number)=> valToLabel.set(String(ii+1), String(label)))
              const back = (v:any)=> valToLabel.get(String(v)) || String(v)
              value = Array.isArray(c.value) ? c.value.map(back) : back(c.value)
            }
            return { qid: localQid, op: c.op, value }
          }))
          localQ.optionLogic[oi] = mapped
        })
      })
    } catch (e) {
      console.error('加载问卷失败', e)
    }
  }
})

// 返回上一页（模板中 @click="goBack" 需要）
function goBack() {
  try {
    router.back()
  } catch (e) {
    // 兜底：如果 history 栈为空，则跳回列表
    router.push({ name: 'SurveyList' })
  }
}

// 预览逻辑已拆分：此页仅负责跳转
// 旧 previewSurvey 按钮跳转逻辑已废弃，预览现在在当前 Tab 内嵌渲染

// 题型实现状态
const getQuestionConfig = (type: number) => {
  return getLegacyQuestionEditorConfig(type)
}

function isStandaloneConfigType(type: number): boolean {
  return getLegacyQuestionConfigPanel(type) === 'standalone'
}

function ensureSliderValidation(question: any) {
  question.validation = question.validation && typeof question.validation === 'object' ? question.validation : {}
  const min = Number(question.validation.min)
  const max = Number(question.validation.max)
  const step = Number(question.validation.step)
  question.validation.min = Number.isFinite(min) ? min : 0
  question.validation.max = Number.isFinite(max) ? max : 100
  question.validation.step = Number.isFinite(step) && step > 0 ? step : 1
  return question.validation as { min: number; max: number; step: number }
}

function normalizeSliderValidation(question: any) {
  const validation = ensureSliderValidation(question)
  if (validation.max < validation.min) validation.max = validation.min
  if (validation.step <= 0) validation.step = 1
}

function ensureRatingValidation(question: any) {
  question.validation = question.validation && typeof question.validation === 'object' ? question.validation : {}
  const min = Number(question.validation.min)
  const max = Number(question.validation.max)
  question.validation.min = Number.isFinite(min) ? min : 1
  question.validation.max = Number.isFinite(max) ? max : 5
  question.validation.step = 1
  return question.validation as { min: number; max: number; step: number }
}

function normalizeRatingValidation(question: any) {
  const validation = ensureRatingValidation(question)
  validation.min = Math.max(1, Math.min(10, Math.floor(Number(validation.min) || 1)))
  validation.max = Math.max(validation.min, Math.min(10, Math.floor(Number(validation.max) || 5)))
  validation.step = 1
}

function ensureScaleValidation(question: any) {
  question.validation = question.validation && typeof question.validation === 'object' ? question.validation : {}
  const min = Number(question.validation.min)
  const max = Number(question.validation.max)
  const step = Number(question.validation.step)
  question.validation.min = Number.isFinite(min) ? min : 0
  question.validation.max = Number.isFinite(max) ? max : 10
  question.validation.step = Number.isFinite(step) && step > 0 ? step : 1
  if (question.validation.minLabel == null) question.validation.minLabel = '最低'
  if (question.validation.maxLabel == null) question.validation.maxLabel = '最高'
  return question.validation as {
    min: number
    max: number
    step: number
    minLabel?: string
    maxLabel?: string
  }
}

function normalizeScaleValidation(question: any) {
  const validation = ensureScaleValidation(question)
  validation.min = Math.max(0, Math.min(100, Math.floor(Number(validation.min) || 0)))
  validation.max = Math.max(validation.min + 1, Math.min(100, Math.floor(Number(validation.max) || 10)))
  validation.step = Math.max(1, Math.floor(Number(validation.step) || 1))
}

function getScalePreviewValues(question: any) {
  const validation = ensureScaleValidation(question)
  const values: number[] = []
  for (let value = validation.min; value <= validation.max; value += validation.step) {
    values.push(value)
  }
  return values
}

function ensureMatrixConfig(question: any) {
  question.matrix = question.matrix && typeof question.matrix === 'object' ? question.matrix : {}
  question.matrix.selectionType = Number(question?.type) === 21 ? 'multiple' : 'single'
  if (!Array.isArray(question.matrix.rows) || question.matrix.rows.length === 0) {
    question.matrix.rows = ['服务态度', '响应速度', '专业程度']
  }
  question.matrix.rows = question.matrix.rows.map((row: any, index: number) => {
    if (typeof row === 'string') return row
    return String(row?.label ?? row?.text ?? `维度${index + 1}`)
  })
  return question.matrix as { rows: string[]; selectionType: 'single' | 'multiple' }
}

function isMatrixMultipleLegacyQuestion(type: number | string) {
  return Number(type) === 21
}

function isMatrixDropdownLegacyQuestion(type: number | string) {
  return Number(type) === 24
}

function addMatrixRow(question: any) {
  const matrix = ensureMatrixConfig(question)
  matrix.rows.push(`维度${matrix.rows.length + 1}`)
}

function removeMatrixRow(question: any, rowIndex: number) {
  const matrix = ensureMatrixConfig(question)
  if (rowIndex < 0 || rowIndex >= matrix.rows.length) return
  matrix.rows.splice(rowIndex, 1)
}

function ensureUploadConfig(question: any) {
  const normalized = normalizeUploadQuestionConfig(question)
  question.upload = {
    maxFiles: normalized.maxFiles,
    maxSizeMb: normalized.maxSizeMb,
    accept: normalized.accept || DEFAULT_UPLOAD_ACCEPT
  }
  return question.upload as { maxFiles: number; maxSizeMb: number; accept: string }
}

function normalizeUploadConfig(question: any) {
  const upload = ensureUploadConfig(question)
  upload.maxFiles = Math.max(1, Math.min(20, Math.floor(Number(upload.maxFiles) || 1)))
  upload.maxSizeMb = Math.max(1, Math.min(10, Number(upload.maxSizeMb) || 10))
  upload.accept = sanitizeUploadAccept(upload.accept)
}

function uploadConfigSummary(question: any) {
  return buildUploadQuestionHelpText(question)
}

function getImplementedQuestionNames() {
  return getImplementedLegacyQuestionNamesFromEditorModel()
}

// 通过题型添加问题
const addQuestionByType = (type: number) => {
  // 关闭当前编辑状态
  editingIndex.value = -1
  
  const config = getQuestionConfig(type)
  
  // 如果题型未实现，显示提示
  if (!config.implemented) {
    alert(`${config.name} 正在开发中，敬请期待！\n\n已实现的题型：\n${getImplementedQuestionNames()}`)
    return
  }
  
  const question: Question = buildLegacyQuestion(type)
  
  surveyForm.questions.push(question)
  
  // 切换到编辑模式
  currentTab.value = 'edit'
}

// 判断题型是否需要选项
const hasOptions = (type: number): boolean => {
  return legacyQuestionTypeHasOptions(type)
}

// 获取选项标签
const getOptionLabel = (type: number, index: number): string => {
  return getLegacyQuestionOptionSuffix(type, index)
}

// 选项编辑（模板引用）
const addOption = (question: Question) => {
  if (!Array.isArray(question.options)) question.options = []
  const nextIdx = question.options.length
  const label = getOptionLabel(question.type, nextIdx)
  question.options.push(`选项${label}`)
  // 保证 optionExtras 与 options 对齐
  const q:any = question as any
  q.optionExtras = Array.isArray(q.optionExtras) ? q.optionExtras : []
  q.optionExtras[nextIdx] = q.optionExtras[nextIdx] || { rich:false, hasDesc:false, desc:'', exclusive:false, defaultSelected:false, hidden:false }
}

const removeOption = (question: Question, optIndex: number) => {
  if (!Array.isArray(question.options)) return
  if (optIndex < 0 || optIndex >= question.options.length) return
  question.options.splice(optIndex, 1)
  const q:any = question as any
  if (Array.isArray(q.optionExtras)) q.optionExtras.splice(optIndex, 1)
}

// 取/建 选项扩展元数据
function ensureOptionExtras(q:any, i:number){
  q.optionExtras = Array.isArray(q.optionExtras) ? q.optionExtras : []
  q.optionExtras[i] = q.optionExtras[i] || { quotaLimit:0, rich:false, hasDesc:false, desc:'', exclusive:false, defaultSelected:false, hidden:false, fillEnabled:false, fillRequired:false, fillPlaceholder:'' }
  return q.optionExtras[i]
}

// 顶部工具条按钮的“是否已配置”判定
function isGroupConfigured(q:any): boolean {
  if (!q) return false
  const hasGroups = Array.isArray(q.optionGroups) && q.optionGroups.length > 0
  const hasRandom = !!q.groupOrderRandom || !!q.groupFillRandom
  return !!(hasGroups || hasRandom)
}

function isQuotaConfigured(q:any): boolean {
  if (!q || !q.quotasEnabled) return false
  const opts:any[] = Array.isArray(q.options) ? q.options : []
  // 优先从 optionExtras 读取（编辑中间态），否则回退到 options[].quotaLimit（服务端回显）
  for (let i = 0; i < opts.length; i++) {
    const ex = Array.isArray(q.optionExtras) ? q.optionExtras[i] : undefined
    const limit = ex && typeof ex.quotaLimit === 'number' ? ex.quotaLimit : (typeof opts[i]?.quotaLimit === 'number' ? opts[i].quotaLimit : 0)
    const enabled = ex && typeof ex.quotaEnabled === 'boolean' ? ex.quotaEnabled : (typeof opts[i]?.quotaEnabled === 'boolean' ? opts[i].quotaEnabled : true)
    if (enabled && Number(limit) > 0) return true
  }
  return false
}

function isScoreConfigured(q:any): boolean {
  // 视为“已配置分数”的条件：存在 examConfig 且分值>0（正确答案可选）
  const cfg = q?.examConfig
  return !!(cfg && typeof cfg.score === 'number' && cfg.score > 0)
}

// 删除重复的 addOption / removeOption 定义，保留上面的实现

// 移动题目
const moveQuestionUp = (index: number) => {
  if (index > 0) {
    const question = surveyForm.questions[index]
    surveyForm.questions.splice(index, 1)
    surveyForm.questions.splice(index - 1, 0, question)
    if (editingIndex.value === index) editingIndex.value = index - 1
  }
}

const moveQuestionDown = (index: number) => {
  if (index < surveyForm.questions.length - 1) {
    const question = surveyForm.questions[index]
    surveyForm.questions.splice(index, 1)
    surveyForm.questions.splice(index + 1, 0, question)
    if (editingIndex.value === index) editingIndex.value = index + 1
  }
}

// AI助手生成
const generateByAI = () => {
  if (!aiPrompt.value.trim()) {
    alert('请输入生成需求')
    return
  }
  
  // 模拟AI生成问题
  const sampleQuestions = [
    {
      id: generateQuestionId(),
      type: 3,
      title: '您对我们的服务总体满意度如何？',
      required: true,
      hideSystemNumber: areAllNumbersHidden.value,
      options: ['非常满意', '满意', '一般', '不满意', '非常不满意']
    },
    {
      id: generateQuestionId(),
      type: 4,
      title: '您认为我们需要改进的方面有哪些？（可多选）',
      required: false,
      hideSystemNumber: areAllNumbersHidden.value,
      options: ['服务态度', '响应速度', '产品质量', '价格合理性', '其他']
    },
    {
      id: generateQuestionId(),
      type: 2,
      title: '请您提出宝贵的建议和意见',
      required: false,
      hideSystemNumber: areAllNumbersHidden.value
    }
  ]
  
  surveyForm.questions.push(...sampleQuestions)
  showAIHelper.value = false
  aiPrompt.value = ''
  
  alert('AI已为您生成了示例问题，您可以继续编辑完善')
}

// 删除重复的 goBack 箭头函数定义，保留上面的 goBack()

const editQuestion = (index: number) => {
  alert('编辑功能待实现')
}

const duplicateQuestion = (index: number) => {
  const originalQuestion = surveyForm.questions[index]
  const duplicatedQuestion = {
    ...originalQuestion,
    id: generateQuestionId(),
    title: `${originalQuestion.title}（副本）`,
    options: Array.isArray(originalQuestion.options) ? [...originalQuestion.options] : undefined,
    validation: originalQuestion.validation ? { ...originalQuestion.validation } : undefined,
    upload: originalQuestion.upload ? { ...originalQuestion.upload } : undefined,
    matrix: originalQuestion.matrix
      ? {
          rows: Array.isArray(originalQuestion.matrix.rows) ? [...originalQuestion.matrix.rows] : undefined,
          selectionType: originalQuestion.matrix.selectionType
        }
      : undefined
  }
  surveyForm.questions.splice(index + 1, 0, duplicatedQuestion)
}

const deleteQuestion = (index: number) => {
  if (confirm('确定要删除这道题目吗？')) {
    const removed = surveyForm.questions.splice(index, 1)[0] as any
    // 清理该题目的富文本状态，避免索引错位导致的接管现象
    if (removed && removed.id && titleRichMap[String(removed.id)]) {
      delete titleRichMap[String(removed.id)]
    }
  }
}

// 完成编辑
const finishEdit = (index?: number) => {
  editingIndex.value = -1
}

// 在当前题后插入空白一题（同类型）
function addQuestionAfter(index:number){
  const cur:any = surveyForm.questions[index]
  const newQ:any = buildLegacyQuestion(Number(cur.type))
  if (isSliderLegacyQuestion(cur.type)) {
    newQ.validation = { ...ensureSliderValidation(cur) }
  }
  if (isRatingLegacyQuestion(cur.type)) {
    newQ.validation = { ...ensureRatingValidation(cur) }
  }
  if (isScaleLegacyQuestion(cur.type)) {
    newQ.validation = { ...ensureScaleValidation(cur) }
  }
  if (isMatrixLegacyQuestion(cur.type)) {
    newQ.matrix = { rows: [...ensureMatrixConfig(cur).rows], selectionType: ensureMatrixConfig(cur).selectionType }
  }
  if (isUploadLegacyQuestion(cur.type)) {
    newQ.upload = { ...ensureUploadConfig(cur) }
  }
  surveyForm.questions.splice(index+1, 0, newQ)
}

// 在指定位置插入一个选项
function addOptionAt(question:any, at:number){
  if (!Array.isArray(question.options)) question.options = []
  const label = `选项${question.options.length+1}`
  question.options.splice(at, 0, label)
  // 同步 extras
  question.optionExtras = Array.isArray(question.optionExtras) ? question.optionExtras : []
  question.optionExtras.splice(at, 0, { rich:false, hasDesc:false, desc:'', exclusive:false, defaultSelected:false, hidden:false })
}

// 聚焦某个选项输入框
function focusOptionInput(qIndex:number, optIndex:number){
  const attr = `q${qIndex}-o${optIndex}`
  // 通过 data-opt 精确定位
  const el = document.querySelector(`input.option-input[data-opt="${attr}"]`) as HTMLInputElement | null
  if (el){
    el.focus()
    el.select()
  }
}

function toggleRich(q:any, i:number){
  const ex = ensureOptionExtras(q, i)
  ex.rich = !ex.rich
}

function toggleDesc(q:any, i:number){
  const ex = ensureOptionExtras(q, i)
  ex.hasDesc = !ex.hasDesc
  if (!ex.hasDesc) ex.desc = ''
}

function toggleHidden(q:any, i:number){
  const ex = ensureOptionExtras(q, i)
  // 仅当从“未隐藏”切换到“隐藏”时做拦截检查
  if (!ex.hidden) {
    const hasOptLogic = Array.isArray(q?.optionLogic?.[i]) && (q.optionLogic[i]?.length > 0)
    const hasJumpByOption = !!(q?.jumpLogic?.byOption && String(q.jumpLogic.byOption[String(i+1)] || '') !== '')
    if (hasOptLogic || hasJumpByOption) {
      ElMessageBox.alert('此选项设置了逻辑关系，不能进行此操作!', '无法隐藏', {
        type: 'warning',
        confirmButtonText: '我知道了'
      })
      return
    }
  }
  ex.hidden = !ex.hidden
}

// 答案管理方法已迁移至 SurveyAnswersPanel.vue 组件

// 切换分类展开状态
const toggleCategory = (category: keyof typeof categoryExpanded) => {
  categoryExpanded[category] = !categoryExpanded[category]
}

const generateQuestionId = (): string => generateQuestionIdUtil('q')

const toServerPayload = () => {
  const questions = surveyForm.questions.map((q, idx) => {
    const idToOrder = Object.fromEntries(surveyForm.questions.map((qq, ii) => [String(qq.id), String(ii+1)]))
    const base: any = {
      uiType: Number((q as any).uiType ?? q.type),
      type: mapLegacyTypeToServer(q.type),
      title: q.title,
      // 持久化富文本标题（若存在）
      ...(q as any).titleHtml ? { titleHtml: (q as any).titleHtml } : {},
      description: q.description,
      required: q.required,
      order: idx + 1,
      hideSystemNumber: !!q.hideSystemNumber
    }
    if ((q as any).validation && typeof (q as any).validation === 'object') {
      base.validation = { ...(q as any).validation }
    }
    const isOptionType = ['radio','checkbox','ranking', 'matrix', 'ratio'].includes(base.type)
    if (isOptionType) {
      base.options = (q.options || []).map((label, i) => {
        const extra:any = (q as any).optionExtras?.[i] || {}
        return {
          label,
          value: String(i + 1),
          order: i + 1,
          quotaLimit: Number(extra.quotaLimit || 0),
          quotaEnabled: extra.quotaEnabled !== false,
          rich: !!extra.rich,
          desc: extra.hasDesc ? (extra.desc || '') : '',
          exclusive: !!extra.exclusive,
          defaultSelected: !!extra.defaultSelected,
          hidden: !!extra.hidden,
          fillEnabled: !!extra.fillEnabled,
          fillRequired: !!extra.fillRequired,
          fillPlaceholder: extra.fillPlaceholder || ''
        }
      })
      // 传递“选项顺序”策略到后端
      base.optionOrder = q.optionOrder || 'none'
      // 分组设置：选项分组与随机化策略
      if (Array.isArray((q as any).optionGroups) && (q as any).optionGroups.length > 0) {
        base.optionGroups = (q as any).optionGroups
          .map((g:any) => ({
            name: String(g?.name ?? ''),
            from: Number(g?.from ?? NaN),
            to: Number(g?.to ?? NaN),
            random: !!g?.random
          }))
          // 仅保留有效范围
          .filter((g:any) => Number.isFinite(g.from) && Number.isFinite(g.to) && g.from >= 1 && g.to >= g.from)
      }
      if ((q as any).groupOrderRandom != null) {
        base.groupOrderRandom = !!(q as any).groupOrderRandom
      }
      
  // 配额配置
  if ((q as any).quotasEnabled != null) base.quotasEnabled = !!(q as any).quotasEnabled
  if ((q as any).quotaMode) base.quotaMode = (q as any).quotaMode
  if ((q as any).quotaFullText != null) base.quotaFullText = String((q as any).quotaFullText || '')
  if ((q as any).quotaShowRemaining != null) base.quotaShowRemaining = !!(q as any).quotaShowRemaining
  // 可选：选项出现时默认选中
      if ((q as any).autoSelectOnAppear) base.autoSelectOnAppear = true
      // 传递每个选项的“可见性逻辑”
      if (Array.isArray((q as any).optionLogic)) {
        base.options = base.options.map((opt:any, i:number) => {
          const optGroups = (q as any).optionLogic?.[i]
          if (!optGroups || !Array.isArray(optGroups) || optGroups.length===0) return opt
          const mappedGroups = optGroups.map((group:any[]) => (group||[]).map((c:any) => {
            // 将“选中的文字”转换为依赖题的“选项value(1/2/3…)”；非选项题保留原值
            const depLocalId = String(c.qid)
            const depIdx = surveyForm.questions.findIndex(xx => String(xx.id) === depLocalId || String(xx.id) === String((c as any).qid))
            const depQ = surveyForm.questions[depIdx]
            let value:any = c.value
            if (depQ && Array.isArray(depQ.options) && depQ.options.length>0) {
              const labelToVal = new Map<string,string>()
              depQ.options.forEach((label:string, ii:number) => labelToVal.set(String(label), String(ii+1)))
              const mapVal = (val:any) => {
                const s = String(val)
                if (/^\d+$/.test(s)) return s
                return labelToVal.get(s) || s
              }
              value = Array.isArray(c.value) ? c.value.map(mapVal) : mapVal(c.value)
            }
            return {
              qid: idToOrder[String(c.qid)] || String(c.qid),
              op: c.op,
              value
            }
          }))
          return { ...opt, visibleWhen: mappedGroups }
        })
      }
      // 跳题逻辑：直接透传到后端（目标为题号字符串或 'end'）
      if ((q as any).jumpLogic) {
        base.jumpLogic = (q as any).jumpLogic
      }
    }
    if (base.type === 'matrix') {
      const matrix = ensureMatrixConfig(q)
      base.matrix = {
        selectionType: matrix.selectionType,
        rows: matrix.rows.map((label: string, i: number) => ({
          label,
          value: String(i + 1),
          order: i + 1
        }))
      }
    }
    if (base.type === 'rating') {
      const validation = ensureRatingValidation(q)
      base.validation = {
        ...base.validation,
        min: validation.min,
        max: validation.max,
        step: 1
      }
    }
    if (base.type === 'scale') {
      const validation = ensureScaleValidation(q)
      base.validation = {
        ...base.validation,
        min: validation.min,
        max: validation.max,
        step: validation.step,
        minLabel: validation.minLabel || '',
        maxLabel: validation.maxLabel || ''
      }
    }
    // 显示逻辑：将前端可视化配置写入后端；把 qid 统一映射为题目“序号字符串”，便于后端校验
    if ((q as any).logic?.visibleWhen) {
      const mapped = (q as any).logic.visibleWhen.map((group:any[]) => (group||[]).map((c:any) => {
        // 将“选中的文字”转换为依赖题的“选项value(1/2/3…)”；非选项题保留原值
        const depLocalId = String(c.qid)
        const depIdx = surveyForm.questions.findIndex(xx => String(xx.id) === depLocalId || String(xx.id) === String((c as any).qid))
        const depQ = surveyForm.questions[depIdx]
        let value:any = c.value
        if (depQ && Array.isArray(depQ.options) && depQ.options.length>0) {
          const labelToVal = new Map<string,string>()
          depQ.options.forEach((label:string, i:number) => labelToVal.set(String(label), String(i+1)))
          const mapVal = (val:any) => {
            const s = String(val)
            if (/^\d+$/.test(s)) return s
            return labelToVal.get(s) || s
          }
          value = Array.isArray(c.value) ? c.value.map(mapVal) : mapVal(c.value)
        }
        return {
          qid: idToOrder[String(c.qid)] || String(c.qid),
          op: c.op,
          value
        }
      }))
      base.logic = { visibleWhen: mapped }
    }
    return base
  })
  return {
    title: surveyForm.title,
    description: surveyForm.description,
    questions,
    settings: {
      ...surveyForm.settings,
      endTime: surveyForm.endTime || '',
      submitOnce: !surveyForm.settings.allowMultipleSubmissions
    }
  }
}

// 生成选项的摘要文本：例如“依赖于[1.上一个问题]第1、2个选项”，用于编辑态与紧凑预览展示
function optionSummary(qIndex:number, optIndex:number): string {
  const q:any = surveyForm.questions[qIndex]
  const groups:any[] = q?.optionLogic?.[optIndex] || []
  if (!Array.isArray(groups) || groups.length===0) return ''
  // 显示操作符中文
  const opCn:Record<string,string> = { eq:'等于', neq:'不等于', gt:'大于', gte:'大于等于', lt:'小于', lte:'小于等于', regex:'匹配正则', in:'等于其一', overlap:'包含其一' }
  const parts:string[] = []
  for (const g of groups) {
    const c:any = Array.isArray(g) && g[0] ? g[0] : null
    if (!c) continue
    // 找到依赖题（允许使用题目顺序号回退）
    let depIdx = surveyForm.questions.findIndex((x:any) => String(x.id) === String(c.qid))
    if (depIdx < 0 && /^\d+$/.test(String(c.qid))) depIdx = Number(String(c.qid)) - 1
    const dep:any = surveyForm.questions[depIdx]
    if (!dep) continue
    const order = depIdx + 1
    const depTitle = dep.title || getQuestionTypeLabel(dep.type)
    const hasOptions = Array.isArray(dep.options) && dep.options.length>0
    if (hasOptions) {
      const picks = Array.isArray(c.value) ? c.value : []
      if (!picks.length) continue
      const idxs:number[] = []
      picks.forEach((lbl:any) => {
        const i = (dep.options||[]).findIndex((t:any)=> String(t)===String(lbl))
        if (i>=0) idxs.push(i+1)
      })
      if (!idxs.length) continue
      const seq = idxs.sort((a,b)=>a-b).map(n=>`第${n}个选项`).join('、')
      parts.push(`依赖于[${order}.${depTitle}]${seq}`)
    } else {
      const op = c.op || 'eq'
      const text = (c.value ?? '').toString().trim()
      if (!text) continue
      parts.push(`依赖于[${order}.${depTitle}]${opCn[op]||op} ${text}`)
    }
  }
  return parts.join(' 或 ')
}

// 生成跳题摘要：在选项后显示（跳转到[xxx]）
function jumpSummary(qIndex:number, optIndex:number): string {
  const q:any = surveyForm.questions[qIndex]
  const j:any = q?.jumpLogic
  if (!j || !j.byOption) return ''
  const target = j.byOption[String(optIndex+1)]
  if (!target) return ''
  if (target === 'end') return '跳转到[问卷末尾]'
  if (target === 'invalid') return '跳转到[无效提交]'
  if (/^\d+$/.test(String(target))) {
    const to = Number(String(target))
    const q2 = surveyForm.questions[to-1]
    if (!q2) return `跳转到[第${to}题]`
    const name = q2.title || getQuestionTypeLabel(q2.type)
    return `跳转到[第${to}题：${name}]`
  }
  return ''
}

// 生成题目关联摘要：在题目下方显示（编辑端）
function questionLogicSummary(qIndex:number): string {
  const q:any = surveyForm.questions[qIndex]
  const groups:any[] = q?.logic?.visibleWhen || []
  if (!Array.isArray(groups) || groups.length===0) return ''
  const parts:string[] = []
  for (const g of groups) {
    const c:any = Array.isArray(g) && g[0] ? g[0] : null
    if (!c) continue
    let depIdx = surveyForm.questions.findIndex((x:any) => String(x.id) === String(c.qid))
    if (depIdx < 0 && /^\d+$/.test(String(c.qid))) depIdx = Number(String(c.qid)) - 1
    const dep:any = surveyForm.questions[depIdx]
    if (!dep) continue
    const order = depIdx + 1
    const depTitle = dep.title || getQuestionTypeLabel(dep.type)
    const hasOptions = Array.isArray(dep.options) && dep.options.length>0
    if (hasOptions) {
      const picks = Array.isArray(c.value) ? c.value : []
      if (!picks.length) continue
      const idxs:number[] = []
      picks.forEach((lbl:any) => {
        const i = (dep.options||[]).findIndex((t:any)=> String(t)===String(lbl))
        if (i>=0) idxs.push(i+1)
      })
      if (!idxs.length) continue
      const seq = idxs.sort((a,b)=>a-b).map(n=>`第${n}个选项`).join('、')
      parts.push(`依赖于[${order}.${depTitle}]${seq}`)
    } else {
      const opCn:Record<string,string> = { eq:'等于', neq:'不等于', gt:'大于', gte:'大于等于', lt:'小于', lte:'小于等于', regex:'匹配正则', in:'等于其一', overlap:'包含其一', includes:'包含', notIncludes:'不包含' }
      const op = c.op || 'eq'
      const text = Array.isArray(c.value)? String(c.value[0]??'') : String(c.value ?? '')
      if (!text) continue
      parts.push(`依赖于[${order}.${depTitle}]${opCn[op]||op} ${text}`)
    }
  }
  return parts.join(' 或 ')
}

const saveDraft = async () => {
  validateForm()
  if (errors.title) return
  saving.value = true
  try {
    const payload = toServerPayload()
    const editingId = route.params?.id as string | undefined
    const created = editingId ? await updateSurvey(String(editingId), payload) : await createSurvey(payload)
    alert('草稿保存成功！')
    // 保存后（新建）进入编辑页继续完善；已有则保持当前 id
    if (!editingId && created.id) router.push({ name: 'EditSurvey', params: { id: created.id } })
  } catch (error: any) {
    console.error('保存草稿失败:', error)
    alert(error?.message || '保存失败，请稍后重试')
  } finally {
    saving.value = false
  }
}

// previewSurvey 旧占位逻辑已移除（内嵌实时预览替代）

const publishSurveyAction = async () => {
  validateForm()
  if (!canPublish.value) return
  if (!confirm('确定要发布这个问卷吗？发布后将无法修改基本结构。')) return
  try {
    const editingId = route.params?.id as string | undefined
    if (editingId) {
      await updateSurvey(String(editingId), toServerPayload())
      await publishSurvey(String(editingId))
    } else {
      const created = await createSurvey(toServerPayload())
      if (!created?.id) throw new Error('发布失败：未获取到问卷ID')
      await publishSurvey(created.id)
    }
    alert('问卷发布成功！')
    router.push({ name: 'SurveyList' })
  } catch (error: any) {
    console.error('发布失败:', error)
    alert(error?.message || '发布失败，请稍后重试')
  }
}

// —— 填写提示（题目说明）开关（响应式） ——
// 使用 reactive 的字典按题目 id 存储开关状态，保证视图立即更新
const hintOpenState = reactive<Record<string, boolean>>({})
const isHintOpen = (q: Question) => !!hintOpenState[q.id]
const setHintOpen = (q: Question, val: boolean) => { hintOpenState[q.id] = !!val }
const toggleHint = (q: Question) => { setHintOpen(q, !isHintOpen(q)) }
const onHintCheckboxChange = (q: Question, e: Event) => {
  const target = e.target as HTMLInputElement
  setHintOpen(q, !!target.checked)
}

type QuickActionKey = 'toggleNumbers' | 'batchAdd'

const triggerQuickAction = async (action: QuickActionKey) => {
  switch (action) {
    case 'toggleNumbers':
      if (surveyForm.questions.length === 0) {
        ElMessage.info('暂无题目可隐藏题号。')
        break
      }
      {
        const nextState = !areAllNumbersHidden.value
        surveyForm.questions.forEach(question => {
          question.hideSystemNumber = nextState
        })
        await nextTick()
  ElMessage.success(nextState ? '已隐藏所有系统题号，可在题目卡片中自行设置题号。' : '已恢复系统题号显示。')
      }
      break
    case 'batchAdd':
      openBatchAddDialog()
      break
  }
}

const switchEditorTab = (tab: 'edit' | 'preview') => {
  if (tab === 'preview') {
    closeQuestionEdit()
  }
  currentTab.value = tab
}

// HTML 安全过滤函数（与 FillSurveyPage 保持一致）
function safeHtml(raw: string): string { return safeHtmlUtil(raw) }
</script>

<style scoped>
.survey-editor {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

/* 顶部工具栏与面包屑页签样式已抽离到 SurveyTopToolbar 组件的 scoped 样式中 */

/* 分享页样式封装在 SurveySharePanel 组件内 */

/* 主编辑容器 */
.editor-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧题型面板 */
.question-types-panel {
  width: 240px;
  background: white;
  border-right: 1px solid #e1e5e9;
  overflow-y: auto;
  flex-shrink: 0;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.panel-header {
  padding: 0.5rem;
  border-bottom: 1px solid #e9ecef;
}

.panel-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #333;
}

.btn-ai {
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
  width: 100%;
}

.question-categories {
  padding: 0;
}

/* 紧凑分类布局 */
.category-compact {
  margin-bottom: -0.5rem; /* 减小分类间距 */
}

.category-title {
  font-size: 0.75rem;
  font-weight: 500;
  color: #333;
  padding: 0.4rem 0.5rem;
  margin: 0;
  cursor: pointer;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.category-title:hover {
  background: #ebebeb;
}

.category-arrow {
  transition: transform 0.3s ease;
  margin-right: 5px;
}

.category-arrow.collapsed {
  transform: rotate(-90deg);
}

.type-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px; /* 与全局 tokens 对齐（再窄一点） */
}

.type-item {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.5rem;
  cursor: pointer;
  text-align: left;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* Hover/Active 样式由全局 design-tokens.css 统一控制 */

/* 统一由全局样式设置边框，避免列间不一致 */

/* 火热标记样式 */
.type-item:contains("🔥") {
  position: relative;
}

.type-item:contains("🔥"):after {
  content: "";
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid #ff4757;
  border-top: 10px solid #ff4757;
}

/* AI助手面板 */
.ai-helper-panel {
  margin: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  border: 1px solid #e9ecef;
}

.ai-helper-panel h4 {
  margin: 0 0 0.5rem 0;
  color: #495057;
}

.ai-tip {
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.75rem;
  line-height: 1.4;
}

.ai-input {
  width: 100%;
  min-height: 80px;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  resize: vertical;
  margin-bottom: 0.75rem;
}

/* 按钮样式 */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  border: 1px solid;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: #0066cc;
  border-color: #0066cc;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #0052a3;
  border-color: #0052a3;
}

.btn-success {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #218838;
  border-color: #1e7e34;
}

.btn-outline {
  background: white;
  border-color: #ced4da;
  color: #495057;
}

.btn-outline:hover:not(:disabled) {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.btn-link {
  background: none;
  border: none;
  color: #0066cc;
  text-decoration: none;
  padding: 0.25rem;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn.danger, .btn.btn-outline.danger { color:#dc2626; border-color:#dc2626; }
.btn.danger:hover, .btn.btn-outline.danger:hover { background:#fee2e2; }

.btn-small {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
}

.btn-block {
  width: 100%;
}

.btn-large {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.btn-icon {
  padding: 0.25rem;
  border: none;
  background: none;
  cursor: pointer;
  border-radius: 0.25rem;
  color: #6c757d;
  transition: all 0.2s;
  min-width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon .icon-text {
  font-size: 0.9rem;
  font-weight: 600;
  pointer-events: none;
}

.btn-icon:hover {
  background: #f8f9fa;
  color: #495057;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger:hover {
  background: #dc3545;
  color: white;
}

/* 主编辑区域 */
.main-editor {
  flex: 1;
  overflow-y: auto; /* 主容器滚动，滚动条在页面最右侧 */
  overflow-x: hidden;
  background: #f3f4f6;
  display: flex;
  flex-direction: column;
}

.edit-area,
.preview-area,
.settings-area {
  max-width: 1100px;
  width: 100%;
  margin: 0rem auto 0;
  padding: 1rem 1rem 1rem 0.25rem;
  background: transparent; /* 透明背景，不影响子区域 */
  border: none;
  border-radius: 0;
  box-shadow: none;
  min-height: 100%; /* 确保占满高度，让滚动条在外层 */
}

.editor-utility-row {
  position: sticky;
  top: 12px;
  z-index: 5;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  width: 100%;
  margin: 0 0 20px;
}

.editor-utility-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 6px;
  width: fit-content;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.06);
  border: 1px solid rgba(148, 163, 184, 0.14);
  backdrop-filter: blur(5px);
}

.editor-utility-bar--left {
  margin-left: 272px;
}

.editor-utility-bar--mirrored {
  justify-content: flex-end;
}

.utility-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  min-width: 26px;
  padding: 0 10px;
  gap: 4px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  color: #1f2937;
  cursor: pointer;
  transition: all 0.2s ease;
}

.utility-btn--icon {
  min-width: 24px;
  width: 24px;
  height: 24px;
  padding: 0;
  border-radius: 6px;
  gap: 0;
}

.utility-label {
  font-size: 12px;
  line-height: 1;
  color: inherit;
}

.utility-btn:hover,
.utility-btn:focus-visible {
  border-color: rgba(59, 130, 246, 0.25);
  background: rgba(59, 130, 246, 0.14);
  color: #0f172a;
  outline: none;
}

.utility-btn.is-active {
  border-color: rgba(59, 130, 246, 0.36);
  background: rgba(59, 130, 246, 0.18);
  color: #0f172a;
}

.utility-btn:disabled {
  opacity: 1;
  cursor: not-allowed;
  border-color: transparent;
  background: transparent;
  color: #cbd5e1;
}

.utility-tooltip {
  position: relative;
}

.utility-tooltip::after {
  content: attr(data-tooltip);
  position: absolute;
  top: calc(100% + 8px);
  left: 100%;
  transform: translateX(8px);
  padding: 4px 8px;
  border-radius: 4px;
  background: rgba(15, 23, 42, 0.92);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.utility-tooltip::before {
  content: '';
  position: absolute;
  top: calc(100% + 2px);
  left: 100%;
  width: 0;
  height: 0;
  transform: translateX(6px);
  border: 6px solid transparent;
  border-top-color: rgba(15, 23, 42, 0.92);
  opacity: 0;
  transition: opacity 0.15s ease;
  z-index: 10;
}

.utility-tooltip:hover::after,
.utility-tooltip:focus-visible::after,
.utility-tooltip:hover::before,
.utility-tooltip:focus-visible::before {
  opacity: 1;
}

.utility-icon {
  display: inline-flex;
  width: 14px;
  height: 14px;
}

.utility-icon svg {
  width: 100%;
  height: 100%;
  display: block;
  fill: currentColor;
}

.utility-icon svg path {
  fill: currentColor;
  transition: fill 0.2s ease;
}

/* 问卷头部编辑器 - 与题目卡片样式一致 */
.survey-header-editor {
  background: #ffffffff; /* 白色背景 */
  padding: 0.75rem; /* 统一内边距 */
  margin-bottom: 0; /* 与题目卡片紧密排列 */
  border: none;
  border-radius: 0; /* 直角 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02); /* 添加极淡阴影 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 平滑过渡 */
  transform-origin: center;
}

.survey-header-editor:hover {
  transform: scale(1.035); /* 增加放大比例，与题目卡片一致 */
  background: #ffffff; /* 保持白色背景 */
  border: 1px solid rgba(231, 232, 233, 0.2); /* 添加淡蓝色边框 */
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12); /* 增强阴影效果 */
}

/* 编辑区域：主-侧并排布局 */
.edit-layout {
  display: block; /* 改为block布局，左侧fixed后右侧自然占满 */
  padding-left: 275px; /* 留出245px题型面板 + 30px间隙 */
  min-height: calc(100vh - 200px); /* 最小高度确保题型面板有足够空间 */
}

.edit-main {
  min-width: 0;
  overflow: visible; /* 不独立滚动，由外层main-editor滚动 */
  background: #ffffff; /* 编辑区独立背景 */
  padding: 0.5rem; /* 内边距 */
  border-radius: 0; /* 直角 */
  width: 100%; /* 占满剩余空间 */
}

/* 并入编辑区的题型面板样式 */
.question-types-panel.in-editor {
  width: 245px; /* 固定宽度 */
  border: 0;
  border-radius: 0;
  background: #fafbfc; /* 题型面板独立背景色 */
  padding: 0 0.75rem 0 0.2rem; /* 左侧padding减小到0.5rem，让内容更靠左 */
  position: fixed; /* 固定定位，完全独立 */
  left: calc(50% - 550px); /* 居中对齐：50% - (1100px/2) */
  top: 64px; /* 贴着顶栏底部 */
  bottom: 0; /* 贴着浏览器底部 */
  overflow-y: auto; /* 题型面板独立滚动 */
  overflow-x: hidden;
  height: calc(100vh - 64px); /* 使用height而不是max-height，确保占满 */
  z-index: 10; /* 确保在上层 */
}

/* 兼容：原本左侧固定面板的基础样式不影响右侧并入版本 */
.question-types-panel.in-editor .panel-header {
  position: sticky;
  top: 0;
  background: #f6f9ff; /* 浅蓝底，更清晰，与主体区分 */
  z-index: 2;
  border: 1px solid #e2e8ff; /* 轻描边，避免与下方叠色露出 */
  border-radius: 4px; /* 减少圆角 */
  padding: 4px 14px 8px 14px; /* 减少上内边距从10px到4px */
  margin-bottom: 8px; /* 与下方内容分隔 */
  box-shadow: 0 1px 2px rgba(16, 42, 112, 0.06);
}

/* 面板三段式标签（题型/题库/大纲） */
.question-types-panel .panel-tabs{ display:flex; gap:18px; background:transparent; padding:0; border-bottom:0; width:100%; }
.question-types-panel .panel-tab{ flex:0 0 auto; background:transparent; color:#5b6775; border:0; border-radius:0; padding:6px 2px; font-weight:600; cursor:pointer; position:relative; line-height:1.1; font-size:16px; }
.question-types-panel .panel-tab:hover{ color:#1e78ff; }
.question-types-panel .panel-tab.active{ color:#1e78ff; }
.question-types-panel .panel-tab::after{ content:''; position:absolute; left:0; right:0; bottom:0; height:2px; background:transparent; border-radius:2px; }
.question-types-panel .panel-tab.active::after{ background:#1e78ff; height:3px; }
.question-types-panel .panel-tab:focus{ outline:none; box-shadow: inset 0 -2px 0 #93c5fd; }

/* 大纲列表样式 */
.question-types-panel .outline-list{ display:flex; flex-direction:column; gap:6px; padding:8px 0; }
.question-types-panel .outline-tip{ display:flex; align-items:center; gap:8px; background:#f3f6fb; border:1px solid #e2e8f0; color:#475569; padding:8px 10px; border-radius:8px; margin:0 0 8px; }
.question-types-panel .outline-tip .tip-icon{ display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; background:#e0e7ff; color:#3b82f6; font-weight:700; font-style:italic; }
.question-types-panel .outline-tip .tip-text{ flex:1; }
.question-types-panel .outline-tip .tip-close{ border:0; background:transparent; color:#94a3b8; cursor:pointer; font-size:16px; }
.question-types-panel .outline-item{ display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; cursor:pointer; border:1px solid transparent; }
.question-types-panel .outline-item:hover{ background:#eaf2ff; border-color:#93c5fd; }
.question-types-panel .outline-item:hover .title{ color:#1e78ff; font-weight:600; }
.question-types-panel .outline-item:hover .num{ color:#2563eb; }
.question-types-panel .outline-item:hover .meta{ color:#3b82f6; }
.question-types-panel .outline-item.dragging{ opacity:.5; }
.question-types-panel .outline-item.over{ outline:2px dashed #93c5fd; outline-offset:2px; }
.question-types-panel .outline-item.over-before{ box-shadow: inset 0 3px 0 #93c5fd; }
.question-types-panel .outline-item.over-after{ box-shadow: inset 0 -3px 0 #93c5fd; }
.question-types-panel .drag-handle{ cursor:grab; user-select:none; color:#94a3b8; padding:0 4px; }
.question-types-panel .drag-handle:active{ cursor:grabbing; }
.question-types-panel .rename-input{ flex:1; min-width:0; border:1px solid #cbd5e1; border-radius:6px; padding:4px 6px; font-size:14px; }
.question-types-panel .outline-item .num{ color:#64748b; width:1.5em; text-align:right; }
.question-types-panel .outline-item .title{ flex:1; color:#1f2937; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.question-types-panel .outline-item .meta{ color:#94a3b8; font-size:12px; }

/* 题库占位 */
.question-types-panel .question-bank{ padding:12px 4px; color:#64748b; }
.question-types-panel .question-bank .bank-empty{ background:#f8fafc; border:1px dashed #e5e7eb; border-radius:8px; padding:12px; text-align:center; }

/* 主编辑块位于第二列，且与面板同一行 */
.edit-main { grid-column: 2; grid-row: 1; }

.title-editor {
  margin-bottom: 1rem;
  text-align: center; /* 标题区整体居中 */
}

.survey-title-input {
  width: 100%;
  font-size: 1.6rem;
  font-weight: 700;
  padding: 0.5rem 0.75rem;
  border: 1px solid transparent; /* 默认隐藏边框 */
  background: transparent;
  color: var(--el-color-primary, #409eff); /* 蓝色标题 */
  border-radius: 10px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, background-color .2s;
  text-align: center; /* 标题居中 */
}
.survey-title-input:hover { border-color:#e5e7eb; background:#fff; }

.survey-title-input:focus {
  border-color: #c7d7fe;
  box-shadow: 0 0 0 2px rgba(64,158,255,.10);
  background: #fff;
}

.survey-title-input:empty:before {
  content: attr(placeholder);
  color: #adb5bd;
}

.survey-desc-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent; /* 默认隐藏边框（细边） */
  border-radius: 10px;
  font-family: inherit;
  margin-bottom: 1rem;
  background: transparent;
  color: #4b5563;
  transition: border-color .2s, box-shadow .2s, background-color .2s;
}
.survey-desc-input:hover { border-color:#e5e7eb; background:#fff; }
.survey-desc-input.is-trigger:focus { outline: none; border-color:#c7d7fe; box-shadow: 0 0 0 2px rgba(64,158,255,.10); background:#fff; }
.survey-desc-input .placeholder{ color:#9ca3af; }

.header-actions {
  text-align: center;
}

.header-settings {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e9ecef;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.setting-group label {
  min-width: 80px;
  font-weight: 500;
}

.setting-row {
  display: flex;
  gap: 1.5rem;
}

.error-tip {
  color: #dc3545;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

/* 题目编辑器 */
.questions-editor {
  background: transparent; /* 去掉白色背景块 */
  border-radius: 0;
  border: none; /* 去掉四周灰色边框线条 */
  min-height: 400px;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  color: #6c757d;
}

.empty-state .empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #495057;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.questions-list {
  padding: 0; /* 移除padding，让题目卡片贴住边缘 */
}

 .question-editor {
  border: none;
  border-radius: 0; /* 直角，不用圆角 */
  margin-bottom: 0; /* 题目之间无间距，紧密排列 */
  margin-top: 0; /* 确保顶部也无间距 */
  background: #ffffffff; /* 使用极浅的灰白色背景，更柔和 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); /* 使用更平滑的缓动函数 */
  transform-origin: center;
  padding: 0.75rem; /* 统一添加内边距 */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02); /* 添加极淡阴影，增加层次感 */
 }

.question-editor:hover {
  transform: scale(1.035); /* 增加放大比例 */
  background: #ffffff; /* 保持白色背景 */
  border: 1px solid rgba(231, 232, 233, 0.2); /* 添加淡蓝色边框 */
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12); /* 增强阴影效果 */
}

.question-editor.active { 
  background: linear-gradient(135deg, #f0f7ff 0%, #e8f2ff 100%); /* 使用渐变背景，更有层次 */
  box-shadow: 0 6px 20px rgba(0, 102, 204, 0.12); /* 编辑状态阴影更明显 */
  transform: scale(1.035); /* 与悬停放大比例一致 */
  border-radius: 0; /* 直角 */
  padding: 0.75rem;
  border: 2px solid rgba(0, 102, 204, 0.15); /* 添加淡蓝色边框，更明显的区分 */
}

.question-toolbar {
  display: flex;
  align-items: center;
  padding: 0.25rem 0 0.25rem 0; /* 更扁平，减少高度 */
  background: transparent; /* 去掉白条 */
  border: none; /* 去掉底线 */
  border-radius: 0;
}

.question-number {
  background: linear-gradient(135deg, #0066cc 0%, #0052a3 100%); /* 渐变效果 */
  color: white;
  width: 1.5rem; /* 稍微增大 */
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  margin-right: 0.75rem;
  box-shadow: 0 2px 6px rgba(0, 102, 204, 0.25); /* 添加阴影 */
}

.question-type-label {
  background: linear-gradient(135deg, #e7f1ff 0%, #d4e7ff 100%); /* 渐变背景 */
  color: #0066cc;
  padding: 0.25rem 0.6rem;
  border-radius: 12px; /* 更圆润的胶囊形状 */
  font-size: 0.7rem;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 102, 204, 0.1); /* 添加轻微阴影 */
}

.question-actions {
  margin-left: auto;
  display: flex;
  gap: 0.2rem;
}

.question-content {
  padding: 0.75rem;
  cursor: pointer;
}

.question-title-editor {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.question-title-input {
  flex: 1;
  font-size: 1rem;
  font-weight: 500;
  padding: 0.625rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 8px; /* 更大的圆角 */
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: rgba(255, 255, 255, 0.6); /* 半透明白色背景 */
}

.question-title-input:hover {
  border-color: #c5d9ed; /* 更柔和的蓝灰色边框 */
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.06); /* 添加轻微阴影 */
}

.question-title-input:focus {
  border-color: #0066cc;
  background: #ffffff;
  box-shadow: 0 4px 12px rgba(0, 102, 204, 0.12); /* 聚焦时更明显的阴影 */
}

/* 标题富文本容器与按钮 */
.title-input-wrap{ width:100%; }
.title-input-shell{ position:relative; width:100%; }
.title-input-wrap .title-rich-preview{ padding:0.625rem 2.5rem 0.625rem 0.75rem; border:1px solid transparent; border-radius:8px; background:#fff; min-height:40px; }
.title-input-wrap .question-title-input{ width:100%; padding-right:2.5rem; }
.title-input-shell .title-rich-btn-wrap{ position:absolute; right:6px; top:50%; transform:translateY(-50%); display:flex; align-items:center; justify-content:center; }
.title-input-wrap .title-rich-btn{ width:30px; height:30px; border:1px solid #d1d5db; border-radius:10px; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#4b5563; box-shadow: 0 1px 2px rgba(0,0,0,0.04); transition: all .15s ease; }
.title-input-wrap .title-rich-btn .icon{ display:block; color:inherit; width:24px; height:24px; }
.title-input-wrap .title-rich-btn:hover{ background:#f8fafc; border-color:#93c5fd; color:#1e3a8a; box-shadow:0 2px 6px rgba(30,58,138,0.12); }
.title-input-wrap .title-rich-btn:focus-visible{ outline:2px solid #93c5fd; outline-offset:2px; }
.title-input-wrap .title-rich-btn.active{ background:#eef5ff; border-color: var(--el-color-primary, #409eff); color: var(--el-color-primary, #409eff); box-shadow:0 2px 8px rgba(64,158,255,0.18); }

.required-toggle {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  color: #6c757d;
  white-space: nowrap;
}

.question-desc-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  resize: vertical;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.hint-editor {
  margin-top: 0.25rem;
}

.hint-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

/* 紧凑选项编辑器 */
.question-options-editor.compact {
  margin-top: 0.75rem;
  border: 1px solid rgba(0, 102, 204, 0.1); /* 淡蓝色边框 */
  border-radius: 12px; /* 增大圆角，与卡片统一 */
  background: linear-gradient(135deg, #f8fbff 0%, #f0f7ff 100%); /* 极淡蓝色渐变背景 */
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.04); /* 添加轻微蓝色阴影 */
}

.options-toolbar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-bottom: 1px solid rgba(0, 102, 204, 0.08); /* 淡蓝色分隔线 */
  background: rgba(255, 255, 255, 0.7); /* 半透明白色，透出底层渐变 */
  border-radius: 12px 12px 0 0; /* 顶部圆角 */
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  background: white;
  color: #333;
  cursor: pointer;
}

/* 添加选项：常驻主色，区分度更高 */
.btn-add-option {
  background: var(--el-color-primary, #409eff) !important;
  border-color: var(--el-color-primary, #409eff) !important;
  color: #fff !important;
}
.btn-add-option:hover {
  background: var(--el-color-primary-dark-2, #337ecc) !important;
  border-color: var(--el-color-primary-dark-2, #337ecc) !important;
}

/* 修正：.btn-sm 中性样式会覆盖 .btn-primary，这里为小号主按钮恢复主色 */
.btn-primary.btn-sm {
  background: var(--el-color-primary, #409eff);
  border-color: var(--el-color-primary, #409eff);
  color: #fff;
}
.btn-primary.btn-sm:hover:not(:disabled) {
  background: var(--el-color-primary-dark-2, #337ecc);
  border-color: var(--el-color-primary-dark-2, #337ecc);
}

.btn-link-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  border: none;
  background: none;
  color: #333; /* 默认深色 */
  cursor: pointer;
  text-decoration: none;
}
.btn-link-sm:hover { color: var(--el-color-primary, #409eff); text-decoration: none; }
/* 仅激活后显示主色 */
.btn.btn-link-sm.active { color: var(--el-color-primary, #409eff); font-weight: 600; }

.options-list {
  padding: 0.75rem;
  background: transparent; /* 透明背景，显示容器的渐变色 */
}

.option-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap; /* 允许换行，便于第二行展示填空预览 */
}

.opt-left { display:flex; align-items:center; gap:0.5rem; flex:1; }
.opt-tools { display:flex; align-items:center; gap:0.25rem; }

.option-radio { display:flex; align-items:center; justify-content:center; }
.option-radio.el-radio-sim .el-radio { --el-radio-input-size:16px; }
.option-radio.el-radio-sim .el-radio__input.is-disabled.is-checked .el-radio__inner { background-color: var(--el-color-primary); border-color: var(--el-color-primary); }
.option-radio.el-radio-sim .el-radio__input.is-disabled .el-radio__inner { cursor: default; }
/* 多选编辑图标尺寸（方形） */
.option-radio.el-checkbox-sim .el-checkbox { --el-checkbox-input-size:16px; }
.option-radio.el-checkbox-sim .el-checkbox__input.is-disabled .el-checkbox__inner { cursor: default; }

.option-input {
  flex: 1;
  padding: 0.375rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}
.opt-input-wrap{ position: relative; flex:1; display:flex; align-items:center; }
.opt-input-wrap .option-input{ padding-right: 8px; }
.opt-input-wrap .option-input-preview{ padding: 6px 34px 6px 8px; min-height: 32px; border: 1px solid #d1d5db; border-radius: 4px; width: 100%; background: #fff; cursor: text; }
.rte-inline-btn{ position:absolute; right:6px; top:50%; transform: translateY(-50%); width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; border:1px solid #d1d5db; background:#fff; border-radius:4px; color:#6b7280; cursor:pointer; }
.opt-fill-preview{ flex-basis:100%; margin:6px 0 0 28px; display:flex; align-items:center; gap:8px; }
.opt-fill-input{ width:300px; max-width:100%; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; background:#f9fafb; color:#6b7280; }
.opt-fill-input::placeholder{ color:#9ca3af; }
.fill-required-tag{ font-size:12px; color:#2563eb; background:#e0ecff; border-radius:3px; padding:2px 6px; }
.rte-inline-btn:hover{ border-color:#9ca3af; color:#374151; background:#f9fafb; }
.rte-inline-btn.active{ background:#f3f4f6; border-color:#9ca3af; color:#111827; }
.rte-inline-btn .icon{ width:14px; height:14px; }

.option-logic-hint { color: #d97706; font-size: 12px; margin-left: 6px; }
.option-logic-hint + .option-logic-hint { margin-left: 4px; }
.options-list .with-tools{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.options-list .with-tools .opt-left{ display:flex; align-items:center; gap:6px; flex:1; }
.options-list .with-tools .opt-tools{ display:flex; align-items:center; gap:10px; white-space:nowrap; }
.options-list .with-tools .tool-btn{ background:#f1f5f9; border:1px solid #e5e7eb; border-radius:4px; padding:2px 6px; cursor:pointer; }
.opt-desc-edit{ margin:6px 0 0 28px; }
.opt-desc-input{ width:100%; border:1px solid #e5e7eb; border-radius:6px; padding:6px 8px; }

/* 简洁图标按钮风格 */
.options-list .with-tools .icon-btn{
  display:inline-flex; align-items:center; justify-content:center;
  width:24px; height:24px; padding:0;
  border:1px solid #d1d5db; border-radius:4px; background:#fff; color:#6b7280;
  cursor:pointer;
}
.options-list .with-tools .icon-btn:hover{ border-color:#9ca3af; color: var(--el-color-primary, #409eff); background:#f9fafb; }
.options-list .with-tools .icon-btn .icon{ width:14px; height:14px; }
.options-list .with-tools .icon-btn.active{ background:#eef5ff; border-color: var(--el-color-primary, #409eff); color: var(--el-color-primary, #409eff); }
.options-list .with-tools .chk.mini{ font-size:12px; color:#6b7280; display:inline-flex; align-items:center; gap:4px; }

/* 高级功能链接：默认深色，悬浮蓝色，激活蓝色 */
.advanced-options { display:flex; gap:12px; align-items:center; margin-top:6px; }
.advanced-options .link-action { color:#333; cursor:pointer; }
.advanced-options .link-action:hover { color: var(--el-color-primary, #409eff); }
.advanced-options .link-action.active { color: var(--el-color-primary, #409eff); font-weight: 600; }

.btn-remove {
  background: #dc3545;
  color: white;
  border: none;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.75rem;
}

.options-bottom-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  font-size: 0.75rem;
}

.left-controls,
.right-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.label {
  color: #666;
  font-size: 0.75rem;
}

.mini-select {
  padding: 0.25rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  background: white;
}

.checkbox-mini {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
}

.advanced-options {
  display: flex;
  align-items: center;
  gap: 0.5rem; /* 减小间距从 0.75rem 到 0.5rem */
  padding: 0.5rem 0.75rem; /* 减小上下内边距 */
  border-top: 1px solid rgba(0, 102, 204, 0.08);
  background: rgba(255, 255, 255, 0.6);
  font-size: 0.75rem;
  border-radius: 0 0 12px 12px;
  flex-wrap: nowrap; /* 强制不换行，保持单行 */
}

.advanced-options .separator {
  color: #cbd5e0;
  margin: 0 0.15rem; /* 减小分隔符间距 */
}

.advanced-options .right-controls-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem; /* 减小间距 */
  margin-left: auto;
  flex-shrink: 0; /* 防止右侧控件被压缩 */
}

.advanced-options .label {
  color: #666;
  font-size: 0.75rem;
  white-space: nowrap;
  margin: 0; /* 移除默认 margin */
}

.advanced-options .mini-select {
  padding: 0.2rem 0.4rem; /* 减小内边距 */
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.75rem;
  background: white;
  min-width: auto; /* 允许更紧凑 */
}

.advanced-options a {
  color: #0066cc;
  text-decoration: none;
  margin-right: 0.5rem; /* 减小间距从 1rem 到 0.5rem */
  white-space: nowrap;
  flex-shrink: 0; /* 防止链接被压缩 */
}

.advanced-options a:hover {
  text-decoration: underline;
}

.advanced-options .link-disabled {
  color: #94a3b8;
  cursor: not-allowed;
  text-decoration: none;
  margin-right: 0.5rem; /* 减小间距 */
  white-space: nowrap;
  flex-shrink: 0;
}

/* 跳题逻辑弹窗表格样式 */
.jump-table{ border: 1px solid #e5e7eb; border-radius:8px; overflow:hidden; background:#fff; margin-bottom:12px; }
.jump-head{ display:grid; grid-template-columns: 80px 1fr 320px; background:#f8fafc; color:#334155; font-weight:600; border-bottom:1px solid #e5e7eb; }
.jump-head .col{ padding:10px 12px; }
.jump-body{ max-height: 360px; overflow:auto; }
.jump-row{ display:grid; grid-template-columns: 80px 1fr 320px; align-items:center; border-bottom:1px solid #f1f5f9; padding:10px 12px; }
.jump-row:last-child{ border-bottom:none; }
.jump-row .col{ padding:10px 12px; }
.jump-row .col-b{ color:#111827; }
.jump-row .col-c select.logic-select{ width:100%; }
.logic-tip{ color:#e11d48; font-size:12px; }

/* 紧凑预览 */
.question-compact-preview {
  margin-top: 0.75rem;
}

.options-preview {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.option-preview {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
}

.radio-circle {
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width: 22px;
  min-height: 22px;
  color: #999;
}

/* 预览态模拟的 el-radio / el-checkbox 尺寸调大 */
.preview-radio-sim .el-radio { --el-radio-input-size:20px; }
.preview-checkbox-sim .el-checkbox { --el-checkbox-input-size:20px; }
.preview-radio-sim .el-radio__input.is-disabled .el-radio__inner,
.preview-checkbox-sim .el-checkbox__input.is-disabled .el-checkbox__inner { cursor: default; }

.option-text {
  color: #333;
  font-size: 0.875rem;
}

.input-preview {
  padding: 0.5rem;
  background: #ffffff; /* 白色 */
  border: 1px solid #e9ecef;
  border-radius: 0.25rem;
  color: #666;
  font-size: 0.875rem;
  font-style: italic;
}

.standalone-editor {
  margin-top: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.standalone-editor__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.standalone-editor__column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.standalone-editor__label {
  font-size: 12px;
  color: #64748b;
}

.standalone-editor__input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
  color: #111827;
}

.standalone-editor__input--sm {
  width: 88px;
}

.standalone-editor__input--lg {
  width: min(100%, 460px);
}

.standalone-editor__preview {
  padding: 8px 4px 0;
}

.standalone-editor__meta {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.standalone-editor__upload {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.standalone-editor__upload-box {
  padding: 18px 16px;
  border: 1px dashed #94a3b8;
  border-radius: 10px;
  background: #fff;
  color: #475569;
  text-align: center;
}

.standalone-editor__date {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.standalone-editor__tip {
  font-size: 12px;
  color: #64748b;
  line-height: 1.6;
}

.matrix-rows-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px dashed #dbe3ee;
}

.matrix-rows-editor__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #475569;
  font-size: 13px;
  font-weight: 600;
}

.matrix-rows-editor__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.matrix-rows-editor__item {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) 36px;
  gap: 10px;
  align-items: center;
}

.matrix-rows-editor__index {
  color: #64748b;
  font-size: 12px;
  text-align: center;
}

.matrix-rows-editor__input {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}

.matrix-preview {
  overflow-x: auto;
}

.matrix-preview__table {
  min-width: 420px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}

.matrix-preview__head,
.matrix-preview__row {
  display: grid;
  grid-template-columns: minmax(120px, 1.2fr) repeat(auto-fit, minmax(72px, 1fr));
}

.matrix-preview__cell,
.matrix-preview__corner {
  padding: 10px 12px;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  text-align: center;
  color: #475569;
  font-size: 13px;
}

.matrix-preview__cell--head,
.matrix-preview__corner {
  background: #f8fafc;
  font-weight: 600;
  color: #334155;
}

.matrix-preview__cell--row {
  text-align: left;
  color: #111827;
}

.matrix-preview__row:last-child .matrix-preview__cell {
  border-bottom: none;
}

.matrix-preview__cell:last-child,
.matrix-preview__corner:last-child {
  border-right: none;
}

.matrix-preview__dot {
  width: 14px;
  height: 14px;
  display: inline-block;
  border-radius: 999px;
  border: 1.5px solid #cbd5e1;
  background: #fff;
}

.matrix-preview__check {
  width: 16px;
  height: 16px;
  display: inline-block;
  border-radius: 4px;
  border: 1.5px solid #cbd5e1;
  background: #fff;
}

.matrix-preview__select {
  min-width: 56px;
  padding: 4px 8px;
  display: inline-flex;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid #dbe3f0;
  background: #fff;
  color: #64748b;
  font-size: 12px;
  line-height: 1.4;
}

/* 预览区域样式已迁移至独立预览页 */
/* 移除内嵌预览手机壳和 preview 样式（已迁移独立页） */

.preview-paper {
  border: 1px solid #e5e7eb !important;
  border-radius: 12px !important;
  padding: 30px 20px 40px !important;
  box-shadow: 0 8px 30px rgba(31,41,55,.06) !important;
}

.preview-paper-header {
  padding: 6px 8px 4px;
}

.preview-paper-title {
  margin: 20px 8px 30px;
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  color: var(--el-color-primary, #409eff);
}

.preview-desc {
  color: #6b7280;
  margin: 2px 8px 8px;
}

/* 预览区域的富文本内容样式 */
.preview-desc :deep(iframe),
.preview-desc :deep(.qfe-iframe),
.preview-q-desc :deep(iframe),
.preview-q-desc :deep(.qfe-iframe) {
  display: block !important;
  margin: 10px auto !important;
  max-width: 100% !important;
  width: 100% !important;
  height: 450px !important;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: none;
  background: #f5f5f5;
  clear: both;
  float: none !important;
}

.preview-desc :deep(video),
.preview-q-desc :deep(video) {
  max-width: 100% !important;
  display: block !important;
  margin: 10px auto !important;
  border-radius: 6px;
  background: #000;
  clear: both;
  float: none !important;
}

.preview-desc :deep(audio),
.preview-q-desc :deep(audio) {
  width: 100% !important;
  display: block !important;
  margin: 10px auto !important;
  clear: both;
  float: none !important;
}

.preview-desc :deep(p),
.preview-q-desc :deep(p) {
  display: block;
  clear: both;
  margin: 0.5em 0;
}

.preview-q-form {
  padding: 0 20px;
}

.preview-q-item {
  margin-bottom: 30px;
}

.preview-q-item :deep(.el-form-item__label) {
  font-weight: 600;
  color: #333333;
  font-size: 15px;
  margin-bottom: 15px;
}

.preview-q-label {
  display: inline-flex;
  align-items: center;
  gap: 0;
}

.preview-q-desc {
  color: #6b7280;
  font-size: 13px;
  margin: -2px 0 8px;
}

.preview-opt-vertical {
  display: flex !important;
  flex-direction: column !important;
  gap: 4px !important;
  align-items: stretch !important;
  width: 100% !important;
}

.preview-opt-vertical :deep(.el-radio),
.preview-opt-vertical :deep(.el-checkbox) {
  display: flex;
  align-items: center;
  margin: -1.5px;
  font-size: 14px;
  line-height: 1.2;
}

.preview-opt-item {
  padding: 8px 12px;
  border-radius: 6px;
  transition: background-color 0.2s;
}

.preview-opt-item:hover {
  background-color: #f3f4f6;
}

.preview-q-divider {
  margin: 20px 0 !important;
}

.preview-actions {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
}

.preview-submit-btn {
  min-width: 120px;
}

.preview-empty-state {
  padding: 60px 20px;
  text-align: center;
}

.preview-other-type {
  padding: 12px;
  background: #f3f4f6;
  border-radius: 6px;
  color: #6b7280;
  font-size: 13px;
  text-align: center;
}

/* 设置区域 */
.settings-container {
  background: white;
  border-radius: 0.5rem;
  padding: 2rem;
  border: 1px solid #e1e5e9;
}

.settings-container h3 {
  margin: 0 0 1.5rem 0;
  color: #495057;
}

.settings-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e9ecef;
}

.settings-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.settings-section h4 {
  margin: 0 0 1rem 0;
  color: #495057;
  font-size: 1rem;
}

.setting-item {
  margin-bottom: 1rem;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-item label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: #495057;
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin-bottom: 0 !important;
}

.form-input,
.form-select {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0,102,204,0.1);
}

/* 基本信息表单 */
.survey-basic-info {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-label.required::after {
  content: ' *';
  color: #dc2626;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.error-message {
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: #dc2626;
}

/* 高级设置 */
.advanced-settings {
  margin-top: 1rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 1rem;
}

.advanced-settings summary {
  cursor: pointer;
  font-weight: 500;
  color: #3b82f6;
  margin-bottom: 0.75rem;
}

.settings-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding-left: 1rem;
}

.setting-item {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
}

/* 题目列表 */
.questions-section {
  padding: 1.5rem;
}

.empty-questions {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.empty-text {
  font-size: 1.125rem;
  font-weight: 500;
  margin: 0 0 0.5rem 0;
}

.empty-hint {
  font-size: 0.875rem;
  margin: 0;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-item {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #f9fafb;
  transition: all 0.2s;
}

.question-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.question-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}

.question-number {
  background: #3b82f6;
  color: white;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.question-type-badge {
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.question-actions {
  margin-left: auto;
  display: flex;
  gap: 0.25rem;
}

.question-content {
  padding: 1rem;
}

.question-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 500;
  color: #1f2937;
}

.question-description {
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.question-preview {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
}

/* 拖拽效果 */
.ghost {
  opacity: 0.5;
  transform: rotate(5deg);
}

/* 预览区域 */
.survey-preview {
  padding: 1.5rem;
}

.preview-container {
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: #f9fafb;
  padding: 1.5rem;
}

.preview-header {
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 1rem;
}

.preview-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
}

.preview-description {
  margin: 0;
  color: #6b7280;
  line-height: 1.5;
}

.preview-questions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-question {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 1rem;
}

.preview-question-title {
  font-weight: 500;
  margin-bottom: 0.75rem;
  color: #1f2937;
}

.required-mark {
  color: #dc2626;
}

.preview-empty {
  text-align: center;
  color: #9ca3af;
  font-style: italic;
  padding: 2rem 0;
}

/* 新增题型样式 */
.star-rating {
  display: flex;
  gap: 0.25rem;
}

.star {
  font-size: 1.5rem;
  color: #fbbf24;
  cursor: pointer;
}

.nps-scale {
  text-align: center;
}

.scale-labels {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.scale-numbers {
  display: flex;
  gap: 0.25rem;
  justify-content: center;
}

.scale-btn {
  width: 2rem;
  height: 2rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  background: white;
  font-size: 0.875rem;
  cursor: pointer;
}

.sort-options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sort-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  background: white;
  cursor: move;
}

.sort-handle {
  color: #999;
  font-weight: bold;
}

.file-upload .upload-area {
  border: 2px dashed #ddd;
  border-radius: 0.5rem;
  padding: 2rem;
  text-align: center;
  background: #f8f9fa;
  color: #666;
  cursor: pointer;
}

.slider-input {
  padding: 1rem 0;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.ai-question .ai-placeholder {
  padding: 1rem;
  background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 0.5rem;
  text-align: center;
}

.page-break .break-line {
  text-align: center;
  color: #999;
  font-style: italic;
  padding: 1rem 0;
  border-top: 2px dashed #ddd;
  border-bottom: 2px dashed #ddd;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .editor-container {
    flex-direction: column;
  }
  .edit-layout {
    grid-template-columns: 1fr;
  }
  .question-types-panel.in-editor {
    max-height: none;
    overflow: visible; /* 单列时采用统一滚动 */
  }
  .question-types-panel.in-editor,
  .edit-main {
    grid-column: 1;
    grid-row: auto;
  }
  .edit-main {
    overflow: visible; /* 单列下统一由外层滚动 */
  }
  .question-type-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .edit-area,
  .preview-area,
  .settings-area {
    padding: 1rem;
  }
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    justify-content: center;
  }
  
  .question-type-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .question-title-editor {
    flex-direction: column;
    align-items: stretch;
  }
  
  .setting-row {
    flex-direction: column;
    gap: 0.75rem;
  }
}

/* 滚动条样式 */
.question-types-panel::-webkit-scrollbar,
.edit-main::-webkit-scrollbar {
  width: 6px;
}

.question-types-panel::-webkit-scrollbar-track,
.edit-main::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.question-types-panel::-webkit-scrollbar-thumb,
.edit-main::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.question-types-panel::-webkit-scrollbar-thumb:hover,
.edit-main::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 段落说明样式 */
.description-text {
  margin: 10px 0;
}

.description-content {
  padding: 15px;
  background: #f8f9fa;
  border-left: 4px solid #007bff;
  border-radius: 4px;
  color: #495057;
  font-style: italic;
}

/* 答案管理区域 */
.answers-area {
  height: 100%;
  overflow: hidden;
}

.answer-management-simple {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.answer-management-simple h3 {
  margin-bottom: 20px;
  color: #333;
  font-size: 24px;
}

.management-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

.feature-card {
  padding: 20px;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  background: white;
  transition: all 0.3s ease;
}

.feature-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.feature-card h4 {
  margin-bottom: 10px;
  color: #333;
  font-size: 18px;
}

.feature-card p {
  margin-bottom: 15px;
  color: #666;
  font-size: 14px;
  line-height: 1.5;
}

.action-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background: linear-gradient(135deg, #764ba2, #667eea);
  transform: translateY(-1px);
}

.quick-stats {
  display: flex;
  gap: 30px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  justify-content: center;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 32px;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

/* 开发中提示样式 */
.developing-notice {
  display: flex;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #fff3cd, #fef7e0);
  border: 1px solid #f0ad4e;
  border-radius: 8px;
  margin: 10px 0;
}

.developing-icon {
  font-size: 24px;
  margin-right: 15px;
}

.developing-text {
  flex: 1;
}

.developing-title {
  font-weight: bold;
  color: #856404;
  margin-bottom: 5px;
}

/* 逻辑弹窗样式 */
.logic-mask{ position:fixed; inset:0; background:rgba(0,0,0,.35); display:flex; align-items:center; justify-content:center; z-index:1000; }
.logic-dialog{ width:760px; background:#fff; border-radius: 10px; box-shadow:0 24px 64px rgba(0,0,0,.2); overflow:hidden; }
.jump-dialog{ min-height: 520px; display:flex; flex-direction:column; }
.jump-dialog .logic-bd{ flex:1; min-height: 360px; }
.logic-submask{ position:fixed; inset:0; background:rgba(0,0,0,.25); display:flex; align-items:center; justify-content:center; z-index:1001; }
.logic-hd{ display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid #eef0f5; }
.logic-tt{ font-weight:700; }
.logic-titlebar{ display:flex; align-items:baseline; gap:12px; }
.logic-subtip{ color:#64748b; font-size:12px; }
.logic-bd{ padding:16px; background:#f6f8fc; }
.logic-bar{ margin-bottom:8px; }
.logic-bar-title{ color:#475569; }
.logic-rowbox{ background:#eef3fb; border:1px solid #e3eaf7; border-radius:8px; padding:12px; margin-bottom:10px; }
.q-logic-rowbox{ min-height: 72px; }
.logic-line{ display:flex; align-items:center; gap:8px; }
.logic-select{ padding:6px 8px; border:1px solid #d6dbe8; border-radius:6px; min-width:280px; }
.logic-select.wide{ flex:1; min-width: 0; }
.logic-select.mini{ min-width: 120px; }
.logic-input{ padding:6px 8px; border:1px solid #d6dbe8; border-radius:6px; min-width:220px; }
.chip-list{ display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; }
.chip{ display:inline-flex; align-items:center; gap:6px; border:1px solid #cbd5e1; padding:6px 10px; border-radius:20px; cursor:pointer; user-select:none; color:#334155; background:white; }
.chip.active{ background:#2563eb; color:#fff; border-color:#2563eb; }
.chip-text{ line-height:1; }
.chip-x{ font-weight:700; cursor:pointer; }
.logic-ft{ display:flex; justify-content:space-between; align-items:center; gap:10px; padding:12px 16px; border-top:1px solid #eef0f5; }
.logic-left-block{ display:flex; flex-direction:column; gap:6px; align-items:flex-start; }
.logic-left-actions{ display:flex; align-items:center; gap:8px; }
.logic-tip{ color:#f50cceff;; font-size:12px; }
.question-logic-hint { color: #f50cceff; font-size: 12px; margin: 6px 0; }
.tip-muted{ color:#6b7280; font-size:12px; }
.btn.btn-link.danger{ color:#dc2626; }

/* 选项关联：左右布局 */
.opt-logic-head{ background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:10px 12px; margin-bottom:10px; }
.opt-logic-head .row1{ color:#334155; font-weight:600; margin-bottom:4px; }
.opt-logic-head .row1 .qname{ color:#0f766e; }
.right-section-title{ color:#475569; font-size:13px; font-weight:600; margin-bottom:8px; }
.opt-logic-layout{ display:grid; grid-template-columns: 240px 1fr; gap:12px; }
.opt-logic-left{ background:#fff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
.opt-head{ font-weight:600; padding:8px 10px; border-bottom:1px solid #eef0f5; background:#f8fafc; }
.opt-rows{ max-height:320px; overflow:auto; }
.opt-row{ display:flex; align-items:center; justify-content:space-between; padding:8px 10px; border-bottom:1px solid #f1f5f9; cursor:pointer; }
.opt-row:last-child{ border-bottom:none; }
.opt-row.active{ background:#eef6ff; }
.opt-title{ color:#334155; font-size:14px; }
.opt-actions{ display:flex; align-items:center; gap:8px; }
.opt-status{ color:#94a3b8; font-size:12px; }
.opt-status.on{ color:#16a34a; }
.opt-logic-right{ min-height: 340px; }
.badge{ display:inline-flex; align-items:center; padding:2px 8px; border-radius:999px; border:1px solid #e5e7eb; background:#fff; font-size:12px; color:#334155; }
.right-actions-line{ display:flex; gap:8px; align-items:center; justify-content:flex-end; margin-top:8px; }

/* 批量编辑弹窗样式（统一与关联弹窗一致宽度） */
.batch-dialog{ width:760px; max-width:94vw; }
.batch-body{ display:flex; gap:14px; align-items:stretch; }
.batch-left{ flex:1 1 auto; }
.batch-textarea{ width:100%; min-height:320px; border:1px solid #e5e7eb; border-radius:6px; padding:10px 12px; font-size:13px; line-height:1.6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
.batch-right{ width:240px; border-left:1px dashed #e5e7eb; padding-left:12px; overflow:auto; max-height:420px; }
.preset-title{ font-weight:600; margin-bottom:8px; color:#334155; }
.preset-list{ display:flex; flex-wrap:wrap; gap:8px; }
.preset-list .chip{ border:1px solid #d1d5db; background:#fff; border-radius:999px; padding:4px 10px; font-size:12px; cursor:pointer; }
.preset-list .chip:hover{ background:#f3f4f6; }

/* 分组标题样式（编辑页与预览共享） */
.group-header{ background:#f3f4f6; color:#334155; padding:8px 10px; border-radius:6px; margin:8px 0; font-weight:600; }
/* 分组设置弹窗高度（与跳题一致） */
.group-dialog{ width:660px; max-width:94vw; min-height:520px; display:flex; flex-direction:column; }
.group-dialog .logic-bd{ flex:1; min-height:360px; overflow:auto; }
/* 添加分组按钮：居中且醒目 */
.add-group-center{ display:flex; justify-content:center; }
.add-group-btn{ padding:10px 18px; font-weight:600; box-shadow:0 6px 16px rgba(37,99,235,.2); }

/* 选项分组样式 */
.group-header{ background:#f3f4f6; color:#334155; padding:8px 10px; border-radius:6px; margin:8px 0; font-weight:600; }
.group-table{ background:#fff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
.group-head{ display:grid; grid-template-columns: 1.2fr 2fr 120px; gap:0; background:#f8fafc; border-bottom:1px solid #eef0f5; padding:8px 10px; color:#64748b; font-size:13px; }
.group-row{ display:grid; grid-template-columns: 1.2fr 2fr 120px; gap:0; border-bottom:1px solid #f1f5f9; padding:8px 10px; align-items:center; }
.group-row:last-child{ border-bottom:none; }
.group-row .col.name{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
.group-row .col.name .gname{ cursor:pointer; color:#334155; }
.group-row .col.name .name-actions{ display:flex; align-items:center; gap:6px; }
.btn-icon-mini{ border:none; background:transparent; cursor:pointer; color:#64748b; padding:4px; border-radius:4px; }
.btn-icon-mini:hover{ background:#eef2ff; color:#1d4ed8; }
.btn-icon-mini.danger:hover{ background:#fee2e2; color:#dc2626; }
.icon-mini{ width:14px; height:14px; }
.group-table{ background:#fff; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden; }
.group-row:hover{ background:#f9fafb; }
.logic-select.mini.invalid{ border-color:#ef4444; box-shadow:0 0 0 2px rgba(239,68,68,.15); }
.range-error{ color:#ef4444; font-size:12px; margin-top:6px; }
.range-tip{ color:#64748b; font-size:12px; margin-top:6px; }

/* 配额设置表格 */
.quota-head, .quota-row { display:grid; grid-template-columns: 1fr 112px 64px; gap:12px; align-items:center; }
.quota-head { color:#64748b; font-size:12px; padding:4px 0; border-bottom:1px solid #eef0f5; margin-bottom:6px; }
.quota-row { padding:8px 0; border-bottom:1px dashed #eef2f7; }
.quota-scroll{ max-height:360px; overflow:auto; overflow-x:hidden; background:#fff; border:1px solid #e5e7eb; border-radius:8px; padding:6px 10px; }
.quota-head.sticky{ position:sticky; top:0; background:#fff; z-index:1; padding:8px 0; margin:0 0 6px 0; }
.text-ellipsis{ display:inline-block; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.logic-input.right{ text-align:right; }
.logic-input.mini{ min-width:0; width:100%; }
.btn.btn-link-sm{ border:none; background:transparent; color:#333; cursor:pointer; padding:4px 8px; }
.btn.btn-link-sm.active{ color:#2563eb; }
.btn.btn-link-sm:hover{ text-decoration:underline; }
.quota-actions{ display:inline-flex; align-items:center; gap:10px; white-space:nowrap; }
.quota-actions .divider{ display:inline-block; width:1px; height:14px; background:#cbd5e1; }
/* 编辑页剩余配额样式 */
.quota-remaining{ color: var(--quota-remaining-color, #64748b); font-size:12px; margin-left:6px; }

/* 批量添加题目按钮样式 */
.batch-add-questions-wrapper {
  padding: 1.5rem;
  text-align: center;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
}

.btn-batch-add-questions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: white;
  color: #3b82f6;
  border: 1.5px solid #3b82f6;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-batch-add-questions:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.btn-batch-add-questions:active {
  transform: translateY(0);
}

.btn-batch-add-questions .btn-icon {
  font-size: 18px;
}

.btn-batch-add-questions .btn-text {
  line-height: 1;
}

/* 批量添加题目弹窗样式 */
.batch-add-questions-dialog {
  width: 1200px;
  height: 700px;
  display: flex;
  flex-direction: column;
}

/* 标签页样式 */
.batch-tabs {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e5e7eb;
  background: #f8f9fa;
  padding: 0 16px;
}

.batch-tab {
  padding: 12px 24px;
  border: none;
  background: transparent;
  color: #6b7280;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
  position: relative;
  top: 1px;
}

.batch-tab:hover {
  color: #374151;
}

.batch-tab.active {
  color: #2563eb;
  border-bottom-color: #2563eb;
  background: white;
}

.batch-tab-help {
  padding: 8px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  font-size: 16px;
}

.batch-tab-help:hover {
  color: #6b7280;
}

.batch-tab-link {
  margin-left: auto;
  color: #2563eb;
  text-decoration: none;
  font-size: 14px;
  padding: 8px 12px;
}

.batch-tab-link:hover {
  text-decoration: underline;
}

/* 左右分栏布局 */
.batch-add-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  flex: 1;
  overflow: hidden;
  background: #f8f9fa;
}

/* 左侧输入区 */
.batch-add-left {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border-right: 1px solid #e5e7eb;
  background: white;
}

/* 文本框容器 */
.batch-add-textarea-wrapper {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: #ffffff;
}

.batch-add-textarea {
  width: 100%;
  padding: 20px;
  border: none;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  resize: none;
  line-height: 1.8;
  color: #1f2937;
  background: transparent;
}

.batch-add-textarea:focus {
  outline: none;
  background: #fafbfc;
}

.batch-add-textarea::placeholder {
  color: #9ca3af;
  line-height: 1.8;
  white-space: pre-line;
}

/* 右侧预览区 */
.batch-add-right {
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
  overflow: hidden;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.preview-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 15px;
}

.preview-count {
  color: #6b7280;
  font-size: 13px;
  background: #f3f4f6;
  padding: 4px 12px;
  border-radius: 12px;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 预览为空状态 */
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  text-align: center;
  padding: 40px 20px;
}

.preview-empty .empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.preview-empty .empty-text {
  font-size: 14px;
}

/* 预览题目列表 */
.preview-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-question-item {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
  display: flex;
  gap: 12px;
  transition: all 0.2s;
}

.preview-question-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.preview-q-number {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  background: #3b82f6;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
}

.preview-q-content {
  flex: 1;
}

.preview-q-title {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
  line-height: 1.6;
}

.preview-q-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-q-option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
}

.option-marker {
  color: #6b7280;
  font-weight: 600;
  flex-shrink: 0;
}

.option-text {
  color: #374151;
}

.preview-q-type {
  padding: 8px 0;
}

.type-badge {
  display: inline-block;
  padding: 4px 12px;
  background: #e0f2fe;
  color: #0369a1;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

/* 底部按钮区 */
.batch-add-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.batch-add-left {
  flex: 1;
}

.btn-text-link {
  border: none;
  background: transparent;
  color: #2563eb;
  font-size: 14px;
  cursor: pointer;
  padding: 8px 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.btn-text-link:hover {
  text-decoration: underline;
  color: #1d4ed8;
}

.batch-add-right {
  display: flex;
  gap: 12px;
}

.btn-import {
  min-width: 120px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
}


</style>
