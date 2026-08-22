import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import type { Role } from '@/types'

const ROLES: { id: Role; label: string; hint: string }[] = [
  { id: 'client', label: 'Cliente', hint: 'Dueño de vehículo' },
  { id: 'taller_free', label: 'Taller FREE', hint: 'Cuenta gratuita' },
  { id: 'taller_paid', label: 'Taller PAID', hint: 'Cuenta paga' },
  { id: 'master', label: 'Master', hint: 'MAD 4 Performance' },
]

export function RegisterPage() {
  const signUp = useAuthStore((s) => s.signUp)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('client')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signUp(email, password, name, role)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-center px-5 py-8 bg-bg">
      <div className="mb-6 text-center">
        <div className="text-lg font-bold tracking-widest text-accent">PITLANE</div>
        <div className="text-xs text-muted mt-1">Crear cuenta</div>
      </div>
      <form onSubmit={handleSubmit}>
        <Input id="name" label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input
          id="email"
          label="Correo"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <Input
          id="password"
          label="Contraseña"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          minLength={6}
          required
        />

        <label className="block text-xs text-muted mb-1.5 mt-1">Tipo de cuenta</label>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {ROLES.map((r) => (
            <button
              type="button"
              key={r.id}
              onClick={() => setRole(r.id)}
              className={`text-left rounded-lg border px-3 py-2.5 min-h-11 ${
                role === r.id ? 'border-accent bg-accent/10' : 'border-border bg-surface'
              }`}
            >
              <div className="text-xs font-semibold">{r.label}</div>
              <div className="text-[10px] text-muted">{r.hint}</div>
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-danger mb-3">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
      <p className="text-xs text-muted text-center mt-4">
        ¿Ya tienes cuenta?{' '}
        <Link to="/login" className="text-accent font-semibold">
          Ingresa
        </Link>
      </p>
    </div>
  )
}
