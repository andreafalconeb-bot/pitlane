import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { DateInputVE } from '@/components/ui/DateInputVE'
import { supabase } from '@/lib/supabase'
import { itemsForPlan } from '@/lib/maintenance'
import { computePlanItemSeed } from '@/lib/planSeeding'
import type { MaintCatalogItem, MaintPlan } from '@/types'

interface ItemOverrideState {
  expanded?: boolean
  dueKm?: string
  dueDate?: string
  kmIntervalOverride?: string
  monthIntervalOverride?: string
}

interface PlanOnboardingStepProps {
  vin: string
  plan: MaintPlan
  currentKm: number
  onDone: () => void
}

/**
 * A freshly registered used vehicle didn't have every maintenance item
 * done on the same day it was registered — asking "when's each one due"
 * up front (or defaulting to 50% of its interval when the owner doesn't
 * know) keeps every alarm from starting out wrong.
 */
export function PlanOnboardingStep({ vin, plan, currentKm, onDone }: PlanOnboardingStepProps) {
  const items = useMemo(() => itemsForPlan(plan), [plan])
  const [overrides, setOverrides] = useState<Record<string, ItemOverrideState>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categories = useMemo(() => {
    const byCategory = new Map<string, MaintCatalogItem[]>()
    for (const item of items) {
      const list = byCategory.get(item.category) ?? []
      list.push(item)
      byCategory.set(item.category, list)
    }
    return [...byCategory.entries()]
  }, [items])

  function patch(id: string, p: Partial<ItemOverrideState>) {
    setOverrides((o) => ({ ...o, [id]: { ...o[id], ...p } }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    const rows = items.map((item) => {
      const ov = overrides[item.id] ?? {}
      const seed = computePlanItemSeed(
        {
          catalogId: item.id,
          kmInterval: item.km_interval,
          monthInterval: item.month_interval,
          dueKm: item.km_interval ? ov.dueKm : undefined,
          dueDate: !item.km_interval ? ov.dueDate : undefined,
          kmIntervalOverride: ov.kmIntervalOverride,
          monthIntervalOverride: ov.monthIntervalOverride,
        },
        currentKm,
      )
      return { vin, ...seed }
    })

    const { error: upsertErr } = await supabase.from('vehicle_maint').upsert(rows, { onConflict: 'vin,catalog_id' })
    setSaving(false)
    if (upsertErr) {
      setError(upsertErr.message)
      return
    }
    onDone()
  }

  return (
    <div>
      <h1 className="text-lg font-semibold mb-1">¿Cuándo le toca cada servicio?</h1>
      <p className="text-xs text-muted mb-3">
        Un vehículo usado no tuvo todo su mantenimiento hecho el mismo día. Indica el kilometraje o la fecha del
        próximo servicio donde lo sepas — lo que dejes en blanco queda a la mitad de su intervalo por defecto, no en
        cero.
      </p>

      {error && <p className="text-xs text-danger mb-3">{error}</p>}

      {categories.map(([category, catItems]) => (
        <div key={category} className="mb-4">
          <div className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2">{category}</div>
          {catItems.map((item) => {
            const ov = overrides[item.id] ?? {}
            const touched = item.km_interval ? !!ov.dueKm : !!ov.dueDate
            return (
              <Card key={item.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => patch(item.id, { expanded: !ov.expanded })}
                  className="w-full flex justify-between items-center gap-2 min-h-9"
                >
                  <span className="text-xs font-medium text-left">{item.label}</span>
                  <span className="text-[10px] font-semibold text-muted flex items-center gap-1 shrink-0">
                    {touched ? 'Indicado' : 'No sé (50%)'}
                    {ov.expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </span>
                </button>

                {ov.expanded && (
                  <div className="mt-2 pt-2 border-t border-border">
                    {item.km_interval ? (
                      <Input
                        id={`due-km-${item.id}`}
                        label={`Próximo servicio a los... km (estándar cada ${item.km_interval.toLocaleString()} km)`}
                        type="number"
                        placeholder="Déjalo vacío si no sabes"
                        value={ov.dueKm ?? ''}
                        onChange={(e) => patch(item.id, { dueKm: e.target.value })}
                      />
                    ) : (
                      <DateInputVE
                        id={`due-date-${item.id}`}
                        label={`Próximo servicio el... (estándar cada ${item.month_interval} meses)`}
                        value={ov.dueDate ?? ''}
                        onChange={(v) => patch(item.id, { dueDate: v })}
                      />
                    )}
                    <div className={item.km_interval ? 'grid grid-cols-2 gap-2' : ''}>
                      {item.km_interval && (
                        <Input
                          id={`km-int-${item.id}`}
                          label="Cada cuántos km (opcional)"
                          type="number"
                          placeholder={String(item.km_interval)}
                          value={ov.kmIntervalOverride ?? ''}
                          onChange={(e) => patch(item.id, { kmIntervalOverride: e.target.value })}
                        />
                      )}
                      <Input
                        id={`mo-int-${item.id}`}
                        label="Cada cuántos meses (opcional)"
                        type="number"
                        placeholder={String(item.month_interval)}
                        value={ov.monthIntervalOverride ?? ''}
                        onChange={(e) => patch(item.id, { monthIntervalOverride: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ))}

      <Button onClick={handleSave} disabled={saving}>
        {saving ? 'Guardando…' : 'Continuar'}
      </Button>
    </div>
  )
}
