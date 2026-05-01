'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { STATUS_LABELS, PRIORITY_LABELS } from '@/lib/utils'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#64748B']

export default function ReportsPage() {
  const { data: summary } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => api.get<{ total: number; byStatus: Array<{ status: string; _count: { id: number } }>; byPriority: Array<{ priority: string; _count: { id: number } }> }>('/api/reports/summary'),
  })

  const { data: workload } = useQuery({
    queryKey: ['reports-workload'],
    queryFn: () => api.get<Array<{ user: { name: string; department?: string } | null; openTasks: number }>>('/api/reports/workload'),
  })

  const { data: overdue } = useQuery({
    queryKey: ['reports-overdue'],
    queryFn: () => api.get<unknown[]>('/api/reports/overdue'),
  })

  const statusData = summary?.byStatus.map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s._count.id,
  })) ?? []

  const priorityData = summary?.byPriority.map((p) => ({
    name: PRIORITY_LABELS[p.priority] ?? p.priority,
    value: p._count.id,
  })) ?? []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Resumen del estado de las tareas</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Total de tareas</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{summary?.total ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">Tareas vencidas</p>
          <p className="text-3xl font-bold text-red-600 mt-1">{overdue?.length ?? 0}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-sm text-gray-500">En progreso</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">
            {summary?.byStatus.find((s) => s.status === 'IN_PROGRESS')?._count.id ?? 0}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Tareas por estado</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statusData}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Tareas por prioridad</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={priorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Carga de trabajo por usuario</h2>
        </div>
        <div className="space-y-3">
          {workload?.map((w, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{w.user?.name ?? 'Sin asignar'}</p>
                {w.user?.department && <p className="text-xs text-gray-400">{w.user.department}</p>}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, (w.openTasks / 10) * 100)}%` }} />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-6 text-right">{w.openTasks}</span>
              </div>
            </div>
          ))}
          {(!workload || workload.length === 0) && <p className="text-sm text-gray-400">Sin datos</p>}
        </div>
      </div>

      <div className="flex justify-end">
        <a
          href="http://localhost:3001/api/reports/export"
          target="_blank"
          className="text-sm text-blue-600 hover:underline"
        >
          Exportar a CSV →
        </a>
      </div>
    </div>
  )
}
