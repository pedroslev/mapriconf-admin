import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { loginService, refreshService, logoutService, getMeService } from './auth.service.js'
import { AppError } from '../../lib/errors.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body)
    try {
      const result = await loginService(body.email, body.password, fastify)
      return reply.send(result)
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ error: err.message, code: err.code })
      throw err
    }
  })

  fastify.post('/refresh', async (request, reply) => {
    const body = refreshSchema.parse(request.body)
    try {
      const result = await refreshService(body.refreshToken, fastify)
      return reply.send(result)
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ error: err.message, code: err.code })
      throw err
    }
  })

  fastify.post('/logout', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const body = refreshSchema.safeParse(request.body)
    if (body.success) await logoutService(body.data.refreshToken)
    return reply.status(204).send()
  })

  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { sub: string }
    try {
      const me = await getMeService(user.sub)
      return reply.send(me)
    } catch (err) {
      if (err instanceof AppError) return reply.status(err.statusCode).send({ error: err.message, code: err.code })
      throw err
    }
  })
}
