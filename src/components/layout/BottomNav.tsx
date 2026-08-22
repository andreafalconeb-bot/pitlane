import { NavLink } from 'react-router-dom'
import { Home, Car, Wrench, FileText, User } from 'lucide-react'

const ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/vehiculos', label: 'Vehículos', icon: Car },
  { to: '/mantenimiento', label: 'Mantenim.', icon: Wrench },
  { to: '/documentos', label: 'Documentos', icon: FileText },
  { to: '/perfil', label: 'Perfil', icon: User },
]

export function BottomNav() {
  return (
    <nav className="sticky bottom-0 bg-surface border-t border-border flex justify-around px-1 pt-2 pb-3.5">
      {ITEMS.map(({ to, label, icon: Icon, end }) => (
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
