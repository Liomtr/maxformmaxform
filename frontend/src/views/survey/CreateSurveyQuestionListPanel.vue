<template>
              <!-- 问卷头部信息 -->
              <div class="survey-header-editor" @click="closeQuestionEdit">
                <div class="title-editor">
                  <input 
                    v-model="surveyForm.title" 
                    data-testid="editor-survey-title-input"
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
                    :data-testid="`question-editor-${index}`"
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
                                :data-testid="`question-title-input-${index}`"
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
                            <button class="btn btn-primary btn-sm" @click.stop="finishEdit()">完成编辑</button>
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
</template>

<script setup lang="ts">
import type { CreateSurveyQuestionListPanelContract } from './createSurveyPageContracts'
import { EditPen, CirclePlus, Remove, Document, Hide, DocumentAdd } from '@element-plus/icons-vue'
import QuillFloatingEditor from '@/components/QuillFloatingEditor.vue'
import './createSurveyPage.css'

const props = defineProps<{
  context: CreateSurveyQuestionListPanelContract
}>()

const {
  surveyForm,
  showHeaderSettings,
  validateForm,
  errors,
  closeQuestionEdit,
  showAIHelper,
  editingIndex,
  getQuestionTypeLabel,
  moveQuestionUp,
  moveQuestionDown,
  duplicateQuestion,
  deleteQuestion,
  ensureTitleRich,
  asPlain,
  onTitleFocus,
  onTitleBlur,
  shouldShowTitleBtn,
  openTitleRichEditor,
  isHintOpen,
  onHintCheckboxChange,
  hasOptions,
  addOption,
  openBatchEdit,
  isGroupConfigured,
  isScoreConfigured,
  isQuotaConfigured,
  openGroupDialog,
  openQuotaDialog,
  groupHeaderFor,
  optionRemaining,
  optionSummary,
  jumpSummary,
  ensureOptionExtras,
  openOptionRichEditor,
  addOptionAt,
  removeOption,
  toggleDesc,
  toggleHidden,
  isMatrixLegacyQuestion,
  isMatrixDropdownLegacyQuestion,
  isMatrixMultipleLegacyQuestion,
  addMatrixRow,
  ensureMatrixConfig,
  removeMatrixRow,
  selectablePrevQs,
  questionLogicSummary,
  openLogicDialog,
  openJumpDialog,
  openOptionLogicDialog,
  isStandaloneConfigType,
  ensureSliderValidation,
  normalizeSliderValidation,
  isSliderLegacyQuestion,
  isUploadLegacyQuestion,
  ensureUploadConfig,
  normalizeUploadConfig,
  uploadConfigSummary,
  isRatingLegacyQuestion,
  ensureRatingValidation,
  normalizeRatingValidation,
  isScaleLegacyQuestion,
  ensureScaleValidation,
  normalizeScaleValidation,
  getScalePreviewValues,
  finishEdit,
  addQuestionAfter,
  openBatchAddDialog
} = props.context
</script>
