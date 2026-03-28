<template>
  <div class="user-page">
    <h1>用户管理</h1>
    <section class="toolbar">
      <input v-model="keyword" placeholder="搜索用户名" />
      <button @click="load">查询</button>
      <button @click="showDialog = true">新建用户</button>
    </section>
    <table v-if="users.length" class="users">
      <thead>
        <tr>
          <th>ID</th>
          <th>用户名</th>
          <th>邮箱</th>
          <th>状态</th>
          <th>创建时间</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="user in users" :key="user.id">
          <td>{{ user.id }}</td>
          <td>{{ user.username }}</td>
          <td>{{ user.email || '-' }}</td>
          <td>{{ user.is_active ? '启用' : '禁用' }}</td>
          <td>{{ user.created_at }}</td>
          <td>
            <button @click="toggle(user)">{{ user.is_active ? '禁用' : '启用' }}</button>
            <button @click="resetPwd(user.id)">重置密码</button>
            <button @click="remove(user.id)">删除</button>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无用户</p>
    <div v-if="showDialog" class="dialog">
      <h3>新建用户</h3>
      <label>用户名：<input v-model="form.username" /></label>
      <label>密码：<input v-model="form.password" type="password" /></label>
      <label>邮箱：<input v-model="form.email" /></label>
      <button @click="save">保存</button>
      <button @click="close">取消</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { createUser, deleteUser, disableUser, enableUser, fetchUsers, updatePassword } from '@/api/userAdmin'
import type { User } from '@/types/user'

const users = ref<User[]>([])
const showDialog = ref(false)
const form = ref({ username: '', password: '', email: '' })
const keyword = ref('')

async function load() {
  const result = await fetchUsers()
  const list = result.list
  users.value = keyword.value.trim()
    ? list.filter(user => user.username.includes(keyword.value.trim()))
    : list
}

function close() {
  showDialog.value = false
  form.value = { username: '', password: '', email: '' }
}

async function save() {
  await createUser({ ...form.value })
  close()
  await load()
}

async function toggle(user: User) {
  if (user.is_active) await disableUser(user.id)
  else await enableUser(user.id)
  await load()
}

async function resetPwd(id: number) {
  await updatePassword(id, '123456')
}

async function remove(id: number) {
  if (!window.confirm(`确认删除用户 #${id} 吗？该操作不可恢复。`)) return
  await deleteUser(id)
  await load()
}

onMounted(load)
</script>

<style scoped>
.user-page { padding: 16px; }
.toolbar { margin-bottom: 12px; display: flex; gap: 8px; align-items: center; }
.users { width: 100%; border-collapse: collapse; }
.users th, .users td { border: 1px solid #ddd; padding: 6px 8px; }
.empty { color: #888; }
.dialog { position: fixed; top: 30%; left: 50%; transform: translate(-50%, -30%); background: #fff; border: 1px solid #ccc; padding: 24px; z-index: 1000; }
</style>
