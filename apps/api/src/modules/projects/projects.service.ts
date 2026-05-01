import { ProjectRole } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { notFound, conflict, forbidden } from '../../lib/errors.js'
import { paginate, paginatedResponse, PaginationParams } from '../../lib/pagination.js'

const projectSelect = {
  id: true, name: true, slug: true, description: true,
  color: true, icon: true, isActive: true, createdAt: true,
  createdBy: { select: { id: true, name: true } },
  _count: { select: { tasks: true, members: true } },
}

export async function listProjects(params: PaginationParams & { isActive?: boolean }) {
  const where = {
    deletedAt: null,
    ...(params.isActive !== undefined && { isActive: params.isActive }),
  }
  const [data, total] = await Promise.all([
    prisma.project.findMany({ where, select: projectSelect, orderBy: { name: 'asc' }, ...paginate(params) }),
    prisma.project.count({ where }),
  ])
  return paginatedResponse(data, total, params)
}

export async function getProject(id: string) {
  const project = await prisma.project.findFirst({
    where: { id, deletedAt: null },
    include: {
      createdBy: { select: { id: true, name: true } },
      members: { include: { user: { select: { id: true, name: true, email: true, role: true, department: true, avatar: true } } } },
      _count: { select: { tasks: true } },
    },
  })
  if (!project) throw notFound('Proyecto')
  return project
}

export async function createProject(data: {
  name: string; slug: string; description?: string; color?: string; icon?: string; createdById: string
}) {
  const existing = await prisma.project.findUnique({ where: { slug: data.slug } })
  if (existing) throw conflict(`El slug "${data.slug}" ya está en uso`)
  return prisma.project.create({ data, select: projectSelect })
}

export async function updateProject(id: string, data: Partial<{
  name: string; description: string; color: string; icon: string; isActive: boolean
}>) {
  const project = await prisma.project.findFirst({ where: { id, deletedAt: null } })
  if (!project) throw notFound('Proyecto')
  return prisma.project.update({ where: { id }, data, select: projectSelect })
}

export async function deleteProject(id: string) {
  const project = await prisma.project.findFirst({ where: { id, deletedAt: null } })
  if (!project) throw notFound('Proyecto')
  await prisma.project.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
}

export async function addMember(projectId: string, userId: string, role: ProjectRole = ProjectRole.MEMBER) {
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } })
  if (!project) throw notFound('Proyecto')
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } })
  if (!user) throw notFound('Usuario')

  return prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    update: { role },
    create: { projectId, userId, role },
  })
}

export async function removeMember(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({ where: { projectId_userId: { projectId, userId } } })
  if (!member) throw notFound('Miembro')
  await prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } })
}

export async function getProjectStats(projectId: string) {
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } })
  if (!project) throw notFound('Proyecto')

  const [byStatus, byPriority, byType, overdue] = await Promise.all([
    prisma.task.groupBy({ by: ['status'], where: { projectId, deletedAt: null }, _count: true }),
    prisma.task.groupBy({ by: ['priority'], where: { projectId, deletedAt: null }, _count: true }),
    prisma.task.groupBy({ by: ['type'], where: { projectId, deletedAt: null }, _count: true }),
    prisma.task.count({
      where: {
        projectId, deletedAt: null, dueDate: { lt: new Date() },
        status: { notIn: ['DONE', 'CANCELLED'] },
      },
    }),
  ])

  return { byStatus, byPriority, byType, overdue }
}
