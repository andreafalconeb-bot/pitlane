import { useState } from 'react'

interface KmRateFieldProps {
  /** Always stored/reported as a monthly rate, regardless of which field the owner edits. */
  valueMonthly: number
  onChange: (monthly: number) => void
  label?: string
}

/** Lets the owner declare their usage as km/mes AND km/año — both fields are
 * editable at once; editing either one recalculates the other from it. Only
 * the monthly figure is stored, which is what the projection math uses. */
export function KmRateField({ valueMonthly, onChange, label }: KmRateFieldProps) {
  const [monthText, setMonthText] = useState(valueMonthly ? String(valueMonthly) : '')
  const [yearText, setYearText] = useState(valueMonthly ? String(valueMonthly * 12) : '')

  function handleMonthInput(raw: string) {
    setMonthText(raw)
    const n = raw ? parseInt(raw, 10) : 0
    setYearText(raw ? String(n * 12) : '')
    onChange(n)
  }

  function handleYearInput(raw: string) {
    setYearText(raw)
    const n = raw ? parseInt(raw, 10) : 0
    const monthly = raw ? Math.round(n / 12) : 0
    setMonthText(raw ? String(monthly) : '')
    onChange(monthly)
  }

  return (
    <div className="mb-2">
      <label className="text-xs text-muted block mb-1.5">{label ?? '¿Cuánto recorres normalmente?'}</label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[10px] text-muted block mb-1">Km/mes</span>
          <input
            type="number"
            value={monthText}
            onChange={(e) => handleMonthInput(e.target.value)}
            placeholder="ej. 1000"
            className="w-full min-h-11 rounded-lg bg-[#0D1117] border border-border text-text px-3 py-2.5 text-sm outline-none focus:border-accent placeholder:text-muted"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted block mb-1">Km/año</span>
          <input
            type="number"
            value={yearText}
            onChange={(e) => handleYearInput(e.target.value)}
            placeholder="ej. 12000"
            className="w-full min-h-11 rounded-lg bg-[#0D1117] border border-border text-text px-3 py-2.5 text-sm outline-none focus:border-accent placeholder:text-muted"
          />
        </div>
      </div>
    </div>
  )
}
