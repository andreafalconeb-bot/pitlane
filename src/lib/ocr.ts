/**
 * PITLANE — OCR extraction algorithm for Venezuelan INTT documents
 * Tested against: Certificado de Circulación, Certificado de Registro de Vehículo
 * Both JPG and PDF formats validated with real documents.
 *
 * Extraction priority:
 * 1. Summary line at bottom of INTT document (cleanest data)
 * 2. Labeled fields (Placa:, Marca:, Color:, etc.)
 * 3. Pattern matching with OCR error correction
 */

export interface VehicleData {
  vin?: string
  plate?: string
  brand?: string
  model?: string
  year?: string
  color?: string
  serialMotor?: string
  _isReverse?: boolean  // detected reverse side of document
}

const COLORS = [
  'BLANCO','NEGRO','ROJO','AZUL','GRIS','PLATA','PLATEADO',
  'VERDE','AMARILLO','NARANJA','MARRON','BEIGE','DORADO',
  'BORDO','VINO','CREMA','PERLA','CHAMPAGNE'
]

function isValidVin(v: string): boolean {
  if (!v || v.length !== 17) return false
  if (/[IOQ]/.test(v)) return false           // these letters don't exist in VIN
  if (!/[A-Z]/.test(v)) return false           // must have letters
  if (!/[0-9]/.test(v)) return false           // must have numbers
  // Reject common Spanish words disguised as VINs
  const rejected = ['ELESDE','SEGURD','TRANSI','REGULA','VEHICU','TERRIT']
  if (rejected.some(r => v.startsWith(r))) return false
  return true
}

// ── VIN detection (shared by extraerDatosINTT and standalone VIN scans) ──
function detectVin(UP: string): string | null {
  // Strategy 1: VIN in summary line format "VIN-1-1" (clearest)
  const vinInSummary = UP.match(/\b([A-Z0-9]{17})-[12]-1\b/)

  // Strategy 2: Labeled field "Serial N.I.V:" with OCR noise
  const vinLabeled = UP.match(
    /SERIAL\s+N[^A-Z0-9\n]{0,4}[IJ1!/|]?[^A-Z0-9\n]{0,4}V\s*[:;,.]?\s*([A-Z0-9.O\-]{10,22})/
  )

  // Strategy 3: Any valid 17-char sequence
  let vinDirect: string | null = null
  const candidates = UP.match(/\b[A-Z0-9]{17,18}\b/g) || []
  for (const c of candidates) {
    const v = c.substring(0, 17)
    if (isValidVin(v)) { vinDirect = v; break }
  }

  const vinRaw = (vinInSummary?.[1]) || (vinLabeled?.[1]) || vinDirect
  if (!vinRaw) return null
  const clean = vinRaw.replace(/[.\-\s]/g, '').substring(0, 17)
  return clean.length >= 10 ? clean : null
}

/**
 * Standalone VIN extraction — used for the "second photo" flow (a direct
 * shot of the VIN plate/etching) when the main document doesn't carry it,
 * e.g. a Certificado de Circulación that omits the VIN field.
 */
export function extraerVinDeTexto(rawText: string): string | null {
  return detectVin(rawText.toUpperCase())
}

