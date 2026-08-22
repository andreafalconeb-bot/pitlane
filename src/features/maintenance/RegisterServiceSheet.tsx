import { useEffect, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface RegisterServiceSheetProps {
  open: boolean
  vin: string
  currentKm: number
  /** When set, also resets this catalog item's counter (last_km/last_date). */
  catalogId?: string
  defaultDescription?: string
  onClose: () => void
  onSaved: () => void
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Logs a service the owner did themselves — no workshop involved, can be
 * backdated or done ahead of the alarm. Immediately approved (it's the
 * owner's own record) and, when scoped to a catalog item, resets that
 * item's due-date/km counter right away.
 */
export function RegisterServiceSheet({
  open,
  vin,
  currentKm,
  catalogId,
  defaultDescription,
  onClose,
  onSaved,
}: RegisterServiceSheetProps) {
  const [date, setDate] = useState(today())
  const [km, setKm] = useState(String(currentKm))
  const [description, setDescription] = useState(defaultDescription ?? '')
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setDate(today())
    setKm(String(currentKm))
    setDescription(defaultDescription ?? '')
    setPrice('')
    setError(null)
  }, [open, currentKm, defaultDescription])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const kmValue = km ? parseInt(km, 10) : null

      const { error: insErr } = await supabase.from('service_history').insert({
        vin,
        workshop_id: null,
        workshop_name: 'Autogestión (propietario)',
        date,
        km_at_service: kmValue,
        description,
        price: price ? parseFloat(price) : null,
        status: 'approved',
        approved_at: new Date().toISOString(),
      })
      if (insErr) throw insErr

      if (catalogId) {
        const { error: maintErr } = await supabase
          .from('vehicle_maint')
          .upsert({ vin, catalog_id: catalogId, last_km: kmValue, last_date: date }, { onConflict: 'vin,catalog_id' })
        if (maintErr) throw maintErr
      }

      if (kmValue !== null && kmValue > currentKm) {
        await supabase
          .from('vehicle_ownership')
          .update({ km_current: kmValue, km_current_updated_at: new Date().toISOString() })
          .eq('vin', vin)
          .is('ended_at', null)
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el servicio')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Registrar trabajo realizado">
      <form onSubmit={handleSubmit}>
        <Input id="rs-date" label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input id="rs-km" label="Kilometraje" type="number" value={km} onChange={(e) => setKm(e.target.value)} />
        <Input
          id="rs-desc"
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <Input
          id="rs-price"
          label="Precio (opcional)"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        {catalogId && (
          <p className="text-[10px] text-muted -mt-1 mb-3">
            Esto reinicia el contador de este ítem a la fecha/km de arriba, sin importar si la alarma ya sonó o no.
          </p>
        )}
        {error && <p className="text-xs text-danger mb-3">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
    </Sheet>
  )
}
