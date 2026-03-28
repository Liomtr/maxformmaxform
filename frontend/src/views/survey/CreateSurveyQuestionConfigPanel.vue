<template>
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
</template>

<script setup lang="ts">
import type { CreateSurveyQuestionConfigPanelContract } from './createSurveyPageContracts'
import {
  CircleCheck,
  Finished,
  ArrowDown,
  UploadFilled,
  Sort,
  StarFilled,
  Edit,
  EditPen,
  Document,
  Collection,
  Calendar,
  HelpFilled,
  ChatLineRound,
  Timer,
  Fold,
  DataLine,
  List,
  Histogram,
  Picture,
  Microphone,
  VideoCamera,
  Link
} from '@element-plus/icons-vue'
import './createSurveyPage.css'

const props = defineProps<{
  context: CreateSurveyQuestionConfigPanelContract
}>()

const {
  panelTab,
  categoryExpanded,
  toggleCategory,
  addQuestionByType,
  showAIHelper,
  aiPrompt,
  generateByAI,
  outlineListEl,
  showOutlineTip,
  surveyForm,
  draggingIndex,
  onOutlineDragStart,
  dragOverIndex,
  dragOverPos,
  onOutlineDragOver,
  onOutlineDrop,
  onOutlineDragEnd,
  editingIndex,
  currentTab,
  startRename,
  renamingIndex,
  renameText,
  renameInputEl,
  confirmRename,
  getQuestionTypeLabel
} = props.context
</script>
