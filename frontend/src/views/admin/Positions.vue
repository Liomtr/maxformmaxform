<template>
  <div class="positions-page">
    <div class="page-head">
      <div>
        <h3>岗位管理</h3>
        <p>维护岗位字典，为后续成员归属和权限壳层提供基础数据。</p>
      </div>
    </div>

    <el-card shadow="never" class="form-card">
      <el-form :inline="true" class="ops" @submit.prevent>
        <el-form-item>
          <el-input v-model="form.name" placeholder="岗位名称" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.code" placeholder="编码" />
        </el-form-item>
        <el-form-item>
          <el-switch v-model="form.isVirtual" active-text="虚拟岗位" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="submitting" @click="create">新增</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table :data="positions" size="small" style="width:100%" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="岗位名称" min-width="180" />
        <el-table-column prop="code" label="编码" width="160" />
        <el-table-column label="虚拟" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_virtual || row.isVirtual ? 'warning' : 'success'">
              {{ row.is_virtual || row.isVirtual ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="180" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button link type="danger" @click="remove(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createPosition, deletePosition, listPositions, type PositionDTO } from '@/api/positions'

const positions = ref<PositionDTO[]>([])
const loading = ref(false)
const submitting = ref(false)
const form = ref<{ name: string; code: string; isVirtual: boolean }>({
  name: '',
  code: '',
  isVirtual: false
})

async function load() {
  loading.value = true
  try {
    positions.value = await listPositions()
  } finally {
    loading.value = false
  }
}

async function create() {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入岗位名称')
    return
  }

  submitting.value = true
  try {
    await createPosition({
      name: form.value.name.trim(),
      code: form.value.code.trim() || undefined,
      isVirtual: form.value.isVirtual
    })
    ElMessage.success('岗位已新增')
    form.value = { name: '', code: '', isVirtual: false }
    await load()
  } finally {
    submitting.value = false
  }
}

async function remove(row: PositionDTO) {
  await ElMessageBox.confirm(`确认删除岗位“${row.name}”吗？`, '删除岗位', {
    type: 'warning',
    confirmButtonText: '确定',
    cancelButtonText: '取消'
  })

  await deletePosition(row.id!)
  ElMessage.success('岗位已删除')
  await load()
}

onMounted(() => {
  void load()
})
</script>

<style scoped>
.positions-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-head h3 {
  margin: 0;
}

.page-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 13px;
}

.form-card :deep(.el-card__body) {
  padding-bottom: 6px;
}

.ops {
  gap: 8px 0;
}
</style>
