<template>
  <div data-testid="admin-repos-page">
    <h3>题库管理</h3>
    <div class="repo-toolbar">
      <el-input
        v-model="newRepoName"
        placeholder="题库名称"
        style="width: 260px"
        data-testid="repo-name-input"
      />
      <el-button type="primary" data-testid="repo-create-button" @click="createRepoAction">
        新建题库
      </el-button>
    </div>
    <el-table :data="repos" v-loading="loading" data-testid="admin-repos-table" @row-click="selectRepo">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column label="题库名称">
        <template #default="{ row }">
          <span :data-testid="`repo-name-${row.id}`">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button
            size="small"
            type="danger"
            :data-testid="`repo-delete-button-${row.id}`"
            @click.stop="removeRepo(row.id)"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer
      v-model="drawer"
      :title="activeRepo?.name || '题库'"
      size="50%"
      data-testid="repo-questions-drawer"
    >
      <div class="question-toolbar">
        <el-input
          v-model="newQTitle"
          placeholder="题目标题"
          data-testid="repo-question-title-input"
        />
        <el-select
          v-model="newQType"
          placeholder="题型"
          style="width: 160px"
          data-testid="repo-question-type-select"
        >
          <el-option
            v-for="option in questionTypeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-button type="primary" data-testid="repo-question-add-button" @click="addQuestion">
          添加题目
        </el-button>
      </div>

      <div class="question-structure-grid">
        <el-input
          v-model="newQStem"
          type="textarea"
          :rows="4"
          placeholder="题面/题干"
          data-testid="repo-question-stem-input"
        />
        <el-input
          v-model="newQOptionsText"
          type="textarea"
          :rows="4"
          placeholder="选项，每行一个"
          data-testid="repo-question-options-input"
        />
      </div>

      <el-input
        v-model="newQContent"
        type="textarea"
        :rows="5"
        placeholder='可选：高级 JSON 扩展字段，例如 {"analysis":"...","tags":["体验"]}'
        data-testid="repo-question-content-input"
      />

      <el-table :data="questions" v-loading="qLoading" data-testid="repo-questions-table">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="题目" min-width="180">
          <template #default="{ row }">
            <span :data-testid="`repo-question-title-${row.id}`">{{ row.title }}</span>
          </template>
        </el-table-column>
        <el-table-column label="题型" width="120">
          <template #default="{ row }">
            <span :data-testid="`repo-question-type-${row.id}`">{{ row.type || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="题面" min-width="220">
          <template #default="{ row }">
            <span :data-testid="`repo-question-stem-${row.id}`">{{ describeQuestionStem(row) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="选项结构" min-width="220">
          <template #default="{ row }">
            <div class="question-options-cell">
              <span :data-testid="`repo-question-option-count-${row.id}`">{{ describeQuestionOptions(row) }}</span>
              <span
                v-if="resolveQuestionOptionPreview(row)"
                class="question-options-preview"
                :data-testid="`repo-question-option-preview-${row.id}`"
                :title="resolveQuestionOptionPreview(row) || undefined"
              >
                {{ resolveQuestionOptionPreview(row) }}
              </span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              size="small"
              type="danger"
              :data-testid="`repo-question-delete-button-${row.id}`"
              @click="removeQuestion(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!qLoading && !questions.length" data-testid="repo-questions-empty">暂无题目</div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  addBankQuestion,
  createRepo,
  deleteRepo,
  listBankQuestions,
  listRepos,
  removeBankQuestion,
  type QuestionBankQuestionDTO,
  type QuestionBankRepoDTO
} from '@/api/repos'

const repos = ref<QuestionBankRepoDTO[]>([])
const loading = ref(false)
const newRepoName = ref('')

const drawer = ref(false)
const activeRepo = ref<QuestionBankRepoDTO | null>(null)
const questions = ref<QuestionBankQuestionDTO[]>([])
const qLoading = ref(false)
const newQTitle = ref('')
const newQType = ref('radio')
const newQStem = ref('')
const newQOptionsText = ref('')
const newQContent = ref('')
const questionTypeOptions = [
  { label: '单选', value: 'radio' },
  { label: '多选', value: 'checkbox' },
  { label: '问答', value: 'textarea' }
]

const load = async () => {
  loading.value = true
  try {
    repos.value = await listRepos()
  } finally {
    loading.value = false
  }
}

const createRepoAction = async () => {
  if (!newRepoName.value.trim()) return

  const repo = await createRepo({ name: newRepoName.value })
  repos.value.push(repo)
  newRepoName.value = ''
}

const removeRepo = async (id?: number) => {
  if (id == null) return

  await deleteRepo(id)
  repos.value = repos.value.filter(repo => repo.id !== id)

  if (activeRepo.value?.id === id) {
    activeRepo.value = null
    drawer.value = false
    questions.value = []
  }
}

const selectRepo = async (row: QuestionBankRepoDTO) => {
  if (row.id == null) return

  activeRepo.value = row
  drawer.value = true
  qLoading.value = true
  try {
    questions.value = await listBankQuestions(row.id)
  } finally {
    qLoading.value = false
  }
}

const parseAdvancedContent = (): Record<string, unknown> | undefined | null => {
  const raw = newQContent.value.trim()
  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      ElMessage.error('高级 JSON 扩展字段必须是对象')
      return null
    }
    return parsed as Record<string, unknown>
  } catch {
    ElMessage.error('高级 JSON 扩展字段不是有效的 JSON')
    return null
  }
}

const parseOptionLines = () => (
  newQOptionsText.value
    .split(/\r?\n/)
    .map(item => item.trim())
    .filter(Boolean)
    .map((label, index) => ({
      label,
      value: String(index + 1)
    }))
)

const typeRequiresOptions = (type?: string) => ['radio', 'checkbox'].includes(String(type || ''))

const getQuestionOptions = (question: QuestionBankQuestionDTO) => {
  const content = question.content
  const contentOptions = content && Array.isArray(content.options) ? content.options : []
  return Array.isArray(question.options) ? question.options : contentOptions
}

const resolveQuestionStem = (question: QuestionBankQuestionDTO) => String(question.stem ?? question.content?.stem ?? '').trim()

const describeQuestionStem = (question: QuestionBankQuestionDTO) => {
  const stem = resolveQuestionStem(question)
  if (!stem) return '-'
  return stem.length > 36 ? `${stem.slice(0, 36)}...` : stem
}

const describeQuestionOptions = (question: QuestionBankQuestionDTO) => {
  const options = getQuestionOptions(question)
  return options.length > 0 ? `${options.length} 项` : '-'
}

const resolveQuestionOptionPreview = (question: QuestionBankQuestionDTO) => {
  const options = getQuestionOptions(question)
  if (!options.length) return ''
  const labels = options
    .map(option => String(option?.label ?? option?.text ?? option?.value ?? '').trim())
    .filter(Boolean)
  if (!labels.length) return ''
  return labels.length > 3 ? `${labels.slice(0, 3).join(' / ')} ...` : labels.join(' / ')
}

const addQuestion = async () => {
  if (!activeRepo.value?.id || !newQTitle.value.trim()) return

  const advancedContent = parseAdvancedContent()
  if (newQContent.value.trim() && !advancedContent) return

  const options = parseOptionLines()
  if (typeRequiresOptions(newQType.value) && options.length < 2) {
    ElMessage.warning('选项题至少需要 2 个选项')
    return
  }

  const payload = {
    title: newQTitle.value,
    type: newQType.value,
    stem: newQStem.value.trim() || undefined,
    options: typeRequiresOptions(newQType.value) && options.length > 0 ? options : undefined,
    content: advancedContent || undefined
  }

  const question = await addBankQuestion(activeRepo.value.id, payload)
  questions.value.push(question)
  newQTitle.value = ''
  newQStem.value = ''
  newQOptionsText.value = ''
  newQContent.value = ''
}

const removeQuestion = async (questionId?: number) => {
  if (!activeRepo.value?.id || questionId == null) return

  await removeBankQuestion(activeRepo.value.id, questionId)
  questions.value = questions.value.filter(question => question.id !== questionId)
}

onMounted(load)
</script>

<style scoped>
.repo-toolbar {
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.question-toolbar {
  margin-bottom: 10px;
  display: flex;
  gap: 8px;
}

.question-structure-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.question-options-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.question-options-preview {
  color: #606266;
  font-size: 12px;
  line-height: 1.4;
}

[data-testid='repo-question-content-input'] {
  margin-bottom: 12px;
}

@media (max-width: 900px) {
  .question-structure-grid {
    grid-template-columns: 1fr;
  }
}
</style>
