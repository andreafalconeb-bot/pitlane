import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import { levelForPoints } from '@/lib/fidelity'
import type { DictionaryTerm, Vehicle, Workshop } from '@/types'

type Tab = 'talleres' | 'vehiculos' | 'diccionario'

export function AdminPage() {
  const userId = useAuthStore((s) => s.userId)
  const [tab, setTab] = useState<Tab>('diccionario')
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [pending, setPending] = useState<DictionaryTerm[]>([])
  const [loading, setLoading] = useState(true)

  async function reload() {
    const [wsRes, vRes, dRes] = await Promise.all([
      supabase.from('workshops').select('*').order('points', { ascending: false }),
      supabase.from('vehicles').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('dictionary').select('*').eq('status', 'pending').order('created_at', { ascending: true }),
    ])
    setWorkshops((wsRes.data as Workshop[]) ?? [])
    setVehicles((vRes.data as Vehicle[]) ?? [])
    setPending((dRes.data as DictionaryTerm[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    reload()
  }, [])

  async function review(term: DictionaryTerm, status: 'approved' | 'rejected') {
    await supabase.from('dictionary').update({ status, reviewed_by: userId }).eq('id', term.id)
    await reload()
  }

  if (loading) {
    return (
      <PageShell>
        <p className="text-sm text-muted">Cargando…</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <h1 className="text-lg font-semibold mb-3">Panel Master</h1>

      <div className="flex gap-1 mb-3 bg-surface border border-border rounded-lg p-1">
        {([
          ['diccionario', `Diccionario (${pending.length})`],
          ['talleres', 'Talleres'],
          ['vehiculos', 'Vehículos'],
        ] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 text-xs font-semibold py-2 min-h-9 rounded-md ${
              tab === id ? 'bg-accent text-black' : 'text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'diccionario' && (
        <>
          {pending.length === 0 && (
            <Card>
              <p className="text-sm text-muted">Sin propuestas pendientes.</p>
            </Card>
          )}
          {pending.map((t) => (
            <Card key={t.id} accent="warning" className="mb-2">
              <div className="text-sm font-semibold">{t.term}</div>
              <p className="text-xs text-muted mt-1">{t.definition}</p>
              <div className="flex gap-2 mt-2.5">
                <Button variant="secondary" onClick={() => review(t, 'approved')} className="flex items-center justify-center gap-1.5">
                  <Check size={14} /> Aprobar
                </Button>
                <Button variant="danger" onClick={() => review(t, 'rejected')} className="flex items-center justify-center gap-1.5">
                  <X size={14} /> Rechazar
                </Button>
              </div>
            </Card>
          ))}
        </>
      )}

      {tab === 'talleres' && (
        <>
          {workshops.map((w) => {
            const level = levelForPoints(w.points)
            return (
              <Card key={w.id} className="mb-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{w.name}</div>
                  <Badge tone={w.tier === 'paid' ? 'accent' : 'neutral'}>{w.tier.toUpperCase()}</Badge>
                </div>
                <div className="text-[10px] text-muted mt-0.5">
                  {level.label} · {w.points} pts
                </div>
              </Card>
            )
          })}
        </>
      )}

      {tab === 'vehiculos' && (
        <>
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
            </Card>
          ))}
        </>
      )}
    </PageShell>
  )
}
