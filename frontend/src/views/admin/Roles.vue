<template>
  <div>
    <h3>角色管理</h3>
    <div class="ops">
      <el-input v-model="form.name" placeholder="角色名称" style="width: 220px" />
      <el-input v-model="form.code" placeholder="角色编码" style="width: 180px" />
      <el-button type="primary" @click="create">新增</el-button>
    </div>
    <el-table :data="roles" size="small" style="width:100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="角色名" />
      <el-table-column prop="code" label="编码" width="140" />
      <el-table-column prop="remark" label="备注" />
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
import { createRole, deleteRole, listRoles } from '@/api/roles'
import type { RoleDTO } from '@/api/roles'

const roles = ref<RoleDTO[]>([])
const form = ref({ name: '', code: '' })

const load = async () => {
  roles.value = await listRoles()
}

const create = async () => {
  if (!form.value.name.trim() || !form.value.code.trim()) return
  await createRole({ ...form.value })
  form.value = { name: '', code: '' }
  await load()
}

const remove = async (id: number) => {
  if (!window.confirm(`确认删除角色 #${id} 吗？`)) return
  await deleteRole(id)
  await load()
}

onMounted(load)
</script>

<style scoped>
.ops { display: flex; gap: 8px; margin-bottom: 12px; }
</style>
