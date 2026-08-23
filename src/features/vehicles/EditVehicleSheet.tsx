import { useEffect, useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { KmRateField } from './KmRateField'
import { supabase } from '@/lib/supabase'
import type { MaintPlan, Vehicle } from '@/types'

interface EditVehicleSheetProps {
  vehicle: Vehicle | null
  onClose: () => void
  onSaved: () => void
}

const PLAN_OPTIONS: { id: MaintPlan; label: string; hint: string }[] = [
  { id: 'basic', label: 'Básico', hint: '23 ítems esenciales' },
  { id: 'advanced', label: 'Avanzado', hint: 'Catálogo completo (51)' },
  { id: 'configurable', label: 'Configurable', hint: 'Tú activas cada ítem' },
]

export function EditVehicleSheet({ vehicle, onClose, onSaved }: EditVehicleSheetProps) {
  const [plate, setPlate] = useState('')
  const [color, setColor] = useState('')
  const [serialMotor, setSerialMotor] = useState('')
  const [oil, setOil] = useState('')
  const [plan, setPlan] = useState<MaintPlan>('basic')
  const [kmMonthly, setKmMonthly] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vehicle) return
    setPlate(vehicle.plate ?? '')
    setColor(vehicle.color ?? '')
    setSerialMotor(vehicle.serial_motor ?? '')
    setOil(vehicle.oil ?? '')
    setError(null)
    setLoading(true)

    supabase
      .from('vehicle_ownership')
      .select('plan, km_monthly')
      .eq('vin', vehicle.vin)
      .is('ended_at', null)
      .maybeSingle()
      .then(({ data }) => {
        setPlan((data?.plan as MaintPlan) ?? 'basic')
        setKmMonthly((data?.km_monthly as number) ?? 0)
        setLoading(false)
      })
  }, [vehicle])

  async function handleSave() {
    if (!vehicle) return
    setSaving(true)
    setError(null)
    try {
      const { error: vErr } = await supabase
        .from('vehicles')
        .update({
          plate: plate || null,
          color: color || null,
          serial_motor: serialMotor || null,
          oil: oil || null,
        })
        .eq('vin', vehicle.vin)
      if (vErr) throw vErr

      const { error: pErr } = await supabase
        .from('vehicle_ownership')
        .update({ plan, km_monthly: kmMonthly })
        .eq('vin', vehicle.vin)
        .is('ended_at', null)
      if (pErr) throw pErr

      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={!!vehicle} onClose={onClose} title="Editar vehículo">
      {vehicle && (
        <>
          <div className="mb-3 text-xs text-muted">
            {vehicle.brand} {vehicle.model} {vehicle.year} · VIN {vehicle.vin}
            <div className="text-[10px] mt-0.5">Marca, modelo, año y VIN no se pueden modificar.</div>
          </div>

          {loading ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : (
            <>
              <Input id="e-plate" label="Placa" value={plate} onChange={(e) => setPlate(e.target.value)} />
              <Input id="e-color" label="Color" value={color} onChange={(e) => setColor(e.target.value)} />
              <Input
                id="e-serial"
                label="Serial de motor"
                value={serialMotor}
                onChange={(e) => setSerialMotor(e.target.value)}
              />
              <Input id="e-oil" label="Aceite recomendado" value={oil} onChange={(e) => setOil(e.target.value)} />
              <KmRateField valueMonthly={kmMonthly} onChange={setKmMonthly} />

              <label className="block text-xs text-muted mb-1.5 mt-1">Plan de mantenimiento</label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PLAN_OPTIONS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPlan(p.id)}
                    className={`text-left rounded-lg border px-2.5 py-2.5 min-h-11 ${
                      plan === p.id ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                    }`}
                  >
                    <div className="text-xs font-semibold">{p.label}</div>
                    <div className="text-[10px] text-muted mt-0.5">{p.hint}</div>
                  </button>
                ))}
              </div>

              {error && <p className="text-xs text-danger mb-3">{error}</p>}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </Button>
            </>
          )}
        </>
      )}
    </Sheet>
  )
}
