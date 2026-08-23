import { useState } from 'react'
import { Check, X, Pencil, Plus } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { supabase } from '@/lib/supabase'
import { RegisterServiceSheet } from './RegisterServiceSheet'
import { formatDateVE } from '@/lib/date'
import type { ServiceHistoryEntry } from '@/types'

interface ServiceHistoryPanelProps {
  vin: string
  ownerId: string
  currentKm: number
  services: ServiceHistoryEntry[]
  onChanged: () => void
}

export function ServiceHistoryPanel({ vin, ownerId, currentKm, services, onChanged }: ServiceHistoryPanelProps) {
  const pending = services.filter((s) => s.status === 'pending')
  const resolved = services.filter((s) => s.status !== 'pending')
  const [modifyTarget, setModifyTarget] = useState<ServiceHistoryEntry | null>(null)
  const [modDesc, setModDesc] = useState('')
  const [modPrice, setModPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)

  /** A confirmed service record — from a workshop or logged directly —
   * always carries the odometer reading at that moment, so approving one
   * is also a fresh km_current reading: bump it and reset the km-check
   * clock, same as RegisterServiceSheet does for self-logged services. */
  async function bumpKmIfNewer(kmAtService: number | null) {
    if (kmAtService === null || kmAtService <= currentKm) return
    await supabase
      .from('vehicle_ownership')
      .update({ km_current: kmAtService, km_current_updated_at: new Date().toISOString() })
      .eq('vin', vin)
      .is('ended_at', null)
  }

  async function approve(s: ServiceHistoryEntry) {
    setBusy(true)
    await supabase
      .from('service_history')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', s.id)
    await bumpKmIfNewer(s.km_at_service)
    setBusy(false)
    onChanged()
  }

  async function reject(s: ServiceHistoryEntry) {
    setBusy(true)
    await supabase.from('service_history').update({ status: 'rejected' }).eq('id', s.id)
    setBusy(false)
    onChanged()
  }

  function openModify(s: ServiceHistoryEntry) {
    setModifyTarget(s)
    setModDesc(s.description)
    setModPrice(String(s.price ?? ''))
  }

  async function submitModify(e: React.FormEvent) {
    e.preventDefault()
    if (!modifyTarget) return
    setBusy(true)
    await supabase
      .from('service_history')
      .update({
        status: 'modified',
        modified_desc: modDesc,
        modified_price: modPrice ? parseFloat(modPrice) : null,
        approved_at: new Date().toISOString(),
      })
      .eq('id', modifyTarget.id)
    await bumpKmIfNewer(modifyTarget.km_at_service)
    setBusy(false)
    setModifyTarget(null)
    onChanged()
  }

  return (
    <div>
      <Button
        onClick={() => setRegisterOpen(true)}
        variant="secondary"
        className="flex items-center justify-center gap-2 mb-1.5"
      >
        <Plus size={16} /> Registrar servicio libre
      </Button>
      <p className="text-[10px] text-muted mb-3">
        Solo para trabajos sueltos que no forman parte del plan ni de tus ítems personalizados. Esos se registran
        desde sus propias tarjetas en las pestañas Plan y Personalizados, para que su alarma se reinicie.
      </p>

      {pending.length > 0 && (
        <>
          <div className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2">
            Pendientes de aprobación ({pending.length})
          </div>
          {pending.map((s) => (
            <Card key={s.id} accent="warning" className="mb-2">
              <div className="text-xs font-medium">{s.description}</div>
              <div className="text-[10px] text-muted mt-0.5">
                {formatDateVE(s.date)} · {s.km_at_service?.toLocaleString() ?? '—'} km · {s.workshop_name}
              </div>
              {s.price !== null && <div className="text-sm font-semibold text-accent mt-1">${s.price.toFixed(2)}</div>}
              <div className="flex gap-2 mt-2.5">
                <Button variant="secondary" disabled={busy} onClick={() => approve(s)} className="flex items-center justify-center gap-1.5">
                  <Check size={14} /> Aprobar
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => openModify(s)} className="flex items-center justify-center gap-1.5">
                  <Pencil size={14} /> Modificar
                </Button>
                <Button variant="danger" disabled={busy} onClick={() => reject(s)} className="flex items-center justify-center gap-1.5">
                  <X size={14} /> Rechazar
                </Button>
              </div>
            </Card>
          ))}
        </>
      )}

      <div className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2 mt-3">Historial</div>
      {resolved.length === 0 && (
        <Card>
          <p className="text-sm text-muted">Sin servicios registrados.</p>
        </Card>
      )}
      {resolved.map((s) => (
        <Card key={s.id} className="mb-2">
          <div className="flex justify-between items-start gap-2">
            <div>
              <div className="text-xs font-medium">{s.modified_desc ?? s.description}</div>
              <div className="text-[10px] text-muted mt-0.5">
                {formatDateVE(s.date)} · {s.km_at_service?.toLocaleString() ?? '—'} km · {s.workshop_name}
              </div>
            </div>
            <Badge tone={s.status === 'approved' || s.status === 'modified' ? 'success' : 'danger'}>{s.status}</Badge>
          </div>
          {(s.modified_price ?? s.price) !== null && (
            <div className="text-sm font-semibold text-accent mt-1">${(s.modified_price ?? s.price ?? 0).toFixed(2)}</div>
          )}
        </Card>
      ))}

      <Sheet open={!!modifyTarget} onClose={() => setModifyTarget(null)} title="Modificar servicio">
        <form onSubmit={submitModify}>
          <Input id="mod-desc" label="Descripción" value={modDesc} onChange={(e) => setModDesc(e.target.value)} required />
          <Input id="mod-price" label="Precio" type="number" step="0.01" value={modPrice} onChange={(e) => setModPrice(e.target.value)} />
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar y aprobar'}
          </Button>
        </form>
      </Sheet>

      <RegisterServiceSheet
        open={registerOpen}
        vin={vin}
        ownerId={ownerId}
        currentKm={currentKm}
        onClose={() => setRegisterOpen(false)}
        onSaved={onChanged}
      />
    </div>
  )
}
