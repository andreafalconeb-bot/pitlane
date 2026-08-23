import { useEffect, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'

interface UpdateKmSheetProps {
  open: boolean
  vin: string
  currentKm: number
  onClose: () => void
  onSaved: () => void
}

/** Shared by KmCheckBanner and ProjectedAlarmBanner — both just need "let
 * the owner correct km_current right now," which also resets the
 * km-check clock and makes every alarm recalculate against the new value. */
export function UpdateKmSheet({ open, vin, currentKm, onClose, onSaved }: UpdateKmSheetProps) {
  const [km, setKm] = useState(String(currentKm))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setKm(String(currentKm))
    setError(null)
  }, [open, currentKm])

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
    onSaved()
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Actualizar kilometraje">
      <form onSubmit={handleSave}>
        <Input
          id="km-update"
          label="Kilometraje actual"
          type="number"
          value={km}
          onChange={(e) => setKm(e.target.value)}
          required
        />
        {error && <p className="text-xs text-danger mb-3">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar y recalcular alarmas'}
        </Button>
      </form>
    </Sheet>
  )
}
