import { createWorker, PSM } from 'tesseract.js'
import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { extraerDatosINTT, extraerVinDeTexto, preprocessImageForOCR, type VehicleData } from './ocr'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const MIN_EMBEDDED_TEXT_LENGTH = 30

// VIN alphabet excludes I, O, Q (never used, to avoid confusion with 1/0).
const VIN_CHAR_WHITELIST = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ'

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
 * VIN plates/etchings are a hard OCR target: small, a stylized/embossed
 * font, and often light text on a dark badge sitting inside a much
 * larger, differently-colored photo (car paint, dashboard, etc). None of
 * that resembles the printed documents preprocessImageForOCR was tuned
 * for, so this runs several preprocessing variants — plain contrast vs.
 * Otsu binarization, each normal and inverted — with a VIN-only
 * character whitelist and sparse-text layout mode, stopping at the
 * first pass that yields a valid VIN.
 */
export async function scanVinPhoto(file: File): Promise<{ vin: string | null; rawText: string }> {
  const img = file.type === 'application/pdf' ? await renderPdfPage(file, 1) : await loadImageFromFile(file)

  const variants: Array<(img: HTMLImageElement, invert: boolean) => string> = [
    preprocessVinPlateContrast,
    preprocessVinPlateOtsu,
  ]

  let lastText = ''
  for (const variant of variants) {
    for (const invert of [false, true]) {
      const text = await runTesseract(variant(img, invert), {
        whitelist: VIN_CHAR_WHITELIST,
        psm: PSM.SPARSE_TEXT,
      })
      lastText = text
      const vin = extraerVinDeTexto(text)
      if (vin) return { vin, rawText: text }
    }
  }
  return { vin: null, rawText: lastText }
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

function scaledGrayscale(imgElement: HTMLImageElement): { ctx: CanvasRenderingContext2D; gray: Float64Array } {
  const canvas = document.createElement('canvas')
  const scale = Math.max(4, 1600 / Math.max(imgElement.width, imgElement.height))
  canvas.width = imgElement.width * scale
  canvas.height = imgElement.height * scale

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height)

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data
  const gray = new Float64Array(data.length / 4)
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
  }
  return { ctx, gray }
}

/** Plain scale-up + grayscale + linear contrast boost, optionally inverted. */
function preprocessVinPlateContrast(imgElement: HTMLImageElement, invert: boolean): string {
  const { ctx, gray } = scaledGrayscale(imgElement)
  const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  const data = imgData.data
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    let g = gray[p]
    if (invert) g = 255 - g
    const contrast = Math.min(255, Math.max(0, (g - 128) * 1.8 + 128))
    data[i] = data[i + 1] = data[i + 2] = contrast
  }
  ctx.putImageData(imgData, 0, 0)
  return ctx.canvas.toDataURL('image/png')
}

/** Otsu-threshold binarization (pure black/white) — usually reads badge/embossed text better than a soft contrast curve. */
function preprocessVinPlateOtsu(imgElement: HTMLImageElement, invert: boolean): string {
  const { ctx, gray } = scaledGrayscale(imgElement)
  const threshold = otsuThreshold(gray)

  const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  const data = imgData.data
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const isForeground = invert ? gray[p] > threshold : gray[p] <= threshold
    const v = isForeground ? 0 : 255
    data[i] = data[i + 1] = data[i + 2] = v
  }
  ctx.putImageData(imgData, 0, 0)
  return ctx.canvas.toDataURL('image/png')
}

function otsuThreshold(gray: Float64Array): number {
  const histogram = new Array(256).fill(0)
  for (let i = 0; i < gray.length; i++) histogram[Math.round(gray[i])]++

  const total = gray.length
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * histogram[t]

  let sumB = 0
  let weightB = 0
  let maxVariance = 0
  let threshold = 127

  for (let t = 0; t < 256; t++) {
    weightB += histogram[t]
    if (weightB === 0) continue
    const weightF = total - weightB
    if (weightF === 0) break

    sumB += t * histogram[t]
    const meanB = sumB / weightB
    const meanF = (sum - sumB) / weightF
    const variance = weightB * weightF * (meanB - meanF) ** 2

    if (variance > maxVariance) {
      maxVariance = variance
      threshold = t
    }
  }
  return threshold
}

async function runTesseract(imageSource: string, options?: { whitelist?: string; psm?: string }): Promise<string> {
  const worker = await createWorker('spa+eng')
  try {
    if (options?.whitelist || options?.psm) {
      await worker.setParameters({
        ...(options.whitelist ? { tessedit_char_whitelist: options.whitelist } : {}),
        ...(options.psm ? { tessedit_pageseg_mode: options.psm as unknown as PSM } : {}),
      })
    }
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
