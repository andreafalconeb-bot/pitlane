import { useEffect, useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

type EngineWorkType = 'cambio' | 'reparacion'

interface MajorEngineWorkSheetProps {
  open: boolean
  vin: string
  ownerId: string
  currentKm: number
  onClose: () => void
  onSaved: () => void
}

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Records a full engine swap or a complete overhaul — rare, important
 * events a future owner or workshop needs to see at a glance, not buried
 * as a routine service line. A swap also updates the vehicle's engine
 * serial, since that's the whole point of the change.
 */
export function MajorEngineWorkSheet({ open, vin, ownerId, currentKm, onClose, onSaved }: MajorEngineWorkSheetProps) {
  const [workType, setWorkType] = useState<EngineWorkType>('cambio')
  const [date, setDate] = useState(today())
  const [km, setKm] = useState(String(currentKm))
  const [newSerial, setNewSerial] = useState('')
  const [workshopName, setWorkshopName] = useState('')
  const [price, setPrice] = useState('')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setWorkType('cambio')
    setDate(today())
    setKm(String(currentKm))
    setNewSerial('')
    setWorkshopName('')
    setPrice('')
    setReceipt(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [open, currentKm])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const kmValue = km ? parseInt(km, 10) : null
      const description =
        workType === 'cambio'
          ? `Sustitución de motor (serial nuevo: ${newSerial}) a los ${kmValue?.toLocaleString() ?? '—'} km`
          : `Reparación mayor de motor a los ${kmValue?.toLocaleString() ?? '—'} km`

      let receiptPath: string | null = null
      if (receipt) {
        const path = `${ownerId}/${vin}/motor-${Date.now()}-${receipt.name}`
        const { error: upErr } = await supabase.storage.from('vehicle-documents').upload(path, receipt)
        if (upErr) throw upErr
        receiptPath = path
      }

      const { error: insErr } = await supabase.from('service_history').insert({
        vin,
        workshop_id: null,
        workshop_name: workshopName || 'No especificado',
        date,
        km_at_service: kmValue,
        description,
        price: price ? parseFloat(price) : null,
        receipt_url: receiptPath,
        status: 'approved',
        event_type: 'major_engine',
        approved_at: new Date().toISOString(),
      })
      if (insErr) throw insErr

      if (workType === 'cambio') {
        const { error: vErr } = await supabase.from('vehicles').update({ serial_motor: newSerial }).eq('vin', vin)
        if (vErr) throw vErr
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
      setError(err instanceof Error ? err.message : 'No se pudo registrar el trabajo de motor')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Cambio o reparación mayor de motor">
      <form onSubmit={handleSubmit}>
        <label className="block text-xs text-muted mb-1.5">Tipo de trabajo</label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {(
            [
              { id: 'cambio', label: 'Cambio de motor' },
              { id: 'reparacion', label: 'Reparación completa' },
            ] as const
          ).map((o) => (
            <button
              type="button"
              key={o.id}
              onClick={() => setWorkType(o.id)}
              className={`text-xs font-semibold py-2.5 min-h-11 rounded-lg border ${
                workType === o.id ? 'border-danger text-danger bg-danger/10' : 'border-border text-muted'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>

        <Input id="mw-date" label="Fecha" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        <Input id="mw-km" label="Kilometraje" type="number" value={km} onChange={(e) => setKm(e.target.value)} required />

        {workType === 'cambio' && (
          <Input
            id="mw-serial"
            label="Serial de motor nuevo"
            value={newSerial}
            onChange={(e) => setNewSerial(e.target.value)}
            required
          />
        )}

        <Input
          id="mw-taller"
          label="Taller donde se realizó (opcional)"
          value={workshopName}
          onChange={(e) => setWorkshopName(e.target.value)}
        />
        <Input
          id="mw-price"
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

        <p className="text-[10px] text-muted -mt-1 mb-3">
          Esto queda guardado como un aviso permanente en el historial del vehículo, visible para cualquier futuro
          propietario o taller.
        </p>

        {error && <p className="text-xs text-danger mb-3">{error}</p>}
        <Button type="submit" variant="danger" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar aviso'}
        </Button>
      </form>
    </Sheet>
  )
}
