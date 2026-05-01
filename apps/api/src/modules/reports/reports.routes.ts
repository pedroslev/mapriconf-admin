import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getTasksSummary, getUserWorkload, getProjectProgress, getResolutionTime, getOverdueTasks, exportTasksCsv } from './reports.service.js'
import { requireManager } from '../../middleware/rbac.js'
import { AppError } from '../../lib/errors.js'

const dateRangeSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  projectId: z.string().optional(),
})

function handleError(err: unknown, reply: any) {
  if (err instanceof AppError) return reply.status(err.statusCode).send({ error: err.message, code: err.code })
  throw err
}

export async function reportsRoutes(fastify: FastifyInstance) {
  fastify.get('/summary', { preHandler: [requireManager] }, async (request, reply) => {
    const query = dateRangeSchema.parse(request.query)
    return reply.send(await getTasksSummary(query))
  })

  fastify.get('/workload', { preHandler: [requireManager] }, async (request, reply) => {
    return reply.send(await getUserWorkload())
  })

  fastify.get('/project-progress', { preHandler: [requireManager] }, async (request, reply) => {
    return reply.send(await getProjectProgress())
  })

  fastify.get('/resolution-time', { preHandler: [requireManager] }, async (request, reply) => {
    const query = dateRangeSchema.parse(request.query)
    return reply.send(await getResolutionTime(query))
  })

  fastify.get('/overdue', { preHandler: [requireManager] }, async (request, reply) => {
    return reply.send(await getOverdueTasks())
  })

  fastify.get('/export', { preHandler: [requireManager] }, async (request, reply) => {
    try {
      const query = dateRangeSchema.extend({ status: z.string().optional() }).parse(request.query)
      const csv = await exportTasksCsv(query)
      reply.header('Content-Type', 'text/csv; charset=utf-8')
      reply.header('Content-Disposition', `attachment; filename="tareas-${Date.now()}.csv"`)
      return reply.send(csv)
    } catch (err) {
      return handleError(err, reply)
    }
  })
}
