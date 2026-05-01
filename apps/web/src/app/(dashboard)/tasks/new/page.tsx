'use client'
import { useRouter } from 'next/navigation'
import { TaskForm } from '@/components/tasks/TaskForm'

export default function NewTaskPage() {
  const router = useRouter()
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Volver</button>
        <h1 className="text-2xl font-bold text-gray-900">Nueva tarea</h1>
      </div>
      <TaskForm onSuccess={(id) => router.push(`/tasks/${id}`)} onCancel={() => router.back()} />
    </div>
  )
}
