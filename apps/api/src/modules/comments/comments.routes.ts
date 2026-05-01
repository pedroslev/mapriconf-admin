import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { listComments, createComment, updateComment, deleteComment } from './comments.service.js'
import { AppError } from '../../lib/errors.js'

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
})

function handleError(err: unknown, reply: any) {
  if (err instanceof AppError) return reply.status(err.statusCode).send({ error: err.message, code: err.code })
  throw err
}

export async function commentsRoutes(fastify: FastifyInstance) {
  fastify.get('/tasks/:taskId/comments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string }
      const actor = request.user as { role: Role }
      const canSeeInternal = actor.role !== Role.OPERATOR
      return reply.send(await listComments(taskId, canSeeInternal))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.post('/tasks/:taskId/comments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string }
      const actor = request.user as { sub: string; role: Role }
      const body = commentSchema.parse(request.body)
      const isInternal = body.isInternal && actor.role !== Role.OPERATOR
      const comment = await createComment(taskId, actor.sub, body.content, isInternal)
      return reply.status(201).send(comment)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.patch('/tasks/:taskId/comments/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { taskId: string; id: string }
      const actor = request.user as { sub: string; role: Role }
      const body = z.object({ content: z.string().min(1).max(5000) }).parse(request.body)
      return reply.send(await updateComment(id, actor.sub, actor.role, body.content))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/tasks/:taskId/comments/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { taskId: string; id: string }
      const actor = request.user as { sub: string; role: Role }
      await deleteComment(id, actor.sub, actor.role)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })
}
