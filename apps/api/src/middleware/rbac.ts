import { FastifyRequest, FastifyReply } from 'fastify'
import { Role } from '@prisma/client'
import { forbidden } from '../lib/errors.js'

const ROLE_HIERARCHY: Record<Role, number> = {
  ADMIN: 3,
  MANAGER: 2,
  OPERATOR: 1,
}

export function requireRole(...roles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: 'No autorizado', code: 'UNAUTHORIZED' })
    }
    const userRole = (request.user as { role: Role }).role
    if (!roles.some((r) => ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[r])) {
      const err = forbidden()
      return reply.status(err.statusCode).send({ error: err.message, code: err.code })
    }
  }
}

export const requireAdmin = requireRole(Role.ADMIN)
export const requireManager = requireRole(Role.MANAGER)
export const requireOperator = requireRole(Role.OPERATOR)
