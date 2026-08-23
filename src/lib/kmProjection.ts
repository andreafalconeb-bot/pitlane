const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44

export interface KmDataPoint {
  date: string
  km: number
}

/**
 * Average km/month from the vehicle's actual recorded readings, fit by
 * ordinary least squares across every point rather than just comparing the
 * earliest and latest — a single unusual reading (a road trip month, a
 * data-entry slip) moves a two-point comparison a lot; least squares barely
 * moves, since it's weighing that point against every other one too.
 * Needs at least 3 readings to be worth fitting a line to.
 */
export function calculateMonthlyKm(points: KmDataPoint[]): number | null {
  const valid = points.filter((p) => p.date && Number.isFinite(p.km))
  if (valid.length < 3) return null

  const sorted = [...valid].sort((a, b) => a.date.localeCompare(b.date))
  const day0 = new Date(sorted[0].date).getTime()
  const xs = sorted.map((p) => (new Date(p.date).getTime() - day0) / MS_PER_MONTH)
  const ys = sorted.map((p) => p.km)

  const n = xs.length
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n

  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY)
    den += (xs[i] - meanX) ** 2
  }
  if (den === 0) return null

  const slopePerMonth = num / den
  return slopePerMonth > 0 ? Math.round(slopePerMonth) : null
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

/** Same idea, but for an arbitrary target date — forward or backward from
 * the anchor reading — so a backdated entry can be checked against what
 * the trend says km should have been on that day. */
export function projectKmAtDate(
  anchorKm: number,
  anchorDate: string | null,
  monthlyKm: number | null,
  targetDate: string,
): number | null {
  if (!anchorDate || monthlyKm === null) return null
  const monthsDiff = (new Date(targetDate).getTime() - new Date(anchorDate).getTime()) / MS_PER_MONTH
  return Math.round(anchorKm + monthlyKm * monthsDiff)
}
