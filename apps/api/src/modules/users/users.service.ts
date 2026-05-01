import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { notFound, conflict, forbidden } from '../../lib/errors.js'
import { paginate, paginatedResponse, PaginationParams } from '../../lib/pagination.js'

const userSelect = {
  id: true, email: true, name: true, role: true, department: true,
  phone: true, avatar: true, isActive: true, createdAt: true, updatedAt: true,
}

export async function listUsers(params: PaginationParams & { role?: Role; isActive?: boolean; search?: string }) {
  const where = {
    deletedAt: null,
    ...(params.role && { role: params.role }),
    ...(params.isActive !== undefined && { isActive: params.isActive }),
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: 'insensitive' as const } },
        { email: { contains: params.search, mode: 'insensitive' as const } },
        { department: { contains: params.search, mode: 'insensitive' as const } },
      ],
    }),
  }
  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, select: userSelect, orderBy: { name: 'asc' }, ...paginate(params) }),
    prisma.user.count({ where }),
  ])
  return paginatedResponse(data, total, params)
}

export async function getUser(id: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null }, select: userSelect })
  if (!user) throw notFound('Usuario')
  return user
}

export async function createUser(data: {
  email: string; name: string; password: string; role: Role; department?: string; phone?: string
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } })
  if (existing) throw conflict('El email ya está registrado')

  const hash = await bcrypt.hash(data.password, 10)
  return prisma.user.create({
    data: { ...data, email: data.email.toLowerCase(), password: hash },
    select: userSelect,
  })
}

export async function updateUser(id: string, data: Partial<{
  name: string; department: string; phone: string; avatar: string; isActive: boolean; role: Role
}>) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } })
  if (!user) throw notFound('Usuario')
  return prisma.user.update({ where: { id }, data, select: userSelect })
}

export async function changePassword(id: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } })
  if (!user) throw notFound('Usuario')

  const valid = await bcrypt.compare(currentPassword, user.password)
  if (!valid) throw forbidden('Contraseña actual incorrecta')

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id }, data: { password: hash } })
}

export async function deleteUser(id: string, requesterId: string) {
  if (id === requesterId) throw forbidden('No podés eliminarte a vos mismo')
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } })
  if (!user) throw notFound('Usuario')
  await prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } })
}

export async function getUserTasks(userId: string, params: PaginationParams) {
  const where = { assignedToId: userId, deletedAt: null }
  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where, orderBy: { updatedAt: 'desc' }, ...paginate(params),
      include: { project: { select: { id: true, name: true, color: true, slug: true } } },
    }),
    prisma.task.count({ where }),
  ])
  return paginatedResponse(data, total, params)
}
