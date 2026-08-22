import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { scanVehicleDocument } from '@/lib/ocr-runner'
import type { VehicleData } from '@/lib/ocr'
import { Button } from '@/components/ui/Button'

interface DocumentScannerProps {
  onResult: (data: VehicleData) => void
}

export function DocumentScanner({ onResult }: DocumentScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setScanning(true)
    try {
      const data = await scanVehicleDocument(file)
      if (!data.vin && !data.plate) {
        setError('No se pudieron leer los datos. Intenta con mejor luz o de forma manual.')
      }
      onResult(data)
    } catch {
      setError('Error al procesar el documento. Intenta de nuevo.')
    } finally {
      setScanning(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={scanning}
        onClick={() => inputRef.current?.click()}
        className="flex items-center justify-center gap-2"
      >
        {scanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
        {scanning ? 'Leyendo documento…' : 'Escanear certificado (Cédula/INTT)'}
      </Button>
      {error && <p className="text-xs text-warning mt-2">{error}</p>}
    </div>
  )
}
