import { Link } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/auth'

const ROLE_LABEL: Record<string, string> = {
  client: 'Cliente',
  taller_free: 'Taller FREE',
  taller_paid: 'Taller PAID',
  master: 'Master',
}

export function HomePage() {
  const profile = useAuthStore((s) => s.profile)

  return (
    <PageShell>
      <h1 className="text-lg font-semibold mb-1">Hola, {profile?.name ?? ''}</h1>
      <div className="mb-4">
        <Badge tone="accent">{profile ? ROLE_LABEL[profile.role] : ''}</Badge>
      </div>

      <Link to="/mantenimiento">
        <Card accent="accent" className="mb-2">
          <div className="text-sm font-semibold">Mantenimiento</div>
          <div className="text-xs text-muted mt-0.5">Revisa el estado de tus vehículos</div>
        </Card>
      </Link>

      <Link to="/vehiculos">
        <Card className="mb-2">
          <div className="text-sm font-semibold">Mis vehículos</div>
          <div className="text-xs text-muted mt-0.5">Ver y registrar vehículos</div>
        </Card>
      </Link>
    </PageShell>
  )
}
