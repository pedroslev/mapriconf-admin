'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api, ApiError } from '@/lib/api'
import type { Task, Project } from '@/types'

const PRIORITIES = [
  { value: 'LOW', label: 'Baja' },
  { value: 'MEDIUM', label: 'Media' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
]

const TYPES = [
  { value: 'INTERNAL', label: 'Tarea Interna' },
  { value: 'INCIDENT', label: 'Reclamo / Incidencia' },
  { value: 'ORDER', label: 'Pedido / Orden' },
  { value: 'PROJECT', label: 'Proyecto' },
]

interface TaskFormProps {
  initialData?: Partial<Task>
  onSuccess: (taskId: string) => void
  onCancel: () => void
}

export function TaskForm({ initialData, onSuccess, onCancel }: TaskFormProps) {
  const isEdit = !!initialData?.id

  const [form, setForm] = useState({
    title: initialData?.title ?? '',
    description: initialData?.description ?? '',
    projectId: initialData?.project?.id ?? '',
    priority: initialData?.priority ?? 'MEDIUM',
    type: initialData?.type ?? 'INTERNAL',
    dueDate: initialData?.dueDate ? initialData.dueDate.split('T')[0] : '',
    estimatedHours: initialData?.estimatedHours?.toString() ?? '',
    assignedToId: initialData?.assignedTo?.id ?? '',
    customerName: initialData?.customerName ?? '',
    customerCuit: initialData?.customerCuit ?? '',
    routeCode: initialData?.routeCode ?? '',
    vehiclePlate: initialData?.vehiclePlate ?? '',
  })

  const { data: projects } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => api.get<{ data: Project[] }>('/api/projects?limit=50'),
  })

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get<{ data: { id: string; name: string; department?: string }[] }>('/api/users?limit=100'),
  })

  const mutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (isEdit) return api.patch<{ id: string }>(`/api/tasks/${initialData!.id}`, data)
      return api.post<{ id: string }>('/api/tasks', data)
    },
    onSuccess: (task) => onSuccess(task.id),
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: Record<string, unknown> = {
      title: form.title,
      description: form.description || undefined,
      priority: form.priority,
      type: form.type,
      dueDate: form.dueDate || undefined,
      estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : undefined,
      assignedToId: form.assignedToId || undefined,
      customerName: form.customerName || undefined,
      customerCuit: form.customerCuit || undefined,
      routeCode: form.routeCode || undefined,
      vehiclePlate: form.vehiclePlate || undefined,
    }
    if (!isEdit) payload.projectId = form.projectId
    mutation.mutate(payload)
  }

  const showClientFields = ['INCIDENT', 'ORDER'].includes(form.type)
  const showLogisticsFields = ['ORDER', 'INTERNAL'].includes(form.type)

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-200 rounded-xl p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
        <input
          required minLength={3}
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Descripción breve de la tarea..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
        <textarea
          rows={4}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Detalle de la tarea, pasos a seguir, contexto..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área / Proyecto *</label>
            <select
              required={!isEdit}
              value={form.projectId}
              onChange={(e) => set('projectId', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar área...</option>
              {projects?.data.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
          <select value={form.type} onChange={(e) => set('type', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <select value={form.priority} onChange={(e) => set('priority', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
          <select value={form.assignedToId} onChange={(e) => set('assignedToId', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Sin asignar</option>
            {users?.data.map((u) => (
              <option key={u.id} value={u.id}>{u.name}{u.department ? ` (${u.department})` : ''}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
          <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Horas estimadas</label>
          <input type="number" min="0.5" step="0.5" value={form.estimatedHours}
            onChange={(e) => set('estimatedHours', e.target.value)}
            placeholder="Ej: 2.5"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {showClientFields && (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Datos del cliente</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cliente</label>
              <input value={form.customerName} onChange={(e) => set('customerName', e.target.value)}
                placeholder="Panadería / Confitería..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CUIT</label>
              <input value={form.customerCuit} onChange={(e) => set('customerCuit', e.target.value)}
                placeholder="XX-XXXXXXXX-X"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
      )}

      {showLogisticsFields && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código de ruta</label>
            <input value={form.routeCode} onChange={(e) => set('routeCode', e.target.value)}
              placeholder="RUTA-A"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patente del vehículo</label>
            <input value={form.vehiclePlate} onChange={(e) => set('vehiclePlate', e.target.value)}
              placeholder="ABC-123"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      )}

      {mutation.error instanceof ApiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {mutation.error.message}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={mutation.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm disabled:opacity-50 transition-colors">
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear tarea'}
        </button>
      </div>
    </form>
  )
}
