export type Role = 'ADMIN' | 'MANAGER' | 'OPERATOR'
export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'REVIEW' | 'BLOCKED' | 'DONE' | 'CANCELLED'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskType = 'INTERNAL' | 'INCIDENT' | 'ORDER' | 'PROJECT'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  department?: string
  phone?: string
  avatar?: string
  isActive: boolean
  createdAt: string
}

export interface Project {
  id: string
  name: string
  slug: string
  description?: string
  color: string
  icon?: string
  isActive: boolean
  createdAt: string
  createdBy: { id: string; name: string }
  _count: { tasks: number; members: number }
}

export interface Task {
  id: string
  displayId: string
  taskNumber: number
  title: string
  description?: string
  status: TaskStatus
  priority: Priority
  type: TaskType
  dueDate?: string
  estimatedHours?: number
  customerName?: string
  customerCuit?: string
  routeCode?: string
  vehiclePlate?: string
  project: { id: string; name: string; color: string; slug: string }
  assignedTo?: { id: string; name: string; email: string; avatar?: string }
  createdBy: { id: string; name: string; email: string; avatar?: string }
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  _count: { comments: number; attachments: number }
}

export interface Comment {
  id: string
  content: string
  isInternal: boolean
  taskId: string
  author: { id: string; name: string; avatar?: string }
  editedAt?: string
  createdAt: string
}

export interface Notification {
  id: string
  type: string
  title: string
  body?: string
  entityType?: string
  entityId?: string
  isRead: boolean
  readAt?: string
  createdAt: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

export interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
}
