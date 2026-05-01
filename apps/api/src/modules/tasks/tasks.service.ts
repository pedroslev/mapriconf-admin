import { TaskStatus, Priority, TaskType, Role } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { notFound, forbidden } from '../../lib/errors.js'
import { paginate, paginatedResponse, PaginationParams } from '../../lib/pagination.js'
import { validateTransition } from './tasks.workflow.js'

const taskInclude = {
  project: { select: { id: true, name: true, color: true, slug: true } },
  assignedTo: { select: { id: true, name: true, email: true, avatar: true } },
  createdBy: { select: { id: true, name: true, email: true, avatar: true } },
  _count: { select: { comments: true, attachments: true } },
}

type ListTasksParams = PaginationParams & {
  projectId?: string
  status?: TaskStatus
  priority?: Priority
  type?: TaskType
  assignedToId?: string
  search?: string
  dueBefore?: Date
  dueAfter?: Date
}

export async function listTasks(params: ListTasksParams) {
  const where = {
    deletedAt: null,
    ...(params.projectId && { projectId: params.projectId }),
    ...(params.status && { status: params.status }),
    ...(params.priority && { priority: params.priority }),
    ...(params.type && { type: params.type }),
    ...(params.assignedToId && { assignedToId: params.assignedToId }),
    ...(params.dueBefore && { dueDate: { lte: params.dueBefore } }),
    ...(params.dueAfter && { dueDate: { gte: params.dueAfter } }),
    ...(params.search && {
      OR: [
        { title: { contains: params.search, mode: 'insensitive' as const } },
        { description: { contains: params.search, mode: 'insensitive' as const } },
        { displayId: { contains: params.search, mode: 'insensitive' as const } },
        { customerName: { contains: params.search, mode: 'insensitive' as const } },
      ],
    }),
  }

  const [data, total] = await Promise.all([
    prisma.task.findMany({ where, include: taskInclude, orderBy: { updatedAt: 'desc' }, ...paginate(params) }),
    prisma.task.count({ where }),
  ])
  return paginatedResponse(data, total, params)
}

export async function getTask(id: string) {
  const task = await prisma.task.findFirst({
    where: { id, deletedAt: null },
    include: {
      ...taskInclude,
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, avatar: true } } },
      },
      attachments: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
    },
  })
  if (!task) throw notFound('Tarea')
  return task
}

export async function createTask(
  data: {
    title: string; description?: string; priority: Priority; type: TaskType
    dueDate?: Date; estimatedHours?: number; assignedToId?: string
    customerName?: string; customerCuit?: string; routeCode?: string; vehiclePlate?: string
  },
  projectId: string,
  createdById: string,
) {
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } })
  if (!project) throw notFound('Proyecto')

  const maxTask = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { taskNumber: 'desc' },
    select: { taskNumber: true },
  })
  const taskNumber = (maxTask?.taskNumber ?? 0) + 1
  const displayId = `${project.slug.toUpperCase().substring(0, 3)}-${taskNumber}`

  return prisma.task.create({
    data: { ...data, projectId, createdById, taskNumber, displayId },
    include: taskInclude,
  })
}

export async function updateTask(
  id: string,
  actorId: string,
  actorRole: Role,
  data: Partial<{
    title: string; description: string; priority: Priority; type: TaskType
    dueDate: Date | null; estimatedHours: number | null; assignedToId: string | null
    customerName: string; customerCuit: string; routeCode: string; vehiclePlate: string
  }>,
) {
  const task = await prisma.task.findFirst({ where: { id, deletedAt: null } })
  if (!task) throw notFound('Tarea')

  if (actorRole === Role.OPERATOR && task.createdById !== actorId && task.assignedToId !== actorId) {
    throw forbidden('Solo podés editar tareas que creaste o que te fueron asignadas')
  }

  return prisma.task.update({ where: { id }, data, include: taskInclude })
}

export async function changeTaskStatus(
  id: string,
  toStatus: TaskStatus,
  actorId: string,
  actorRole: Role,
  comment?: string,
) {
  const task = await prisma.task.findFirst({ where: { id, deletedAt: null } })
  if (!task) throw notFound('Tarea')

  if (actorRole === Role.OPERATOR && task.assignedToId !== actorId) {
    throw forbidden('Solo podés cambiar el estado de tareas asignadas a vos')
  }

  validateTransition(task.status, toStatus, actorRole, comment)

  const updates: Record<string, unknown> = { status: toStatus }
  if (toStatus === TaskStatus.IN_PROGRESS && !task.startedAt) updates.startedAt = new Date()
  if (toStatus === TaskStatus.DONE) updates.resolvedAt = new Date()

  const [updatedTask] = await prisma.$transaction(async (tx) => {
    const updated = await tx.task.update({ where: { id }, data: updates, include: taskInclude })

    await tx.activityLog.create({
      data: {
        entityType: 'task', entityId: id, taskId: id,
        action: 'task.status_changed',
        actorId, actorEmail: undefined,
        changes: { status: { from: task.status, to: toStatus } },
        ...(comment && { metadata: { comment } }),
      },
    })

    if (comment) {
      await tx.comment.create({ data: { content: comment, taskId: id, authorId: actorId } })
    }

    return [updated]
  })

  return updatedTask
}

export async function deleteTask(id: string, actorRole: Role) {
  const task = await prisma.task.findFirst({ where: { id, deletedAt: null } })
  if (!task) throw notFound('Tarea')
  await prisma.task.update({ where: { id }, data: { deletedAt: new Date() } })
}

export async function assignTask(id: string, assignedToId: string | null, actorId: string) {
  const task = await prisma.task.findFirst({ where: { id, deletedAt: null } })
  if (!task) throw notFound('Tarea')

  const updated = await prisma.task.update({
    where: { id },
    data: { assignedToId },
    include: taskInclude,
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'task', entityId: id, taskId: id,
      action: 'task.assigned',
      actorId,
      changes: { assignedToId: { from: task.assignedToId, to: assignedToId } },
    },
  })

  if (assignedToId && assignedToId !== task.assignedToId) {
    await prisma.notification.create({
      data: {
        recipientId: assignedToId,
        type: 'task.assigned',
        title: 'Nueva tarea asignada',
        body: `Se te asignó la tarea: ${task.title}`,
        entityType: 'task',
        entityId: id,
      },
    })
  }

  return updated
}

export async function getTaskActivity(id: string) {
  const task = await prisma.task.findFirst({ where: { id, deletedAt: null } })
  if (!task) throw notFound('Tarea')

  return prisma.activityLog.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'asc' },
    include: { actor: { select: { id: true, name: true, avatar: true } } },
  })
}

export async function watchTask(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } })
  if (!task) throw notFound('Tarea')
  return prisma.taskWatcher.upsert({
    where: { taskId_userId: { taskId, userId } },
    update: {},
    create: { taskId, userId },
  })
}

export async function unwatchTask(taskId: string, userId: string) {
  await prisma.taskWatcher.deleteMany({ where: { taskId, userId } })
}
