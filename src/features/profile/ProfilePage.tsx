import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'

export function ProfilePage() {
  const profile = useAuthStore((s) => s.profile)
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <PageShell>
      <h1 className="text-lg font-semibold mb-3">Perfil</h1>
      <Card className="mb-3">
        <div className="text-sm font-semibold">{profile?.name}</div>
        <div className="text-xs text-muted mt-0.5">{profile?.email}</div>
        <div className="text-xs text-muted mt-0.5">{profile?.phone ?? 'Sin teléfono'}</div>
      </Card>
      <Button variant="secondary" onClick={() => signOut()}>
        Cerrar sesión
      </Button>
    </PageShell>
  )
}
