<template>
  <div>
    <h3>问卷管理</h3>
    <el-table :data="surveys" v-loading="loading" size="small" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="status" label="状态" width="120" />
      <el-table-column prop="response_count" label="答卷数" width="100" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="publish(row.id)">发布</el-button>
          <el-button size="small" @click="view(row.id)">查看</el-button>
          <el-button size="small" type="danger" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-drawer v-model="drawer" title="问卷详情" size="50%">
      <pre v-if="current">{{ JSON.stringify(current, null, 2) }}</pre>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deleteSurvey, getSurvey, listSurveys, publishSurvey } from '@/api/surveys'
import type { Survey } from '@/types/survey'

const surveys = ref<Survey[]>([])
const loading = ref(false)
const drawer = ref(false)
const current = ref<Survey | null>(null)

const load = async () => {
  loading.value = true
  try {
    const result = await listSurveys()
    surveys.value = result.list
  } finally {
    loading.value = false
  }
}

const publish = async (id: number) => {
  await publishSurvey(id)
  await load()
}

const view = async (id: number) => {
  current.value = await getSurvey(id)
  drawer.value = true
}

const remove = async (id: number) => {
  await deleteSurvey(id)
  await load()
}

onMounted(load)
</script>
