<template>
  <aside class="question-types-panel in-editor">
    <div class="panel-header">
      <div class="panel-tabs" role="tablist" aria-label="题型面板切换">
        <button class="panel-tab" :class="{ active: panelTab === 'types' }" role="tab" :aria-selected="panelTab === 'types'" data-testid="survey-panel-tab-types" @click="panelTab = 'types'">题型</button>
        <button class="panel-tab" :class="{ active: panelTab === 'repo' }" role="tab" :aria-selected="panelTab === 'repo'" data-testid="survey-panel-tab-repo" @click="panelTab = 'repo'">题库</button>
        <button class="panel-tab" :class="{ active: panelTab === 'outline' }" role="tab" :aria-selected="panelTab === 'outline'" data-testid="survey-panel-tab-outline" @click="panelTab = 'outline'">大纲</button>
      </div>
    </div>

    <template v-if="panelTab === 'types'">
      <div class="question-categories">
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

      <div v-if="showAIHelper" class="ai-helper-panel">
        <h4>AI 助手</h4>
        <p class="ai-tip">输入需求或可校验的 JSON，快速生成问卷问题。</p>
        <textarea
          v-model="aiPrompt"
          class="ai-input"
          placeholder="例如：帮我生成一套关于员工满意度的调查问卷"
        ></textarea>
        <button class="btn btn-primary btn-block" @click="generateByAI">
          立即生成
        </button>
      </div>
    </template>

    <div v-else-if="panelTab === 'repo'" class="question-bank" data-testid="survey-question-bank-panel">
      <div class="bank-toolbar">
        <select v-model="selectedRepoId" class="bank-select" data-testid="survey-bank-repo-select">
          <option value="">选择题库</option>
          <option v-for="repo in repoList" :key="repo.id" :value="String(repo.id)">
            {{ repo.name }}
          </option>
        </select>
        <input
          v-model="repoKeyword"
          class="bank-search"
          type="search"
          placeholder="搜索题目标题或题面"
          data-testid="survey-bank-search-input"
        />
      </div>

      <div v-if="authStore.isAdmin" class="bank-export-card">
        <div class="bank-export-header">
          <div>
            <div class="bank-export-title">保存当前题到题库</div>
            <div class="bank-export-subtitle">
              {{ currentEditingQuestion ? (currentEditingQuestion.title || getQuestionTypeLabel(currentEditingQuestion.type)) : '先在编辑区选中一个题目' }}
            </div>
          </div>
          <button
            class="btn btn-primary btn-sm"
            type="button"
            data-testid="survey-bank-save-current-button"
            :disabled="!selectedRepoId || currentEditingQuestionIndex < 0 || exportingQuestion"
            @click="handleSaveCurrentQuestion"
          >
            {{ exportingQuestion ? '保存中...' : '保存到题库' }}
          </button>
        </div>
        <div class="bank-export-form">
          <input
            v-model="exportTagsText"
            class="bank-search"
            type="text"
            placeholder="标签，多个用逗号分隔"
            data-testid="survey-bank-export-tags-input"
          />
          <input
            v-model="exportKnowledgePointsText"
            class="bank-search"
            type="text"
            placeholder="知识点，多个用逗号分隔"
            data-testid="survey-bank-export-knowledge-input"
          />
          <input
            v-model="exportApplicableScenesText"
            class="bank-search"
            type="text"
            placeholder="适用场景，多个用逗号分隔"
            data-testid="survey-bank-export-scenes-input"
          />
          <textarea
            v-model="exportAiMetaText"
            class="bank-export-textarea"
            rows="4"
            placeholder='AI 元数据 JSON，例如 {"generatedBy":"gpt-5.2","reviewStatus":"draft"}'
            data-testid="survey-bank-export-ai-meta-input"
          ></textarea>
        </div>
        <div class="bank-export-tip">
          保存时会保留题型、题面、选项和结构化问卷题配置，跨题逻辑不会写入题库。
        </div>
      </div>

      <div v-if="repoLoading" class="bank-state">题库加载中...</div>
      <div v-else-if="repoError" class="bank-state bank-error">{{ repoError }}</div>
      <div v-else-if="!repoList.length" class="bank-empty">
        <div class="bank-tip">暂无可用题库</div>
      </div>
      <template v-else>
        <div v-if="repoQuestionsLoading" class="bank-state">题目加载中...</div>
        <div v-else-if="repoQuestionError" class="bank-state bank-error">{{ repoQuestionError }}</div>
        <div v-else-if="!filteredRepoQuestions.length" class="bank-empty">
          <div class="bank-tip">当前题库暂无匹配题目</div>
        </div>
        <div v-else class="bank-question-list">
          <article
            v-for="question in filteredRepoQuestions"
            :key="question.id"
            class="bank-question-card"
            :data-testid="`survey-bank-question-${question.id}`"
          >
            <div class="bank-question-header">
              <div class="bank-question-main">
                <div class="bank-question-title">{{ question.title }}</div>
                <div class="bank-question-meta">
                  <span>{{ question.type || 'input' }}</span>
                  <span v-if="question.score != null">分值 {{ question.score }}</span>
                </div>
              </div>
              <button
                class="btn btn-sm"
                type="button"
                :disabled="importingQuestionId === question.id"
                :data-testid="`survey-bank-import-button-${question.id}`"
                @click="handleImportQuestion(question)"
              >
                {{ importingQuestionId === question.id ? '导入中...' : '加入问卷' }}
              </button>
            </div>
            <div v-if="describeStem(question)" class="bank-question-stem">
              {{ describeStem(question) }}
            </div>
            <div v-if="describeOptions(question)" class="bank-question-options">
              {{ describeOptions(question) }}
            </div>
            <div v-if="describeMetadata(question).length" class="bank-question-tags">
              <span
                v-for="item in describeMetadata(question)"
                :key="`${question.id}-${item}`"
                class="bank-question-tag"
              >
                {{ item }}
              </span>
            </div>
          </article>
        </div>
      </template>
    </div>

    <div v-else class="outline-list" ref="outlineListEl">
      <div v-if="showOutlineTip" class="outline-tip">
        <span class="tip-icon">i</span>
        <span class="tip-text">拖动目录可修改题目排序</span>
        <button class="tip-close" @click="showOutlineTip = false">×</button>
      </div>
      <template v-if="surveyForm.questions.length">
        <div
          v-for="(q, i) in surveyForm.questions"
          :key="q.id"
          class="outline-item"
          :class="{ dragging: draggingIndex === i, over: dragOverIndex === i, 'over-before': dragOverIndex === i && dragOverPos === 'before', 'over-after': dragOverIndex === i && dragOverPos === 'after' }"
          @dragover.prevent="onOutlineDragOver(i, $event)"
          @drop="onOutlineDrop(i)"
          @dragend="onOutlineDragEnd"
          @click="editingIndex = i; currentTab = 'edit'"
          @dblclick="startRename(i, q)"
        >
          <span class="drag-handle" draggable="true" @dragstart="onOutlineDragStart(i, $event)">☰</span>
          <span class="num">{{ i + 1 }}.</span>
          <template v-if="renamingIndex === i">
            <input class="rename-input" v-model="renameText" ref="renameInputEl" @keydown.enter.prevent="confirmRename" @blur="confirmRename" />
          </template>
          <template v-else>
            <span class="title">{{ q.title || getQuestionTypeLabel(q.type) }}</span>
          </template>
          <span class="meta">{{ getQuestionTypeLabel(q.type) }}</span>
        </div>
        <div
          class="outline-end-drop"
          :class="{ over: dragOverIndex === 'end' }"
          @dragover.prevent="onOutlineDragOver('end', $event)"
          @drop="onOutlineDrop('end')"
        ></div>
      </template>
      <div v-else class="outline-empty">暂无题目，先到“题型”页签添加题目</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { CreateSurveyQuestionConfigPanelContract } from './createSurveyPageContracts'
