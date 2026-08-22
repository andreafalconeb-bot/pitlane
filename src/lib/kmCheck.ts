import type { KmCheckFreq } from '@/types'

const FREQ_DAYS: Record<KmCheckFreq, number | null> = {
  never: null,
  monthly: 30,
  quarterly: 90,
}

/** Whenever a service is logged with a fresh odometer reading (or the
 * owner updates km_current directly), the "ask again" clock resets from
 * that moment — no point asking again right after we just got a real
 * reading. */
export function isKmCheckDue(updatedAt: string | null, freq: KmCheckFreq): boolean {
  const days = FREQ_DAYS[freq]
  if (days === null || !updatedAt) return false
  const dueAt = new Date(updatedAt).getTime() + days * 24 * 60 * 60 * 1000
  return Date.now() >= dueAt
}
