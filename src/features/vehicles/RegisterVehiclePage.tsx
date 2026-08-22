import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { DocumentScanner } from '@/features/scanner/DocumentScanner'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { VehicleData } from '@/lib/ocr'

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

export function RegisterVehiclePage() {
  const userId = useAuthStore((s) => s.userId)
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

  function applyVin(vin: string) {
    setForm((f) => ({ ...f, vin }))
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

      const { data: existing } = await supabase.from('vehicles').select('vin').eq('vin', vin).maybeSingle()

      if (existing) {
        const { error: claimErr } = await supabase.rpc('claim_vehicle', {
          p_vin: vin,
          p_code: form.code.trim() || null,
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
          plan: 'basic',
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
        <DocumentScanner onResult={applyScan} onVinResult={applyVin} />
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
        <Input id="vin" label="VIN (17 caracteres)" maxLength={17} {...field('vin')} required />
        <Input id="plate" label="Placa" {...field('plate')} />
        <Input id="brand" label="Marca" {...field('brand')} required />
        <Input id="model" label="Modelo" {...field('model')} required />
        <Input id="year" label="Año" type="number" {...field('year')} required />
        <Input id="color" label="Color" {...field('color')} />
        <Input id="serialMotor" label="Serial de motor" {...field('serialMotor')} />
        <Input
          id="code"
          label="Código de traslado (solo si te lo dieron)"
          placeholder="TRANS-... o SRGO-..."
          {...field('code')}
        />

        {error && <p className="text-xs text-danger mb-3">{error}</p>}
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando…' : 'Registrar vehículo'}
        </Button>
      </form>
    </PageShell>
  )
}