import {
  addBankQuestion,
  listBankQuestions,
  listRepos,
  type QuestionBankQuestionDTO,
  type QuestionBankRepoDTO
} from '@/api/repos'
import { useAuthStore } from '@/stores/auth'
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
  Link,
  Star,
  Tickets
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
  importQuestionBankQuestion,
  buildQuestionBankPayload,
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

const authStore = useAuthStore()

const repoLoading = ref(false)
const repoQuestionsLoading = ref(false)
const repoError = ref('')
const repoQuestionError = ref('')
const repoList = ref<QuestionBankRepoDTO[]>([])
const repoQuestions = ref<QuestionBankQuestionDTO[]>([])
const selectedRepoId = ref('')
const repoKeyword = ref('')
const exportTagsText = ref('')
const exportKnowledgePointsText = ref('')
const exportApplicableScenesText = ref('')
const exportAiMetaText = ref('')
const importingQuestionId = ref<number | null>(null)
const exportingQuestion = ref(false)
const hasLoadedRepoList = ref(false)

const currentEditingQuestionIndex = computed(() => {
  const index = Number(editingIndex.value)
  return Number.isInteger(index) && index >= 0 && index < surveyForm.questions.length ? index : -1
})

const currentEditingQuestion = computed(() => {
  if (currentEditingQuestionIndex.value < 0) return null
  return surveyForm.questions[currentEditingQuestionIndex.value] || null
})

