'use client'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { api } from '@/lib/api'
import type { Task, PaginatedResponse } from '@/types'
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS, TYPE_LABELS, formatDate } from '@/lib/utils'

function TaskBadge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>
}

export default function TasksPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', { search, status, page }],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (status) params.set('status', status)
      return api.get<PaginatedResponse<Task>>(`/api/tasks?${params}`)
    },
  })

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.meta.total ?? 0} tarea{data?.meta.total !== 1 ? 's' : ''}
          </p>
        </div>
        <a
          href="/tasks/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors text-center"
        >
          + Nueva tarea
        </a>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar tareas..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:max-w-xs"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1) }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {isLoading && <p className="text-center py-8 text-gray-400">Cargando...</p>}
        {!isLoading && data?.data.length === 0 && (
          <p className="text-center py-8 text-gray-400">No se encontraron tareas</p>
        )}
        {data?.data.map((task) => (
          <div
            key={task.id}
            className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer active:bg-gray-50"
            onClick={() => window.location.href = `/tasks/${task.id}`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <span className="font-mono text-xs text-gray-400">{task.displayId}</span>
                <p className="font-medium text-gray-900 text-sm mt-0.5 truncate">{task.title}</p>
                {task.customerName && <p className="text-xs text-gray-400 mt-0.5">{task.customerName}</p>}
              </div>
              <TaskBadge className={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</TaskBadge>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              <TaskBadge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</TaskBadge>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.project.color }} />
                <span className="text-xs text-gray-500">{task.project.name}</span>
              </span>
              {task.assignedTo && <span className="text-xs text-gray-400">{task.assignedTo.name}</span>}
              {task.dueDate && (
                <span className={`text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                  📅 {formatDate(task.dueDate)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">ID</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Título</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Prioridad</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Proyecto</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Asignado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Vence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">Cargando...</td></tr>
            )}
            {!isLoading && data?.data.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-400">No se encontraron tareas</td></tr>
            )}
            {data?.data.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => window.location.href = `/tasks/${task.id}`}>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{task.displayId}</td>
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 truncate max-w-xs">{task.title}</div>
                  {task.customerName && <div className="text-xs text-gray-400 mt-0.5">{task.customerName}</div>}
                </td>
                <td className="px-4 py-3"><TaskBadge className={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</TaskBadge></td>
                <td className="px-4 py-3"><TaskBadge className={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</TaskBadge></td>
                <td className="px-4 py-3 text-gray-500 text-xs">{TYPE_LABELS[task.type]}</td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: task.project.color }} />
                    <span className="text-xs text-gray-700">{task.project.name}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{task.assignedTo?.name ?? '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {task.dueDate ? (
                    <span className={new Date(task.dueDate) < new Date() && task.status !== 'DONE' ? 'text-red-600 font-medium' : ''}>
                      {formatDate(task.dueDate)}
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Página {data.meta.page} de {data.meta.totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Anterior</button>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages}
                className="px-3 py-1 text-xs border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50">Siguiente</button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile pagination */}
      {data && data.meta.totalPages > 1 && (
        <div className="md:hidden flex items-center justify-between mt-3">
          <p className="text-xs text-gray-500">Página {data.meta.page} de {data.meta.totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-50">Anterior</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= data.meta.totalPages}
              className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  )
}
