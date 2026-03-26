<template>
  <div class="question-chart">
    <div v-if="hasChartData" ref="chartRef" class="question-chart__surface"></div>
    <div v-else class="question-chart__empty">
      <strong>暂无可视化数据</strong>
      <p>{{ emptyMessage }}</p>
    </div>
    <p v-if="caption" class="question-chart__caption">{{ caption }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { echarts } from '@/utils/echarts'
import type {
  LegendComponentOption,
  SeriesOption,
  XAXisComponentOption,
  YAXisComponentOption
} from 'echarts'

type AnalysisChartMode = '表格' | '明细' | '饼状' | '条形' | '折线'
type QuestionType = string

interface QuestionOption {
  label: string
  count: number
  percentage: number
  avgRank?: number | null
  avgShare?: number | null
}

interface MatrixRowStat {
  label: string
  value: string
  totalAnswers: number
  options: QuestionOption[]
}

interface ChartQuestion {
  questionTitle: string
  questionTypeLabel: string
  sourceType?: string
  type: QuestionType
  totalAnswers?: number
  totalFiles?: number
  options?: QuestionOption[]
  distribution?: Record<string, number>
  avgValue?: number | null
  minValue?: number | null
  maxValue?: number | null
  rows?: MatrixRowStat[]
}

const props = defineProps<{
  question: ChartQuestion
  mode: AnalysisChartMode
}>()

const palette = ['#2563eb', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#14b8a6']
const chartRef = ref<HTMLDivElement | null>(null)

type ChartInstance = ReturnType<typeof echarts.init>

let chart: ChartInstance | null = null
let resizeObserver: ResizeObserver | null = null

const chartPayload = computed(() => buildChartPayload(props.question, props.mode))
const hasChartData = computed(() => chartPayload.value.series.length > 0)
const emptyMessage = computed(() => chartPayload.value.emptyMessage)
const caption = computed(() => chartPayload.value.caption)

function buildChartPayload(question: ChartQuestion, mode: AnalysisChartMode) {
  if (question.type === 'choice') {
    return buildChoicePayload(question, mode)
  }
  if (question.type === 'rating') {
    return buildRatingPayload(question, mode)
  }
  if (question.type === 'metric') {
    return buildMetricPayload(question, mode)
  }
  if (question.type === 'files') {
    return buildFilesPayload(question, mode)
  }
  if (question.type === 'matrix') {
    return buildMatrixPayload(question, mode)
  }
  if (question.type === 'ratio') {
    return buildRatioPayload(question, mode)
  }
  return {
    title: '',
    caption: '',
    emptyMessage: '当前题型暂不支持图表。',
    series: [] as SeriesOption[],
    xAxis: undefined as XAXisComponentOption | undefined,
    yAxis: undefined as YAXisComponentOption | undefined,
    legend: undefined as LegendComponentOption | undefined,
    tooltipFormatter: undefined as ((value: number) => string) | undefined
  }
}

function buildChoicePayload(question: ChartQuestion, mode: AnalysisChartMode) {
  const options = Array.isArray(question.options)
    ? question.options.filter(item => item?.label && Number.isFinite(Number(item.count)))
    : []
  if (options.length === 0) {
    return {
      title: '',
      caption: '',
      emptyMessage: '当前题目还没有有效选项样本。',
      series: [] as SeriesOption[],
      xAxis: undefined,
      yAxis: undefined,
      legend: undefined,
      tooltipFormatter: undefined
    }
  }

  const isRanking = question.sourceType === 'ranking'
  const rankingSeries = options.map(item => Number(item.avgRank ?? 0)).filter(value => value > 0)
  const chartValues = isRanking && mode !== '饼状' && rankingSeries.length
    ? options.map(item => Number(item.avgRank ?? 0))
    : options.map(item => Number(item.count || 0))
  const categories = options.map(item => item.label)
  const metricLabel = isRanking && mode !== '饼状' && rankingSeries.length ? '平均排序' : '选择人次'
  const tooltipFormatter = (value: number) => {
    if (isRanking && mode !== '饼状' && rankingSeries.length) {
      return `${formatNumber(value)} 位`
    }
    return `${formatNumber(value)} 人`
  }

  if (mode === '饼状') {
    return {
      title: '',
      caption: isRanking ? '排序题的饼图按入选人次展示，条形和折线视图显示平均排序。' : '',
      emptyMessage: '当前题目还没有有效选项样本。',
      series: [{
        type: 'pie',
        radius: ['34%', '72%'],
        center: ['50%', '48%'],
        minAngle: 3,
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#ffffff',
          borderWidth: 3
        },
        label: {
          color: '#334155',
          formatter: '{b}\n{d}%'
        },
        data: options.map((item, index) => ({
          name: item.label,
          value: Number(item.count || 0),
          itemStyle: { color: palette[index % palette.length] }
        }))
      }],
      xAxis: undefined,
      yAxis: undefined,
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#64748b', fontSize: 12 }
      },
      tooltipFormatter
    }
  }

  return {
    title: '',
    caption: isRanking && rankingSeries.length ? '数值越低表示该选项平均排序越靠前。' : '',
    emptyMessage: '当前题目还没有有效选项样本。',
    series: [{
      type: mode === '折线' ? 'line' : 'bar',
      smooth: mode === '折线',
      symbol: 'circle',
      symbolSize: 8,
      barMaxWidth: 42,
      data: chartValues,
      itemStyle: {
        color: mode === '折线' ? '#2563eb' : undefined,
        borderRadius: mode === '条形' ? [12, 12, 0, 0] : 0
      },
      lineStyle: { width: 3, color: '#2563eb' },
      areaStyle: mode === '折线'
        ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(37, 99, 235, 0.22)' },
              { offset: 1, color: 'rgba(37, 99, 235, 0.02)' }
            ])
          }
        : undefined
    }],
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#475569', interval: 0, rotate: categories.length > 5 ? 20 : 0 }
    },
    yAxis: {
      type: 'value',
      minInterval: isRanking && rankingSeries.length ? 0.1 : 1,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: {
        color: '#64748b',
        formatter: (value: number) => isRanking && rankingSeries.length ? `${value}` : formatNumber(value)
      },
      name: metricLabel,
      nameTextStyle: { color: '#94a3b8', padding: [0, 0, 6, 0] }
    },
    legend: undefined,
    tooltipFormatter
  }
}

