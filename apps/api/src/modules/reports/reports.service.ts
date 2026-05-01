import { prisma } from '../../lib/prisma.js'

interface DateRange {
  startDate?: Date
  endDate?: Date
  projectId?: string
}

export async function getTasksSummary(params: DateRange) {
  const where = {
    deletedAt: null,
    ...(params.projectId && { projectId: params.projectId }),
    ...(params.startDate && { createdAt: { gte: params.startDate } }),
    ...(params.endDate && { createdAt: { lte: params.endDate } }),
  }

  const [byStatus, byPriority, byType, total] = await Promise.all([
    prisma.task.groupBy({ by: ['status'], where, _count: { id: true } }),
    prisma.task.groupBy({ by: ['priority'], where, _count: { id: true } }),
    prisma.task.groupBy({ by: ['type'], where, _count: { id: true } }),
    prisma.task.count({ where }),
  ])

  return { total, byStatus, byPriority, byType }
}

export async function getUserWorkload() {
  const tasks = await prisma.task.groupBy({
    by: ['assignedToId'],
    where: { deletedAt: null, status: { notIn: ['DONE', 'CANCELLED'] }, assignedToId: { not: null } },
    _count: { id: true },
  })

  const userIds = tasks.map((t) => t.assignedToId!).filter(Boolean)
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, department: true, avatar: true },
  })

  return tasks.map((t) => ({
    user: users.find((u) => u.id === t.assignedToId) ?? null,
    openTasks: t._count.id,
  })).sort((a, b) => b.openTasks - a.openTasks)
}

export async function getProjectProgress() {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, isActive: true },
    select: { id: true, name: true, color: true, slug: true },
  })

  const result = await Promise.all(
    projects.map(async (p) => {
      const stats = await prisma.task.groupBy({
        by: ['status'],
        where: { projectId: p.id, deletedAt: null },
        _count: { id: true },
      })
      return { project: p, stats }
    }),
  )

  return result
}

export async function getResolutionTime(params: DateRange) {
  const tasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      resolvedAt: { not: null },
      status: 'DONE',
      ...(params.projectId && { projectId: params.projectId }),
      ...(params.startDate && { createdAt: { gte: params.startDate } }),
      ...(params.endDate && { createdAt: { lte: params.endDate } }),
    },
    select: { id: true, projectId: true, createdAt: true, resolvedAt: true,
      project: { select: { name: true, color: true } } },
  })

  const byProject: Record<string, { name: string; color: string; totalHours: number; count: number }> = {}

  for (const task of tasks) {
    if (!task.resolvedAt) continue
    const hours = (task.resolvedAt.getTime() - task.createdAt.getTime()) / 3600000
    if (!byProject[task.projectId]) {
      byProject[task.projectId] = { name: task.project.name, color: task.project.color, totalHours: 0, count: 0 }
    }
    byProject[task.projectId].totalHours += hours
    byProject[task.projectId].count++
  }

  return Object.entries(byProject).map(([projectId, data]) => ({
    projectId,
    projectName: data.name,
    projectColor: data.color,
    avgHours: data.count > 0 ? Math.round((data.totalHours / data.count) * 100) / 100 : 0,
    completedCount: data.count,
  }))
}

export async function getOverdueTasks() {
  return prisma.task.findMany({
    where: {
      deletedAt: null,
      dueDate: { lt: new Date() },
      status: { notIn: ['DONE', 'CANCELLED'] },
    },
    orderBy: { dueDate: 'asc' },
    include: {
      project: { select: { id: true, name: true, color: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  })
}

export async function exportTasksCsv(params: DateRange & { status?: string }) {
  const tasks = await prisma.task.findMany({
    where: {
      deletedAt: null,
      ...(params.projectId && { projectId: params.projectId }),
      ...(params.startDate && { createdAt: { gte: params.startDate } }),
      ...(params.endDate && { createdAt: { lte: params.endDate } }),
      ...(params.status && { status: params.status as any }),
    },
    include: {
      project: { select: { name: true } },
      assignedTo: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const header = 'ID,Proyecto,Título,Estado,Prioridad,Tipo,Asignado a,Creado por,Fecha creación,Fecha vencimiento,Cliente'
  const rows = tasks.map((t) =>
    [
      t.displayId,
      t.project.name,
      `"${t.title.replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.type,
      t.assignedTo?.name ?? '',
      t.createdBy.name,
      t.createdAt.toISOString().split('T')[0],
      t.dueDate?.toISOString().split('T')[0] ?? '',
      t.customerName ?? '',
    ].join(','),
  )

  return [header, ...rows].join('\n')
}
