import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { TaskStatus, Priority, TaskType, Role } from '@prisma/client'
import { listTasks, getTask, createTask, updateTask, changeTaskStatus, deleteTask, assignTask, getTaskActivity, watchTask, unwatchTask } from './tasks.service.js'
import { requireManager } from '../../middleware/rbac.js'
import { AppError } from '../../lib/errors.js'
import { paginationSchema } from '../../lib/pagination.js'

const createTaskSchema = z.object({
  title: z.string().min(3).max(500),
  description: z.string().optional(),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  type: z.nativeEnum(TaskType).default(TaskType.INTERNAL),
  dueDate: z.coerce.date().optional(),
  estimatedHours: z.number().positive().optional(),
  assignedToId: z.string().optional(),
  customerName: z.string().optional(),
  customerCuit: z.string().optional(),
  routeCode: z.string().optional(),
  vehiclePlate: z.string().optional(),
})

const updateTaskSchema = createTaskSchema.partial()

const statusSchema = z.object({
  status: z.nativeEnum(TaskStatus),
  comment: z.string().optional(),
})

const assignSchema = z.object({
  assignedToId: z.string().nullable(),
})

const listQuerySchema = paginationSchema.extend({
  projectId: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  type: z.nativeEnum(TaskType).optional(),
  assignedToId: z.string().optional(),
  search: z.string().optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
})

function handleError(err: unknown, reply: any) {
  if (err instanceof AppError) return reply.status(err.statusCode).send({ error: err.message, code: err.code })
  throw err
}

export async function tasksRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    return reply.send(await listTasks(query))
  })

  fastify.get('/my', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const actor = request.user as { sub: string }
    const query = paginationSchema.parse(request.query)
    return reply.send(await listTasks({ ...query, assignedToId: actor.sub }))
  })

  fastify.get('/overdue', { preHandler: [requireManager] }, async (request, reply) => {
    const query = paginationSchema.parse(request.query)
    return reply.send(await listTasks({ ...query, dueBefore: new Date(), status: undefined }))
  })

  fastify.post('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const actor = request.user as { sub: string }
      const body = createTaskSchema.parse(request.body)
      const { projectId } = request.body as { projectId: string }
      if (!projectId) return reply.status(400).send({ error: 'projectId es requerido', code: 'BAD_REQUEST' })
      const task = await createTask(body, projectId, actor.sub)
      return reply.status(201).send(task)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      return reply.send(await getTask(id))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.patch('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const actor = request.user as { sub: string; role: Role }
      const body = updateTaskSchema.parse(request.body)
      return reply.send(await updateTask(id, actor.sub, actor.role, body))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.patch('/:id/status', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const actor = request.user as { sub: string; role: Role }
      const body = statusSchema.parse(request.body)
      return reply.send(await changeTaskStatus(id, body.status, actor.sub, actor.role, body.comment))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.patch('/:id/assign', { preHandler: [requireManager] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const actor = request.user as { sub: string }
      const body = assignSchema.parse(request.body)
      return reply.send(await assignTask(id, body.assignedToId, actor.sub))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/:id', { preHandler: [requireManager] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const actor = request.user as { role: Role }
      await deleteTask(id, actor.role)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/:id/activity', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      return reply.send(await getTaskActivity(id))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.post('/:id/watch', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const actor = request.user as { sub: string }
      return reply.status(201).send(await watchTask(id, actor.sub))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/:id/watch', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const actor = request.user as { sub: string }
      await unwatchTask(id, actor.sub)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })
}
