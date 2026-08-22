import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { scanVinPhoto } from '@/lib/ocr-runner'

interface VinPhotoButtonProps {
  onResult: (vin: string | null, rawText: string) => void
}

export function VinPhotoButton({ onResult }: VinPhotoButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const { vin, rawText } = await scanVinPhoto(file)
      onResult(vin, rawText)
    } catch {
      onResult(null, '')
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
        aria-label="Tomar foto del VIN"
        title="Tomar foto del VIN"
        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border border-border text-accent disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
      </button>
    </>
  )
}