function buildRatingPayload(question: ChartQuestion, mode: AnalysisChartMode) {
  const entries = Object.entries(question.distribution || {})
    .map(([key, value]) => ({
      label: key,
      value: Number(value || 0)
    }))
    .filter(item => item.label !== '' && Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => Number(a.label) - Number(b.label))

  if (entries.length === 0) {
    return {
      title: '',
      caption: '',
      emptyMessage: '当前题目还没有评分样本。',
      series: [] as SeriesOption[],
      xAxis: undefined,
      yAxis: undefined,
      legend: undefined,
      tooltipFormatter: undefined
    }
  }

  const tooltipFormatter = (value: number) => `${Number(value).toFixed(2)}%`
  if (mode === '饼状') {
    return {
      title: '',
      caption: '评分题的饼图按各分值占比展示。',
      emptyMessage: '当前题目还没有评分样本。',
      series: [{
        type: 'pie',
        radius: ['30%', '72%'],
        center: ['50%', '48%'],
        minAngle: 3,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#ffffff',
          borderWidth: 3
        },
        label: {
          color: '#334155',
          formatter: '{b}分\n{d}%'
        },
        data: entries.map((item, index) => ({
          name: item.label,
          value: Number(item.value.toFixed(2)),
          itemStyle: { color: palette[index % palette.length] }
        }))
      }],
      xAxis: undefined,
      yAxis: undefined,
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#64748b', fontSize: 12 }
      },
      tooltipFormatter
    }
  }

  return {
    title: '',
    caption: '',
    emptyMessage: '当前题目还没有评分样本。',
    series: [{
      type: mode === '折线' ? 'line' : 'bar',
      smooth: mode === '折线',
      symbol: 'circle',
      symbolSize: 8,
      barMaxWidth: 42,
      data: entries.map(item => item.value),
      lineStyle: { width: 3, color: '#f59e0b' },
      itemStyle: {
        color: mode === '折线' ? '#f59e0b' : '#f59e0b',
        borderRadius: mode === '条形' ? [12, 12, 0, 0] : 0
      },
      areaStyle: mode === '折线'
        ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245, 158, 11, 0.22)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.02)' }
            ])
          }
        : undefined
    }],
    xAxis: {
      type: 'category',
      data: entries.map(item => `${item.label}分`),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#475569' }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', formatter: (value: number) => `${value}%` },
      name: '占比',
      nameTextStyle: { color: '#94a3b8', padding: [0, 0, 6, 0] }
    },
    legend: undefined,
    tooltipFormatter
  }
}

