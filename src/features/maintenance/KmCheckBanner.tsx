import { useState } from 'react'
import { Gauge } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { supabase } from '@/lib/supabase'
import { isKmCheckDue } from '@/lib/kmCheck'
import type { KmCheckFreq } from '@/types'

interface KmCheckBannerProps {
  vin: string
  currentKm: number
  updatedAt: string | null
  freq: KmCheckFreq
  onSaved: () => void
}

/** Prompts for a fresh odometer reading once km_check_freq's interval has
 * elapsed since km_current was last verified. Logging a service (or saving
 * here) resets the clock — see RegisterServiceSheet. */
export function KmCheckBanner({ vin, currentKm, updatedAt, freq, onSaved }: KmCheckBannerProps) {
  const [open, setOpen] = useState(false)
  const [km, setKm] = useState(String(currentKm))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isKmCheckDue(updatedAt, freq)) return null

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const kmValue = parseInt(km, 10)
    const { error: updErr } = await supabase
      .from('vehicle_ownership')
      .update({ km_current: kmValue, km_current_updated_at: new Date().toISOString() })
      .eq('vin', vin)
      .is('ended_at', null)
    setSaving(false)
    if (updErr) {
      setError(updErr.message)
      return
    }
    setOpen(false)
    onSaved()
  }

  return (
    <>
      <Card accent="warning" className="mb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Gauge size={16} className="text-warning" />
          <span className="text-xs font-semibold">¿Cuál es el kilometraje actual?</span>
        </div>
        <p className="text-[10px] text-muted mb-2.5">
          Mantiene precisas las alarmas de mantenimiento por kilometraje.
        </p>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Actualizar kilometraje
        </Button>
      </Card>

      <Sheet open={open} onClose={() => setOpen(false)} title="Actualizar kilometraje">
        <form onSubmit={handleSave}>
          <Input
            id="km-check"
            label="Kilometraje actual"
            type="number"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            required
          />
          {error && <p className="text-xs text-danger mb-3">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </form>
      </Sheet>
    </>
  )
}
