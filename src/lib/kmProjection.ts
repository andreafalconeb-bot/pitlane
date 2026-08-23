const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44

export interface KmDataPoint {
  date: string
  km: number
}

/**
 * Average km/month from the vehicle's actual recorded readings (earliest
 * vs. latest date+km on file), not a manually-typed guess. Needs at least
 * two readings spanning some real time to mean anything.
 */
export function calculateMonthlyKm(points: KmDataPoint[]): number | null {
  const valid = points.filter((p) => p.date && Number.isFinite(p.km))
  if (valid.length < 2) return null

  const sorted = [...valid].sort((a, b) => a.date.localeCompare(b.date))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]

  const monthsBetween = (new Date(last.date).getTime() - new Date(first.date).getTime()) / MS_PER_MONTH
  const kmDelta = last.km - first.km
  if (monthsBetween < 0.5 || kmDelta <= 0) return null

  return Math.round(kmDelta / monthsBetween)
}

/** Projects today's likely km from the last confirmed reading plus the
 * calculated monthly rate — an estimate for when the owner hasn't logged
 * a fresh reading in a while. */
export function projectKmToday(lastKm: number, lastDate: string | null, monthlyKm: number | null): number {
  if (!lastDate || monthlyKm === null) return lastKm
  const monthsElapsed = (Date.now() - new Date(lastDate).getTime()) / MS_PER_MONTH
  if (monthsElapsed <= 0) return lastKm
  return Math.round(lastKm + monthlyKm * monthsElapsed)
}
