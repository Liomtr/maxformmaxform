<template>
  <div class="admin-config-page" data-testid="admin-config-page">
    <el-card class="config-card" shadow="never">
      <template #header>
        <div class="card-header">
          <div>
            <h3>系统配置</h3>
            <p>管理员可在这里识别 AI Key 类型，并查看 AI 管理 JSON 协议、执行入口和执行账本。</p>
          </div>
          <div class="header-actions">
            <el-button :loading="loadingProtocol" @click="loadProtocol">刷新协议</el-button>
            <el-button type="primary" :disabled="!protocol" @click="fillExample">填充示例</el-button>
          </div>
        </div>
      </template>

      <div class="layout">
        <section class="panel panel-full">
          <div class="panel-head">
            <div>
              <div class="panel-title">AI Key 识别</div>
              <p class="panel-desc">仅在当前浏览器本地识别 Key 形态，不会自动提交到后端。</p>
            </div>
            <el-tag type="info" effect="light">Local Only</el-tag>
          </div>

          <div class="ai-key-layout">
            <div class="ai-key-form">
              <el-input
                v-model="aiKeyInput"
                type="password"
                show-password
                clearable
                placeholder="输入 AI API Key，例如 sk-proj-... / sk-ant-... / AIza..."
                data-testid="admin-config-ai-key-input"
              />
              <el-input
                v-model="aiApiBaseInput"
                clearable
                placeholder="可选：输入 API Base 辅助识别，例如 https://api.deepseek.com"
                data-testid="admin-config-ai-base-input"
              />

              <div class="ai-key-notes">
                <span>支持精确识别：OpenAI、Anthropic、Gemini、OpenRouter、百度千帆。</span>
                <span>兼容 OpenAI 风格的 `sk-` Key 会结合 API Base 做进一步判断。</span>
              </div>

              <div class="ai-config-form">
                <div class="panel-title">AI 接入配置</div>
                <el-select
                  v-model="aiProviderForm.providerId"
                  clearable
                  placeholder="选择平台"
                  data-testid="admin-config-provider-select"
                  @change="handleProviderPresetChange"
                >
                  <el-option
                    v-for="provider in AI_PROVIDERS"
                    :key="provider.id"
                    :label="provider.label"
                    :value="provider.id"
                  />
                </el-select>
                <el-input
                  v-model="aiProviderForm.providerLabel"
                  clearable
                  placeholder="平台显示名称，例如 OpenAI / DeepSeek"
                />
                <el-input
                  v-model="aiProviderForm.apiKey"
                  type="password"
                  show-password
                  clearable
                  placeholder="保存用 API Key"
                />
                <div v-if="systemConfig.provider.hasApiKey" class="saved-secret-hint">
                  已保存 Key：{{ systemConfig.provider.apiKeyMasked || '-' }}
                  <span>当前输入框留空时，保存将保留已存值。</span>
                </div>
                <el-input
                  v-model="aiProviderForm.apiBase"
                  clearable
                  placeholder="API Base"
                />
                <el-input
                  v-model="aiProviderForm.endpoint"
                  clearable
                  placeholder="Endpoint，例如 /v1/chat/completions"
                />
                <div class="model-select-group">
                  <el-select
                    v-model="aiProviderForm.model"
                    clearable
                    filterable
                    allow-create
                    default-first-option
                    reserve-keyword
                    :placeholder="modelSelectPlaceholder"
                    data-testid="admin-config-model-select"
                  >
                    <el-option
                      v-for="option in recommendedModelOptions"
                      :key="option.value"
                      :label="option.label"
                      :value="option.value"
                    >
                      <div class="model-option">
                        <span class="model-option-label">{{ option.label }}</span>
                        <span v-if="option.hint" class="model-option-hint">{{ option.hint }}</span>
                      </div>
                    </el-option>
                  </el-select>
                  <div class="field-hint">{{ modelFieldHint }}</div>
                </div>
                <el-input
                  v-model="aiProviderForm.note"
                  type="textarea"
                  :rows="3"
                  placeholder="备注，可选"
                />

                <div class="config-actions">
                  <el-button @click="applyRecognitionToForm" :disabled="!canApplyRecognition">
                    使用识别结果
                  </el-button>
                  <el-button :loading="testingConfig" @click="runAiProviderConnectionTest">
                    连接测试
                  </el-button>
                  <el-button type="primary" :loading="savingConfig" @click="saveAiProviderConfig">
                    保存配置
                  </el-button>
                </div>

                <div v-if="connectivityResult" class="connectivity-result" :class="{ ok: connectivityResult.ok, fail: !connectivityResult.ok }">
                  <strong>{{ connectivityResult.ok ? '测试通过' : '测试失败' }}</strong>
                  <span>{{ connectivityResult.message }}</span>
                  <span v-if="connectivityResult.requestUrl">请求地址：{{ connectivityResult.requestUrl }}</span>
                </div>

                <div class="config-meta">
                  <span>最后更新：{{ systemConfigUpdatedAtText }}</span>
                  <span>更新人：{{ systemConfig.updatedBy ?? '-' }}</span>
                </div>
              </div>
            </div>

            <div class="ai-key-result" data-testid="admin-config-ai-key-result">
              <template v-if="aiKeyRecognition.status === 'empty'">
                <div class="result-empty">
                  <div class="empty-title">等待输入 Key</div>
                  <div class="empty-text">输入 Key 后会自动识别平台、图标和推荐接入地址。</div>
                </div>
              </template>

              <template v-else>
                <div class="result-top">
                  <div v-if="aiKeyRecognition.provider" class="provider-chip">
                    <img :src="aiKeyRecognition.provider.icon" class="provider-icon" alt="" />
                    <div>
                      <div class="provider-name">{{ aiKeyRecognition.provider.label }}</div>
                      <div class="provider-platform">{{ aiKeyRecognition.provider.platform }}</div>
                    </div>
                  </div>
                  <div v-else class="provider-chip provider-chip-generic">
                    <div class="provider-fallback">{{ aiKeyRecognition.fallbackLabel }}</div>
                    <div>
                      <div class="provider-name">{{ aiKeyRecognition.title }}</div>
                      <div class="provider-platform">{{ aiKeyRecognition.subtitle }}</div>
                    </div>
                  </div>
                  <el-tag :type="recognitionStatusType(aiKeyRecognition.status)" effect="light">
                    {{ recognitionStatusLabel(aiKeyRecognition.status) }}
                  </el-tag>
                </div>

                <p class="recognition-text">{{ aiKeyRecognition.description }}</p>

                <div class="recognition-grid">
                  <div class="recognition-item">
                    <strong>Key 摘要</strong>
                    <span>{{ maskedAiKey }}</span>
                  </div>
                  <div class="recognition-item">
                    <strong>识别依据</strong>
                    <span>{{ aiKeyRecognition.reason }}</span>
                  </div>
                  <div class="recognition-item">
                    <strong>推荐 Base</strong>
                    <span>{{ aiKeyRecognition.apiBase || '-' }}</span>
                  </div>
                  <div class="recognition-item">
                    <strong>推荐 Endpoint</strong>
                    <span>{{ aiKeyRecognition.endpoint || '-' }}</span>
                  </div>
                </div>

                <div v-if="aiKeyRecognition.candidates?.length" class="candidate-list">
                  <div class="candidate-title">可能的平台</div>
                  <div class="candidate-grid">
                    <div v-for="candidate in aiKeyRecognition.candidates" :key="candidate.id" class="candidate-card">
                      <img :src="candidate.icon" class="candidate-icon" alt="" />
                      <div class="candidate-name">{{ candidate.label }}</div>
                      <div class="candidate-base">{{ candidate.apiBase }}</div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-title">AI 管理协议</div>
          <el-skeleton :loading="loadingProtocol" animated :rows="6">
            <template #default>
              <div v-if="protocol" class="protocol-meta">
                <el-tag type="danger">Admin Only</el-tag>
                <el-tag>{{ protocol.version }}</el-tag>
                <span class="meta-line">kind: {{ protocol.kind }}</span>
                <span class="meta-line">actions: {{ protocol.actions.length }}</span>
                <span class="meta-line">idempotency: {{ protocol.boundaries.idempotency }}</span>
              </div>
              <ul v-if="protocol?.notes?.length" class="note-list">
                <li v-for="note in protocol.notes" :key="note">{{ note }}</li>
              </ul>
              <pre v-if="protocolText" class="json-box">{{ protocolText }}</pre>
            </template>
          </el-skeleton>
        </section>

        <section ref="editorPanelRef" class="panel">
          <div class="panel-title">动作 JSON</div>
          <el-input
            v-model="actionText"
            type="textarea"
            :rows="18"
            placeholder="输入 management.action JSON"
          />
          <div class="action-row">
            <div class="action-row-left">
              <el-switch v-model="dryRun" active-text="Dry Run" inactive-text="Execute" />
              <span class="hint-text">执行失败记录回填时会自动重置幂等键。</span>
            </div>
            <div class="action-row-right">
              <el-button @click="fillExample" :disabled="!protocol">示例</el-button>
              <el-button type="primary" :loading="running" @click="submitAction">提交</el-button>
            </div>
          </div>
          <div class="panel-title">执行结果</div>
          <pre class="json-box result-box">{{ resultText }}</pre>
        </section>

        <section class="panel panel-full">
          <div class="ledger-header">
            <div>
              <div class="panel-title ledger-title">执行账本</div>
              <p class="ledger-summary">
                {{ executionSummary }}
              </p>
            </div>
            <div class="ledger-actions">
              <el-button :loading="exportingJson" @click="downloadLedger('json')">导出 JSON</el-button>
              <el-button :loading="exportingCsv" @click="downloadLedger('csv')">导出 CSV</el-button>
            </div>
          </div>

          <div class="ledger-filters">
            <el-input
              v-model="executionQuery.action"
              placeholder="按 action 过滤"
              clearable
              @keyup.enter="applyExecutionFilters"
            />
            <el-select v-model="executionQuery.status" placeholder="状态" clearable>
              <el-option label="completed" value="completed" />
              <el-option label="failed" value="failed" />
              <el-option label="pending" value="pending" />
            </el-select>
            <el-input
              v-model="executionQuery.actor_id"
              placeholder="Actor ID"
              clearable
              @keyup.enter="applyExecutionFilters"
            />
            <el-date-picker
              v-model="executionQuery.created_from"
              type="datetime"
              placeholder="开始时间"
              value-format="YYYY-MM-DDTHH:mm:ss[Z]"
              clearable
            />
            <el-date-picker
              v-model="executionQuery.created_to"
              type="datetime"
              placeholder="结束时间"
              value-format="YYYY-MM-DDTHH:mm:ss[Z]"
              clearable
            />
            <div class="filter-buttons">
              <el-button :loading="loadingExecutions" @click="applyExecutionFilters">查询</el-button>
              <el-button @click="resetExecutionFilters" :disabled="loadingExecutions || !hasExecutionFilters">
                重置
              </el-button>
            </div>
          </div>

          <el-table
            :data="executionRows"
            v-loading="loadingExecutions"
            stripe
            empty-text="暂无执行记录"
          >
            <el-table-column prop="id" label="ID" width="90" />
            <el-table-column prop="actorId" label="Actor" width="100" />
            <el-table-column prop="action" label="Action" min-width="180" />
            <el-table-column prop="status" label="状态" width="120">
              <template #default="{ row }">
                <el-tag :type="statusTagType(row.status)" effect="light">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="idempotencyKey" label="幂等键" min-width="220" />
            <el-table-column prop="errorCode" label="错误码" min-width="180" />
            <el-table-column prop="createdAt" label="创建时间" min-width="180">
              <template #default="{ row }">
                {{ formatDateTime(row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" fixed="right">
              <template #default="{ row }">
                <div class="table-actions">
                  <el-button link type="primary" @click="openExecutionDetail(row)">查看</el-button>
                  <el-button
                    v-if="row.status === 'failed'"
                    link
                    type="danger"
                    @click="backfillExecution(row)"
                  >
                    回填
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-row">
            <el-pagination
              background
              layout="total, sizes, prev, pager, next"
              :total="executionTotal"
              :current-page="executionPage"
              :page-size="executionPageSize"
              :page-sizes="[10, 20, 50, 100]"
              @current-change="handleExecutionPageChange"
              @size-change="handleExecutionPageSizeChange"
            />
          </div>
        </section>
      </div>
    </el-card>

    <el-drawer v-model="detailVisible" title="执行详情" size="50%">
      <template v-if="selectedExecution">
        <div class="detail-grid">
          <div class="detail-item"><strong>ID:</strong> {{ selectedExecution.id }}</div>
          <div class="detail-item"><strong>Actor:</strong> {{ selectedExecution.actorId ?? '-' }}</div>
          <div class="detail-item"><strong>Action:</strong> {{ selectedExecution.action }}</div>
          <div class="detail-item"><strong>Status:</strong> {{ selectedExecution.status }}</div>
          <div class="detail-item"><strong>Idempotency:</strong> {{ selectedExecution.idempotencyKey }}</div>
          <div class="detail-item"><strong>Created:</strong> {{ formatDateTime(selectedExecution.createdAt) }}</div>
          <div class="detail-item"><strong>Error Code:</strong> {{ selectedExecution.errorCode || '-' }}</div>
          <div class="detail-item"><strong>Error Message:</strong> {{ selectedExecution.errorMessage || '-' }}</div>
        </div>

        <div class="detail-toolbar">
          <el-button
            v-if="selectedExecution.status === 'failed'"
            type="danger"
            plain
            @click="backfillExecution(selectedExecution)"
          >
            回填失败请求到编辑器
          </el-button>
        </div>

        <div class="detail-section">
          <div class="panel-title">Request Payload</div>
          <pre class="json-box detail-box">{{ executionRequestText }}</pre>
        </div>
        <div class="detail-section">
          <div class="panel-title">Response Payload</div>
          <pre class="json-box detail-box">{{ executionResponseText }}</pre>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  exportManagementAiExecutions,
  getManagementAiProtocol,
  listManagementAiExecutions,
  runManagementAiAction,
  type ManagementActionRunResultDTO
} from '@/api/managementAi'
import {
  getSystemConfig,
  testSystemConfigConnection,
  updateSystemConfig,
  type AiProviderConfigDTO,
  type SystemConfigConnectivityResultDTO,
  type SystemConfigDTO
} from '@/api/systemConfig'
import type {
  ManagementActionEnvelopeDTO,
  ManagementActionProtocolDTO,
  ManagementAiExecutionDTO
} from '../../../../shared/management.contract.js'

type RecognitionStatus = 'empty' | 'exact' | 'heuristic' | 'ambiguous' | 'unknown'

interface AiProviderDefinition {
  id: string
  label: string
  platform: string
  icon: string
  apiBase: string
  endpoint: string
  recommendedModels?: AiModelOption[]
  exactMatchers?: RegExp[]
  baseUrlMatchers?: RegExp[]
}

interface AiModelOption {
  value: string
  label: string
  hint?: string
}

interface AiKeyRecognitionResult {
  status: RecognitionStatus
  title: string
  subtitle: string
  description: string
  reason: string
  fallbackLabel: string
  apiBase?: string
  endpoint?: string
  provider?: AiProviderDefinition
  candidates?: AiProviderDefinition[]
}

function getLobeIcon(name: string) {
  return `https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/dark/${name}.svg`
}

const AI_PROVIDERS: AiProviderDefinition[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    platform: 'OpenAI',
    icon: getLobeIcon('openai'),
    apiBase: 'https://api.openai.com',
    endpoint: '/v1/chat/completions',
    recommendedModels: [
      { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini', hint: '通用默认' },
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini', hint: '低成本' },
      { value: 'gpt-4.1', label: 'gpt-4.1', hint: '更高质量' },
      { value: 'gpt-4o', label: 'gpt-4o', hint: '多模态' }
    ],
    exactMatchers: [/^sk-proj-[A-Za-z0-9_-]{16,}$/i, /^sess-[A-Za-z0-9_-]{16,}$/i],
    baseUrlMatchers: [/api\.openai\.com/i, /openai\.com/i]
  },
  {
    id: 'anthropic',
    label: 'Claude / Anthropic',
    platform: 'Anthropic',
    icon: getLobeIcon('claude'),
    apiBase: 'https://api.anthropic.com',
    endpoint: '/v1/messages',
    recommendedModels: [
      { value: 'claude-3-5-haiku-latest', label: 'claude-3-5-haiku-latest', hint: '更快' },
      { value: 'claude-3-5-sonnet-latest', label: 'claude-3-5-sonnet-latest', hint: '通用默认' }
    ],
    exactMatchers: [/^sk-ant-[A-Za-z0-9_-]{16,}$/i],
    baseUrlMatchers: [/api\.anthropic\.com/i, /anthropic\.com/i]
  },
  {
    id: 'gemini',
    label: 'Gemini',
    platform: 'Google AI Studio',
    icon: getLobeIcon('gemini'),
    apiBase: 'https://generativelanguage.googleapis.com',
    endpoint: '/v1beta/models/*:generateContent',
    recommendedModels: [
      { value: 'gemini-2.0-flash', label: 'gemini-2.0-flash', hint: '通用默认' },
      { value: 'gemini-1.5-pro', label: 'gemini-1.5-pro', hint: '更强推理' }
    ],
    exactMatchers: [/^AIza[0-9A-Za-z\-_]{20,}$/],
    baseUrlMatchers: [/generativelanguage\.googleapis\.com/i, /googleapis\.com/i]
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    platform: 'OpenRouter',
    icon: getLobeIcon('openrouter'),
    apiBase: 'https://openrouter.ai/api',
    endpoint: '/v1/chat/completions',
    recommendedModels: [
      { value: 'openai/gpt-4o-mini', label: 'openai/gpt-4o-mini', hint: 'OpenAI 兼容' },
      { value: 'anthropic/claude-3.5-sonnet', label: 'anthropic/claude-3.5-sonnet', hint: '高质量' },
      { value: 'google/gemini-2.0-flash-001', label: 'google/gemini-2.0-flash-001', hint: '低延迟' }
    ],
    exactMatchers: [/^sk-or-v1-[A-Za-z0-9_-]{16,}$/i],
    baseUrlMatchers: [/openrouter\.ai/i]
  },
  {
    id: 'baidu',
    label: '百度千帆',
    platform: 'Baidu Qianfan',
    icon: getLobeIcon('ernie'),
    apiBase: 'https://qianfan.baidubce.com',
    endpoint: '/v2/chat/completions',
    recommendedModels: [
      { value: 'ERNIE-4.0-8K', label: 'ERNIE-4.0-8K', hint: '旗舰' },
      { value: 'ERNIE-3.5-8K', label: 'ERNIE-3.5-8K', hint: '常用' }
    ],
    exactMatchers: [/^bce-v3\/[A-Za-z0-9/+_=.-]{16,}$/i],
    baseUrlMatchers: [/baidubce\.com/i, /qianfan/i]
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    platform: 'DeepSeek',
    icon: getLobeIcon('deepseek'),
    apiBase: 'https://api.deepseek.com',
    endpoint: '/chat/completions',
    recommendedModels: [
      { value: 'deepseek-chat', label: 'deepseek-chat', hint: '通用默认' },
      { value: 'deepseek-reasoner', label: 'deepseek-reasoner', hint: '推理增强' }
    ],
    baseUrlMatchers: [/deepseek\.com/i]
  },
  {
    id: 'moonshot',
    label: 'Moonshot Kimi',
    platform: 'Moonshot',
    icon: getLobeIcon('moonshot'),
    apiBase: 'https://api.moonshot.cn',
    endpoint: '/v1/chat/completions',
    recommendedModels: [
      { value: 'moonshot-v1-8k', label: 'moonshot-v1-8k', hint: '轻量' },
      { value: 'moonshot-v1-32k', label: 'moonshot-v1-32k', hint: '通用默认' },
      { value: 'moonshot-v1-128k', label: 'moonshot-v1-128k', hint: '长上下文' }
    ],
    baseUrlMatchers: [/moonshot\.cn/i, /kimi/i]
  },
  {
    id: 'qwen',
    label: 'Qwen / 百炼',
    platform: 'DashScope',
    icon: getLobeIcon('qwen'),
    apiBase: 'https://dashscope.aliyuncs.com/compatible-mode',
    endpoint: '/v1/chat/completions',
    recommendedModels: [
      { value: 'qwen-turbo', label: 'qwen-turbo', hint: '低成本' },
      { value: 'qwen-plus', label: 'qwen-plus', hint: '通用默认' },
      { value: 'qwen-max', label: 'qwen-max', hint: '更强能力' }
    ],
    baseUrlMatchers: [/dashscope/i, /aliyuncs\.com/i]
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow',
    platform: 'SiliconFlow',
    icon: getLobeIcon('siliconflow'),
    apiBase: 'https://api.siliconflow.cn',
    endpoint: '/v1/chat/completions',
    recommendedModels: [
      { value: 'deepseek-ai/DeepSeek-V3', label: 'deepseek-ai/DeepSeek-V3', hint: '通用默认' },
      { value: 'Qwen/Qwen2.5-7B-Instruct', label: 'Qwen/Qwen2.5-7B-Instruct', hint: '轻量' },
      { value: 'THUDM/glm-4-9b-chat', label: 'THUDM/glm-4-9b-chat', hint: '开源' }
    ],
    baseUrlMatchers: [/siliconflow\.cn/i]
  },
  {
    id: 'zhipu',
    label: '智谱 AI',
    platform: 'BigModel',
    icon: getLobeIcon('zhipu'),
    apiBase: 'https://open.bigmodel.cn',
    endpoint: '/api/paas/v4/chat/completions',
    recommendedModels: [
      { value: 'glm-4-flash', label: 'glm-4-flash', hint: '低成本' },
      { value: 'glm-4-air', label: 'glm-4-air', hint: '通用默认' },
      { value: 'glm-4-plus', label: 'glm-4-plus', hint: '更高质量' }
    ],
    baseUrlMatchers: [/bigmodel\.cn/i, /zhipu/i]
  }
]

const GENERIC_SK_PROVIDER_IDS = ['openai', 'deepseek', 'moonshot', 'qwen', 'siliconflow']

function normalizeText(value?: string | null) {
  return String(value || '').trim()
}

function normalizeUrl(value?: string | null) {
  return normalizeText(value).toLowerCase()
}

function maskSecret(value?: string | null) {
  const normalized = normalizeText(value)
  if (!normalized) return '-'
  if (normalized.length <= 10) return normalized
  return `${normalized.slice(0, 6)}...${normalized.slice(-4)}`
}

function findProviderByBaseUrl(baseUrl: string) {
  if (!baseUrl) return null
  return AI_PROVIDERS.find(provider => provider.baseUrlMatchers?.some(matcher => matcher.test(baseUrl))) || null
}

function findProviderByExactKey(key: string) {
  if (!key) return null
  return AI_PROVIDERS.find(provider => provider.exactMatchers?.some(matcher => matcher.test(key))) || null
}

function getProvidersByIds(ids: string[]) {
  return ids
    .map(id => AI_PROVIDERS.find(provider => provider.id === id))
    .filter((provider): provider is AiProviderDefinition => Boolean(provider))
}

function createRecognitionResult(partial: Partial<AiKeyRecognitionResult>): AiKeyRecognitionResult {
  return {
    status: partial.status || 'unknown',
    title: partial.title || '未识别',
    subtitle: partial.subtitle || '未知平台',
    description: partial.description || '当前 Key 形态暂未命中已知平台规则。',
    reason: partial.reason || '未命中规则',
    fallbackLabel: partial.fallbackLabel || 'AI',
    apiBase: partial.apiBase,
    endpoint: partial.endpoint,
    provider: partial.provider,
    candidates: partial.candidates
  }
}

function recognizeAiKey(keyInput: string, baseUrlInput: string): AiKeyRecognitionResult {
  const key = normalizeText(keyInput)
  const baseUrl = normalizeUrl(baseUrlInput)

  if (!key) {
    return createRecognitionResult({
      status: 'empty',
      title: '等待输入',
      subtitle: '尚未开始识别',
      description: '输入 Key 后会在本地进行规则识别，并显示候选平台与建议地址。',
      reason: '未输入 Key',
      fallbackLabel: 'AI'
    })
  }

  const exactProvider = findProviderByExactKey(key)
  if (exactProvider) {
    return createRecognitionResult({
      status: 'exact',
      title: exactProvider.label,
      subtitle: exactProvider.platform,
      description: `已根据 Key 前缀精确识别为 ${exactProvider.label}。`,
      reason: '命中平台特征前缀',
      fallbackLabel: exactProvider.label.slice(0, 2).toUpperCase(),
      provider: exactProvider,
      apiBase: exactProvider.apiBase,
      endpoint: exactProvider.endpoint
    })
  }

  const baseMatchedProvider = findProviderByBaseUrl(baseUrl)
  if (baseMatchedProvider && /^sk-[A-Za-z0-9._-]{16,}$/i.test(key)) {
    return createRecognitionResult({
      status: 'heuristic',
      title: baseMatchedProvider.label,
      subtitle: baseMatchedProvider.platform,
      description: `当前 Key 为通用 OpenAI 兼容风格，已结合 API Base 识别为 ${baseMatchedProvider.label}。`,
      reason: 'Key 形态通用，Base URL 命中平台域名',
      fallbackLabel: baseMatchedProvider.label.slice(0, 2).toUpperCase(),
      provider: baseMatchedProvider,
      apiBase: baseMatchedProvider.apiBase,
      endpoint: baseMatchedProvider.endpoint
    })
  }

  if (/^[A-Za-z0-9]{16,}\.[A-Za-z0-9]{16,}$/i.test(key)) {
    const zhipuProvider = AI_PROVIDERS.find(provider => provider.id === 'zhipu')
    return createRecognitionResult({
      status: 'heuristic',
      title: zhipuProvider?.label || '智谱 AI',
      subtitle: zhipuProvider?.platform || 'BigModel',
      description: '当前 Key 呈现双段式 token 结构，较符合智谱 BigModel 的常见形态。',
      reason: '命中双段式 token 规则',
      fallbackLabel: 'ZP',
      provider: zhipuProvider,
      apiBase: zhipuProvider?.apiBase,
      endpoint: zhipuProvider?.endpoint
    })
  }

  if (/^sk-[A-Za-z0-9._-]{16,}$/i.test(key)) {
    const candidates = getProvidersByIds(GENERIC_SK_PROVIDER_IDS)
    return createRecognitionResult({
      status: 'ambiguous',
      title: '兼容 OpenAI 风格 Key',
      subtitle: '需要结合 Base URL 或平台信息进一步确认',
      description: '该 Key 形态被多个平台复用，单靠前缀无法精确区分。',
      reason: '命中通用 sk- 规则',
      fallbackLabel: 'SK',
      apiBase: baseMatchedProvider?.apiBase,
      endpoint: baseMatchedProvider?.endpoint,
      provider: baseMatchedProvider || undefined,
      candidates: baseMatchedProvider ? undefined : candidates
    })
  }

  if (baseMatchedProvider) {
    return createRecognitionResult({
      status: 'heuristic',
      title: baseMatchedProvider.label,
      subtitle: baseMatchedProvider.platform,
      description: `Key 前缀不具备明显特征，但 API Base 已指向 ${baseMatchedProvider.label}。`,
      reason: 'Base URL 命中平台域名',
      fallbackLabel: baseMatchedProvider.label.slice(0, 2).toUpperCase(),
      provider: baseMatchedProvider,
      apiBase: baseMatchedProvider.apiBase,
      endpoint: baseMatchedProvider.endpoint
    })
  }

  return createRecognitionResult({
    status: 'unknown',
    title: '未识别平台',
    subtitle: '未知或自定义接入',
    description: '当前 Key 未命中内置规则，可能是自定义网关、代理平台或尚未收录的模型服务。',
    reason: '未命中已知平台规则',
    fallbackLabel: '??'
  })
}

function recognitionStatusType(status: RecognitionStatus) {
  if (status === 'exact') return 'success'
  if (status === 'heuristic') return 'warning'
  if (status === 'ambiguous') return 'info'
  if (status === 'unknown') return 'danger'
  return 'info'
}

function recognitionStatusLabel(status: RecognitionStatus) {
  if (status === 'exact') return '精确识别'
  if (status === 'heuristic') return '启发识别'
  if (status === 'ambiguous') return '待确认'
  if (status === 'unknown') return '未识别'
  return '待输入'
}

function createEmptyProviderForm(): AiProviderConfigDTO {
  return {
    providerId: '',
    providerLabel: '',
    apiKey: '',
    apiBase: '',
    endpoint: '',
    model: '',
    note: ''
  }
}

const protocol = ref<ManagementActionProtocolDTO | null>(null)
const loadingProtocol = ref(false)
const running = ref(false)
const dryRun = ref(true)
const actionText = ref('')
const result = ref<ManagementActionRunResultDTO | null>(null)
const aiKeyInput = ref('')
const aiApiBaseInput = ref('')
const savingConfig = ref(false)
const testingConfig = ref(false)
const systemConfig = ref<SystemConfigDTO>({
  provider: createEmptyProviderForm(),
  updatedAt: null,
  updatedBy: null
})
const aiProviderForm = ref<AiProviderConfigDTO>(createEmptyProviderForm())
const connectivityResult = ref<SystemConfigConnectivityResultDTO | null>(null)

const loadingExecutions = ref(false)
const exportingJson = ref(false)
const exportingCsv = ref(false)
const executionRows = ref<ManagementAiExecutionDTO[]>([])
const executionTotal = ref(0)
const executionPage = ref(1)
const executionPageSize = ref(10)
const selectedExecution = ref<ManagementAiExecutionDTO | null>(null)
const detailVisible = ref(false)
const editorPanelRef = ref<HTMLElement | null>(null)
const executionQuery = ref({
  action: '',
  status: '',
  actor_id: '',
  created_from: '',
  created_to: ''
})

const protocolText = computed(() => formatJson(protocol.value, ''))
const resultText = computed(() => formatJson(result.value, '暂无结果'))
const executionRequestText = computed(() => formatJson(selectedExecution.value?.requestPayload ?? null, '暂无请求数据'))
const executionResponseText = computed(() => formatJson(selectedExecution.value?.responsePayload ?? null, '暂无响应数据'))
const hasExecutionFilters = computed(() => Object.values(executionQuery.value).some(Boolean))
const executionPageCount = computed(() => Math.max(1, Math.ceil(executionTotal.value / executionPageSize.value)))
const aiKeyRecognition = computed(() => recognizeAiKey(aiKeyInput.value, aiApiBaseInput.value))
const maskedAiKey = computed(() => maskSecret(aiKeyInput.value))
const canApplyRecognition = computed(() => aiKeyRecognition.value.status !== 'empty' && aiKeyRecognition.value.status !== 'unknown')
const activeModelProvider = computed(() => {
  const providerId = normalizeText(aiProviderForm.value.providerId)
  if (providerId) {
    return AI_PROVIDERS.find(provider => provider.id === providerId) || null
  }
  return aiKeyRecognition.value.provider || null
})
const recommendedModelOptions = computed(() => {
  const savedValue = normalizeText(aiProviderForm.value.model)
  const providerOptions = activeModelProvider.value?.recommendedModels || []
  if (!savedValue || providerOptions.some(option => option.value === savedValue)) {
    return providerOptions
  }
  return [
    { value: savedValue, label: `${savedValue}（当前值）`, hint: '当前配置' },
    ...providerOptions
  ]
})
const modelSelectPlaceholder = computed(() => {
  if (activeModelProvider.value) {
    return '选择推荐模型，或直接输入自定义模型'
  }
  return '可直接输入模型，或先选择平台查看推荐'
})
const modelFieldHint = computed(() => {
  const providerLabel = activeModelProvider.value?.label
  if (providerLabel && recommendedModelOptions.value.length) {
    return `已加载 ${providerLabel} 推荐模型，也支持直接输入自定义值。`
  }
  return '该字段不会限制自定义模型名，可直接输入供应商实际模型 ID。'
})
const systemConfigUpdatedAtText = computed(() => formatDateTime(systemConfig.value.updatedAt))
const executionSummary = computed(() => {
  if (!executionTotal.value) return '暂无执行记录'
  return `共 ${executionTotal.value} 条，当前第 ${executionPage.value} / ${executionPageCount.value} 页，每页 ${executionPageSize.value} 条`
})

function formatJson(value: unknown, fallback: string) {
  if (value === undefined || value === null || value === '') return fallback
  return JSON.stringify(value, null, 2)
}

function formatDateTime(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', { hour12: false })
}

function statusTagType(status?: string) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'danger'
  return 'warning'
}

function syncProviderForm(value?: Partial<AiProviderConfigDTO> | null) {
  aiProviderForm.value = {
    ...createEmptyProviderForm(),
    ...(value || {})
  }
}

function buildExecutionListParams() {
  return {
    page: executionPage.value,
    pageSize: executionPageSize.value,
    action: executionQuery.value.action || undefined,
    status: executionQuery.value.status || undefined,
    actor_id: executionQuery.value.actor_id || undefined,
    created_from: executionQuery.value.created_from || undefined,
    created_to: executionQuery.value.created_to || undefined
  }
}

function buildExecutionFilterParams() {
  const params = buildExecutionListParams()
  return {
    action: params.action,
    status: params.status,
    actor_id: params.actor_id,
    created_from: params.created_from,
    created_to: params.created_to
  }
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function createRetryIdempotencyKey(original?: string | null) {
  const seed = String(original || 'management-action').trim() || 'management-action'
  return `${seed}-retry-${Date.now()}`
}

function cloneActionEnvelope(value: unknown): ManagementActionEnvelopeDTO | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return JSON.parse(JSON.stringify(value)) as ManagementActionEnvelopeDTO
}

async function loadProtocol() {
  loadingProtocol.value = true
  try {
    protocol.value = await getManagementAiProtocol()
  } finally {
    loadingProtocol.value = false
  }
}

async function loadSystemConfig() {
  const data = await getSystemConfig()
  systemConfig.value = data
  syncProviderForm(data.provider)
}

async function loadExecutions(options: { resetPage?: boolean } = {}) {
  if (options.resetPage) {
    executionPage.value = 1
  }

  loadingExecutions.value = true
  try {
    const page = await listManagementAiExecutions(buildExecutionListParams())
    executionRows.value = page.list || []
    executionTotal.value = page.total || 0
    executionPage.value = page.page || executionPage.value
    executionPageSize.value = page.pageSize || executionPageSize.value
  } finally {
    loadingExecutions.value = false
  }
}

function fillExample() {
  const example = protocol.value?.actions?.[0]?.example
  if (!example) {
    ElMessage.warning('当前没有可用示例')
    return
  }

  const nextPayload: ManagementActionEnvelopeDTO = {
    ...example,
    idempotencyKey: example.idempotencyKey || `admin-${Date.now()}`,
    dryRun: dryRun.value
  }
  actionText.value = JSON.stringify(nextPayload, null, 2)
}

function applyRecognitionToForm() {
  const recognition = aiKeyRecognition.value
  const provider = recognition.provider
  if (!provider && recognition.status === 'unknown') {
    ElMessage.warning('当前识别结果不足以回填配置')
    return
  }

  aiProviderForm.value = {
    ...aiProviderForm.value,
    providerId: provider?.id || aiProviderForm.value.providerId,
    providerLabel: provider?.label || recognition.title || aiProviderForm.value.providerLabel,
    apiKey: normalizeText(aiKeyInput.value),
    apiBase: recognition.apiBase || normalizeText(aiApiBaseInput.value) || aiProviderForm.value.apiBase,
    endpoint: recognition.endpoint || aiProviderForm.value.endpoint
  }

  ElMessage.success('已将识别结果回填到配置表单')
}

function handleProviderPresetChange(providerId?: string) {
  const provider = AI_PROVIDERS.find(item => item.id === String(providerId || ''))
  if (!provider) return

  aiProviderForm.value = {
    ...aiProviderForm.value,
    providerId: provider.id,
    providerLabel: aiProviderForm.value.providerLabel || provider.label,
    apiBase: aiProviderForm.value.apiBase || provider.apiBase,
    endpoint: aiProviderForm.value.endpoint || provider.endpoint
  }
}

async function runAiProviderConnectionTest() {
  testingConfig.value = true
  connectivityResult.value = null
  try {
    const data = await testSystemConfigConnection({
      provider: {
        ...aiProviderForm.value
      }
    })
    connectivityResult.value = data
    ElMessage[data.ok ? 'success' : 'error'](data.message)
  } finally {
    testingConfig.value = false
  }
}

async function saveAiProviderConfig() {
  if (!normalizeText(aiProviderForm.value.apiKey) && !systemConfig.value.provider.hasApiKey) {
    ElMessage.warning('请先输入要保存的 API Key')
    return
  }

  savingConfig.value = true
  try {
    const data = await updateSystemConfig({
      provider: {
        ...aiProviderForm.value
      }
    })
    systemConfig.value = data
    syncProviderForm(data.provider)
    ElMessage.success('AI 接入配置已保存')
  } finally {
    savingConfig.value = false
  }
}

function parseActionText(): ManagementActionEnvelopeDTO | null {
  const raw = actionText.value.trim()
  if (!raw) {
    ElMessage.warning('请输入管理动作 JSON')
    return null
  }

  try {
    const parsed = JSON.parse(raw) as ManagementActionEnvelopeDTO
    return {
      ...parsed,
      dryRun: dryRun.value
    }
  } catch {
    ElMessage.error('管理动作 JSON 不是有效的 JSON')
    return null
  }
}

async function submitAction() {
  const payload = parseActionText()
  if (!payload) return

  running.value = true
  try {
    result.value = await runManagementAiAction(payload)
    ElMessage.success(result.value.executed ? '管理动作已执行' : 'Dry run 校验通过')
    await loadExecutions({ resetPage: true })
  } finally {
    running.value = false
  }
}

function openExecutionDetail(row: ManagementAiExecutionDTO) {
  selectedExecution.value = row
  detailVisible.value = true
}

async function backfillExecution(row: ManagementAiExecutionDTO) {
  const payload = cloneActionEnvelope(row.requestPayload)
  if (!payload) {
    ElMessage.warning('该记录没有可回填的请求体')
    return
  }

  if (row.status === 'failed') {
    payload.idempotencyKey = createRetryIdempotencyKey(payload.idempotencyKey)
  }

  dryRun.value = Boolean(payload.dryRun)
  actionText.value = JSON.stringify(payload, null, 2)
  detailVisible.value = false
  result.value = null

  ElMessage.success(row.status === 'failed' ? '已回填失败请求，并重置幂等键' : '已回填请求')

  await nextTick()
  editorPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function applyExecutionFilters() {
  await loadExecutions({ resetPage: true })
}

async function resetExecutionFilters() {
  executionQuery.value = {
    action: '',
    status: '',
    actor_id: '',
    created_from: '',
    created_to: ''
  }
  await loadExecutions({ resetPage: true })
}

async function handleExecutionPageChange(nextPage: number) {
  executionPage.value = nextPage
  await loadExecutions()
}

async function handleExecutionPageSizeChange(nextPageSize: number) {
  executionPageSize.value = nextPageSize
  await loadExecutions({ resetPage: true })
}

async function downloadLedger(format: 'json' | 'csv') {
  const target = format === 'json' ? exportingJson : exportingCsv
  if (target.value) return

  target.value = true
  try {
    const { blob, filename } = await exportManagementAiExecutions(format, buildExecutionFilterParams())
    triggerBrowserDownload(blob, filename)
    ElMessage.success(`执行账本已导出为 ${format.toUpperCase()}`)
  } finally {
    target.value = false
  }
}

onMounted(async () => {
  await loadSystemConfig()
  await loadProtocol()
  fillExample()
  await loadExecutions()
})
</script>

<style scoped>
.admin-config-page {
  padding: 20px;
}

.config-card {
  border-radius: 16px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.card-header h3 {
  margin: 0 0 6px;
  font-size: 20px;
}

.card-header p {
  margin: 0;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.panel {
  min-width: 0;
}

.panel-full {
  grid-column: 1 / -1;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.panel-title {
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.panel-desc {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 13px;
}

.ai-key-layout {
  display: grid;
  grid-template-columns: minmax(320px, 1.05fr) minmax(320px, 0.95fr);
  gap: 20px;
}

.ai-key-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ai-key-notes {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px 16px;
  border-radius: 12px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  line-height: 1.6;
}

.ai-config-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  background: #fff;
}

.saved-secret-hint {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.6;
}

.model-select-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-hint {
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}

.model-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.model-option-label {
  color: #0f172a;
}

.model-option-hint {
  flex: 0 0 auto;
  color: #64748b;
  font-size: 12px;
}

.config-actions {
  display: flex;
  gap: 12px;
}

.connectivity-result {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.6;
}

.connectivity-result.ok {
  background: #ecfdf5;
  color: #166534;
}

.connectivity-result.fail {
  background: #fef2f2;
  color: #b91c1c;
}

.config-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  color: #64748b;
  font-size: 12px;
}

.ai-key-result {
  min-height: 220px;
  padding: 18px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background:
    radial-gradient(circle at top right, rgba(148, 163, 184, 0.12), transparent 40%),
    linear-gradient(135deg, #ffffff, #f8fafc);
}

.result-empty {
  display: flex;
  min-height: 180px;
  flex-direction: column;
  justify-content: center;
  color: #64748b;
}

.empty-title {
  margin-bottom: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.empty-text {
  line-height: 1.7;
}

.result-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.provider-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.provider-chip-generic {
  align-items: flex-start;
}

.provider-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
}

.provider-fallback {
  display: inline-flex;
  width: 42px;
  height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: #e2e8f0;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
}

.provider-name {
  color: #0f172a;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.3;
}

.provider-platform {
  color: #64748b;
  font-size: 13px;
  line-height: 1.5;
}

.recognition-text {
  margin: 0 0 14px;
  color: #334155;
  line-height: 1.7;
}

.recognition-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.recognition-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.95);
  color: #334155;
  word-break: break-word;
}

.recognition-item strong {
  color: #0f172a;
  font-size: 12px;
}

.candidate-list {
  margin-top: 18px;
}

.candidate-title {
  margin-bottom: 10px;
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
}

.candidate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.candidate-card {
  padding: 12px;
  border-radius: 12px;
  background: #f8fafc;
}

.candidate-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 8px;
}

.candidate-name {
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
}

.candidate-base {
  margin-top: 4px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
}

.protocol-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.meta-line {
  color: #475569;
  font-size: 13px;
}

.note-list {
  margin: 0 0 12px;
  padding-left: 18px;
  color: #475569;
  line-height: 1.7;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 14px 0 20px;
}

.action-row-left,
.action-row-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hint-text {
  color: #64748b;
  font-size: 12px;
}

.ledger-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.ledger-title {
  margin-bottom: 4px;
}

.ledger-summary {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.ledger-actions {
  display: flex;
  gap: 12px;
}

.ledger-filters {
  display: grid;
  grid-template-columns: repeat(6, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.filter-buttons {
  display: flex;
  gap: 12px;
}

.json-box {
  margin: 0;
  padding: 14px;
  min-height: 220px;
  overflow: auto;
  border-radius: 12px;
  background: #0f172a;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.result-box {
  min-height: 180px;
}

.table-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-row {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.detail-item {
  color: #334155;
  word-break: break-word;
}

.detail-toolbar {
  margin-bottom: 20px;
}

.detail-section + .detail-section {
  margin-top: 20px;
}

.detail-box {
  min-height: 160px;
}

@media (max-width: 1180px) {
  .layout,
  .ai-key-layout {
    grid-template-columns: 1fr;
  }

  .ledger-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .card-header,
  .panel-head,
  .action-row,
  .ledger-header,
  .result-top {
    flex-direction: column;
    align-items: stretch;
  }

  .action-row-left,
  .action-row-right,
  .header-actions,
  .ledger-actions,
  .filter-buttons {
    width: 100%;
  }

  .action-row-right > *,
  .header-actions > *,
  .ledger-actions > *,
  .filter-buttons > *,
  .config-actions > * {
    flex: 1;
  }

  .recognition-grid,
  .detail-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .admin-config-page {
    padding: 12px;
  }

  .ledger-filters {
    grid-template-columns: 1fr;
  }

  .pagination-row {
    justify-content: center;
  }
}
</style>