export function extraerDatosINTT(rawText: string): VehicleData {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  const UP = rawText.toUpperCase()
  const result: VehicleData = {}

  // Detect reverse side of document (contains traffic regulations text)
  result._isReverse = (
    UP.includes('REGLAMENTO') ||
    UP.includes('ARTICULO') ||
    (UP.includes('TERRITORIO NACIONAL') && UP.includes('OBLIGATORIO'))
  )

  const vin = detectVin(UP)
  if (vin) result.vin = vin

  // ── PLATE ──────────────────────────────────────────────────
  // OCR may read "Praca" instead of "Placa", "A10EW8A" vs "AlOEW8A"
  const plateMatch = UP.match(/(?:PLACA|PRACA|PLAC[AO])\s*[:;.]?\s*([A-Z0-9]{4,8})/)
  if (plateMatch) result.plate = plateMatch[1].trim()

  // ── SUMMARY LINE (most reliable source) ───────────────────
  // Format: "VIN SERIAL_MOTOR BRAND MODEL YEAR COLOR CLASS..."
  // Example: "8YBEMPDJ8SG000388 77644411 ENCAVA EP-1000 2025 GRIS CAMIONETA..."
  const summaryMatch = UP.match(
    /[A-Z0-9]{17}\s+\d{5,12}\s+([A-Z][A-Z\s\-]{1,15}?)\s+(EP\-\d+[A-Z0-9 /\-]*|[A-Z0-9][A-Z0-9 /\-]{1,25}?)\s+(\d{4})\s+([A-Z]+)/
  )
  if (summaryMatch) {
    const [, brand, model, year, color] = summaryMatch
    const yr = parseInt(year)
    if (yr >= 1970 && yr <= new Date().getFullYear() + 2) {
      result.brand = brand.trim().charAt(0) + brand.trim().slice(1).toLowerCase()
      result.model = model.trim().charAt(0) + model.trim().slice(1).toLowerCase()
      result.year  = year
      if (COLORS.includes(color.trim())) {
        result.color = color.trim().charAt(0) + color.trim().slice(1).toLowerCase()
      }
    }
  }

  // ── BRAND (fallback) ───────────────────────────────────────
  if (!result.brand) {
    const brandMatch = UP.match(/MARCA\s*[:;.]?\s*([A-Z]{2,25})/)
    if (brandMatch) {
      const b = brandMatch[1].trim()
      result.brand = b.charAt(0) + b.slice(1).toLowerCase()
    }
  }

  // ── MODEL (fallback) ───────────────────────────────────────
  if (!result.model) {
    const modelMatch = UP.match(
      /(?:MODELO|MUUSV|MODEL[OA])\s*[,;:]?\s*([A-Z0-9 /\-]{2,30}?)(?:\n|A[ÑN]O|COLOR|CLASE)/
    )
    if (modelMatch) {
      const m = modelMatch[1].trim()
      if (m.length > 1 && !m.includes('REGLAMENTO')) {
        result.model = m.charAt(0) + m.slice(1).toLowerCase()
      }
    }
    // Fallback: line after brand
    if (!result.model && result.brand) {
      const brandIdx = lines.findIndex(l =>
        l.toUpperCase().includes(result.brand!.toUpperCase())
      )
      if (brandIdx >= 0 && brandIdx + 1 < lines.length) {
        const next = lines[brandIdx + 1].replace(/^['"]/,'')
        const yearInNext = next.match(/(\d{4})/)
        if (yearInNext) {
          const yr = parseInt(yearInNext[1])
          if (yr >= 1970 && yr <= 2030) {
            if (!result.year) result.year = String(yr)
            const mod = next.substring(0, next.indexOf(yearInNext[0])).trim()
            if (mod.length > 1) result.model = mod.charAt(0) + mod.slice(1).toLowerCase()
          }
        } else if (next.length > 1) {
          result.model = next.charAt(0) + next.slice(1).toLowerCase()
        }
      }
    }
  }

  // ── YEAR (fallback) ────────────────────────────────────────
  if (!result.year) {
    // OCR confuses Ñ → N, producing "ATTO", "AITO", "AFIO", "ANO"
    const yearMatch = (
      UP.match(/(?:A[ÑN]O|ATTO|AITO|AFIO|ANO)\s+(?:FABRICACI[OÓ]N\s+)?(\d{4})/) ||
      UP.match(/(\d{4})\/\d{4}/) ||
      UP.match(/(?:A[ÑN]O|ATTO|AITO|AFIO|ANO)\s*[:;.]?\s*(\d{4})/)
    )
    if (yearMatch) {
      const yr = parseInt(yearMatch[1])
      if (yr >= 1970 && yr <= new Date().getFullYear() + 2) result.year = String(yr)
    }
  }

  // ── COLOR (fallback) ───────────────────────────────────────
  if (!result.color) {
    const colorMatch = UP.match(/COLOR\s*[;:.]?\s*([A-Z]+)/)
    if (colorMatch && COLORS.includes(colorMatch[1].trim())) {
      const c = colorMatch[1].trim()
      result.color = c.charAt(0) + c.slice(1).toLowerCase()
    }
    // In "750KGS 2EJES BLANCO" format (carnet)
    if (!result.color) {
      for (const line of lines) {
        const l = line.toUpperCase()
        if (l.includes('KGS') || l.includes('EJES')) {
          const found = COLORS.find(c => l.includes(c))
          if (found) {
            result.color = found.charAt(0) + found.slice(1).toLowerCase()
            break
          }
        }
      }
    }
  }

  // ── SERIAL MOTOR ───────────────────────────────────────────
  const smMatch = (
    UP.match(/(\d{6,12})\s+TC\s*[:;.]?\s*(?:DIESEL|GASOLINA|GAS)/) ||
    UP.match(/(?:SERIAL\s+MOTOR|S\.\s*MOTOR)\s*[:;.]?\s*([A-Z0-9]{6,20})/)
  )
  if (smMatch) result.serialMotor = smMatch[1]

  return result
}

/**
 * Preprocess image canvas for better OCR results
 * Scale to minimum 1200px, increase contrast
 */
export function preprocessImageForOCR(imgElement: HTMLImageElement): string {
  const canvas = document.createElement('canvas')
  const scale = Math.max(2.5, 1200 / Math.max(imgElement.width, imgElement.height))
  canvas.width  = imgElement.width  * scale
  canvas.height = imgElement.height * scale

  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(imgElement, 0, 0, canvas.width, canvas.height)

  // Convert to grayscale with increased contrast
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114
    const contrast = Math.min(255, Math.max(0, ((gray - 128) * 1.8) + 128))
    data[i] = data[i+1] = data[i+2] = contrast
  }
  ctx.putImageData(imgData, 0, 0)

  return canvas.toDataURL('image/png')
}
