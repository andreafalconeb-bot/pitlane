import { useEffect, useRef, useState } from 'react'
import { Upload, FileText, ExternalLink } from 'lucide-react'
import { PageShell } from '@/components/layout/PageShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/auth'
import type { DocType, Vehicle, VehicleDocument } from '@/types'

const DOC_TYPE_LABEL: Record<DocType, string> = {
  carnet: 'Carnet de circulación',
  titulo: 'Título de propiedad',
  otro: 'Otro',
}

const MAX_SIZE = 10 * 1024 * 1024

export function DocumentsPage() {
  const userId = useAuthStore((s) => s.userId)
  const profile = useAuthStore((s) => s.profile)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [selectedVin, setSelectedVin] = useState<string | null>(null)
  const [docs, setDocs] = useState<VehicleDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isOwner = !!selectedVin && vehicles.find((v) => v.vin === selectedVin)?.current_owner === userId

  useEffect(() => {
    if (!userId) return
    supabase
      .from('vehicles')
      .select('*')
      .eq('current_owner', userId)
      .then(({ data }) => {
        const list = (data as Vehicle[]) ?? []
        setVehicles(list)
        setSelectedVin((prev) => prev ?? list[0]?.vin ?? null)
        setLoading(false)
      })
  }, [userId])

  async function reloadDocs() {
    if (!selectedVin) return
    const { data } = await supabase
      .from('vehicle_documents')
      .select('*')
      .eq('vin', selectedVin)
      .eq('active', true)
      .order('created_at', { ascending: false })
    setDocs((data as VehicleDocument[]) ?? [])
  }

  useEffect(() => {
    reloadDocs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVin])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !selectedVin || !userId) return
    setError(null)

    if (file.size > MAX_SIZE) {
      setError('El archivo supera 10MB.')
      return
    }

    setUploading(true)
    try {
      const path = `${userId}/${selectedVin}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('vehicle-documents').upload(path, file)
      if (upErr) throw upErr

      // The bucket is private — file_url stores the storage path, and a
      // signed URL is minted on demand when someone opens the document.
      const { error: insErr } = await supabase.from('vehicle_documents').insert({
        vin: selectedVin,
        owner_id: userId,
        doc_type: 'otro',
        file_url: path,
        file_name: file.name,
        mime_type: file.type,
        file_size_kb: Math.round(file.size / 1024),
        active: true,
      })
      if (insErr) throw insErr

      await reloadDocs()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el documento')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleView(doc: VehicleDocument) {
    const { data, error: signErr } = await supabase.storage
      .from('vehicle-documents')
      .createSignedUrl(doc.file_url, 60)
    if (signErr || !data) {
      setError('No se pudo abrir el documento')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  if (loading) {
    return (
      <PageShell>
        <p className="text-sm text-muted">Cargando…</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <h1 className="text-lg font-semibold mb-3">Documentos</h1>

      {vehicles.length === 0 && (
        <Card>
          <p className="text-sm text-muted">
            {profile?.role === 'client'
              ? 'Aún no tienes vehículos registrados.'
              : 'Solo el propietario puede subir documentos. Aquí verás los de vehículos donde tengas acceso.'}
          </p>
        </Card>
      )}

      {vehicles.length > 1 && (
        <div className="flex gap-2 mb-3 overflow-x-auto">
          {vehicles.map((v) => (
            <button
              key={v.vin}
              onClick={() => setSelectedVin(v.vin)}
              className={`shrink-0 text-xs font-semibold px-3 py-2 min-h-11 rounded-lg border ${
                v.vin === selectedVin ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted'
              }`}
            >
              {v.brand} {v.model}
            </button>
          ))}
        </div>
      )}

      {selectedVin && isOwner && (
        <div className="mb-3">
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleUpload} />
          <Button
            variant="secondary"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="flex items-center justify-center gap-2"
          >
            <Upload size={16} /> {uploading ? 'Subiendo…' : 'Subir documento'}
          </Button>
          {error && <p className="text-xs text-danger mt-2">{error}</p>}
        </div>
      )}

      {selectedVin && docs.length === 0 && (
        <Card>
          <p className="text-sm text-muted">Sin documentos para este vehículo.</p>
        </Card>
      )}

      {docs.map((doc) => (
        <Card key={doc.id} className="mb-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText size={16} className="text-muted shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{doc.file_name}</div>
                <div className="text-[10px] text-muted mt-0.5">{doc.file_size_kb} KB</div>
              </div>
            </div>
            <Badge tone="neutral">{DOC_TYPE_LABEL[doc.doc_type ?? 'otro']}</Badge>
            <button
              onClick={() => handleView(doc)}
              className="min-w-11 min-h-11 flex items-center justify-center text-accent"
              aria-label="Ver documento"
            >
              <ExternalLink size={16} />
            </button>
          </div>
        </Card>
      ))}
    </PageShell>
  )
}
