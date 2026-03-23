// 与后端之间的数据映射与适配
import type { LegacyQuestionType, SurveyForm } from '@/types/survey'

// 数字（编辑器内部 legacy） -> 后端字符串类型
export function mapLegacyTypeToServer(t: LegacyQuestionType | number): string {
  switch (Number(t)) {
    case 1: return 'input'      // 单项填空
    case 2: return 'textarea'   // 简答题
    case 3: return 'radio'      // 单选
    case 4: return 'checkbox'   // 多选
    case 7: return 'radio'      // 下拉（暂以单选存储）
    case 11: return 'ranking'   // 排序
    case 13: return 'upload'    // 文件上传
    case 14: return 'date'      // 日期
    case 8: return 'slider'     // 滑动条
    default: return 'input'
  }
}

// 后端字符串类型 -> 数字（编辑器内部 legacy）
export function mapServerTypeToLegacy(t: string): LegacyQuestionType {
  const m: Record<string, LegacyQuestionType> = {
    input: 1,
    textarea: 2,
    radio: 3,      // 下拉也归入 radio
    checkbox: 4,
    ranking: 11,
    upload: 13,
    date: 14,
    slider: 8,
  }
  return (m[String(t)] ?? 1) as LegacyQuestionType
}

// 可选：发送给后端时的整形（保持结构，主要是类型映射）
export function toServerPayload(form: SurveyForm) {
  return {
    ...form,
    questions: form.questions.map(q => ({
      ...q,
      type: mapLegacyTypeToServer(Number(q.type)),
    })),
  }
}

// 可选：从后端拉取后转为前端内部结构（类型映射）
export function fromServerPayload(form: any): SurveyForm {
  return {
    ...form,
    questions: (form.questions || []).map((q: any) => ({
      ...q,
      type: mapServerTypeToLegacy(q.type),
    })),
  }
}
