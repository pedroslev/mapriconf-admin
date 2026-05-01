'use client'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { Task } from '@/types'
import { TaskForm } from '@/components/tasks/TaskForm'

export default function EditTaskPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const { data: task, isLoading } = useQuery({
    queryKey: ['task', id],
    queryFn: () => api.get<Task>(`/api/tasks/${id}`),
  })

  if (isLoading) return <div className="p-8 text-gray-400">Cargando...</div>
  if (!task) return <div className="p-8 text-red-500">Tarea no encontrada</div>

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Volver</button>
        <h1 className="text-2xl font-bold text-gray-900">Editar {task.displayId}</h1>
      </div>
      <TaskForm
        initialData={task}
        onSuccess={(taskId) => router.push(`/tasks/${taskId}`)}
        onCancel={() => router.back()}
      />
    </div>
  )
}
