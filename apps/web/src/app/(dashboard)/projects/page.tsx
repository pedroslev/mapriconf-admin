'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Project, PaginatedResponse } from '@/types'

export default function ProjectsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<PaginatedResponse<Project>>('/api/projects?limit=50'),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proyectos / Áreas</h1>
          <p className="text-sm text-gray-500 mt-0.5">Áreas operativas de Mapriconf</p>
        </div>
      </div>

      {isLoading && <p className="text-gray-400">Cargando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.data.map((project) => (
          <div
            key={project.id}
            className="bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors cursor-pointer"
            onClick={() => window.location.href = `/tasks?projectId=${project.id}`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: project.color }}>
                {project.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{project.name}</h3>
                <p className="text-xs text-gray-400">/{project.slug}</p>
              </div>
            </div>
            {project.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{project.description}</p>}
            <div className="flex gap-4 text-xs text-gray-400">
              <span>{project._count.tasks} tarea{project._count.tasks !== 1 ? 's' : ''}</span>
              <span>{project._count.members} miembro{project._count.members !== 1 ? 's' : ''}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
