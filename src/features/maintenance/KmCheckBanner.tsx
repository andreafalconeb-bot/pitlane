import { useState } from 'react'
import { Gauge } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { UpdateKmSheet } from './UpdateKmSheet'
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
 * elapsed since km_current was last verified. Logging a service (or
 * saving here) resets the clock — see RegisterServiceSheet. */
export function KmCheckBanner({ vin, currentKm, updatedAt, freq, onSaved }: KmCheckBannerProps) {
  const [open, setOpen] = useState(false)

  if (!isKmCheckDue(updatedAt, freq)) return null

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

      <UpdateKmSheet open={open} vin={vin} currentKm={currentKm} onClose={() => setOpen(false)} onSaved={onSaved} />
    </>
  )
}
