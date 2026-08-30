const MS_PER_MONTH = 1000 * 60 * 60 * 24 * 30.44

/** ISO date `months` in the past, from today. */
export function isoDateMonthsAgo(months: number): string {
  return new Date(Date.now() - months * MS_PER_MONTH).toISOString().slice(0, 10)
}

/** ISO date `months` before another ISO date. */
export function isoDateMinusMonths(dateIso: string, months: number): string {
  return new Date(new Date(`${dateIso}T00:00:00`).getTime() - months * MS_PER_MONTH).toISOString().slice(0, 10)
}

export interface PlanItemSeedInput {
  catalogId: string
  /** null when the item has no km-based interval at all. */
  kmInterval: number | null
  monthInterval: number
  /** Owner-declared "next service due at this km" — blank/undefined means "no sé". */
  dueKm?: string
  /** Owner-declared "next service due on this date" — used for km-less (time-only) items. */
  dueDate?: string
  /** Owner's own interval, overriding the catalog default — blank means keep the default. */
  kmIntervalOverride?: string
  monthIntervalOverride?: string
}

export interface PlanItemSeedRow {
  catalog_id: string
  last_km: number | null
  last_date: string
  km_interval_override: number | null
  month_interval_override: number | null
}

/**
 * A freshly registered used vehicle almost never had every maintenance
 * item done on the same day — assuming so (the old behavior: no
 * vehicle_maint row at all, which reads as "0% used, just serviced")
 * quietly gets every alarm wrong. Absent a real answer from the owner,
 * every item starts at 50% of its interval instead — a neutral middle
 * ground — and an owner who *does* know the next due km/date gets that
 * used as the source of truth instead.
 */
export function computePlanItemSeed(input: PlanItemSeedInput, currentKm: number): PlanItemSeedRow {
  const kmInterval = input.kmIntervalOverride ? parseInt(input.kmIntervalOverride, 10) : input.kmInterval
  const monthInterval = input.monthIntervalOverride ? parseInt(input.monthIntervalOverride, 10) : input.monthInterval

  let lastKm: number | null = null
  if (kmInterval) {
    lastKm = input.dueKm ? parseInt(input.dueKm, 10) - kmInterval : Math.max(0, currentKm - Math.round(kmInterval / 2))
  }

  const lastDate = input.dueDate ? isoDateMinusMonths(input.dueDate, monthInterval) : isoDateMonthsAgo(monthInterval / 2)

  return {
    catalog_id: input.catalogId,
    last_km: lastKm,
    last_date: lastDate,
    km_interval_override: input.kmIntervalOverride ? parseInt(input.kmIntervalOverride, 10) : null,
    month_interval_override: input.monthIntervalOverride ? parseInt(input.monthIntervalOverride, 10) : null,
  }
}
