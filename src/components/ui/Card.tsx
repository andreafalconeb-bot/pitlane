import type { HTMLAttributes, ReactNode } from 'react'

type AccentColor = 'accent' | 'success' | 'warning' | 'danger' | 'none'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: AccentColor
  children: ReactNode
}

const ACCENT_CLASSES: Record<AccentColor, string> = {
  accent: 'border-l-[3px] border-l-accent rounded-l-none',
  success: 'border-l-[3px] border-l-success rounded-l-none',
  warning: 'border-l-[3px] border-l-warning rounded-l-none',
  danger: 'border-l-[3px] border-l-danger rounded-l-none',
  none: '',
}

export function Card({ accent = 'none', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-surface border border-border rounded-[10px] p-3.5 ${ACCENT_CLASSES[accent]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
