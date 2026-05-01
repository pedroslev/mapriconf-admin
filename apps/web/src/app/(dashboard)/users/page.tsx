'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User, PaginatedResponse } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const ROLE_LABELS = { ADMIN: 'Admin', MANAGER: 'Manager', OPERATOR: 'Operador' }
const ROLE_COLORS = {
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  OPERATOR: 'bg-gray-100 text-gray-700',
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (me && me.role === 'OPERATOR') router.push('/tasks')
  }, [me, router])

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<PaginatedResponse<User>>('/api/users?limit=50'),
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.meta.total ?? 0} usuarios registrados</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nombre</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Rol</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Área</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && <tr><td colSpan={5} className="text-center py-12 text-gray-400">Cargando...</td></tr>}
            {data?.data.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{user.department ?? '—'}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {user.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
