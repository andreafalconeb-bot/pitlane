import { NavLink } from 'react-router-dom'
import { Home, Car, Wrench, FileText, User, Store, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'
import type { Role } from '@/types'

const CLIENT_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/vehiculos', label: 'Vehículos', icon: Car },
  { to: '/mantenimiento', label: 'Mantenim.', icon: Wrench },
  { to: '/documentos', label: 'Documentos', icon: FileText },
  { to: '/perfil', label: 'Perfil', icon: User },
]

const WORKSHOP_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/taller', label: 'Taller', icon: Store },
  { to: '/documentos', label: 'Documentos', icon: FileText },
  { to: '/perfil', label: 'Perfil', icon: User },
]

const MASTER_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/admin', label: 'Admin', icon: ShieldCheck },
  { to: '/documentos', label: 'Documentos', icon: FileText },
  { to: '/perfil', label: 'Perfil', icon: User },
]

function itemsForRole(role: Role | undefined) {
  if (role === 'taller_free' || role === 'taller_paid') return WORKSHOP_ITEMS
  if (role === 'master') return MASTER_ITEMS
  return CLIENT_ITEMS
}

export function BottomNav() {
  const profile = useAuthStore((s) => s.profile)
  const items = itemsForRole(profile?.role)

  return (
    <nav className="sticky bottom-0 bg-surface border-t border-border flex justify-around px-1 pt-2 pb-3.5">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 min-w-11 min-h-11 justify-center px-1.5 text-[10px] ${
              isActive ? 'text-accent font-semibold' : 'text-muted'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
