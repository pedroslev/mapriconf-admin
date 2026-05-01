import { Role } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { notFound, forbidden } from '../../lib/errors.js'

export async function listComments(taskId: string, includeInternal: boolean) {
  const task = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } })
  if (!task) throw notFound('Tarea')

  return prisma.comment.findMany({
    where: {
      taskId,
      deletedAt: null,
      ...(includeInternal ? {} : { isInternal: false }),
    },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, name: true, avatar: true, role: true } } },
  })
}

export async function createComment(
  taskId: string, authorId: string, content: string, isInternal = false
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } })
  if (!task) throw notFound('Tarea')

  const comment = await prisma.comment.create({
    data: { taskId, authorId, content, isInternal },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })

  await prisma.activityLog.create({
    data: {
      entityType: 'comment', entityId: comment.id, taskId,
      action: 'comment.added', actorId: authorId,
    },
  })

  const watchers = await prisma.taskWatcher.findMany({ where: { taskId } })
  const toNotify = watchers.filter((w) => w.userId !== authorId)
  if (toNotify.length > 0) {
    await prisma.notification.createMany({
      data: toNotify.map((w) => ({
        recipientId: w.userId,
        type: 'task.commented',
        title: 'Nuevo comentario en una tarea',
        body: `${task.title}: ${content.substring(0, 100)}`,
        entityType: 'task',
        entityId: taskId,
      })),
    })
  }

  return comment
}

export async function updateComment(commentId: string, authorId: string, role: Role, content: string) {
  const comment = await prisma.comment.findFirst({ where: { id: commentId, deletedAt: null } })
  if (!comment) throw notFound('Comentario')

  if (comment.authorId !== authorId) throw forbidden('Solo podés editar tus propios comentarios')

  const diffMs = Date.now() - comment.createdAt.getTime()
  if (role === Role.OPERATOR && diffMs > 10 * 60 * 1000) {
    throw forbidden('Solo podés editar comentarios dentro de los 10 minutos de creación')
  }

  return prisma.comment.update({
    where: { id: commentId },
    data: { content, editedAt: new Date() },
    include: { author: { select: { id: true, name: true, avatar: true } } },
  })
}

export async function deleteComment(commentId: string, actorId: string, role: Role) {
  const comment = await prisma.comment.findFirst({ where: { id: commentId, deletedAt: null } })
  if (!comment) throw notFound('Comentario')

  if (role === Role.OPERATOR && comment.authorId !== actorId) {
    throw forbidden('No podés eliminar comentarios de otros usuarios')
  }

  await prisma.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } })
}
