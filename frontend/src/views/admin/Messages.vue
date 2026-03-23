<template>
  <div>
    <h3>消息中心</h3>
    <el-table :data="msgs" size="small" style="width:100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="level" label="级别" width="100" />
      <el-table-column prop="createdAt" label="时间" width="180" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button size="small" type="primary" @click="markRead(row)">已读</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { listMessages, markMessageRead, type MessageDTO } from '@/api/messages'
const msgs = ref<MessageDTO[]>([])
const load = async()=>{ msgs.value = await listMessages() }
const markRead = async(m:MessageDTO)=>{ if (m.id == null) return; await markMessageRead(m.id); await load() }
onMounted(load)
</script>
