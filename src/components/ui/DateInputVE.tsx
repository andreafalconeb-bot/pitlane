import { useEffect, useState } from 'react'

interface DateInputVEProps {
  id: string
  label?: string
  /** ISO yyyy-mm-dd, same as a native date input's value. */
  value: string
  onChange: (isoDate: string) => void
  required?: boolean
}

function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

function displayToIso(display: string): string | null {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match
  return `${y}-${m}-${d}`
}

/**
 * A native <input type="date"> renders its typed value in whatever format
 * the browser/OS locale dictates — often mm/dd/yyyy regardless of the
 * page's own language. This is a plain masked text field instead, so
 * dd/mm/aaaa is guaranteed everywhere, not just wherever the visitor's
 * locale happens to agree with us.
 */
export function DateInputVE({ id, label, value, onChange, required }: DateInputVEProps) {
  const [text, setText] = useState(isoToDisplay(value))

  useEffect(() => {
    setText(isoToDisplay(value))
  }, [value])

  function handleChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 8)
    let formatted = digits
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`
    setText(formatted)

    const iso = displayToIso(formatted)
    if (iso) onChange(iso)
  }

  return (
    <div className="mb-2">
      {label && (
        <label htmlFor={id} className="block text-xs text-muted mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        required={required}
        className="w-full min-h-11 rounded-lg bg-[#0D1117] border border-border text-text px-3 py-2.5 text-sm outline-none focus:border-accent placeholder:text-muted"
      />
    </div>
  )
}
