import type { ReactNode } from 'react'

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

interface BadgeProps {
  tone?: Tone
  children: ReactNode
}

const TONE_CLASSES: Record<Tone, string> = {
  accent: 'bg-accent/15 text-accent border-accent/30',
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  neutral: 'bg-muted/15 text-muted border-muted/30',
}

export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  )
}
