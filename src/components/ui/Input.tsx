import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Input({ label, id, className = '', ...props }: InputProps) {
  return (
    <div className="mb-2">
      {label && (
        <label htmlFor={id} className="block text-xs text-muted mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full min-h-11 rounded-lg bg-[#0D1117] border border-border text-text px-3 py-2.5 text-sm outline-none focus:border-accent placeholder:text-muted ${className}`}
        {...props}
      />
    </div>
  )
}
