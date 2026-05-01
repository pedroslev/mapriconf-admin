import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Role } from '@prisma/client'
import { listUsers, getUser, createUser, updateUser, deleteUser, changePassword, getUserTasks } from './users.service.js'
import { requireAdmin, requireManager } from '../../middleware/rbac.js'
import { AppError } from '../../lib/errors.js'
import { paginationSchema } from '../../lib/pagination.js'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
  role: z.nativeEnum(Role),
  department: z.string().optional(),
  phone: z.string().optional(),
})

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  department: z.string().optional(),
  phone: z.string().optional(),
  isActive: z.boolean().optional(),
  role: z.nativeEnum(Role).optional(),
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

const listQuerySchema = paginationSchema.extend({
  role: z.nativeEnum(Role).optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().optional(),
})

function handleError(err: unknown, reply: any) {
  if (err instanceof AppError) return reply.status(err.statusCode).send({ error: err.message, code: err.code })
  throw err
}

export async function usersRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: [requireManager] }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query)
    return reply.send(await listUsers(query))
  })

  fastify.post('/', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const body = createUserSchema.parse(request.body)
      const user = await createUser(body)
      return reply.status(201).send(user)
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/:id', { preHandler: [requireManager] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      return reply.send(await getUser(id))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.patch('/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const actor = request.user as { sub: string; role: Role }
      const body = updateUserSchema.parse(request.body)

      if (actor.role !== Role.ADMIN && (body.role !== undefined || body.isActive !== undefined)) {
        return reply.status(403).send({ error: 'Solo admins pueden cambiar roles o estado activo', code: 'FORBIDDEN' })
      }
      if (actor.role === Role.OPERATOR && actor.sub !== id) {
        return reply.status(403).send({ error: 'Solo podés editar tu propio perfil', code: 'FORBIDDEN' })
      }

      return reply.send(await updateUser(id, body))
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.patch('/:id/password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const actor = request.user as { sub: string }
      if (actor.sub !== id) return reply.status(403).send({ error: 'Solo podés cambiar tu propia contraseña', code: 'FORBIDDEN' })
      const body = changePasswordSchema.parse(request.body)
      await changePassword(id, body.currentPassword, body.newPassword)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.delete('/:id', { preHandler: [requireAdmin] }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string }
      const actor = request.user as { sub: string }
      await deleteUser(id, actor.sub)
      return reply.status(204).send()
    } catch (err) {
      return handleError(err, reply)
    }
  })

  fastify.get('/:id/tasks', { preHandler: [requireManager] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const query = paginationSchema.parse(request.query)
    return reply.send(await getUserTasks(id, query))
  })
}
