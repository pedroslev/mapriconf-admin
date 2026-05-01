import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { prisma } from '../../lib/prisma.js'
import { notFound, forbidden, badRequest } from '../../lib/errors.js'
import { Role } from '@prisma/client'
import { env } from '../../lib/env.js'

const ALLOWED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword', 'application/vnd.ms-excel',
  'text/plain', 'text/csv',
])

export async function saveAttachment(
  taskId: string,
  uploadedById: string,
  filename: string,
  mimeType: string,
  buffer: Buffer,
) {
  const task = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } })
  if (!task) throw notFound('Tarea')

  if (!ALLOWED_TYPES.has(mimeType)) throw badRequest(`Tipo de archivo no permitido: ${mimeType}`)

  const maxBytes = env.MAX_FILE_SIZE_MB * 1024 * 1024
  if (buffer.length > maxBytes) throw badRequest(`El archivo supera el límite de ${env.MAX_FILE_SIZE_MB} MB`)

  const ext = path.extname(filename) || ''
  const storedName = `${randomUUID()}${ext}`
  const now = new Date()
  const relDir = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
  const absDir = path.join(env.UPLOAD_DIR, relDir)
  const storagePath = path.join(relDir, storedName)

  await fs.mkdir(absDir, { recursive: true })
  await fs.writeFile(path.join(absDir, storedName), buffer)

  return prisma.attachment.create({
    data: { taskId, uploadedById, filename, storedName, storagePath, mimeType, fileSize: buffer.length },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })
}

export async function listAttachments(taskId: string) {
  const task = await prisma.task.findFirst({ where: { id: taskId, deletedAt: null } })
  if (!task) throw notFound('Tarea')
  return prisma.attachment.findMany({
    where: { taskId, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })
}

export async function getAttachmentFile(attachmentId: string) {
  const att = await prisma.attachment.findFirst({ where: { id: attachmentId, deletedAt: null } })
  if (!att) throw notFound('Archivo')
  const absPath = path.join(env.UPLOAD_DIR, att.storagePath)
  try {
    await fs.access(absPath)
  } catch {
    throw notFound('Archivo en disco')
  }
  return { att, absPath }
}

export async function deleteAttachment(id: string, actorId: string, actorRole: Role) {
  const att = await prisma.attachment.findFirst({ where: { id, deletedAt: null } })
  if (!att) throw notFound('Archivo')
  if (actorRole === Role.OPERATOR && att.uploadedById !== actorId) {
    throw forbidden('Solo podés eliminar archivos que subiste vos')
  }
  await prisma.attachment.update({ where: { id }, data: { deletedAt: new Date() } })
}
