import { useState } from 'react'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { exportHistoryExcel, exportHistoryPdf, type ExportVehicleInfo } from '@/lib/exportHistory'
import type { ServiceHistoryEntry } from '@/types'

type ExportFormat = 'pdf' | 'excel'

interface ExportHistorySheetProps {
  open: boolean
  vehicle: ExportVehicleInfo
  services: ServiceHistoryEntry[]
  onClose: () => void
}

export function ExportHistorySheet({ open, vehicle, services, onClose }: ExportHistorySheetProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf')
  const [includeDocs, setIncludeDocs] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleExport() {
    setExporting(true)
    setError(null)
    try {
      if (format === 'pdf') await exportHistoryPdf(vehicle, services, includeDocs)
      else await exportHistoryExcel(vehicle, services, includeDocs)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el archivo')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Exportar historial">
      <label className="block text-xs text-muted mb-1.5">Formato</label>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(
          [
            { id: 'pdf', label: 'PDF' },
            { id: 'excel', label: 'Excel' },
          ] as const
        ).map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setFormat(o.id)}
            className={`text-sm font-semibold py-2.5 min-h-11 rounded-lg border ${
              format === o.id ? 'border-accent text-accent bg-accent/10' : 'border-border text-muted'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setIncludeDocs((v) => !v)}
        className="w-full flex items-center justify-between mb-1.5 min-h-11"
      >
        <span className="text-xs text-muted text-left">Incluir documentos de soporte (facturas, notas)</span>
        <span
          className={`shrink-0 ml-3 w-11 h-6 rounded-full border transition relative ${
            includeDocs ? 'border-accent bg-accent/30' : 'border-border bg-transparent'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-accent transition-all ${
              includeDocs ? 'left-5.5' : 'left-0.5'
            }`}
          />
        </span>
      </button>
      <p className="text-[10px] text-muted mb-4">
        {format === 'excel'
          ? 'Con Excel, los documentos se entregan aparte: un PDF con las imágenes en orden cronológico, cada una con la fecha del servicio.'
          : 'Cada documento disponible se agrega al final del PDF, en orden cronológico, con la fecha del servicio correspondiente.'}
      </p>

      {error && <p className="text-xs text-danger mb-3">{error}</p>}
      <Button onClick={handleExport} disabled={exporting}>
        {exporting ? 'Generando…' : 'Exportar'}
      </Button>
    </Sheet>
  )
}
