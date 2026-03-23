<template>
  <div>
    <h3>成员管理</h3>
    <div class="toolbar">
      <el-input v-model="keyword" placeholder="搜索用户名" style="width: 240px" />
      <el-button type="primary" @click="load">查询</el-button>
      <el-button @click="showCreate = true">新增成员</el-button>
    </div>

    <el-table :data="members" size="small" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="账号" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role_id" label="角色ID" width="100" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">{{ row.is_active ? '启用' : '禁用' }}</template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="toggle(row)">{{ row.is_active ? '禁用' : '启用' }}</el-button>
          <el-button size="small" @click="resetPwd(row.id)">重置密码</el-button>
          <el-button size="small" type="danger" @click="remove(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showCreate" title="新增成员" width="420px">
      <el-form label-width="90px">
        <el-form-item label="用户名">
          <el-input v-model="createForm.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="createForm.password" type="password" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="createForm.email" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" @click="create">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { createUser, deleteUser, disableUser, enableUser, fetchUsers, updatePassword } from '@/api/userAdmin'
import type { User } from '@/types/user'

const members = ref<User[]>([])
const keyword = ref('')
const showCreate = ref(false)
const createForm = ref({ username: '', password: '', email: '' })

const load = async () => {
  const result = await fetchUsers()
  const list = result.list || []
  members.value = keyword.value.trim()
    ? list.filter(user => user.username.includes(keyword.value.trim()))
    : list
}

const create = async () => {
  if (!createForm.value.username.trim() || !createForm.value.password.trim()) return
  await createUser({
    username: createForm.value.username.trim(),
    password: createForm.value.password,
    email: createForm.value.email.trim() || undefined
  })
  createForm.value = { username: '', password: '', email: '' }
  showCreate.value = false
  await load()
}

const toggle = async (user: User) => {
  if (user.is_active) await disableUser(user.id)
  else await enableUser(user.id)
  await load()
}

const resetPwd = async (id: number) => {
  await updatePassword(id, '123456')
  window.alert('密码已重置为 123456')
}

const remove = async (id: number) => {
  await deleteUser(id)
  await load()
}

onMounted(load)
</script>

<style scoped>
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
</style>