function buildMetricPayload(question: ChartQuestion, mode: AnalysisChartMode) {
  const entries = [
    { label: '最小值', value: Number(question.minValue ?? NaN) },
    { label: '平均值', value: Number(question.avgValue ?? NaN) },
    { label: '最大值', value: Number(question.maxValue ?? NaN) }
  ].filter(item => Number.isFinite(item.value))

  if (entries.length === 0) {
    return {
      title: '',
      caption: '',
      emptyMessage: '当前题目还没有数值样本。',
      series: [] as SeriesOption[],
      xAxis: undefined,
      yAxis: undefined,
      legend: undefined,
      tooltipFormatter: undefined
    }
  }

  if (mode === '饼状') {
    return {
      title: '',
      caption: '数值题的饼图用于对比最小值、平均值与最大值。',
      emptyMessage: '当前题目还没有数值样本。',
      series: [{
        type: 'pie',
        radius: ['30%', '72%'],
        center: ['50%', '48%'],
        itemStyle: {
          borderRadius: 8,
          borderColor: '#ffffff',
          borderWidth: 3
        },
        label: {
          color: '#334155',
          formatter: '{b}\n{d}%'
        },
        data: entries.map((item, index) => ({
          name: item.label,
          value: item.value,
          itemStyle: { color: palette[index % palette.length] }
        }))
      }],
      xAxis: undefined,
      yAxis: undefined,
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#64748b', fontSize: 12 }
      },
      tooltipFormatter: (value: number) => formatNumber(value)
    }
  }

  return {
    title: '',
    caption: '',
    emptyMessage: '当前题目还没有数值样本。',
    series: [{
      type: mode === '折线' ? 'line' : 'bar',
      smooth: mode === '折线',
      symbol: 'circle',
      symbolSize: 8,
      barMaxWidth: 42,
      data: entries.map(item => item.value),
      lineStyle: { width: 3, color: '#0ea5e9' },
      itemStyle: {
        color: '#0ea5e9',
        borderRadius: mode === '条形' ? [12, 12, 0, 0] : 0
      },
      areaStyle: mode === '折线'
        ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(14, 165, 233, 0.22)' },
              { offset: 1, color: 'rgba(14, 165, 233, 0.02)' }
            ])
          }
        : undefined
    }],
    xAxis: {
      type: 'category',
      data: entries.map(item => item.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#475569' }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', formatter: (value: number) => formatNumber(value) },
      name: '数值',
      nameTextStyle: { color: '#94a3b8', padding: [0, 0, 6, 0] }
    },
    legend: undefined,
    tooltipFormatter: (value: number) => formatNumber(value)
  }
}

function buildRatioPayload(question: ChartQuestion, mode: AnalysisChartMode) {
  const options = Array.isArray(question.options)
    ? question.options
      .map(item => ({
        label: item?.label,
        value: Number(item?.avgShare ?? NaN)
      }))
      .filter(item => item.label && Number.isFinite(item.value))
    : []

  if (options.length === 0) {
    return {
      title: '',
      caption: '',
      emptyMessage: '当前比重题还没有有效样本。',
      series: [] as SeriesOption[],
      xAxis: undefined,
      yAxis: undefined,
      legend: undefined,
      tooltipFormatter: undefined
    }
  }

  if (mode === '饼状') {
    return {
      title: '',
      caption: '饼图按各选项平均占比分配展示。',
      emptyMessage: '当前比重题还没有有效样本。',
      series: [{
        type: 'pie',
        radius: ['28%', '74%'],
        center: ['50%', '48%'],
        minAngle: 3,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#ffffff',
          borderWidth: 3
        },
        label: {
          color: '#334155',
          formatter: '{b}\n{d}%'
        },
        data: options.map((item, index) => ({
          name: item.label,
          value: item.value,
          itemStyle: { color: palette[index % palette.length] }
        }))
      }],
      xAxis: undefined,
      yAxis: undefined,
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#64748b', fontSize: 12 }
      },
      tooltipFormatter: (value: number) => `${Number(value).toFixed(2)}%`
    }
  }

  return {
    title: '',
    caption: mode === '折线' ? '折线展示各选项平均占比。' : '',
    emptyMessage: '当前比重题还没有有效样本。',
    series: [{
      type: mode === '折线' ? 'line' : 'bar',
      smooth: mode === '折线',
      symbol: 'circle',
      symbolSize: 8,
      barMaxWidth: 42,
      data: options.map(item => item.value),
      lineStyle: { width: 3, color: '#0f766e' },
      itemStyle: {
        color: '#0f766e',
        borderRadius: mode === '条形' ? [12, 12, 0, 0] : 0
      },
      areaStyle: mode === '折线'
        ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(15, 118, 110, 0.22)' },
              { offset: 1, color: 'rgba(15, 118, 110, 0.02)' }
            ])
          }
        : undefined
    }],
    xAxis: {
      type: 'category',
      data: options.map(item => item.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#475569', interval: 0, rotate: options.length > 5 ? 18 : 0 }
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', formatter: (value: number) => `${value}%` },
      name: '平均占比',
      nameTextStyle: { color: '#94a3b8', padding: [0, 0, 6, 0] }
    },
    legend: undefined,
    tooltipFormatter: (value: number) => `${Number(value).toFixed(2)}%`
  }
}

