<template>
  <div>
    <h3>题库管理</h3>
    <div style="margin-bottom:12px;display:flex;gap:8px;align-items:center;">
      <el-input v-model="newRepoName" placeholder="题库名称" style="width:260px" />
      <el-button type="primary" @click="createRepoAction">新建题库</el-button>
    </div>
    <el-table :data="repos" v-loading="loading" @row-click="selectRepo">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="题库名称" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" type="danger" @click.stop="removeRepo(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="drawer" :title="activeRepo?.name||'题库'" size="50%">
      <div style="margin-bottom:10px;display:flex;gap:8px;">
        <el-input v-model="newQTitle" placeholder="题目标题" />
        <el-select v-model="newQType" placeholder="题型" style="width:160px">
          <el-option label="单选" value="radio" />
          <el-option label="多选" value="checkbox" />
          <el-option label="问答" value="textarea" />
        </el-select>
        <el-button type="primary" @click="addQuestion">添加题目</el-button>
      </div>
      <el-table :data="questions" v-loading="qLoading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="题目" />
        <el-table-column prop="type" label="类型" width="120" />
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button size="small" type="danger" @click="removeQuestion(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listRepos, createRepo, updateRepo, deleteRepo, listBankQuestions, addBankQuestion, removeBankQuestion, type RepoItem, type BankQuestion } from '@/api/repos'

const repos = ref<RepoItem[]>([])
const loading = ref(false)
const newRepoName = ref('')

const drawer = ref(false)
const activeRepo = ref<RepoItem | null>(null)
const questions = ref<BankQuestion[]>([])
const qLoading = ref(false)
const newQTitle = ref('')
const newQType = ref('radio')

const load = async () => {
  loading.value = true
  try { repos.value = await listRepos() } finally { loading.value = false }
}

const createRepoAction = async () => {
  if (!newRepoName.value.trim()) return
  const r = await createRepo({ name: newRepoName.value })
  repos.value.push(r)
  newRepoName.value = ''
}

const removeRepo = async (id?: number) => {
  if (id == null) return
  await deleteRepo(id)
  repos.value = repos.value.filter(r => r.id !== id)
}

const selectRepo = async (row: RepoItem) => {
  if (row.id == null) return
  activeRepo.value = row
  drawer.value = true
  qLoading.value = true
  try { questions.value = await listBankQuestions(row.id) } finally { qLoading.value = false }
}

const addQuestion = async () => {
  if (!activeRepo.value?.id || !newQTitle.value.trim()) return
  const q = await addBankQuestion(activeRepo.value.id, { title: newQTitle.value, type: newQType.value })
  questions.value.push(q)
  newQTitle.value = ''
}

const removeQuestion = async (qid?: number) => {
  if (!activeRepo.value?.id || qid == null) return
  await removeBankQuestion(activeRepo.value.id, qid)
  questions.value = questions.value.filter(q => q.id !== qid)
}

onMounted(load)
</script>
