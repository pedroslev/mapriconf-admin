'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'
import { api } from '@/lib/api'

interface AuthStore {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setTokens: (access: string, refresh: string, user: User) => void
}

export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setTokens: (accessToken, refreshToken, user) => {
        localStorage.setItem('accessToken', accessToken)
        set({ user, accessToken, refreshToken })
      },

      login: async (email: string, password: string) => {
        const data = await api.post<{ user: User; accessToken: string; refreshToken: string }>(
          '/api/auth/login',
          { email, password },
        )
        localStorage.setItem('accessToken', data.accessToken)
        set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken })
      },

      logout: async () => {
        const { refreshToken } = get()
        try {
          if (refreshToken) {
            await api.post('/api/auth/logout', { refreshToken })
          }
        } finally {
          localStorage.removeItem('accessToken')
          set({ user: null, accessToken: null, refreshToken: null })
        }
      },
    }),
    { name: 'mapriconf-auth', partialize: (s) => ({ user: s.user, refreshToken: s.refreshToken }) },
  ),
)
