'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { api, ApiError } from '@/lib/api'
import type { Task, Comment } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, TYPE_LABELS, formatDate, formatDateTime, cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

const NEXT_STATUSES: Record<string, string[]> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['REVIEW', 'BLOCKED', 'DONE', 'CANCELLED'],
  REVIEW: ['DONE', 'IN_PROGRESS', 'CANCELLED'],
  BLOCKED: ['IN_PROGRESS', 'CANCELLED'],
  DONE: ['IN_PROGRESS'],
  CANCELLED: [],
}

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', className)}>{children}</span>
}

function Avatar({ name, size = 8 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
  return (
    <div className={`w-${size} h-${size} rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0`}>
      <span className="text-white text-xs font-semibold">{initials}</span>
    </div>
  )
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const qc = useQueryClient()

  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [statusModal, setStatusModal] = useState<string | null>(null)
  const [statusComment, setStatusComment] = useState('')
  const [uploadError, setUploadError] = useState('')

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get<Task & { comments: Comment[]; attachments: any[]; activities: any[] }>(`/api/tasks/${id}`),
  })

  const commentMutation = useMutation({
    mutationFn: (body: { content: string; isInternal: boolean }) =>
      api.post(`/api/tasks/${id}/comments`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', id] })
      setComment('')
      setIsInternal(false)
    },
  })

  const statusMutation = useMutation({
    mutationFn: (body: { status: string; comment?: string }) =>
      api.patch(`/api/tasks/${id}/status`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['task', id] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      setStatusModal(null)
      setStatusComment('')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/tasks/${id}`),
    onSuccess: () => router.push('/tasks'),
  })

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/tasks/${id}/attachments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setUploadError(err.error ?? 'Error al subir archivo')
        return
      }
      qc.invalidateQueries({ queryKey: ['task', id] })
    } catch {
      setUploadError('Error de red al subir archivo')
    }
    e.target.value = ''
  }

  async function handleDeleteAttachment(attachId: string) {
    await api.delete(`/api/tasks/${id}/attachments/${attachId}`)
    qc.invalidateQueries({ queryKey: ['task', id] })
  }

  if (isLoading) return <div className="p-8 text-gray-400">Cargando tarea...</div>
  if (!task) return <div className="p-8 text-red-500">Tarea no encontrada</div>

  const canChangeStatus = user?.role !== 'OPERATOR' || task.assignedTo?.id === user?.id
  const canEdit = user?.role !== 'OPERATOR' || task.createdBy.id === user?.id || task.assignedTo?.id === user?.id
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const nextStatuses = NEXT_STATUSES[task.status] ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Volver</button>
          <span className="text-gray-300">|</span>
          <span className="font-mono text-sm text-gray-400">{task.displayId}</span>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <a href={`/tasks/${id}/edit`} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
              Editar
            </a>
          )}
          {isManager && (
            <button onClick={() => { if (confirm('¿Eliminar esta tarea?')) deleteMutation.mutate() }}
              className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              Eliminar
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main content */}
        <div className="col-span-2 space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">{task.title}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge>
              <Badge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
              <Badge className="bg-gray-100 text-gray-600">{TYPE_LABELS[task.type]}</Badge>
            </div>
          </div>

          {task.description && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {task.description}
            </div>
          )}

          {/* Status actions */}
          {canChangeStatus && nextStatuses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">Cambiar estado:</span>
              {nextStatuses.map((s) => (
                <button key={s} onClick={() => setStatusModal(s)}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                  → {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}

          {/* Attachments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Archivos adjuntos ({(task as any).attachments?.length ?? 0})</h3>
              <label className="text-xs text-blue-600 hover:underline cursor-pointer">
                + Subir archivo
                <input type="file" className="hidden" onChange={handleUpload} />
              </label>
            </div>
            {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}
            {(task as any).attachments?.length > 0 ? (
              <div className="space-y-2">
                {(task as any).attachments.map((att: any) => (
                  <div key={att.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg">📎</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{att.filename}</p>
                        <p className="text-xs text-gray-400">{att.uploadedBy.name} · {formatDate(att.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/tasks/${id}/attachments/${att.id}`}
                        target="_blank" className="text-xs text-blue-600 hover:underline">Descargar</a>
                      {(isManager || att.uploadedBy.id === user?.id) && (
                        <button onClick={() => handleDeleteAttachment(att.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Sin archivos adjuntos</p>
            )}
          </div>

          {/* Comments */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Comentarios ({(task as any).comments?.length ?? 0})</h3>
            <div className="space-y-3 mb-4">
              {(task as any).comments?.map((c: Comment & { author: any }) => (
                <div key={c.id} className={cn('rounded-xl p-4', c.isInternal ? 'bg-yellow-50 border border-yellow-100' : 'bg-white border border-gray-200')}>
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar name={c.author.name} size={6} />
                    <span className="text-sm font-medium text-gray-800">{c.author.name}</span>
                    {c.isInternal && <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded font-medium">Nota interna</span>}
                    <span className="text-xs text-gray-400 ml-auto">{formatDateTime(c.createdAt)}</span>
                    {c.editedAt && <span className="text-xs text-gray-400">(editado)</span>}
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
              {(task as any).comments?.length === 0 && <p className="text-xs text-gray-400">Sin comentarios aún</p>}
            </div>

            {/* Comment form */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribí un comentario..."
                rows={3}
                className="w-full px-4 py-3 text-sm resize-none focus:outline-none"
              />
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-200">
                {isManager && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} className="rounded" />
                    <span className="text-xs text-gray-600">Nota interna</span>
                  </label>
                )}
                {!isManager && <span />}
                <button
                  onClick={() => commentMutation.mutate({ content: comment, isInternal })}
                  disabled={!comment.trim() || commentMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-4 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {commentMutation.isPending ? 'Enviando...' : 'Comentar'}
                </button>
              </div>
            </div>
          </div>

          {/* Activity */}
          {(task as any).activities?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Actividad</h3>
              <div className="space-y-2">
                {(task as any).activities.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-2 text-xs text-gray-500">
                    <span className="mt-0.5">•</span>
                    <div>
                      <span className="font-medium text-gray-700">{a.actor?.name ?? 'Sistema'}</span>
                      {a.action === 'task.status_changed' && a.changes?.status && (
                        <span> cambió el estado de <b>{STATUS_LABELS[a.changes.status.from]}</b> a <b>{STATUS_LABELS[a.changes.status.to]}</b></span>
                      )}
                      {a.action === 'task.assigned' && <span> asignó la tarea</span>}
                      {a.action === 'comment.added' && <span> agregó un comentario</span>}
                      <span className="ml-2 text-gray-400">{formatDateTime(a.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 text-sm">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Proyecto</p>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: task.project.color }} />
                <span className="text-gray-800 font-medium">{task.project.name}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Asignado a</p>
              {task.assignedTo ? (
                <div className="flex items-center gap-2">
                  <Avatar name={task.assignedTo.name} size={6} />
                  <span className="text-gray-800">{task.assignedTo.name}</span>
                </div>
              ) : (
                <span className="text-gray-400">Sin asignar</span>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Creado por</p>
              <div className="flex items-center gap-2">
                <Avatar name={task.createdBy.name} size={6} />
                <span className="text-gray-800">{task.createdBy.name}</span>
              </div>
            </div>

            {task.dueDate && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Fecha límite</p>
                <p className={cn('font-medium', new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-600' : 'text-gray-800')}>
                  {formatDate(task.dueDate)}
                  {new Date(task.dueDate) < new Date() && task.status !== 'DONE' && ' ⚠️ vencida'}
                </p>
              </div>
            )}

            {task.estimatedHours && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Horas estimadas</p>
                <p className="text-gray-800">{task.estimatedHours}h</p>
              </div>
            )}

            {task.customerName && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Cliente</p>
                <p className="text-gray-800">{task.customerName}</p>
                {task.customerCuit && <p className="text-xs text-gray-400">CUIT: {task.customerCuit}</p>}
              </div>
            )}

            {task.routeCode && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Ruta</p>
                <p className="text-gray-800">{task.routeCode}</p>
              </div>
            )}

            {task.vehiclePlate && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Vehículo</p>
                <p className="text-gray-800">{task.vehiclePlate}</p>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400">Creada {formatDateTime(task.createdAt)}</p>
              {task.resolvedAt && <p className="text-xs text-gray-400">Resuelta {formatDateTime(task.resolvedAt)}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Status change modal */}
      {statusModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="font-semibold text-gray-900 mb-1">
              Cambiar a: <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLORS[statusModal])}>{STATUS_LABELS[statusModal]}</span>
            </h3>
            {['CANCELLED', 'BLOCKED'].includes(statusModal) && (
              <p className="text-xs text-gray-500 mb-3">Se requiere un comentario para esta acción.</p>
            )}
            <textarea
              placeholder={['CANCELLED', 'BLOCKED'].includes(statusModal) ? 'Motivo (requerido)...' : 'Comentario opcional...'}
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            />
            <div className="flex gap-3">
              <button onClick={() => { setStatusModal(null); setStatusComment('') }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={() => statusMutation.mutate({ status: statusModal, comment: statusComment || undefined })}
                disabled={statusMutation.isPending || (['CANCELLED', 'BLOCKED'].includes(statusModal) && !statusComment.trim())}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {statusMutation.isPending ? 'Guardando...' : 'Confirmar'}
              </button>
            </div>
            {statusMutation.error instanceof ApiError && (
              <p className="text-xs text-red-600 mt-2">{statusMutation.error.message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
