import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { paginationSchema, paginate, paginatedResponse } from '../../lib/pagination.js'

export async function notificationsRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const actor = request.user as { sub: string }
    const query = paginationSchema.extend({ unreadOnly: z.coerce.boolean().optional() }).parse(request.query)
    const where = {
      recipientId: actor.sub,
      ...(query.unreadOnly && { isRead: false }),
    }
    const [data, total] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(query) }),
      prisma.notification.count({ where }),
    ])
    return reply.send(paginatedResponse(data, total, query))
  })

  fastify.get('/unread-count', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const actor = request.user as { sub: string }
    const count = await prisma.notification.count({ where: { recipientId: actor.sub, isRead: false } })
    return reply.send({ count })
  })

  fastify.patch('/:id/read', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const actor = request.user as { sub: string }
    const { id } = request.params as { id: string }
    await prisma.notification.updateMany({
      where: { id, recipientId: actor.sub },
      data: { isRead: true, readAt: new Date() },
    })
    return reply.status(204).send()
  })

  fastify.patch('/read-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const actor = request.user as { sub: string }
    await prisma.notification.updateMany({
      where: { recipientId: actor.sub, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
    return reply.status(204).send()
  })

  fastify.delete('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const actor = request.user as { sub: string }
    const { id } = request.params as { id: string }
    await prisma.notification.deleteMany({ where: { id, recipientId: actor.sub } })
    return reply.status(204).send()
  })
}
