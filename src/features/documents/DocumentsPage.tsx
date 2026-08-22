import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'

export function DocumentsPage() {
  return (
    <PageShell>
      <h1 className="text-lg font-semibold mb-3">Documentos</h1>
      <Card>
        <p className="text-sm text-muted">Selecciona un vehículo para ver sus documentos.</p>
      </Card>
    </PageShell>
  )
}
