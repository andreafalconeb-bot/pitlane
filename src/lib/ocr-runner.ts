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
  if (file.type === 'application/pdf') {
    const embedded = await extractEmbeddedPdfText(file)
    if (embedded.trim().length >= MIN_EMBEDDED_TEXT_LENGTH) {
      return { data: extraerDatosINTT(embedded), rawText: embedded }
    }
    // Scanned PDF with no text layer (e.g. a photographed carnet saved as
    // PDF) — fall back to rendering page 1 and running OCR on it.
    const img = await renderPdfPage(file, 1)
    const rawText = await runTesseract(preprocessImageForOCR(img))
    return { data: extraerDatosINTT(rawText), rawText }
  }

  const img = await loadImageFromFile(file)
  const rawText = await runTesseract(preprocessImageForOCR(img))
  return { data: extraerDatosINTT(rawText), rawText }
}

/**
 * VIN plates/etchings are usually a small metal or sticker tag — often
 * light/embossed text on a dark background, the opposite polarity of a
 * printed document. Tries normal contrast first (cheap, covers photos of
 * paper documents), and only pays for a second OCR pass with inverted
 * contrast if no valid VIN turned up.
 */
export async function scanVinPhoto(file: File): Promise<{ vin: string | null; rawText: string }> {
  const img = file.type === 'application/pdf' ? await renderPdfPage(file, 1) : await loadImageFromFile(file)

  const normalText = await runTesseract(preprocessVinPlateForOCR(img, false))
  const normalVin = extraerVinDeTexto(normalText)
  if (normalVin) return { vin: normalVin, rawText: normalText }

  const invertedText = await runTesseract(preprocessVinPlateForOCR(img, true))
  const invertedVin = extraerVinDeTexto(invertedText)
  return invertedVin ? { vin: invertedVin, rawText: invertedText } : { vin: null, rawText: normalText }
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
  // once the grayscale/contrast step runs on it).
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport, canvas }).promise

  return loadImage(canvas.toDataURL('image/png'))
}

/**
 * Same scale-up + grayscale + contrast approach as preprocessImageForOCR,
 * with an optional inversion pass for light-text-on-dark-background plates.
 */
function preprocessVinPlateForOCR(imgElement: HTMLImageElement, invert: boolean): string {
  const canvas = document.createElement('canvas')
  const scale = Math.max(3, 1400 / Math.max(imgElement.width, imgElement.height))
  canvas.width = imgElement.width * scale
  canvas.height = imgElement.height * scale

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height)

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    let gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
    if (invert) gray = 255 - gray
    const contrast = Math.min(255, Math.max(0, (gray - 128) * 1.8 + 128))
    data[i] = data[i + 1] = data[i + 2] = contrast
  }
  ctx.putImageData(imgData, 0, 0)

  return canvas.toDataURL('image/png')
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
