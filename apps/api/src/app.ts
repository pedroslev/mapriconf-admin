import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import { env } from './lib/env.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { usersRoutes } from './modules/users/users.routes.js'
import { projectsRoutes } from './modules/projects/projects.routes.js'
import { tasksRoutes } from './modules/tasks/tasks.routes.js'
import { commentsRoutes } from './modules/comments/comments.routes.js'
import { reportsRoutes } from './modules/reports/reports.routes.js'
import { notificationsRoutes } from './modules/notifications/notifications.routes.js'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>
  }
}

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV === 'development' ? { transport: { target: 'pino-pretty' } } : true,
  })

  await app.register(helmet, { contentSecurityPolicy: false })

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
  })

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  })

  await app.register(multipart, {
    limits: { fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024 },
  })

  app.decorate('authenticate', async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ error: 'No autorizado', code: 'UNAUTHORIZED' })
    }
  })

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  await app.register(authRoutes, { prefix: '/api/auth' })
  await app.register(usersRoutes, { prefix: '/api/users' })
  await app.register(projectsRoutes, { prefix: '/api/projects' })
  await app.register(tasksRoutes, { prefix: '/api/tasks' })
  await app.register(commentsRoutes, { prefix: '/api' })
  await app.register(reportsRoutes, { prefix: '/api/reports' })
  await app.register(notificationsRoutes, { prefix: '/api/notifications' })

  app.setErrorHandler((error: { validation?: unknown; statusCode?: number; message?: string }, _request, reply) => {
    app.log.error(error)
    if (error.validation) {
      return reply.status(400).send({ error: 'Datos inválidos', details: error.validation, code: 'VALIDATION_ERROR' })
    }
    const statusCode = error.statusCode ?? 500
    return reply.status(statusCode).send({ error: error.message ?? 'Error interno del servidor', code: 'INTERNAL_ERROR' })
  })

  return app
}
