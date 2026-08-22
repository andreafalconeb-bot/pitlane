import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Bell, BellOff } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { buildMaintView } from '@/lib/maintenance'
import type { MaintItemView, MaintPlan, Vehicle, VehicleMaintState } from '@/types'

interface OwnedVehicle extends Vehicle {
  plan: MaintPlan
  km_current: number
}

const STATUS_LABEL: Record<MaintItemView['status'], string> = {
  overdue: 'VENCIDO',
  soon: 'PRÓXIMO',
  ok: 'AL DÍA',
}

const STATUS_TONE: Record<MaintItemView['status'], 'danger' | 'warning' | 'success'> = {
  overdue: 'danger',
  soon: 'warning',
  ok: 'success',
}

export function MaintenanceDashboardPage() {
  const userId = useAuthStore((s) => s.userId)
  const [vehicles, setVehicles] = useState<OwnedVehicle[]>([])
  const [selectedVin, setSelectedVin] = useState<string | null>(null)
  const [maintState, setMaintState] = useState<Record<string, VehicleMaintState>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function load() {
      const { data: own } = await supabase
        .from('vehicle_ownership')
        .select('vin, plan, km_current, vehicles(*)')
        .eq('owner_id', userId as string)
        .is('ended_at', null)

      if (cancelled) return

      const list: OwnedVehicle[] = (own ?? [])
        .filter((row) => row.vehicles)
        .map((row) => ({
          ...(row.vehicles as unknown as Vehicle),
          plan: row.plan as MaintPlan,
          km_current: row.km_current as number,
        }))

      setVehicles(list)
      setSelectedVin((prev) => prev ?? list[0]?.vin ?? null)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (!selectedVin) return
    let cancelled = false

    async function loadMaint() {
      const { data } = await supabase.from('vehicle_maint').select('*').eq('vin', selectedVin as string)
      if (cancelled) return
      const byId: Record<string, VehicleMaintState> = {}
      for (const row of data ?? []) {
        byId[row.catalog_id as string] = row as VehicleMaintState
      }
      setMaintState(byId)
    }

    loadMaint()
    return () => {
      cancelled = true
    }
  }, [selectedVin])

  const selected = vehicles.find((v) => v.vin === selectedVin) ?? null

  const items = useMemo(() => {
    if (!selected) return []
    return buildMaintView(selected.km_current ?? 0, selected.plan, maintState)
  }, [selected, maintState])

  const overdue = items.filter((i) => i.status === 'overdue').length
  const soon = items.filter((i) => i.status === 'soon').length
  const ok = items.length - overdue - soon

  if (loading) {
    return (
      <PageShell>
        <p className="text-sm text-muted">Cargando…</p>
      </PageShell>
    )
  }

  if (vehicles.length === 0) {
    return (
      <PageShell>
        <Card>
          <p className="text-sm text-muted">Aún no tienes vehículos registrados.</p>
        </Card>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <h1 className="text-lg font-semibold mb-3">Mantenimiento</h1>

      {vehicles.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {vehicles.map((v) => (
            <button
              key={v.vin}
              onClick={() => setSelectedVin(v.vin)}
              className={`shrink-0 text-xs font-semibold px-3 py-2 min-h-11 rounded-lg border ${
                v.vin === selectedVin ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted'
              }`}
            >
              {v.brand} {v.model}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <>
          <Card accent="accent" className="mb-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-sm font-semibold">
                {selected.brand} {selected.model}
              </div>
              <Badge tone="accent">Plan {selected.plan}</Badge>
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="bg-danger/15 rounded-md py-1.5">
                <div className="text-base font-extrabold text-danger">{overdue}</div>
                <div className="text-[9px] text-muted">VENCIDOS</div>
              </div>
              <div className="bg-warning/15 rounded-md py-1.5">
                <div className="text-base font-extrabold text-warning">{soon}</div>
                <div className="text-[9px] text-muted">PRÓXIMOS</div>
              </div>
              <div className="bg-success/15 rounded-md py-1.5">
                <div className="text-base font-extrabold text-success">{ok}</div>
                <div className="text-[9px] text-muted">AL DÍA</div>
              </div>
            </div>
          </Card>

          {items.map((item) => (
            <Card
              key={item.id}
              accent={item.status === 'overdue' ? 'danger' : item.status === 'soon' ? 'warning' : 'success'}
              className="mb-2"
            >
              <div className="flex justify-between items-start gap-2 mb-1">
                <div className="flex-1">
                  <div className="text-xs font-medium flex items-center gap-1">
                    {item.criticality === 'alta' && <AlertTriangle size={11} className="text-danger" />}
                    {item.label}
                  </div>
                  <div className="text-[10px] text-muted mt-0.5">
                    {item.km_interval && item.month_interval
                      ? `${item.km_interval.toLocaleString()} km ó ${item.month_interval}m`
                      : item.km_interval
                        ? `Cada ${item.km_interval.toLocaleString()} km`
                        : `Cada ${item.month_interval} meses`}
                  </div>
                </div>
                <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              </div>
              <div className="h-1 rounded-full bg-border overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    item.status === 'overdue' ? 'bg-danger' : item.status === 'soon' ? 'bg-warning' : 'bg-success'
                  }`}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              {!item.alarm_on && (
                <div className="flex items-center gap-1 text-[10px] text-muted mt-1.5">
                  <BellOff size={11} /> Recordatorio desactivado
                </div>
              )}
              {item.alarm_on && item.status !== 'ok' && (
                <div className="flex items-center gap-1 text-[10px] text-muted mt-1.5">
                  <Bell size={11} /> Recordatorio activo
                </div>
              )}
            </Card>
          ))}
        </>
      )}
    </PageShell>
  )
}
