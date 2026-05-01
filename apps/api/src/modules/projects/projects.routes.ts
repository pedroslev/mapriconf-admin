import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { ProjectRole } from '@prisma/client'
import { listProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember, getProjectStats } from './projects.service.js'
import { requireAdmin, requireManager } from '../../middleware/rbac.js'
import { AppError } from '../../lib/errors.js'
import { paginationSchema } from '../../lib/pagination.js'

const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Solo letras minúsculas, números y guiones'),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
})

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.nativeEnum(ProjectRole).optional(),
})

function handleError(err: unknown, reply: any) {
  if (err instanceof AppError) return reply.status(err.statusCode).send({ error: err.message, code: err.code })
  throw err
}

export async function projectsRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const query = paginationSchema.extend({ isActive: z.coerce.boolean().optional() }).parse(request.query)
    return reply.send(await listProjects(query))
  })

  fastify.post('/', { preHandler: [requireManager] }, async (request, reply) => {
    try {
      const actor = request.user as { sub: string }
      const body = createProjectSchema.parse(request.body)
      return reply.status(201).send(await createProject({ ...body, createdById: actor.sub }))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      return reply.send(await getProject(id))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/:id/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      return reply.send(await getProjectStats(id))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.patch('/:id', { preHandler: [requireManager] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = updateProjectSchema.parse(request.body)
      return reply.send(await updateProject(id, body))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      await deleteProject(id)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.post('/:id/members', { preHandler: [requireManager] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const body = addMemberSchema.parse(request.body)
      return reply.status(201).send(await addMember(id, body.userId, body.role))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/:id/members/:userId', { preHandler: [requireManager] }, async (request, reply) => {
    try {
      const { id, userId } = request.params as { id: string; userId: string }
      await removeMember(id, userId)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })
}
