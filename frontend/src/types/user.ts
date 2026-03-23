export interface User {
  id: number
  username: string
  email?: string
  role_id?: number
  dept_id?: number
  avatar?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
  nickname?: string
  role?: string
  status?: string
  isActive?: boolean
  deptId?: number
  positionId?: number
  createdAt?: string
  lockUntil?: string | null
  surveyCount?: number
  submissionCount?: number
}

export interface Role {
  id: number
  name: string
  code: string
  permissions?: string[]
  remark?: string
  created_at: string
}

export interface Dept {
  id: number
  name: string
  parent_id?: number
  sort_order: number
  created_at: string
  children?: Dept[]
  code?: string
  status?: string
}
