import { useState } from 'react'
import { Plus, Trash2, Star, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { supabase } from '@/lib/supabase'
import { RegisterServiceSheet } from './RegisterServiceSheet'
import type { CustomMaintItem, MaintMode, MaintStatus } from '@/types'

const MODE_OPTIONS: { id: MaintMode; label: string }[] = [
  { id: 'km', label: 'Por km' },
  { id: 'time', label: 'Por tiempo' },
  { id: 'both', label: 'Ambos' },
]

const STATUS_LABEL: Record<MaintStatus, string> = {
  overdue: 'VENCIDO',
  soon: 'PRÓXIMO',
  ok: 'AL DÍA',
}

const STATUS_TONE: Record<MaintStatus, 'danger' | 'warning' | 'success'> = {
  overdue: 'danger',
  soon: 'warning',
  ok: 'success',
}

const MONTH_IN_MS = 30 * 24 * 60 * 60 * 1000

/** Same km-vs-time percentage logic as buildMaintView, but for a custom
 * item's own last_km/last_date/km_interval/month_interval — custom items
 * aren't in the shared catalog, so they track themselves. */
function customItemStatus(item: CustomMaintItem, currentKm: number): { pct: number; status: MaintStatus } | null {
  if (!item.km_interval && !item.month_interval) return null

  let pctKm: number | null = null
  if (item.km_interval && item.last_km !== null) {
    pctKm = Math.min(150, Math.round(((currentKm - item.last_km) / item.km_interval) * 100))
  }

  let pctTime: number | null = null
  if (item.month_interval && item.last_date) {
    const monthsElapsed = (Date.now() - new Date(item.last_date).getTime()) / MONTH_IN_MS
    pctTime = Math.min(150, Math.round((monthsElapsed / item.month_interval) * 100))
  }

  if (pctKm === null && pctTime === null) return null

  const pct = Math.max(pctKm ?? 0, pctTime ?? 0, 0)
  const status: MaintStatus = pct >= 100 ? 'overdue' : pct >= 80 ? 'soon' : 'ok'
  return { pct: Math.min(100, pct), status }
}

interface CustomItemsPanelProps {
  vin: string
  ownerId: string
  currentKm: number
  kmUpdatedAt: string | null
  kmMonthly: number
  items: CustomMaintItem[]
  onChanged: () => void
}

export function CustomItemsPanel({
  vin,
  ownerId,
  currentKm,
  kmUpdatedAt,
  kmMonthly,
  items,
  onChanged,
}: CustomItemsPanelProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('')
  const [km, setKm] = useState('')
  const [months, setMonths] = useState('')
  const [mode, setMode] = useState<MaintMode>('both')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [serviceItem, setServiceItem] = useState<CustomMaintItem | null>(null)

  const atLimit = items.length >= 5

  function resetForm() {
    setLabel('')
    setCategory('')
    setKm('')
    setMonths('')
    setMode('both')
    setError(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (atLimit) return
    setSaving(true)
    setError(null)
    try {
      const { error: insErr } = await supabase.from('custom_maint').insert({
        vin,
        owner_id: ownerId,
        label,
        category: category || null,
        km_interval: km ? parseInt(km, 10) : null,
        month_interval: months ? parseInt(months, 10) : null,
        mode,
        criticality: 'media',
        alarm_on: true,
      })
      if (insErr) throw insErr
      resetForm()
      setOpen(false)
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo agregar el ítem')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('custom_maint').delete().eq('id', id)
    onChanged()
  }

  async function handleToggleAlarm(item: CustomMaintItem) {
    await supabase.from('custom_maint').update({ alarm_on: !item.alarm_on }).eq('id', item.id)
    onChanged()
  }

  return (
    <div>
      <Button
        variant="secondary"
        disabled={atLimit}
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 mb-3"
      >
        <Plus size={16} /> {atLimit ? 'Máximo 5 ítems personalizados' : 'Agregar ítem personalizado'}
      </Button>

      {items.length === 0 && (
        <Card>
          <p className="text-sm text-muted">Sin ítems personalizados.</p>
        </Card>
      )}

      {items.map((item) => {
        const s = customItemStatus(item, currentKm)
        return (
          <Card key={item.id} accent={s ? (s.status === 'overdue' ? 'danger' : s.status === 'soon' ? 'warning' : 'success') : 'accent'} className="mb-2">
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1">
                <div className="text-xs font-medium flex items-center gap-1">
                  <Star size={10} className="text-accent" />
                  {item.label}
                </div>
                <div className="text-[10px] text-muted mt-0.5">
                  {item.km_interval ? `${item.km_interval.toLocaleString()} km` : ''}
                  {item.km_interval && item.month_interval ? ' · ' : ''}
                  {item.month_interval ? `${item.month_interval} meses` : ''}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleAlarm(item)}
                  className="text-[10px] font-semibold px-2 py-1 min-h-11 rounded border border-border text-muted"
                >
                  {item.alarm_on ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  aria-label="Eliminar"
                  className="min-w-11 min-h-11 flex items-center justify-center text-danger"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {s && (
              <>
                <div className="h-1 rounded-full bg-border overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full ${
                      s.status === 'overdue' ? 'bg-danger' : s.status === 'soon' ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
                <div className="mt-1.5">
                  <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>
                </div>
              </>
            )}
            <Button
              variant="secondary"
              onClick={() => setServiceItem(item)}
              className="mt-2.5 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 size={14} /> Registrar servicio
            </Button>
          </Card>
        )
      })}

      <Sheet open={open} onClose={() => setOpen(false)} title="Nuevo ítem personalizado">
        <form onSubmit={handleAdd}>
          <Input id="c-label" label="Nombre" value={label} onChange={(e) => setLabel(e.target.value)} required />
          <Input id="c-cat" label="Categoría" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Input
            id="c-km"
            label="Intervalo (km)"
            type="number"
            value={km}
            onChange={(e) => setKm(e.target.value)}
          />
          <Input
            id="c-mes"
            label="Intervalo (meses)"
            type="number"
            value={months}
            onChange={(e) => setMonths(e.target.value)}
          />
          <div className="flex gap-2 mb-4">
            {MODE_OPTIONS.map((o) => (
              <button
                type="button"
                key={o.id}
                onClick={() => setMode(o.id)}
                className={`flex-1 text-xs font-semibold py-2 min-h-11 rounded-lg border ${
                  mode === o.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-danger mb-3">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Agregar'}
          </Button>
        </form>
      </Sheet>

      <RegisterServiceSheet
        open={!!serviceItem}
        vin={vin}
        ownerId={ownerId}
        currentKm={currentKm}
        kmUpdatedAt={kmUpdatedAt}
        kmMonthly={kmMonthly}
        customItemId={serviceItem?.id}
        defaultDescription={serviceItem?.label}
        onClose={() => setServiceItem(null)}
        onSaved={onChanged}
      />
    </div>
  )
}
