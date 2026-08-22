import { createWorker } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { extraerDatosINTT, preprocessImageForOCR, type VehicleData } from './ocr'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export async function scanVehicleDocument(file: File): Promise<VehicleData> {
  const img = file.type === 'application/pdf' ? await renderPdfFirstPage(file) : await loadImageFromFile(file)
  const processed = preprocessImageForOCR(img)

  const worker = await createWorker('spa+eng')
  try {
    const { data } = await worker.recognize(processed)
    return extraerDatosINTT(data.text)
  } finally {
    await worker.terminate()
  }
}

async function renderPdfFirstPage(file: File): Promise<HTMLImageElement> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const page = await pdf.getPage(1)
  const viewport = page.getViewport({ scale: 2.5 })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  return loadImage(canvas.toDataURL('image/png'))
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const dataUrl = await loadAsImageDataUrl(file)
  return loadImage(dataUrl)
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
