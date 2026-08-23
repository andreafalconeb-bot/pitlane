import type { PDFDocument as PDFDocumentType } from 'pdf-lib'
import { supabase } from '@/lib/supabase'
import { formatDateVE } from '@/lib/date'
import type { ServiceHistoryEntry } from '@/types'

// jsPDF, exceljs and pdf-lib are only needed the moment someone actually
// exports — dynamically imported inside these functions instead of at
// module scope, so the base app bundle doesn't carry ~2MB nobody asked for.

export interface ExportVehicleInfo {
  vin: string
  brand: string
  model: string
  year: number
  plate: string | null
}

const STATUS_LABEL: Record<ServiceHistoryEntry['status'], string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  modified: 'Modificado',
  rejected: 'Rechazado',
}

function todayStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

function chronological(services: ServiceHistoryEntry[]): ServiceHistoryEntry[] {
  return [...services].sort((a, b) => a.date.localeCompare(b.date))
}

/** pdf-lib's Uint8Array is typed over ArrayBufferLike, which the DOM's
 * Blob constructor no longer accepts directly — copy it into a plain
 * ArrayBuffer Blob can take. */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

async function fetchReceiptBytes(receiptPath: string): Promise<{ bytes: ArrayBuffer; ext: string } | null> {
  const { data, error } = await supabase.storage.from('vehicle-documents').createSignedUrl(receiptPath, 120)
  if (error || !data) return null
  const res = await fetch(data.signedUrl)
  if (!res.ok) return null
  const bytes = await res.arrayBuffer()
  const ext = (receiptPath.split('.').pop() ?? '').toLowerCase()
  return { bytes, ext }
}

/** Appends every service's receipt (image embedded, PDF pages merged in),
 * in chronological order, each preceded by a caption naming its service
 * date — same rule for the PDF report's own attachments and for the
 * documents-only companion PDF that ships alongside an Excel export. */
async function appendReceiptsChronologically(pdfDoc: PDFDocumentType, services: ServiceHistoryEntry[]) {
  const { PDFDocument, StandardFonts } = await import('pdf-lib')
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const withReceipts = chronological(services).filter((s) => s.receipt_url)

  for (const s of withReceipts) {
    const fetched = await fetchReceiptBytes(s.receipt_url as string)
    if (!fetched) continue
    const { bytes, ext } = fetched
    const caption = `${formatDateVE(s.date)} — ${s.modified_desc ?? s.description}`

    if (ext === 'pdf') {
      try {
        const src = await PDFDocument.load(bytes)
        const captionPage = pdfDoc.addPage([595.28, 841.89])
        captionPage.drawText('Documento de soporte', { x: 50, y: 780, size: 14, font })
        captionPage.drawText(caption, { x: 50, y: 755, size: 11, font })
        const copied = await pdfDoc.copyPages(src, src.getPageIndices())
        copied.forEach((p) => pdfDoc.addPage(p))
      } catch {
        continue
      }
      continue
    }

    try {
      const image = ext === 'png' ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
      const page = pdfDoc.addPage([595.28, 841.89])
      page.drawText('Documento de soporte', { x: 50, y: 780, size: 14, font })
      page.drawText(caption, { x: 50, y: 755, size: 11, font })

      const maxW = 495.28
      const maxH = 650
      const scale = Math.min(maxW / image.width, maxH / image.height, 1)
      const w = image.width * scale
      const h = image.height * scale
      page.drawImage(image, { x: (595.28 - w) / 2, y: 720 - h, width: w, height: h })
    } catch {
      continue
    }
  }
}

