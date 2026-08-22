import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginPage() {
  const signIn = useAuthStore((s) => s.signIn)
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col justify-center px-5 bg-bg">
      <div className="mb-8 text-center">
        <div className="text-lg font-bold tracking-widest text-accent">PITLANE</div>
        <div className="text-xs text-muted mt-1">MAD 4 Performance</div>
      </div>
      <form onSubmit={handleSubmit}>
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
          autoComplete="current-password"
          required
        />
        {error && <p className="text-xs text-danger mb-3">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
      <p className="text-xs text-muted text-center mt-4">
        ¿No tienes cuenta?{' '}
        <Link to="/registro" className="text-accent font-semibold">
          Regístrate
        </Link>
      </p>
    </div>
  )
}