const filteredRepoQuestions = computed(() => {
  const keyword = repoKeyword.value.trim().toLowerCase()
  if (!keyword) return repoQuestions.value
  return repoQuestions.value.filter(question => {
    const values = [
      String(question.title || ''),
      String(question.stem || question.content?.stem || '')
    ]
    return values.some(value => value.toLowerCase().includes(keyword))
  })
})

function describeStem(question: QuestionBankQuestionDTO) {
  return String(question.stem || question.content?.stem || '').trim()
}

function describeOptions(question: QuestionBankQuestionDTO) {
  const content = question.content
  const options = Array.isArray(question.options)
    ? question.options
    : (content && Array.isArray(content.options) ? content.options : [])
  const labels = options
    .map(option => String(option?.label ?? option?.text ?? option?.value ?? '').trim())
    .filter(Boolean)
  return labels.length ? `选项：${labels.slice(0, 3).join(' / ')}${labels.length > 3 ? ' ...' : ''}` : ''
}

function parseCommaSeparatedText(value: string) {
  return value
    .split(/[,\n，]/)
    .map(item => item.trim())
    .filter(Boolean)
}

function parseAiMetaText(value: string) {
  const raw = value.trim()
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      ElMessage.error('AI 元数据必须是 JSON 对象')
      return null
    }
    return parsed as Record<string, unknown>
  } catch {
    ElMessage.error('AI 元数据不是有效的 JSON')
    return null
  }
}

function describeMetadata(question: QuestionBankQuestionDTO) {
  const content = question.content
  const tags = Array.isArray(question.tags) ? question.tags : []
  const knowledgePoints = Array.isArray(question.knowledgePoints) ? question.knowledgePoints : []
  const applicableScenes = Array.isArray(question.applicableScenes)
    ? question.applicableScenes
    : (content && Array.isArray(content.applicableScenes) ? content.applicableScenes : [])

  return [
    ...tags.map(item => `标签:${item}`),
    ...knowledgePoints.map(item => `知识点:${item}`),
    ...applicableScenes.map(item => `场景:${item}`)
  ]
}

async function loadRepoList() {
  if (hasLoadedRepoList.value || repoLoading.value) return
  repoLoading.value = true
  repoError.value = ''
  try {
    repoList.value = await listRepos()
    hasLoadedRepoList.value = true
    if (!selectedRepoId.value && repoList.value[0]?.id != null) {
      selectedRepoId.value = String(repoList.value[0].id)
    }
  } catch (error: any) {
    repoError.value = error?.message || '题库加载失败'
  } finally {
    repoLoading.value = false
  }
}

async function loadRepoQuestions(repoId: string) {
  if (!repoId) {
    repoQuestions.value = []
    return
  }
  repoQuestionsLoading.value = true
  repoQuestionError.value = ''
  try {
    repoQuestions.value = await listBankQuestions(Number(repoId))
  } catch (error: any) {
    repoQuestionError.value = error?.message || '题目加载失败'
  } finally {
    repoQuestionsLoading.value = false
  }
}

async function handleImportQuestion(question: QuestionBankQuestionDTO) {
  if (question.id == null) return
  importingQuestionId.value = question.id
  try {
    importQuestionBankQuestion(question)
    ElMessage.success('已将题库题加入当前问卷')
  } finally {
    importingQuestionId.value = null
  }
}

async function handleSaveCurrentQuestion() {
  if (!authStore.isAdmin || !selectedRepoId.value || currentEditingQuestionIndex.value < 0) return
  const aiMeta = parseAiMetaText(exportAiMetaText.value)
  if (aiMeta === null) return

  const payload = buildQuestionBankPayload(currentEditingQuestionIndex.value, {
    tags: parseCommaSeparatedText(exportTagsText.value),
    knowledgePoints: parseCommaSeparatedText(exportKnowledgePointsText.value),
    applicableScenes: parseCommaSeparatedText(exportApplicableScenesText.value),
    aiMeta
  })
  if (!payload) return

  exportingQuestion.value = true
  try {
    await addBankQuestion(Number(selectedRepoId.value), payload)
    await loadRepoQuestions(selectedRepoId.value)
    ElMessage.success('已将当前题保存到题库')
  } catch (error: any) {
    ElMessage.error(error?.message || '保存题库题失败')
  } finally {
    exportingQuestion.value = false
  }
}

watch(() => panelTab.value, async nextTab => {
  if (nextTab !== 'repo') return
  await loadRepoList()
}, { immediate: true })

watch(selectedRepoId, async repoId => {
  await loadRepoQuestions(repoId)
}, { immediate: true })
</script>
