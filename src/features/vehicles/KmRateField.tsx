import { useState } from 'react'

interface KmRateFieldProps {
  /** Always stored/reported as a monthly rate, regardless of the unit shown. */
  valueMonthly: number
  onChange: (monthly: number) => void
  label?: string
}

/** Lets the owner declare their usage as either km/month or km/año — either
 * way it's converted to and stored as a monthly rate, which is what the
 * projection math uses. */
export function KmRateField({ valueMonthly, onChange, label }: KmRateFieldProps) {
  const [unit, setUnit] = useState<'mensual' | 'anual'>('mensual')
  const displayed = unit === 'anual' ? valueMonthly * 12 : valueMonthly

  function handleInput(raw: string) {
    const n = raw ? parseInt(raw, 10) : 0
    onChange(unit === 'anual' ? Math.round(n / 12) : n)
  }

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs text-muted">{label ?? '¿Cuánto recorres normalmente?'}</label>
        <div className="flex gap-1">
          {(['mensual', 'anual'] as const).map((u) => (
            <button
              type="button"
              key={u}
              onClick={() => setUnit(u)}
              className={`text-[10px] font-semibold px-2 py-1 min-h-7 rounded border ${
                unit === u ? 'border-accent text-accent' : 'border-border text-muted'
              }`}
            >
              {u === 'mensual' ? 'Km/mes' : 'Km/año'}
            </button>
          ))}
        </div>
      </div>
      <input
        type="number"
        value={displayed || ''}
        onChange={(e) => handleInput(e.target.value)}
        placeholder={unit === 'anual' ? 'ej. 12000' : 'ej. 1000'}
        className="w-full min-h-11 rounded-lg bg-[#0D1117] border border-border text-text px-3 py-2.5 text-sm outline-none focus:border-accent placeholder:text-muted"
      />
    </div>
  )
}
