import { useRef, useState } from 'react'
import { Camera, Loader2, ImageUp } from 'lucide-react'
import { scanVinPhoto } from '@/lib/ocr-runner'
import { CameraCropScanner } from './CameraCropScanner'

interface VinPhotoButtonProps {
  onResult: (vin: string | null, rawText: string) => void
}

export function VinPhotoButton({ onResult }: VinPhotoButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function processFile(file: File) {
    setCameraOpen(false)
    setLoading(true)
    try {
      const { vin, rawText } = await scanVinPhoto(file)
      onResult(vin, rawText)
    } catch {
      onResult(null, '')
    } finally {
      setLoading(false)
    }
  }

  async function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) await processFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileInput}
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => setCameraOpen(true)}
        aria-label="Escanear VIN con la cámara"
        title="Escanear VIN con la cámara"
        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border border-border text-accent disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
      </button>

      <CameraCropScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={processFile}
        label="Alinea el VIN dentro del recuadro y captura"
      />

      {cameraOpen && (
        <button
          type="button"
          onClick={() => {
            setCameraOpen(false)
            fileInputRef.current?.click()
          }}
          className="fixed top-4 right-4 z-[110] flex items-center gap-1.5 bg-surface/90 border border-border rounded-lg px-3 py-2 text-xs text-muted"
        >
          <ImageUp size={14} /> Elegir foto
        </button>
      )}
    </>
  )
}
