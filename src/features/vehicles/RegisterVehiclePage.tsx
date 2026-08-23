import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { DocumentScanner } from '@/features/scanner/DocumentScanner'
import { VinPhotoButton } from '@/features/scanner/VinPhotoButton'
import { KmRateField } from './KmRateField'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { VehicleData } from '@/lib/ocr'
import type { MaintPlan } from '@/types'

interface FormState {
  vin: string
  plate: string
  brand: string
  model: string
  year: string
  color: string
  serialMotor: string
  code: string
}

const EMPTY_FORM: FormState = {
  vin: '',
  plate: '',
  brand: '',
  model: '',
  year: '',
  color: '',
  serialMotor: '',
  code: '',
}

const PLAN_OPTIONS: { id: MaintPlan; label: string; hint: string }[] = [
  { id: 'basic', label: 'Básico', hint: '23 ítems esenciales' },
  { id: 'advanced', label: 'Avanzado', hint: 'Catálogo completo (51)' },
  { id: 'configurable', label: 'Configurable', hint: 'Tú activas cada ítem' },
]

export function RegisterVehiclePage() {
  const userId = useAuthStore((s) => s.userId)
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [plan, setPlan] = useState<MaintPlan>('basic')
  const [kmCurrent, setKmCurrent] = useState('')
  const [kmMonthly, setKmMonthly] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vinScanError, setVinScanError] = useState<string | null>(null)
  const [vinRawText, setVinRawText] = useState<string | null>(null)
  const [showVinRaw, setShowVinRaw] = useState(false)
  const [lucky, setLucky] = useState(false)

  function applyScan(data: VehicleData) {
    setForm((f) => ({
      ...f,
      vin: data.vin ?? f.vin,
      plate: data.plate ?? f.plate,
      brand: data.brand ?? f.brand,
      model: data.model ?? f.model,
      year: data.year ?? f.year,
      color: data.color ?? f.color,
      serialMotor: data.serialMotor ?? f.serialMotor,
    }))
  }

  function handleVinPhoto(vin: string | null, rawText: string) {
    setVinScanError(vin ? null : 'No se pudo leer el VIN en esa foto. Intenta con más luz o escríbelo a mano.')
    setVinRawText(vin ? null : rawText)
    if (vin) setForm((f) => ({ ...f, vin }))
  }

  function field(key: keyof FormState) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [key]: e.target.value })),
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError(null)
    setSaving(true)
    setLucky(false)

    try {
      const vin = form.vin.trim().toUpperCase()
      const year = parseInt(form.year, 10)
      if (vin.length < 10 || !form.brand || !form.model || !year) {
        setError('Completa VIN, marca, modelo y año.')
        return
      }

      const kmCurrentValue = kmCurrent ? parseInt(kmCurrent, 10) : 0

      const { data: existing } = await supabase.from('vehicles').select('vin').eq('vin', vin).maybeSingle()

      if (existing) {
        const { error: claimErr } = await supabase.rpc('claim_vehicle', {
          p_vin: vin,
          p_code: form.code.trim() || null,
          p_plan: plan,
          p_km_current: kmCurrentValue,
          p_km_monthly: kmMonthly,
        })
        if (claimErr) throw claimErr
        setLucky(true)
      } else {
        const { error: insErr } = await supabase.from('vehicles').insert({
          vin,
          plate: form.plate || null,
          brand: form.brand,
          model: form.model,
          year,
          color: form.color || null,
          serial_motor: form.serialMotor || null,
          status: 'active',
          current_owner: userId,
        })
        if (insErr) {
          if (insErr.code === '23505') {
            setError('Este vehículo ya está registrado a otro propietario.')
            return
          }
          throw insErr
        }

        const { error: ownErr } = await supabase.from('vehicle_ownership').insert({
          vin,
          owner_id: userId,
          plan,
          km_current: kmCurrentValue,
          km_monthly: kmMonthly,
          km_current_updated_at: new Date().toISOString(),
        })
        if (ownErr) throw ownErr
      }

      navigate('/mantenimiento')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar el vehículo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageShell>
      <h1 className="text-lg font-semibold mb-3">Registrar vehículo</h1>

      <Card className="mb-3">
        <DocumentScanner onResult={applyScan} />
      </Card>

      {lucky && (
        <Card accent="accent" className="mb-3">
          <p className="text-sm font-semibold text-accent">Eres afortunado</p>
          <p className="text-xs text-muted mt-1">
            Este vehículo ya tiene historial. Ahora tienes acceso completo como propietario.
          </p>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <div className="flex gap-2 items-end mb-2">
          <div className="flex-1">
            <Input id="vin" label="VIN (17 caracteres)" maxLength={17} {...field('vin')} required />
          </div>
          <div className="mb-2">
            <VinPhotoButton onResult={handleVinPhoto} />
          </div>
        </div>
        {vinScanError && <p className="text-xs text-warning -mt-1 mb-1">{vinScanError}</p>}
        {vinRawText && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowVinRaw((v) => !v)}
              className="text-[10px] text-muted flex items-center gap-1 min-h-8"
            >
              {showVinRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              Ver texto detectado
            </button>
            {showVinRaw && (
              <pre className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words bg-[#0D1117] border border-border rounded-lg p-2 text-[10px] text-muted">
                {vinRawText}
              </pre>
            )}
          </div>
        )}

        <Input id="plate" label="Placa" {...field('plate')} />
        <Input id="brand" label="Marca" {...field('brand')} required />
        <Input id="model" label="Modelo" {...field('model')} required />
        <Input id="year" label="Año" type="number" {...field('year')} required />
        <Input id="color" label="Color" {...field('color')} />
        <Input id="serialMotor" label="Serial de motor" {...field('serialMotor')} />
        <Input
          id="kmCurrent"
          label="Kilometraje actual"
          type="number"
          value={kmCurrent}
          onChange={(e) => setKmCurrent(e.target.value)}
        />
        <KmRateField valueMonthly={kmMonthly} onChange={setKmMonthly} />
        <Input
          id="code"
          label="Código de traslado (solo si te lo dieron)"
          placeholder="TRANS-... o SRGO-..."
          {...field('code')}
        />

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
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Registrar vehículo'}
        </Button>
      </form>
    </PageShell>
  )
}
