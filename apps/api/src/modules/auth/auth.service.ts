import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma.js'
import { unauthorized, notFound } from '../../lib/errors.js'
import { env } from '../../lib/env.js'
import type { FastifyInstance } from 'fastify'

export async function loginService(email: string, password: string, fastify: FastifyInstance) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, email: true, name: true, role: true, isActive: true, password: true, department: true, avatar: true },
  })

  if (!user || !user.isActive) throw unauthorized('Credenciales inválidas')

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw unauthorized('Credenciales inválidas')

  const { password: _, ...userWithoutPassword } = user

  const accessToken = fastify.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn: '15m' })

  const refreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' },
  )

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } })

  return { user: userWithoutPassword, accessToken, refreshToken }
}

export async function refreshService(refreshToken: string, fastify: FastifyInstance) {
  let payload: jwt.JwtPayload
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as jwt.JwtPayload
  } catch {
    throw unauthorized('Token de refresco inválido o expirado')
  }

  if (payload.type !== 'refresh' || !payload.sub) throw unauthorized('Token de refresco inválido')

  const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw unauthorized('Token de refresco expirado o revocado')
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub as string } })
  if (!user || !user.isActive) throw unauthorized('Usuario inactivo')

  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } })

  const newAccessToken = fastify.jwt.sign({ sub: user.id, email: user.email, role: user.role }, { expiresIn: '15m' })

  const newRefreshToken = jwt.sign(
    { sub: user.id, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' },
  )

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { token: newRefreshToken, userId: user.id, expiresAt } })

  return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}

export async function logoutService(refreshToken: string) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshToken, revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export async function getMeService(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true, department: true, phone: true, avatar: true, isActive: true, createdAt: true },
  })
  if (!user) throw notFound('Usuario')
  return user
}
