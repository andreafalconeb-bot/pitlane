export function generateTransferCode(plate: string, vin: string): string {
  const cleanPlate = (plate || 'SINPLACA').replace(/[^A-Z0-9]/gi, '').toUpperCase()
  const last4 = vin.slice(-4).toUpperCase()
  return `TRANS-${cleanPlate}-${Date.now()}_${last4}`
}

export function generateWorkshopInviteCode(plate: string): string {
  const prefix = (plate || 'SINPLACA').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6)
  const year = new Date().getFullYear()
  return `SRGO-${prefix}-${year}`
}
