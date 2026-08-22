import { useEffect, useState } from 'react'
import { Plus, Copy, Wrench } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sheet } from '@/components/ui/Sheet'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { levelForPoints, nextLevel } from '@/lib/fidelity'
import { generateWorkshopInviteCode } from '@/lib/codes'
import type { Vehicle, Workshop, WorkshopVehicle } from '@/types'

interface AssignedVehicle extends WorkshopVehicle {
  vehicle: Vehicle | null
}

export function WorkshopDashboardPage() {
  const userId = useAuthStore((s) => s.userId)
  const profile = useAuthStore((s) => s.profile)
  const [workshop, setWorkshop] = useState<Workshop | null>(null)
  const [assigned, setAssigned] = useState<AssignedVehicle[]>([])
  const [loading, setLoading] = useState(true)

  const [preOpen, setPreOpen] = useState(false)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [vin, setVin] = useState('')
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [serviceTarget, setServiceTarget] = useState<AssignedVehicle | null>(null)
  const [svcDesc, setSvcDesc] = useState('')
  const [svcKm, setSvcKm] = useState('')
  const [svcPrice, setSvcPrice] = useState('')

  async function ensureWorkshop(): Promise<Workshop | null> {
    if (!userId || !profile) return null
    const { data } = await supabase.from('workshops').select('*').eq('owner_id', userId).maybeSingle()
    if (data) {
      setWorkshop(data as Workshop)
      return data as Workshop
    }
    const { data: created, error: insErr } = await supabase
      .from('workshops')
      .insert({
        owner_id: userId,
        name: profile.name,
        tier: profile.role === 'taller_paid' ? 'paid' : 'free',
      })
      .select('*')
      .single()
    if (!insErr && created) {
      setWorkshop(created as Workshop)
      return created as Workshop
    }
    return null
  }

  async function reloadAssigned(ws: Workshop | null) {
    if (!ws) return
    const { data } = await supabase
      .from('workshop_vehicles')
      .select('*, vehicle:vehicles(*)')
      .eq('workshop_id', ws.id)
      .order('created_at', { ascending: false })
    setAssigned((data as unknown as AssignedVehicle[]) ?? [])
  }

  useEffect(() => {
    async function init() {
      const ws = await ensureWorkshop()
      await reloadAssigned(ws)
      setLoading(false)
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  async function handlePreRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!workshop) return
    setSaving(true)
    setError(null)
    try {
      const vinClean = vin.trim().toUpperCase()
      const yearNum = parseInt(year, 10)
      if (vinClean.length < 10 || !brand || !model || !yearNum) {
        setError('Completa VIN, marca, modelo y año.')
        return
      }

      const { error: vErr } = await supabase.from('vehicles').insert({
        vin: vinClean,
        plate: plate || null,
        brand,
        model,
        year: yearNum,
        status: 'active',
        current_owner: null,
      })
      if (vErr && vErr.code !== '23505') throw vErr

      const code = generateWorkshopInviteCode(plate)
      const { error: wvErr } = await supabase.from('workshop_vehicles').insert({
        workshop_id: workshop.id,
        vin: vinClean,
        status: 'pending',
        invite_code: code,
      })
      if (wvErr) throw wvErr

      setInviteCode(code)
      await reloadAssigned(workshop)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo pre-registrar el vehículo')
    } finally {
      setSaving(false)
    }
  }

  function closePreRegister() {
    setPreOpen(false)
    setInviteCode(null)
    setVin('')
    setPlate('')
    setBrand('')
    setModel('')
    setYear('')
    setError(null)
  }

  async function submitService(e: React.FormEvent) {
    e.preventDefault()
    if (!serviceTarget || !workshop) return
    setSaving(true)
    setError(null)
    try {
      const { error: insErr } = await supabase.from('service_history').insert({
        vin: serviceTarget.vin,
        workshop_id: workshop.id,
        workshop_name: workshop.name,
        date: new Date().toISOString().slice(0, 10),
        km_at_service: svcKm ? parseInt(svcKm, 10) : null,
        description: svcDesc,
        price: svcPrice ? parseFloat(svcPrice) : null,
        status: 'pending',
      })
      if (insErr) throw insErr
      setServiceTarget(null)
      setSvcDesc('')
      setSvcKm('')
      setSvcPrice('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo precargar el servicio')
    } finally {
      setSaving(false)
    }
  }

  if (loading || !workshop) {
    return (
      <PageShell>
        <p className="text-sm text-muted">Cargando…</p>
      </PageShell>
    )
  }

  const level = levelForPoints(workshop.points)
  const next = nextLevel(workshop.points)
  const progressPct = next ? Math.round(((workshop.points - level.min) / (next.min - level.min)) * 100) : 100

  return (
    <PageShell>
      <h1 className="text-lg font-semibold mb-3">{workshop.name}</h1>

      <Card accent="accent" className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <Badge tone="accent">{level.label.toUpperCase()}</Badge>
          <span className="text-xs text-muted">{workshop.points} pts</span>
        </div>
        <div className="h-1.5 rounded-full bg-border overflow-hidden mb-1.5">
          <div className="h-full bg-accent rounded-full" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="text-[10px] text-muted">
          {next ? `${next.min - workshop.points} pts para ${next.label}` : 'Nivel máximo alcanzado'} · {level.discount}%
          descuento
        </div>
      </Card>

      <Button onClick={() => setPreOpen(true)} className="flex items-center justify-center gap-2 mb-3">
        <Plus size={16} /> Pre-registrar vehículo
      </Button>

      <div className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2">
        Vehículos asignados ({assigned.length})
      </div>

      {assigned.length === 0 && (
        <Card>
          <p className="text-sm text-muted">Aún no has pre-registrado vehículos.</p>
        </Card>
      )}

      {assigned.map((a) => (
        <Card key={a.id} className="mb-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                {a.vehicle ? `${a.vehicle.brand} ${a.vehicle.model}` : a.vin}
              </div>
              <div className="text-[10px] text-muted mt-0.5">{a.vehicle?.plate ?? a.vin}</div>
            </div>
            <Badge tone={a.status === 'active' ? 'success' : 'neutral'}>{a.status}</Badge>
          </div>
          {a.status === 'active' && (
            <button
              onClick={() => setServiceTarget(a)}
              className="text-xs text-accent font-semibold mt-2.5 min-h-11 flex items-center gap-1.5"
            >
              <Wrench size={13} /> Precargar servicio
            </button>
          )}
        </Card>
      ))}

      <Sheet open={preOpen} onClose={closePreRegister} title="Pre-registrar vehículo">
        {!inviteCode ? (
          <form onSubmit={handlePreRegister}>
            <Input id="w-vin" label="VIN" maxLength={17} value={vin} onChange={(e) => setVin(e.target.value)} required />
            <Input id="w-plate" label="Placa" value={plate} onChange={(e) => setPlate(e.target.value)} />
            <Input id="w-brand" label="Marca" value={brand} onChange={(e) => setBrand(e.target.value)} required />
            <Input id="w-model" label="Modelo" value={model} onChange={(e) => setModel(e.target.value)} required />
            <Input id="w-year" label="Año" type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
            {error && <p className="text-xs text-danger mb-3">{error}</p>}
            <Button type="submit" disabled={saving}>
              {saving ? 'Guardando…' : 'Pre-registrar'}
            </Button>
          </form>
        ) : (
          <div>
            <p className="text-xs text-muted mb-2">Comparte este código con el propietario para que reclame el vehículo.</p>
            <div className="flex items-center gap-2 bg-[#0D1117] border border-border rounded-lg px-3 py-2.5 mb-3">
              <span className="text-sm font-mono flex-1 break-all">{inviteCode}</span>
              <button
                onClick={() => navigator.clipboard.writeText(inviteCode)}
                className="min-w-11 min-h-11 flex items-center justify-center text-accent"
                aria-label="Copiar código"
              >
                <Copy size={16} />
              </button>
            </div>
            <Button onClick={closePreRegister}>Listo</Button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!serviceTarget} onClose={() => setServiceTarget(null)} title="Precargar servicio">
        <form onSubmit={submitService}>
          <Input id="s-desc" label="Descripción" value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} required />
          <Input id="s-km" label="Kilometraje" type="number" value={svcKm} onChange={(e) => setSvcKm(e.target.value)} />
          <Input id="s-price" label="Precio" type="number" step="0.01" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} />
          {error && <p className="text-xs text-danger mb-3">{error}</p>}
          <Button type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Enviar al propietario'}
          </Button>
        </form>
      </Sheet>
    </PageShell>
  )
}
