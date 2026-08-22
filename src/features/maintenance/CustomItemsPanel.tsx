import { useState } from 'react'
import { Plus, Trash2, Star } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { supabase } from '@/lib/supabase'
import type { CustomMaintItem, MaintMode } from '@/types'

const MODE_OPTIONS: { id: MaintMode; label: string }[] = [
  { id: 'km', label: 'Por km' },
  { id: 'time', label: 'Por tiempo' },
  { id: 'both', label: 'Ambos' },
]

interface CustomItemsPanelProps {
  vin: string
  ownerId: string
  items: CustomMaintItem[]
  onChanged: () => void
}

export function CustomItemsPanel({ vin, ownerId, items, onChanged }: CustomItemsPanelProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [category, setCategory] = useState('')
  const [km, setKm] = useState('')
  const [months, setMonths] = useState('')
  const [mode, setMode] = useState<MaintMode>('both')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      {items.map((item) => (
        <Card key={item.id} accent="accent" className="mb-2">
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
        </Card>
      ))}

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
    </div>
  )
}