function buildFilesPayload(question: ChartQuestion, mode: AnalysisChartMode) {
  const totalAnswers = Number(question.totalAnswers || 0)
  const totalFiles = Number(question.totalFiles || 0)
  if (totalAnswers <= 0 && totalFiles <= 0) {
    return {
      title: '',
      caption: '',
      emptyMessage: '当前题目还没有附件样本。',
      series: [] as SeriesOption[],
      xAxis: undefined,
      yAxis: undefined,
      legend: undefined,
      tooltipFormatter: undefined
    }
  }

  const averageFilesPerAnswer = totalAnswers > 0 ? Number((totalFiles / totalAnswers).toFixed(2)) : 0
  return {
    title: '',
    caption: mode === '饼状'
      ? `附件题按答卷数与文件数展示，人均上传 ${averageFilesPerAnswer} 个文件。`
      : `人均上传 ${averageFilesPerAnswer} 个文件。`,
    emptyMessage: '当前题目还没有附件样本。',
    series: [{
      type: mode === '折线' ? 'line' : 'bar',
      smooth: mode === '折线',
      symbol: 'circle',
      symbolSize: 8,
      barMaxWidth: 42,
      data: [totalAnswers, totalFiles],
      lineStyle: { width: 3, color: '#22c55e' },
      itemStyle: {
        color: '#22c55e',
        borderRadius: mode === '条形' || mode === '饼状' ? [12, 12, 0, 0] : 0
      },
      areaStyle: mode === '折线'
        ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(34, 197, 94, 0.22)' },
              { offset: 1, color: 'rgba(34, 197, 94, 0.02)' }
            ])
          }
        : undefined
    }],
    xAxis: {
      type: 'category',
      data: ['上传答卷', '附件总数'],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#475569' }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', formatter: (value: number) => formatNumber(value) },
      name: '数量',
      nameTextStyle: { color: '#94a3b8', padding: [0, 0, 6, 0] }
    },
    legend: undefined,
    tooltipFormatter: (value: number) => `${formatNumber(value)}`
  }
}

