import { createWorker } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { extraerDatosINTT, extraerVinDeTexto, preprocessImageForOCR, type VehicleData } from './ocr'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const MIN_EMBEDDED_TEXT_LENGTH = 30

export interface ScanResult {
  data: VehicleData
  rawText: string
}

export async function scanVehicleDocument(file: File): Promise<ScanResult> {
  const rawText = await extractText(file)
  return { data: extraerDatosINTT(rawText), rawText }
}

export async function scanVinPhoto(file: File): Promise<{ vin: string | null; rawText: string }> {
  const rawText = await extractText(file)
  return { vin: extraerVinDeTexto(rawText), rawText }
}

async function extractText(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const embedded = await extractEmbeddedPdfText(file)
    if (embedded.trim().length >= MIN_EMBEDDED_TEXT_LENGTH) return embedded
    // Scanned PDF with no text layer (e.g. a photographed carnet saved as
    // PDF) — fall back to rendering page 1 and running OCR on it.
    const img = await renderPdfPage(file, 1)
    return runTesseract(preprocessImageForOCR(img))
  }

  const img = await loadImageFromFile(file)
  return runTesseract(preprocessImageForOCR(img))
}

/**
 * Real INTT certificates are 2 pages: page 1 is boilerplate legal text
 * (traffic regulations), page 2 carries the actual vehicle summary line.
 * Concatenating every page's text and letting extraerDatosINTT's regexes
 * find what they need is simpler and more robust than guessing which
 * page has the data.
 */
async function extractEmbeddedPdfText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const pageTexts: string[] = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    pageTexts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '))
  }
  return pageTexts.join('\n')
}

async function renderPdfPage(file: File, pageNumber: number): Promise<HTMLImageElement> {
  const buffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: 2.5 })

  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext('2d')!
  // PDF.js only paints the page content — fill white first so any area
  // it doesn't cover isn't left transparent (which would read as black
  // once preprocessImageForOCR converts to grayscale and boosts contrast).
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  return loadImage(canvas.toDataURL('image/png'))
}

async function runTesseract(imageSource: string): Promise<string> {
  const worker = await createWorker('spa+eng')
  try {
    const { data } = await worker.recognize(imageSource)
    return data.text
  } finally {
    await worker.terminate()
  }
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
