import { useEffect, useMemo, useState } from 'react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { buildMaintView } from '@/lib/maintenance'
import { PlanItemsPanel } from './PlanItemsPanel'
import { CustomItemsPanel } from './CustomItemsPanel'
import { ServiceHistoryPanel } from './ServiceHistoryPanel'
import { KmCheckBanner } from './KmCheckBanner'
import { ProjectedAlarmBanner } from './ProjectedAlarmBanner'
import { EditVehicleSheet } from '@/features/vehicles/EditVehicleSheet'
import type { CustomMaintItem, KmCheckFreq, MaintPlan, ServiceHistoryEntry, Vehicle, VehicleMaintState } from '@/types'

interface OwnedVehicle extends Vehicle {
  plan: MaintPlan
  km_current: number
  km_current_updated_at: string | null
  km_check_freq: KmCheckFreq
  km_monthly: number
}

type Tab = 'plan' | 'custom' | 'historial'

const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'Plan' },
  { id: 'custom', label: 'Personalizados' },
  { id: 'historial', label: 'Historial' },
]

export function MaintenanceDashboardPage() {
  const userId = useAuthStore((s) => s.userId)
  const [vehicles, setVehicles] = useState<OwnedVehicle[]>([])
  const [selectedVin, setSelectedVin] = useState<string | null>(null)
  const [maintState, setMaintState] = useState<Record<string, VehicleMaintState>>({})
  const [customItems, setCustomItems] = useState<CustomMaintItem[]>([])
  const [services, setServices] = useState<ServiceHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('plan')
  const [editOpen, setEditOpen] = useState(false)

  async function reloadVehicles() {
    if (!userId) return
    const { data: own, error } = await supabase
      .from('vehicle_ownership')
      .select('vin, plan, km_current, km_current_updated_at, km_check_freq, km_monthly, vehicles(*)')
      .eq('owner_id', userId)
      .is('ended_at', null)

    if (error) {
      setLoadError(error.message)
      setLoading(false)
      return
    }
    setLoadError(null)

    const list: OwnedVehicle[] = (own ?? [])
      .filter((row) => row.vehicles)
      .map((row) => ({
        ...(row.vehicles as unknown as Vehicle),
        plan: row.plan as MaintPlan,
        km_current: row.km_current as number,
        km_current_updated_at: row.km_current_updated_at as string | null,
        km_check_freq: row.km_check_freq as KmCheckFreq,
        km_monthly: (row.km_monthly as number) ?? 0,
      }))

    setVehicles(list)
    setSelectedVin((prev) => prev ?? list[0]?.vin ?? null)
    setLoading(false)
  }

  useEffect(() => {
    reloadVehicles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function reloadVehicleData() {
    if (!selectedVin) return
    const [maintRes, customRes, serviceRes] = await Promise.all([
      supabase.from('vehicle_maint').select('*').eq('vin', selectedVin),
      supabase.from('custom_maint').select('*').eq('vin', selectedVin),
      supabase.from('service_history').select('*').eq('vin', selectedVin).order('date', { ascending: false }),
    ])

    const byId: Record<string, VehicleMaintState> = {}
    for (const row of maintRes.data ?? []) {
      byId[row.catalog_id as string] = row as VehicleMaintState
    }
    setMaintState(byId)
    setCustomItems((customRes.data as CustomMaintItem[]) ?? [])
    setServices((serviceRes.data as ServiceHistoryEntry[]) ?? [])
  }

  useEffect(() => {
    reloadVehicleData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVin])

  // Logging/approving a service can bump vehicle_ownership.km_current and
  // km_current_updated_at — reloadVehicleData alone won't pick that up
  // since km_current lives in the `vehicles` list, not the per-vin state.
  async function refreshAll() {
    await Promise.all([reloadVehicles(), reloadVehicleData()])
  }

  const selected = vehicles.find((v) => v.vin === selectedVin) ?? null

  const items = useMemo(() => {
    if (!selected) return []
    return buildMaintView(selected.km_current ?? 0, selected.plan, maintState)
  }, [selected, maintState])

  if (loading) {
    return (
      <PageShell>
        <p className="text-sm text-muted">Cargando…</p>
      </PageShell>
    )
  }

  if (loadError) {
    return (
      <PageShell>
        <Card accent="danger">
          <p className="text-sm text-danger font-semibold mb-1">No se pudo cargar tus vehículos</p>
          <p className="text-xs text-muted">{loadError}</p>
        </Card>
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
          <ProjectedAlarmBanner
            vin={selected.vin}
            currentKm={selected.km_current ?? 0}
            kmUpdatedAt={selected.km_current_updated_at}
            kmMonthly={selected.km_monthly ?? 0}
            plan={selected.plan}
            maintState={maintState}
            onSaved={refreshAll}
          />

          <Card className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold">
              {selected.brand} {selected.model}
            </div>
            <button
              onClick={() => setEditOpen(true)}
              aria-label="Editar plan de mantenimiento"
              className="min-h-11 flex items-center px-1"
            >
              <Badge tone="accent">Plan {selected.plan}</Badge>
            </button>
          </Card>

          <KmCheckBanner
            vin={selected.vin}
            currentKm={selected.km_current ?? 0}
            updatedAt={selected.km_current_updated_at}
            freq={selected.km_check_freq}
            onSaved={reloadVehicles}
          />

          <div className="flex gap-1 mb-3 bg-surface border border-border rounded-lg p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 text-xs font-semibold py-2 min-h-9 rounded-md ${
                  tab === t.id ? 'bg-accent text-black' : 'text-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'plan' && (
            <PlanItemsPanel
              vin={selected.vin}
              plan={selected.plan}
              currentKm={selected.km_current ?? 0}
              items={items}
              onChanged={refreshAll}
            />
          )}
          {tab === 'custom' && (
            <CustomItemsPanel
              vin={selected.vin}
              ownerId={selected.current_owner ?? ''}
              items={customItems}
              onChanged={reloadVehicleData}
            />
          )}
          {tab === 'historial' && (
            <ServiceHistoryPanel
              vin={selected.vin}
              currentKm={selected.km_current ?? 0}
              kmUpdatedAt={selected.km_current_updated_at}
              kmMonthly={selected.km_monthly ?? 0}
              services={services}
              onChanged={refreshAll}
            />
          )}

          <EditVehicleSheet vehicle={editOpen ? selected : null} onClose={() => setEditOpen(false)} onSaved={refreshAll} />
        </>
      )}
    </PageShell>
  )
}
