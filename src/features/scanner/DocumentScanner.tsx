import { useRef, useState } from 'react'
import { Camera, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { scanVehicleDocument } from '@/lib/ocr-runner'
import type { VehicleData } from '@/lib/ocr'
import { Button } from '@/components/ui/Button'

interface DocumentScannerProps {
  onResult: (data: VehicleData) => void
}

export function DocumentScanner({ onResult }: DocumentScannerProps) {
  const docInputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  async function handleDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setRawText(null)
    setScanning(true)
    try {
      const { data, rawText: text } = await scanVehicleDocument(file)
      setRawText(text)
      if (!data.vin && !data.plate) {
        setError(
          'No se pudieron leer los datos automáticamente. Revisa el texto detectado abajo, o completa el formulario a mano.',
        )
      } else if (!data.vin) {
        setError('Se leyeron los datos del vehículo, pero no el VIN. Usa el botón de cámara junto al campo VIN.')
      }
      onResult(data)
    } catch {
      setError('Error al procesar el documento. Intenta de nuevo.')
    } finally {
      setScanning(false)
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={docInputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={handleDocFile}
      />

      <Button
        type="button"
        variant="secondary"
        disabled={scanning}
        onClick={() => docInputRef.current?.click()}
        className="flex items-center justify-center gap-2"
      >
        {scanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {scanning ? 'Leyendo documento…' : 'Escanear certificado (Cédula/INTT)'}
      </Button>

      {error && <p className="text-xs text-warning mt-2">{error}</p>}

      {rawText && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowRaw((v) => !v)}
            className="text-[10px] text-muted flex items-center gap-1 min-h-8"
          >
            {showRaw ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Ver texto detectado
          </button>
          {showRaw && (
            <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words bg-[#0D1117] border border-border rounded-lg p-2 text-[10px] text-muted">
              {rawText}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
