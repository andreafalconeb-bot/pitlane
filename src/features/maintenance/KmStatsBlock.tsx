import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { formatDateVE } from '@/lib/date'
import { calculateMonthlyKm, projectKmToday } from '@/lib/kmProjection'
import type { ServiceHistoryEntry } from '@/types'

interface KmStatsBlockProps {
  currentKm: number
  kmUpdatedAt: string | null
  kmMonthly: number
  services: ServiceHistoryEntry[]
}

/** km_monthly is what the owner declared at registration (and can rectify
 * later in Editar vehículo) — that's the source of truth for the
 * projection, not something inferred from however many readings happen to
 * be on file. The historical rate is only surfaced as a suggestion, in
 * case it drifts noticeably from what's declared. */
export function KmStatsBlock({ currentKm, kmUpdatedAt, kmMonthly, services }: KmStatsBlockProps) {
  const historicalKm = useMemo(() => {
    const points = services
      .filter((s) => (s.status === 'approved' || s.status === 'modified') && s.km_at_service !== null)
      .map((s) => ({ date: s.date, km: s.km_at_service as number }))

    if (kmUpdatedAt) points.push({ date: kmUpdatedAt.slice(0, 10), km: currentKm })

    return calculateMonthlyKm(points)
  }, [services, kmUpdatedAt, currentKm])

  const projected = projectKmToday(currentKm, kmUpdatedAt, kmMonthly)
  const showRectifyHint = historicalKm !== null && Math.abs(historicalKm - kmMonthly) / Math.max(kmMonthly, 1) > 0.2

  return (
    <Card className="mb-3">
      <div className="text-[10px] font-bold tracking-widest uppercase text-muted mb-2">Kilometraje</div>
      <div className="flex flex-col gap-1.5 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-muted">Última fecha con km registrado</span>
          <span className="font-semibold">{formatDateVE(kmUpdatedAt)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted">Km mensuales calculados</span>
          <span className="font-semibold">{kmMonthly > 0 ? `${kmMonthly.toLocaleString()} km` : '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted">Km proyectados a la fecha de hoy</span>
          <span className="font-semibold text-accent">{projected.toLocaleString()} km</span>
        </div>
      </div>
      {showRectifyHint && (
        <p className="text-[10px] text-warning mt-2.5 pt-2.5 border-t border-border">
          Tu historial reciente sugiere un promedio distinto: ~{historicalKm!.toLocaleString()} km/mes. Puedes
          rectificarlo en Editar vehículo.
        </p>
      )}
    </Card>
  )
}
