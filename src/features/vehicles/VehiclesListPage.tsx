import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { Vehicle } from '@/types'

export function VehiclesListPage() {
  const userId = useAuthStore((s) => s.userId)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('vehicles')
      .select('*')
      .eq('current_owner', userId)
      .then(({ data }) => {
        setVehicles((data as Vehicle[]) ?? [])
        setLoading(false)
      })
  }, [userId])

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">Mis vehículos</h1>
        <Link
          to="/vehiculos/registrar"
          className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-accent text-black"
        >
          <Plus size={18} />
        </Link>
      </div>

      {loading && <p className="text-sm text-muted">Cargando…</p>}

      {!loading && vehicles.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-muted mb-3">Aún no tienes vehículos registrados.</p>
          <Link to="/vehiculos/registrar">
            <Button>Registrar vehículo</Button>
          </Link>
        </Card>
      )}

      {vehicles.map((v) => (
        <Card key={v.vin} className="mb-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                {v.brand} {v.model}
              </div>
              <div className="text-[10px] text-muted mt-0.5">
                {v.plate ?? 'Sin placa'} · {v.year}
              </div>
            </div>
            <Badge tone={v.status === 'active' ? 'success' : 'neutral'}>{v.status}</Badge>
          </div>
        </Card>
      ))}
    </PageShell>
  )
}
