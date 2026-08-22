import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'

interface CameraCropScannerProps {
  open: boolean
  onClose: () => void
  onCapture: (file: File) => void
  label?: string
  /** width / height of the guide box, tuned per use case (e.g. a VIN plate is a wide single line). */
  aspectRatio?: number
}

const GUIDE_WIDTH_FRACTION = 0.82
const DEFAULT_ASPECT_RATIO = 4.2

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * Full-screen live camera view with a fixed guide box overlay — point the
 * camera at a short code/field on a document (VIN, a policy number, etc.)
 * and capture just that region instead of a whole-page photo. The video
 * renders with object-fit: contain (never cropped by the browser), so the
 * guide box's fraction of the rendered video maps 1:1 to the same fraction
 * of the actual video resolution — no coordinate-space conversion needed
 * for the capture crop, only for drawing the overlay in the right place.
 */
export function CameraCropScanner({ open, onClose, onCapture, label, aspectRatio }: CameraCropScannerProps) {
  const ratio = aspectRatio ?? DEFAULT_ASPECT_RATIO
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [guideRect, setGuideRect] = useState<Rect | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
      } catch {
        if (!cancelled) setError('No se pudo acceder a la cámara. Revisa los permisos del navegador.')
      }
    }

    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open])

  function updateGuideRect() {
    const video = videoRef.current
    const container = containerRef.current
    if (!video || !container || !video.videoWidth) return

    const videoAspect = video.videoWidth / video.videoHeight
    const containerAspect = container.clientWidth / container.clientHeight

    const renderedWidth = videoAspect > containerAspect ? container.clientWidth : container.clientHeight * videoAspect
    const renderedHeight = videoAspect > containerAspect ? container.clientWidth / videoAspect : container.clientHeight
    const renderedLeft = (container.clientWidth - renderedWidth) / 2
    const renderedTop = (container.clientHeight - renderedHeight) / 2

    const guideWidth = renderedWidth * GUIDE_WIDTH_FRACTION
    const guideHeight = guideWidth / ratio

    setGuideRect({
      left: renderedLeft + (renderedWidth - guideWidth) / 2,
      top: renderedTop + (renderedHeight - guideHeight) / 2,
      width: guideWidth,
      height: guideHeight,
    })
  }

  function handleCapture() {
    const video = videoRef.current
    if (!video || !video.videoWidth) return

    const cropW = video.videoWidth * GUIDE_WIDTH_FRACTION
    const cropH = cropW / ratio
    const cropX = (video.videoWidth - cropW) / 2
    const cropY = (video.videoHeight - cropH) / 2

    const canvas = document.createElement('canvas')
    canvas.width = cropW
    canvas.height = cropH
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

    canvas.toBlob((blob) => {
      if (blob) onCapture(new File([blob], 'captura.png', { type: 'image/png' }))
    }, 'image/png')
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={updateGuideRect}
          className="w-full h-full object-contain"
        />
        {guideRect && !error && (
          <div
            className="absolute border-2 border-accent rounded-lg pointer-events-none"
            style={{
              left: guideRect.left,
              top: guideRect.top,
              width: guideRect.width,
              height: guideRect.height,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
            }}
          />
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="text-sm text-warning text-center">{error}</p>
          </div>
        )}
      </div>

      <div className="bg-bg px-4 pt-3 pb-6">
        <p className="text-xs text-muted text-center mb-3">{label ?? 'Alinea el texto dentro del recuadro'}</p>
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="min-w-11 min-h-11 flex items-center justify-center text-muted"
          >
            <X size={22} />
          </button>
          <button
            onClick={handleCapture}
            disabled={!!error}
            aria-label="Capturar"
            className="w-16 h-16 rounded-full bg-accent flex items-center justify-center disabled:opacity-40"
          >
            <Camera size={26} className="text-black" />
          </button>
          <div className="w-11" />
        </div>
      </div>
    </div>
  )
}
