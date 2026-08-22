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
  const role = profile?.role

  return (
    <PageShell>
      <h1 className="text-lg font-semibold mb-1">Hola, {profile?.name ?? ''}</h1>
      <div className="mb-4">
        <Badge tone="accent">{profile ? ROLE_LABEL[profile.role] : ''}</Badge>
      </div>

      {role === 'client' && (
        <>
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
        </>
      )}

      {(role === 'taller_free' || role === 'taller_paid') && (
        <Link to="/taller">
          <Card accent="accent" className="mb-2">
            <div className="text-sm font-semibold">Mi taller</div>
            <div className="text-xs text-muted mt-0.5">Vehículos asignados, puntos y servicios</div>
          </Card>
        </Link>
      )}

      {role === 'master' && (
        <Link to="/admin">
          <Card accent="accent" className="mb-2">
            <div className="text-sm font-semibold">Panel Master</div>
            <div className="text-xs text-muted mt-0.5">Talleres, vehículos y diccionario</div>
          </Card>
        </Link>
      )}

      <Link to="/documentos">
        <Card className="mb-2">
          <div className="text-sm font-semibold">Documentos</div>
          <div className="text-xs text-muted mt-0.5">Certificados y títulos</div>
        </Card>
      </Link>

      <Link to="/diccionario">
        <Card className="mb-2">
          <div className="text-sm font-semibold">Diccionario</div>
          <div className="text-xs text-muted mt-0.5">Términos técnicos de mantenimiento</div>
        </Card>
      </Link>
    </PageShell>
  )
}
