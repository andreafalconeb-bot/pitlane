import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Upload } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { projectKmAtDate } from '@/lib/kmProjection'

interface RegisterServiceSheetProps {
  open: boolean
  vin: string
  ownerId: string
  currentKm: number
  /** Last confirmed reading's date + declared monthly rate — the anchor used
   * to sanity-check a km entered for a different (often backdated) date. */
  kmUpdatedAt: string | null
  kmMonthly: number
  /** When set, also resets this catalog item's counter (last_km/last_date). */
  catalogId?: string
  /** When set instead, resets this custom item's own last_km/last_date. */
  customItemId?: string
  defaultDescription?: string
  onClose: () => void
  onSaved: () => void
}

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Logs a service the owner did themselves — no workshop involved, can be
 * backdated or done ahead of the alarm. Immediately approved (it's the
 * owner's own record) and, when scoped to a catalog or custom item, resets
 * that item's due-date/km counter right away.
 */
export function RegisterServiceSheet({
  open,
  vin,
  ownerId,
  currentKm,
  kmUpdatedAt,
  kmMonthly,
  catalogId,
  customItemId,
  defaultDescription,
  onClose,
  onSaved,
}: RegisterServiceSheetProps) {
  const [date, setDate] = useState(today())
  const [km, setKm] = useState(String(currentKm))
  const [description, setDescription] = useState(defaultDescription ?? '')
  const [price, setPrice] = useState('')
  const [workshopName, setWorkshopName] = useState('Yo mismo (autogestión)')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Warns — never blocks — when the km typed for this date drifts far from
  // what the vehicle's own trend says it should be, so a backdated or
  // mistyped reading doesn't quietly corrupt the timeline.
  const expectedKm = useMemo(() => {
    if (!date || kmMonthly <= 0) return null
    return projectKmAtDate(currentKm, kmUpdatedAt, kmMonthly, date)
  }, [date, currentKm, kmUpdatedAt, kmMonthly])

  const kmValueForCheck = km ? parseInt(km, 10) : null
  const kmMismatch =
    expectedKm !== null &&
    kmValueForCheck !== null &&
    Math.abs(kmValueForCheck - expectedKm) > Math.max(500, expectedKm * 0.15)

  useEffect(() => {
    if (!open) return
    setDate(today())
    setKm(String(currentKm))
    setDescription(defaultDescription ?? '')
    setPrice('')
    setWorkshopName('Yo mismo (autogestión)')
    setReceipt(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [open, currentKm, defaultDescription])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const kmValue = km ? parseInt(km, 10) : null

      let receiptPath: string | null = null
      if (receipt) {
        const path = `${ownerId}/${vin}/service-${Date.now()}-${receipt.name}`
        const { error: upErr } = await supabase.storage.from('vehicle-documents').upload(path, receipt)
        if (upErr) throw upErr
        receiptPath = path
      }

      const { error: insErr } = await supabase.from('service_history').insert({
        vin,
        workshop_id: null,
        workshop_name: workshopName || 'Yo mismo (autogestión)',
        date,
        km_at_service: kmValue,
        description,
        price: price ? parseFloat(price) : null,
        receipt_url: receiptPath,
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

      if (customItemId) {
        const { error: customErr } = await supabase
          .from('custom_maint')
          .update({ last_km: kmValue, last_date: date })
          .eq('id', customItemId)
        if (customErr) throw customErr
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
    <Sheet open={open} onClose={onClose} title="Registrar servicio">
      <form onSubmit={handleSubmit}>
        <Input id="rs-date" label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input id="rs-km" label="Kilometraje" type="number" value={km} onChange={(e) => setKm(e.target.value)} />
        {kmMismatch && expectedKm !== null && (
          <div className="flex items-start gap-2 -mt-1 mb-3 p-2.5 rounded-lg border border-warning bg-warning/10">
            <AlertTriangle size={14} className="text-warning shrink-0 mt-0.5" />
            <div className="text-[11px]">
              Ese kilometraje no corresponde con la fecha elegida. Según tu promedio, para esa fecha deberías tener
              aproximadamente <b>{expectedKm.toLocaleString()} km</b>.
              <button
                type="button"
                onClick={() => setKm(String(expectedKm))}
                className="block mt-1 font-semibold text-warning underline underline-offset-2"
              >
                Usar {expectedKm.toLocaleString()} km sugeridos
              </button>
            </div>
          </div>
        )}
        <Input
          id="rs-desc"
          label="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
        <Input
          id="rs-taller"
          label="Taller donde se realizó"
          value={workshopName}
          onChange={(e) => setWorkshopName(e.target.value)}
          required
        />
        <Input
          id="rs-price"
          label="Monto (opcional)"
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <label className="block text-xs text-muted mb-1.5">Factura / nota de servicio (opcional)</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null
            if (file && file.size > MAX_RECEIPT_SIZE) {
              setError('El archivo supera 10MB.')
              setReceipt(null)
              return
            }
            setError(null)
            setReceipt(file)
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="w-full min-h-11 mb-3 flex items-center justify-center gap-2 rounded-lg border border-border text-xs font-semibold text-muted"
        >
          <Upload size={14} /> {receipt ? receipt.name : 'Adjuntar documento (lo que tengas)'}
        </button>

        {(catalogId || customItemId) && (
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
