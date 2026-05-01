'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/tasks', label: 'Tareas', icon: '📋' },
  { href: '/projects', label: 'Proyectos', icon: '📁' },
  { href: '/reports', label: 'Reportes', icon: '📊' },
  { href: '/users', label: 'Usuarios', icon: '👥', adminOnly: true },
]

export function MobileNav() {
  const pathname = usePathname()
  const { user } = useAuth()

  const items = navItems.filter((i) => !(i.adminOnly && user?.role === 'OPERATOR'))

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex md:hidden z-30 safe-area-pb">
      {items.map((item) => {
        const active = pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors',
              active ? 'text-blue-600' : 'text-gray-400',
            )}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