export async function exportHistoryPdf(
  vehicle: ExportVehicleInfo,
  services: ServiceHistoryEntry[],
  includeDocs: boolean,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }, { PDFDocument }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('pdf-lib'),
  ])

  const doc = new jsPDF()
  doc.setFontSize(16)
  doc.text('Historial de mantenimiento', 14, 18)
  doc.setFontSize(10)
  doc.text(`${vehicle.brand} ${vehicle.model} ${vehicle.year}`, 14, 26)
  doc.text(`VIN: ${vehicle.vin}${vehicle.plate ? `   ·   Placa: ${vehicle.plate}` : ''}`, 14, 32)
  doc.text(`Generado: ${formatDateVE(new Date().toISOString())}`, 14, 38)

  autoTable(doc, {
    startY: 44,
    head: [['Fecha', 'Km', 'Descripción', 'Taller', 'Monto', 'Estado']],
    body: chronological(services).map((s) => [
      formatDateVE(s.date),
      s.km_at_service?.toLocaleString() ?? '—',
      (s.event_type === 'major_engine' ? '⚠ ' : '') + (s.modified_desc ?? s.description),
      s.workshop_name,
      (s.modified_price ?? s.price) !== null ? `$${(s.modified_price ?? s.price ?? 0).toFixed(2)}` : '—',
      STATUS_LABEL[s.status],
    ]),
    headStyles: { fillColor: [200, 134, 10] },
    styles: { fontSize: 8 },
  })

  const pdfDoc = await PDFDocument.load(doc.output('arraybuffer'))
  if (includeDocs) await appendReceiptsChronologically(pdfDoc, services)

  const bytes = await pdfDoc.save()
  downloadBlob(
    new Blob([toArrayBuffer(bytes)], { type: 'application/pdf' }),
    `historial-${vehicle.vin}-${todayStamp()}.pdf`,
  )
}

export async function exportHistoryExcel(
  vehicle: ExportVehicleInfo,
  services: ServiceHistoryEntry[],
  includeDocs: boolean,
): Promise<void> {
  const { default: ExcelJS } = await import('exceljs')

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Historial')

  sheet.mergeCells('A1:F1')
  sheet.getCell('A1').value = `${vehicle.brand} ${vehicle.model} ${vehicle.year} — VIN ${vehicle.vin}${
    vehicle.plate ? ` — Placa ${vehicle.plate}` : ''
  }`
  sheet.getCell('A1').font = { bold: true, size: 13 }
  sheet.mergeCells('A2:F2')
  sheet.getCell('A2').value = `Generado ${formatDateVE(new Date().toISOString())}`
  sheet.getCell('A2').font = { italic: true, color: { argb: 'FF6B7280' } }

  const headerRow = sheet.getRow(4)
  headerRow.values = ['Fecha', 'Km', 'Descripción', 'Taller', 'Monto', 'Estado']
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8860A' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border = { bottom: { style: 'thin' } }
  })

  chronological(services).forEach((s, i) => {
    const row = sheet.getRow(5 + i)
    row.values = [
      new Date(`${s.date}T00:00:00`),
      s.km_at_service ?? null,
      (s.event_type === 'major_engine' ? '⚠ ' : '') + (s.modified_desc ?? s.description),
      s.workshop_name,
      s.modified_price ?? s.price ?? null,
      STATUS_LABEL[s.status],
    ]
    row.getCell(1).numFmt = 'dd/mm/yyyy'
    row.getCell(5).numFmt = '$#,##0.00'
    if (i % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      })
    }
  })

  sheet.columns = [{ width: 13 }, { width: 10 }, { width: 42 }, { width: 22 }, { width: 12 }, { width: 14 }]
  sheet.getColumn(3).alignment = { wrapText: true }

  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `historial-${vehicle.vin}-${todayStamp()}.xlsx`,
  )

  if (includeDocs && services.some((s) => s.receipt_url)) {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib')
    const pdfDoc = await PDFDocument.create()
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const cover = pdfDoc.addPage([595.28, 841.89])
    cover.drawText('Documentos de soporte', { x: 50, y: 780, size: 16, font })
    cover.drawText(`${vehicle.brand} ${vehicle.model} ${vehicle.year} — VIN ${vehicle.vin}`, {
      x: 50,
      y: 755,
      size: 11,
      font,
      color: rgb(0.3, 0.3, 0.3),
    })
    await appendReceiptsChronologically(pdfDoc, services)
    const bytes = await pdfDoc.save()
    downloadBlob(
      new Blob([toArrayBuffer(bytes)], { type: 'application/pdf' }),
      `documentos-${vehicle.vin}-${todayStamp()}.pdf`,
    )
  }
}
