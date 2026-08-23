import { useMemo, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { UpdateKmSheet } from './UpdateKmSheet'
import { buildMaintView } from '@/lib/maintenance'
import { projectKmToday } from '@/lib/kmProjection'
import type { MaintPlan, VehicleMaintState } from '@/types'

interface ProjectedAlarmBannerProps {
  vin: string
  currentKm: number
  kmUpdatedAt: string | null
  kmMonthly: number
  plan: MaintPlan
  maintState: Record<string, VehicleMaintState>
  onSaved: () => void
}

/**
 * The projection is an estimate, not a confirmed reading — so before it
 * gets to act like one, the owner has to look at it. If projecting forward
 * pushes an item past due that the last CONFIRMED km hasn't, this is the
 * first thing shown: "verify your real km before we trust this."
 */
export function ProjectedAlarmBanner({
  vin,
  currentKm,
  kmUpdatedAt,
  kmMonthly,
  plan,
  maintState,
  onSaved,
}: ProjectedAlarmBannerProps) {
  const [open, setOpen] = useState(false)
  const projectedKm = projectKmToday(currentKm, kmUpdatedAt, kmMonthly)

  const newlyDue = useMemo(() => {
    if (projectedKm <= currentKm) return []
    const atCurrent = buildMaintView(currentKm, plan, maintState)
    const atProjected = buildMaintView(projectedKm, plan, maintState)
    const alreadyOverdue = new Set(atCurrent.filter((i) => i.status === 'overdue').map((i) => i.id))
    return atProjected.filter((i) => i.status === 'overdue' && i.km_interval && !alreadyOverdue.has(i.id))
  }, [projectedKm, currentKm, plan, maintState])

  if (newlyDue.length === 0) return null

  return (
    <>
      <Card accent="danger" className="mb-3">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-danger" />
          <span className="text-xs font-semibold text-danger">Verifica tu kilometraje</span>
        </div>
        {newlyDue.map((item) => {
          const dueKm = (item.last_km ?? 0) + (item.km_interval ?? 0)
          return (
            <p key={item.id} className="text-xs mb-1">
              Tienes una alarma de servicio para <b>{item.label}</b> a los {dueKm.toLocaleString()} km.
            </p>
          )
        })}
        <p className="text-[10px] text-muted mt-1 mb-2.5">
          Verifica si tu kilometraje actual corresponde al proyectado (~{projectedKm.toLocaleString()} km). Si no es
          así, introduce el valor real y recalculamos todas las alarmas.
        </p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Verificar / actualizar kilometraje
        </Button>
      </Card>

      <UpdateKmSheet open={open} vin={vin} currentKm={currentKm} onClose={() => setOpen(false)} onSaved={onSaved} />
    </>
  )
}
