import { useState } from 'react'
import { AlertTriangle, Bell, BellOff } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase'
import type { MaintItemView, MaintPlan } from '@/types'

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

interface PlanItemsPanelProps {
  vin: string
  plan: MaintPlan
  items: MaintItemView[]
  onChanged: () => void
}

export function PlanItemsPanel({ vin, plan, items, onChanged }: PlanItemsPanelProps) {
  const overdue = items.filter((i) => i.status === 'overdue').length
  const soon = items.filter((i) => i.status === 'soon').length
  const ok = items.length - overdue - soon
  const canToggleAlarms = plan === 'configurable'
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  async function toggleAlarm(item: MaintItemView) {
    setError(null)
    setTogglingId(item.id)
    const { error: upsertErr } = await supabase
      .from('vehicle_maint')
      .upsert({ vin, catalog_id: item.id, alarm_on: !item.alarm_on }, { onConflict: 'vin,catalog_id' })
    setTogglingId(null)
    if (upsertErr) {
      setError(upsertErr.message)
      return
    }
    onChanged()
  }

  return (
    <>
      <Card accent="accent" className="mb-3">
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

      {canToggleAlarms && (
        <p className="text-[10px] text-muted mb-2 text-center">
          Plan configurable: toca la campana para activar o desactivar el recordatorio de cada ítem.
        </p>
      )}
      {error && <p className="text-xs text-danger mb-2 text-center">{error}</p>}

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
            <div className="flex items-center gap-1.5">
              {canToggleAlarms ? (
                <button
                  onClick={() => toggleAlarm(item)}
                  disabled={togglingId === item.id}
                  aria-label={item.alarm_on ? 'Desactivar recordatorio' : 'Activar recordatorio'}
                  className={`min-w-11 min-h-11 flex items-center justify-center rounded-lg border disabled:opacity-50 ${
                    item.alarm_on ? 'border-accent text-accent' : 'border-border text-muted'
                  }`}
                >
                  {item.alarm_on ? <Bell size={16} /> : <BellOff size={16} />}
                </button>
              ) : (
                <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              )}
            </div>
          </div>
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className={`h-full rounded-full ${
                item.status === 'overdue' ? 'bg-danger' : item.status === 'soon' ? 'bg-warning' : 'bg-success'
              }`}
              style={{ width: `${item.pct}%` }}
            />
          </div>
          {canToggleAlarms && (
            <div className="flex items-center justify-between mt-1.5">
              <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
              {!item.alarm_on && <span className="text-[10px] text-muted">Recordatorio desactivado</span>}
            </div>
          )}
        </Card>
      ))}
    </>
  )
}
