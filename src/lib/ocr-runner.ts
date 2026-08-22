import { createWorker } from 'tesseract.js'
import { extraerDatosINTT, preprocessImageForOCR, type VehicleData } from './ocr'

export async function scanVehicleDocument(file: File): Promise<VehicleData> {
  const dataUrl = await loadAsImageDataUrl(file)
  const img = await loadImage(dataUrl)
  const processed = preprocessImageForOCR(img)

  const worker = await createWorker('spa+eng')
  try {
    const { data } = await worker.recognize(processed)
    return extraerDatosINTT(data.text)
  } finally {
    await worker.terminate()
  }
}

function loadAsImageDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'))
    img.src = src
  })
}
