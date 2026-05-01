import { FastifyInstance } from 'fastify'
import fs from 'fs'
import { Role } from '@prisma/client'
import { saveAttachment, listAttachments, getAttachmentFile, deleteAttachment } from './attachments.service.js'
import { AppError } from '../../lib/errors.js'

function handleError(err: unknown, reply: any) {
  if (err instanceof AppError) return reply.status(err.statusCode).send({ error: err.message, code: err.code })
  throw err
}

export async function attachmentsRoutes(fastify: FastifyInstance) {
  fastify.get('/tasks/:taskId/attachments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string }
      return reply.send(await listAttachments(taskId))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.post('/tasks/:taskId/attachments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { taskId } = request.params as { taskId: string }
      const actor = request.user as { sub: string }
      const data = await request.file()
      if (!data) return reply.status(400).send({ error: 'No se recibió ningún archivo', code: 'BAD_REQUEST' })

      const chunks: Buffer[] = []
      for await (const chunk of data.file) chunks.push(chunk)
      const buffer = Buffer.concat(chunks)

      const att = await saveAttachment(taskId, actor.sub, data.filename, data.mimetype, buffer)
      return reply.status(201).send(att)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/tasks/:taskId/attachments/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { taskId: string; id: string }
      const { att, absPath } = await getAttachmentFile(id)
      reply.header('Content-Type', att.mimeType)
      reply.header('Content-Disposition', `attachment; filename="${encodeURIComponent(att.filename)}"`)
      reply.header('Content-Length', att.fileSize)
      return reply.send(fs.createReadStream(absPath))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/tasks/:taskId/attachments/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { taskId: string; id: string }
      const actor = request.user as { sub: string; role: Role }
      await deleteAttachment(id, actor.sub, actor.role)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })
}
