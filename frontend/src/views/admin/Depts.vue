<template>
  <div>
    <h3>部门管理</h3>
    <div class="ops">
      <el-input v-model="name" placeholder="部门名称" style="width: 240px" />
      <el-input v-model.number="parentId" placeholder="上级部门ID，可选" style="width: 180px" />
      <el-button type="primary" @click="create">新增</el-button>
    </div>
    <el-table :data="depts" size="small" style="width:100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="部门名称" />
      <el-table-column prop="parent_id" label="上级部门" width="120" />
      <el-table-column prop="sort_order" label="排序" width="100" />
      <el-table-column label="操作" width="120">
        <template #default="{ row }">
          <el-button size="small" type="danger" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { createDept, deleteDept, listDepts } from '@/api/depts'
import type { DeptDTO } from '@/api/depts'

const depts = ref<DeptDTO[]>([])
const name = ref('')
const parentId = ref<number | null>(null)

const load = async () => {
  depts.value = await listDepts()
}

const create = async () => {
  if (!name.value.trim()) return
  await createDept({ name: name.value.trim(), parent_id: parentId.value || undefined })
  name.value = ''
  parentId.value = null
  await load()
}

const remove = async (id: number) => {
  await deleteDept(id)
  await load()
}

onMounted(load)
</script>

<style scoped>
.ops { display: flex; gap: 8px; margin-bottom: 12px; }
</style>
