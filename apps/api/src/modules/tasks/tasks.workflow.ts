import { TaskStatus, Role } from '@prisma/client'
import { forbidden, badRequest } from '../../lib/errors.js'

type Transition = {
  from: TaskStatus
  to: TaskStatus
  allowedRoles: Role[]
  requiresComment?: boolean
}

const TRANSITIONS: Transition[] = [
  { from: TaskStatus.OPEN, to: TaskStatus.IN_PROGRESS, allowedRoles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
  { from: TaskStatus.OPEN, to: TaskStatus.CANCELLED, allowedRoles: [Role.ADMIN, Role.MANAGER] },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.REVIEW, allowedRoles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.BLOCKED, allowedRoles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.DONE, allowedRoles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.CANCELLED, allowedRoles: [Role.ADMIN, Role.MANAGER], requiresComment: true },
  { from: TaskStatus.REVIEW, to: TaskStatus.DONE, allowedRoles: [Role.ADMIN, Role.MANAGER] },
  { from: TaskStatus.REVIEW, to: TaskStatus.IN_PROGRESS, allowedRoles: [Role.ADMIN, Role.MANAGER] },
  { from: TaskStatus.REVIEW, to: TaskStatus.CANCELLED, allowedRoles: [Role.ADMIN, Role.MANAGER], requiresComment: true },
  { from: TaskStatus.BLOCKED, to: TaskStatus.IN_PROGRESS, allowedRoles: [Role.ADMIN, Role.MANAGER, Role.OPERATOR] },
  { from: TaskStatus.BLOCKED, to: TaskStatus.CANCELLED, allowedRoles: [Role.ADMIN, Role.MANAGER], requiresComment: true },
  { from: TaskStatus.DONE, to: TaskStatus.IN_PROGRESS, allowedRoles: [Role.ADMIN, Role.MANAGER] },
]

export function validateTransition(
  from: TaskStatus,
  to: TaskStatus,
  role: Role,
  comment?: string,
) {
  if (from === to) throw badRequest(`La tarea ya está en estado "${to}"`)

  const transition = TRANSITIONS.find((t) => t.from === from && t.to === to)
  if (!transition) throw badRequest(`Transición de "${from}" a "${to}" no permitida`)
  if (!transition.allowedRoles.includes(role)) throw forbidden(`Tu rol no puede realizar esta transición`)
  if (transition.requiresComment && !comment?.trim()) {
    throw badRequest(`Se requiere un comentario para cancelar una tarea`)
  }
}

export function getAvailableTransitions(status: TaskStatus, role: Role): TaskStatus[] {
  return TRANSITIONS
    .filter((t) => t.from === status && t.allowedRoles.includes(role))
    .map((t) => t.to)
}
