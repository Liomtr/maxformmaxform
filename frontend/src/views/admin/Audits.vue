<template>
  <div class="p">
    <h3>审计日志</h3>
    <div class="ops">
      <input v-model="q.username" placeholder="按用户过滤 (targetId)" />
      <input v-model="q.action" placeholder="动作 (create/update/delete/...)" />
      <input v-model="q.targetType" placeholder="对象类型 (user/...)" />
      <button @click="load">查询</button>
    </div>
    <table v-if="list.length" class="tbl">
      <thead>
        <tr>
          <th>时间</th>
          <th>操作者</th>
          <th>动作</th>
          <th>对象类型</th>
          <th>对象ID</th>
          <th>详情</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in list" :key="`${a.time || ''}${a.targetId || ''}${a.action}`">
          <td>{{ a.time ? a.time.replace('T',' ').slice(0,19) : '-' }}</td>
          <td>{{ a.actor }}</td>
          <td>{{ a.action }}</td>
          <td>{{ a.targetType }}</td>
          <td>{{ a.targetId || '-' }}</td>
          <td>{{ a.detail || '-' }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">暂无日志</p>
    <div class="pager" v-if="total>pageSize">
      <button :disabled="page===1" @click="page--; load()">上一页</button>
      <span>{{ page }}/{{ Math.ceil(total/pageSize) }}（共 {{ total }} 条）</span>
      <button :disabled="page*pageSize>=total" @click="page++; load()">下一页</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchAudits, type AuditLogDTO } from '@/api/audits'
const q = ref({ username:'', action:'', targetType:'' })
const list = ref<AuditLogDTO[]>([])
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const load = async()=>{ const result = await fetchAudits({ page:page.value, pageSize:pageSize.value, username:q.value.username, action:q.value.action, targetType:q.value.targetType }); list.value = result.list; total.value = result.total }
onMounted(load)
</script>
<style scoped>
.p { padding: 16px }
.ops { display:flex; gap:8px; margin-bottom: 12px }
.tbl { width: 100%; border-collapse: collapse }
.tbl th,.tbl td { border: 1px solid #ddd; padding: 6px 8px }
.empty { color:#888 }
.pager { margin-top: 10px; display:flex; gap:12px; align-items:center }
</style>
