import type { ReactNode } from 'react'
import { BottomNav } from './BottomNav'

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-bg">
      <header className="sticky top-0 z-40 bg-surface border-b border-border px-3.5 py-2.5">
        <span className="text-xs font-bold tracking-widest text-accent">PITLANE</span>
      </header>
      <main className="flex-1 overflow-y-auto p-3.5">{children}</main>
      <BottomNav />
    </div>
  )
}
