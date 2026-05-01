'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { api } from '@/lib/api'
import type { Notification } from '@/types'
import { formatDateTime } from '@/lib/utils'

interface UnreadCount { count: number }
interface NotifList { data: Notification[]; meta: { total: number } }

export function Header({ title }: { title?: string }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: unread } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => api.get<UnreadCount>('/api/notifications/unread-count'),
    refetchInterval: 30_000,
  })

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<NotifList>('/api/notifications?limit=10'),
    enabled: open,
  })

  const readAllMutation = useMutation({
    mutationFn: () => api.patch('/api/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-count'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const readOneMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-count'] })
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const count = unread?.count ?? 0

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
      <h2 className="text-base font-semibold text-gray-800">{title ?? 'Mapriconf Admin'}</h2>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span className="text-lg">🔔</span>
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-30">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="text-sm font-semibold text-gray-800">Notificaciones</span>
                {count > 0 && (
                  <button onClick={() => readAllMutation.mutate()} className="text-xs text-blue-600 hover:underline">
                    Marcar todas como leídas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {notifs?.data.length === 0 && (
                  <div className="py-8 text-center text-sm text-gray-400">Sin notificaciones</div>
                )}
                {notifs?.data.map((n) => (
                  <div key={n.id}
                    className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'bg-blue-50/50' : ''}`}
                    onClick={() => { if (!n.isRead) readOneMutation.mutate(n.id) }}
                  >
                    <div className="flex items-start gap-2">
                      {!n.isRead && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                      <div className={!n.isRead ? '' : 'pl-3.5'}>
                        <p className="text-xs font-medium text-gray-800">{n.title}</p>
                        {n.body && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                        <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User chip */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-semibold">
              {user?.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
          <span className="text-sm text-gray-700 font-medium hidden sm:block">{user?.name.split(' ')[0]}</span>
        </div>
      </div>
    </header>
  )
}
