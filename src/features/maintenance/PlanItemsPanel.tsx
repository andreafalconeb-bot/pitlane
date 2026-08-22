import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, BellOff, CheckCircle2, Pencil, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { supabase } from '@/lib/supabase'
import { RegisterServiceSheet } from './RegisterServiceSheet'
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
  currentKm: number
  items: MaintItemView[]
  onChanged: () => void
}

export function PlanItemsPanel({ vin, plan, currentKm, items, onChanged }: PlanItemsPanelProps) {
  const overdue = items.filter((i) => i.status === 'overdue').length
  const soon = items.filter((i) => i.status === 'soon').length
  const ok = items.length - overdue - soon
  const canToggleAlarms = plan === 'configurable'
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [intervalItem, setIntervalItem] = useState<MaintItemView | null>(null)
  const [serviceItem, setServiceItem] = useState<MaintItemView | null>(null)

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
              <button
                onClick={() => setIntervalItem(item)}
                className="text-[10px] text-muted mt-0.5 flex items-center gap-1 min-h-6"
              >
                {item.km_interval && item.month_interval
                  ? `${item.km_interval.toLocaleString()} km ó ${item.month_interval}m`
                  : item.km_interval
                    ? `Cada ${item.km_interval.toLocaleString()} km`
                    : `Cada ${item.month_interval} meses`}
                {item.isCustomInterval && <Badge tone="accent">PERSONALIZADO</Badge>}
                <Pencil size={10} />
              </button>
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
          <button
            onClick={() => setServiceItem(item)}
            className="text-xs text-accent font-semibold mt-2 min-h-9 flex items-center gap-1.5"
          >
            <CheckCircle2 size={14} /> Marcar como realizado
          </button>
        </Card>
      ))}

      <IntervalEditSheet vin={vin} item={intervalItem} onClose={() => setIntervalItem(null)} onSaved={onChanged} />

      <RegisterServiceSheet
        open={!!serviceItem}
        vin={vin}
        currentKm={currentKm}
        catalogId={serviceItem?.id}
        defaultDescription={serviceItem?.label}
        onClose={() => setServiceItem(null)}
        onSaved={onChanged}
      />
    </>
  )
}

interface IntervalEditSheetProps {
  vin: string
  item: MaintItemView | null
  onClose: () => void
  onSaved: () => void
}

function IntervalEditSheet({ vin, item, onClose, onSaved }: IntervalEditSheetProps) {
  const [km, setKm] = useState('')
  const [months, setMonths] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!item) return
    setKm(String(item.km_interval ?? ''))
    setMonths(String(item.month_interval ?? ''))
    setError(null)
  }, [item])

  async function save(kmValue: number | null, monthsValue: number | null) {
    if (!item) return
    setSaving(true)
    setError(null)
    const { error: upsertErr } = await supabase.from('vehicle_maint').upsert(
      { vin, catalog_id: item.id, km_interval_override: kmValue, month_interval_override: monthsValue },
      { onConflict: 'vin,catalog_id' },
    )
    setSaving(false)
    if (upsertErr) {
      setError(upsertErr.message)
      return
    }
    onSaved()
    onClose()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    save(km ? parseInt(km, 10) : null, months ? parseInt(months, 10) : null)
  }

  return (
    <Sheet
      open={!!item}
      onClose={onClose}
      title={item ? `Intervalo — ${item.label}` : undefined}
    >
      {item && (
        <form onSubmit={handleSubmit}>
          <Input id="i-km" label="Cada cuántos km" type="number" value={km} onChange={(e) => setKm(e.target.value)} />
          <Input
            id="i-months"
            label="Cada cuántos meses"
            type="number"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
          {error && <p className="text-xs text-danger mb-3">{error}</p>}
          <Button type="submit" disabled={saving} className="mb-2">
            {saving ? 'Guardando…' : 'Guardar intervalo'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={saving}
            onClick={() => save(null, null)}
            className="flex items-center justify-center gap-2"
          >
            <RotateCcw size={14} /> Restablecer a valores de fábrica
          </Button>
        </form>
      )}
    </Sheet>
  )
}