function buildMatrixPayload(question: ChartQuestion, mode: AnalysisChartMode) {
  const rows = Array.isArray(question.rows)
    ? question.rows.filter(row => row?.label && Array.isArray(row.options) && row.options.length > 0)
    : []

  if (rows.length === 0) {
    return {
      title: '',
      caption: '',
      emptyMessage: '当前矩阵题还没有有效样本。',
      series: [] as SeriesOption[],
      xAxis: undefined,
      yAxis: undefined,
      legend: undefined,
      tooltipFormatter: undefined
    }
  }

  const optionLabels = Array.from(new Set(rows.flatMap(row => row.options.map(option => option.label).filter(Boolean))))
  if (optionLabels.length === 0) {
    return {
      title: '',
      caption: '',
      emptyMessage: '当前矩阵题还没有有效样本。',
      series: [] as SeriesOption[],
      xAxis: undefined,
      yAxis: undefined,
      legend: undefined,
      tooltipFormatter: undefined
    }
  }

  if (mode === '饼状') {
    const aggregates = optionLabels.map(label => ({
      label,
      value: rows.reduce((sum, row) => {
        const matched = row.options.find(option => option.label === label)
        return sum + Number(matched?.count || 0)
      }, 0)
    })).filter(item => item.value > 0)

    return {
      title: '',
      caption: '矩阵题的饼图按所有行合并后的选项分布展示。',
      emptyMessage: '当前矩阵题还没有有效样本。',
      series: [{
        type: 'pie',
        radius: ['28%', '74%'],
        center: ['50%', '48%'],
        minAngle: 3,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#ffffff',
          borderWidth: 3
        },
        label: {
          color: '#334155',
          formatter: '{b}\n{d}%'
        },
        data: aggregates.map((item, index) => ({
          name: item.label,
          value: item.value,
          itemStyle: { color: palette[index % palette.length] }
        }))
      }],
      xAxis: undefined,
      yAxis: undefined,
      legend: {
        bottom: 0,
        icon: 'circle',
        textStyle: { color: '#64748b', fontSize: 12 }
      },
      tooltipFormatter: (value: number) => `${formatNumber(value)} 次`
    }
  }

  return {
    title: '',
    caption: mode === '折线' ? '每条线代表一个矩阵选项在各行中的分布变化。' : '',
    emptyMessage: '当前矩阵题还没有有效样本。',
    series: optionLabels.map((label, index) => ({
      name: label,
      type: mode === '折线' ? 'line' : 'bar',
      smooth: mode === '折线',
      symbol: 'circle',
      symbolSize: 7,
      barMaxWidth: 34,
      lineStyle: { width: 3, color: palette[index % palette.length] },
      itemStyle: {
        color: palette[index % palette.length],
        borderRadius: mode === '条形' ? [10, 10, 0, 0] : 0
      },
      areaStyle: mode === '折线'
        ? {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: hexToAlpha(palette[index % palette.length], 0.18) },
              { offset: 1, color: hexToAlpha(palette[index % palette.length], 0.02) }
            ])
          }
        : undefined,
      data: rows.map(row => {
        const matched = row.options.find(option => option.label === label)
        return Number(matched?.count || 0)
      })
    })),
    xAxis: {
      type: 'category',
      data: rows.map(row => row.label),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
      axisLabel: { color: '#475569', interval: 0, rotate: rows.length > 4 ? 18 : 0 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', formatter: (value: number) => formatNumber(value) },
      name: '人次',
      nameTextStyle: { color: '#94a3b8', padding: [0, 0, 6, 0] }
    },
    legend: {
      top: 0,
      icon: 'circle',
      textStyle: { color: '#64748b', fontSize: 12 }
    },
    tooltipFormatter: (value: number) => `${formatNumber(value)} 人`
  }
}

function renderChart() {
  if (!chartRef.value || !hasChartData.value) {
    disposeChart()
    return
  }

  chart = chart || echarts.init(chartRef.value)
  if (!chart) return
  const payload = chartPayload.value
  chart.setOption({
    animationDuration: 280,
    color: palette,
    grid: props.mode === '饼状' ? undefined : { top: payload.legend ? 48 : 20, right: 20, bottom: 36, left: 42 },
    tooltip: {
      trigger: props.mode === '饼状' ? 'item' : 'axis',
      valueFormatter: payload.tooltipFormatter
    },
    legend: payload.legend,
    xAxis: payload.xAxis,
    yAxis: payload.yAxis,
    series: payload.series
  })
}

function disposeChart() {
  chart?.dispose()
  chart = null
}

function resizeChart() {
  chart?.resize()
}

function syncResizeObserver() {
  resizeObserver?.disconnect()
  resizeObserver = null
  if (!chartRef.value || typeof ResizeObserver === 'undefined') return

  resizeObserver = new ResizeObserver(() => {
    resizeChart()
  })
  resizeObserver.observe(chartRef.value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value)
}

function hexToAlpha(color: string, alpha: number) {
  const hex = color.replace('#', '')
  if (hex.length !== 6) return color
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

onMounted(async () => {
  await nextTick()
  renderChart()
  syncResizeObserver()
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  disposeChart()
})

watch(
  () => [props.mode, props.question],
  async () => {
    await nextTick()
    renderChart()
    syncResizeObserver()
  },
  { deep: true }
)
</script>

<style scoped>
.question-chart {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-chart__surface {
  width: 100%;
  min-height: 320px;
  border-radius: 18px;
  border: 1px solid rgba(191, 219, 254, 0.8);
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.08), transparent 42%),
    linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
}

.question-chart__empty {
  min-height: 220px;
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(255, 255, 255, 0.96));
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #64748b;
}

.question-chart__empty strong {
  color: #0f172a;
  font-size: 16px;
}

.question-chart__empty p,
.question-chart__caption {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: #64748b;
}

.question-chart__caption {
  padding: 0 2px;
}

@media (max-width: 768px) {
  .question-chart__surface {
    min-height: 280px;
  }
}
</style>
