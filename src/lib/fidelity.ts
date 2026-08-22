import type { WorkshopLevel } from '@/types'

export interface LevelInfo {
  id: WorkshopLevel
  label: string
  min: number
  discount: number
}

export const LEVELS: LevelInfo[] = [
  { id: 'basico', label: 'Básico', min: 0, discount: 0 },
  { id: 'tecnico', label: 'Técnico', min: 300, discount: 15 },
  { id: 'especialista', label: 'Especialista', min: 700, discount: 35 },
  { id: 'experto', label: 'Experto', min: 1500, discount: 55 },
  { id: 'master', label: 'Master', min: 2500, discount: 70 },
]

export function levelForPoints(points: number): LevelInfo {
  return [...LEVELS].reverse().find((l) => points >= l.min) ?? LEVELS[0]
}

export function nextLevel(points: number): LevelInfo | null {
  return LEVELS.find((l) => l.min > points) ?? null
}
