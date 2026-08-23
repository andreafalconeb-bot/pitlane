import { useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { formatDateVE } from '@/lib/date'
import { calculateMonthlyKm, projectKmToday } from '@/lib/kmProjection'
import type { ServiceHistoryEntry } from '@/types'

interface KmStatsBlockProps {
  currentKm: number
  kmUpdatedAt: string | null
  services: ServiceHistoryEntry[]
}

export function KmStatsBlock({ currentKm, kmUpdatedAt, services }: KmStatsBlockProps) {
  const monthlyKm = useMemo(() => {
    const points = services
      .filter((s) => (s.status === 'approved' || s.status === 'modified') && s.km_at_service !== null)
      .map((s) => ({ date: s.date, km: s.km_at_service as number }))

    if (kmUpdatedAt) points.push({ date: kmUpdatedAt.slice(0, 10), km: currentKm })

    return calculateMonthlyKm(points)
  }, [services, kmUpdatedAt, currentKm])

  const projected = projectKmToday(currentKm, kmUpdatedAt, monthlyKm)

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
          <span className="font-semibold">{monthlyKm !== null ? `${monthlyKm.toLocaleString()} km` : '—'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted">Km proyectados a la fecha de hoy</span>
          <span className="font-semibold text-accent">{projected.toLocaleString()} km</span>
        </div>
      </div>
    </Card>
  )
}
