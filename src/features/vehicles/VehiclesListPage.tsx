import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Send, Archive, Copy } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Sheet } from '@/components/ui/Sheet'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { generateTransferCode } from '@/lib/codes'
import type { Vehicle } from '@/types'

export function VehiclesListPage() {
  const userId = useAuthStore((s) => s.userId)
  const profile = useAuthStore((s) => s.profile)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [actionVehicle, setActionVehicle] = useState<Vehicle | null>(null)
  const [transferCode, setTransferCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function reload() {
    if (!userId) return
    const { data } = await supabase.from('vehicles').select('*').eq('current_owner', userId)
    setVehicles((data as Vehicle[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const canManage = profile?.role === 'client' || profile?.role === 'master'

  function openActions(v: Vehicle) {
    setActionVehicle(v)
    setTransferCode(null)
    setError(null)
  }

  async function handleTransfer() {
    if (!actionVehicle) return
    setBusy(true)
    setError(null)
    try {
      const code = generateTransferCode(actionVehicle.plate ?? '', actionVehicle.vin)
      const { error: updErr } = await supabase
        .from('vehicles')
        .update({ status: 'transferred', transfer_code: code })
        .eq('vin', actionVehicle.vin)
      if (updErr) throw updErr
      setTransferCode(code)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el código')
    } finally {
      setBusy(false)
    }
  }

  async function handleDecommission() {
    if (!actionVehicle) return
    setBusy(true)
    setError(null)
    try {
      const { error: updErr } = await supabase
        .from('vehicles')
        .update({ status: 'decommissioned' })
        .eq('vin', actionVehicle.vin)
      if (updErr) throw updErr
      setActionVehicle(null)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dar de baja')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageShell>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-semibold">Mis vehículos</h1>
        <Link
          to="/vehiculos/registrar"
          className="min-w-11 min-h-11 flex items-center justify-center rounded-lg bg-accent text-black"
        >
          <Plus size={18} />
        </Link>
      </div>

      {loading && <p className="text-sm text-muted">Cargando…</p>}

      {!loading && vehicles.length === 0 && (
        <Card className="text-center">
          <p className="text-sm text-muted mb-3">Aún no tienes vehículos registrados.</p>
          <Link to="/vehiculos/registrar">
            <Button>Registrar vehículo</Button>
          </Link>
        </Card>
      )}

      {vehicles.map((v) => (
        <Card key={v.vin} className="mb-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">
                {v.brand} {v.model}
              </div>
              <div className="text-[10px] text-muted mt-0.5">
                {v.plate ?? 'Sin placa'} · {v.year}
              </div>
            </div>
            <Badge tone={v.status === 'active' ? 'success' : 'neutral'}>{v.status}</Badge>
          </div>
          {canManage && v.status === 'active' && (
            <button
              onClick={() => openActions(v)}
              className="text-xs text-accent font-semibold mt-2.5 min-h-11 flex items-center"
            >
              Transferir / dar de baja
            </button>
          )}
        </Card>
      ))}

      <Sheet open={!!actionVehicle} onClose={() => setActionVehicle(null)} title={actionVehicle?.plate ?? undefined}>
        {actionVehicle && !transferCode && (
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={handleTransfer}
              className="flex items-center justify-center gap-2"
            >
              <Send size={16} /> Generar código de traslado
            </Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={handleDecommission}
              className="flex items-center justify-center gap-2"
            >
              <Archive size={16} /> Dar de baja
            </Button>
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>
        )}

        {transferCode && (
          <div>
            <p className="text-xs text-muted mb-2">
              Comparte este código con el nuevo propietario. Lo debe ingresar al registrar el vehículo.
            </p>
            <div className="flex items-center gap-2 bg-[#0D1117] border border-border rounded-lg px-3 py-2.5 mb-3">
              <span className="text-sm font-mono flex-1 break-all">{transferCode}</span>
              <button
                onClick={() => navigator.clipboard.writeText(transferCode)}
                className="min-w-11 min-h-11 flex items-center justify-center text-accent"
                aria-label="Copiar código"
              >
                <Copy size={16} />
              </button>
            </div>
            <Button onClick={() => setActionVehicle(null)}>Listo</Button>
          </div>
        )}
      </Sheet>
    </PageShell>
  )
}
