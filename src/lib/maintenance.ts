import type { MaintCatalogItem, MaintItemView, MaintPlan, VehicleMaintState } from '@/types'

// Catálogo de 51 ítems validado en supabase_schema.sql / prototipo.
export const MAINT_CATALOG: MaintCatalogItem[] = [
  // MOTOR
  { id: 'oil', category: 'Motor', label: 'Cambio de aceite + filtro de aceite', km_interval: 5000, month_interval: 6, mode: 'both', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 1 },
  { id: 'air', category: 'Motor', label: 'Filtro de aire motor', km_interval: 15000, month_interval: 18, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 2 },
  { id: 'fuf', category: 'Motor', label: 'Filtro de combustible', km_interval: 30000, month_interval: 24, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 3 },
  { id: 'pol', category: 'Motor', label: 'Filtro de habitáculo', km_interval: 15000, month_interval: 12, mode: 'both', criticality: 'baja', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 4 },
  { id: 'spk', category: 'Motor', label: 'Bujías', km_interval: 30000, month_interval: 36, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 5 },
  { id: 'tmg', category: 'Motor', label: 'Correa / cadena de distribución', km_interval: 50000, month_interval: 60, mode: 'both', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 6 },
  { id: 'blt', category: 'Motor', label: 'Correas accesorios (poly-v)', km_interval: 60000, month_interval: 60, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 7 },
  { id: 'wtp', category: 'Motor', label: 'Bomba de agua', km_interval: 60000, month_interval: 60, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 8 },
  { id: 'pcv', category: 'Motor', label: 'Válvula PCV', km_interval: 40000, month_interval: 48, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 9 },
  { id: 'inj', category: 'Motor', label: 'Limpieza inyectores (equipo externo)', km_interval: 40000, month_interval: 48, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 10 },
  { id: 'cbl', category: 'Motor', label: 'Limpieza sistema combustible (aditivo)', km_interval: 5000, month_interval: 6, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 11 },
  // TRANSMISION
  { id: 'taf', category: 'Transmision', label: 'Aceite transmisión automática', km_interval: 40000, month_interval: 48, mode: 'both', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 20 },
  { id: 'tmf', category: 'Transmision', label: 'Aceite transmisión manual', km_interval: 40000, month_interval: 48, mode: 'both', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 21 },
  { id: 'dfl', category: 'Transmision', label: 'Aceite diferencial delantero', km_interval: 40000, month_interval: 48, mode: 'both', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 22 },
  { id: 'dfr', category: 'Transmision', label: 'Aceite diferencial trasero', km_interval: 40000, month_interval: 48, mode: 'both', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 23 },
  { id: 'tcs', category: 'Transmision', label: 'Aceite caja de transferencia', km_interval: 40000, month_interval: 48, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 24 },
  { id: 'clu', category: 'Transmision', label: 'Revisión de embrague', km_interval: 60000, month_interval: 60, mode: 'both', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 25 },
  { id: 'crd', category: 'Transmision', label: 'Cardanes y crucetas (engrase)', km_interval: 20000, month_interval: 12, mode: 'both', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 26 },
  // FRENOS
  { id: 'brk', category: 'Frenos', label: 'Pastillas de freno delanteras', km_interval: 25000, month_interval: 30, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 30 },
  { id: 'brkr', category: 'Frenos', label: 'Pastillas de freno traseras', km_interval: 30000, month_interval: 36, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 31 },
  { id: 'dsc', category: 'Frenos', label: 'Discos de freno delanteros', km_interval: 50000, month_interval: 60, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 32 },
  { id: 'dscr', category: 'Frenos', label: 'Discos de freno traseros', km_interval: 60000, month_interval: 72, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 33 },
  { id: 'bfl', category: 'Frenos', label: 'Líquido de frenos', km_interval: null, month_interval: 24, mode: 'time', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 34 },
  { id: 'pbk', category: 'Frenos', label: 'Revisión freno de estacionamiento', km_interval: 20000, month_interval: 24, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 35 },
  // REFRIGERACION
  { id: 'clt', category: 'Refrigeracion', label: 'Refrigerante / anticongelante', km_interval: null, month_interval: 36, mode: 'time', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 40 },
  { id: 'thr', category: 'Refrigeracion', label: 'Termostato', km_interval: 80000, month_interval: 72, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 41 },
  { id: 'mrf', category: 'Refrigeracion', label: 'Mangueras de refrigeración', km_interval: 60000, month_interval: 60, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 42 },
  // TREN DELANTERO
  { id: 'rot', category: 'TrenDelantero', label: 'Rótulas y terminales', km_interval: 20000, month_interval: 12, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 50 },
  { id: 'buj', category: 'TrenDelantero', label: 'Bujes y silent blocks', km_interval: 40000, month_interval: 36, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 51 },
  { id: 'bar', category: 'TrenDelantero', label: 'Bujes barra estabilizadora', km_interval: 40000, month_interval: 36, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 52 },
  { id: 'amr', category: 'TrenDelantero', label: 'Amortiguadores', km_interval: 60000, month_interval: 60, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 53 },
  { id: 'lft', category: 'TrenDelantero', label: 'Revisión kit de levante', km_interval: 10000, month_interval: 6, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 54 },
  { id: 'ang', category: 'TrenDelantero', label: 'Convergencia y camber', km_interval: 15000, month_interval: 12, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 55 },
  { id: 'rod', category: 'TrenDelantero', label: 'Rodamientos de rueda', km_interval: 40000, month_interval: 36, mode: 'both', criticality: 'alta', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 56 },
  // DIRECCION
  { id: 'ali', category: 'Direccion', label: 'Alineación y balanceo', km_interval: 10000, month_interval: 12, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 60 },
  { id: 'psf', category: 'Direccion', label: 'Líquido dirección hidráulica', km_interval: 40000, month_interval: 36, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 61 },
  // NEUMATICOS
  { id: 'rt2', category: 'Neumaticos', label: 'Rotación de neumáticos', km_interval: 10000, month_interval: 12, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 70 },
  { id: 'pre', category: 'Neumaticos', label: 'Chequeo de presión', km_interval: 5000, month_interval: 3, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 71 },
  { id: 'bnd', category: 'Neumaticos', label: 'Revisión banda de rodamiento', km_interval: 10000, month_interval: 12, mode: 'both', criticality: 'alta', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 72 },
  { id: 'rep', category: 'Neumaticos', label: 'Revisión neumático de repuesto', km_interval: 10000, month_interval: 12, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 73 },
  // ELECTRICO
  { id: 'bat', category: 'Electrico', label: 'Batería (bornes y nivel)', km_interval: null, month_interval: 12, mode: 'time', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 80 },
  { id: 'alt', category: 'Electrico', label: 'Alternador (inspección)', km_interval: 80000, month_interval: 60, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 81 },
  { id: 'bob', category: 'Electrico', label: 'Bobinas de encendido', km_interval: 50000, month_interval: 60, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 82 },
  { id: 'luz', category: 'Electrico', label: 'Revisión luces y señalización', km_interval: 10000, month_interval: 12, mode: 'both', criticality: 'media', plan_basic: true, plan_advanced: true, plan_config: true, sort_order: 83 },
  // CLIMATIZACION
  { id: 'acf', category: 'Climatizacion', label: 'Filtro A/C + carga de refrigerante', km_interval: null, month_interval: 24, mode: 'time', criticality: 'baja', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 90 },
  { id: 'mol', category: 'Climatizacion', label: 'Esterilización moho en A/C', km_interval: null, month_interval: 12, mode: 'time', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 91 },
  { id: 'eva', category: 'Climatizacion', label: 'Descontaminación evaporador A/C', km_interval: null, month_interval: 48, mode: 'time', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 92 },
  // GENERAL
  { id: 'mng', category: 'General', label: 'Revisión mangueras y correas', km_interval: 10000, month_interval: 12, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 100 },
  { id: 'esc', category: 'General', label: 'Revisión sistema de escape', km_interval: 20000, month_interval: 24, mode: 'both', criticality: 'media', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 101 },
  { id: 'lub', category: 'General', label: 'Lubricación de puntos y bisagras', km_interval: 10000, month_interval: 12, mode: 'both', criticality: 'baja', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 102 },
  { id: 'lmp', category: 'General', label: 'Revisión limpiaparabrisas', km_interval: null, month_interval: 12, mode: 'time', criticality: 'baja', plan_basic: false, plan_advanced: true, plan_config: true, sort_order: 103 },
]

function planKeyOf(item: MaintCatalogItem, plan: MaintPlan): boolean {
  if (plan === 'basic') return item.plan_basic
  if (plan === 'advanced') return item.plan_advanced
  return item.plan_config
}

export function itemsForPlan(plan: MaintPlan): MaintCatalogItem[] {
  return MAINT_CATALOG.filter((item) => planKeyOf(item, plan))
}

const MONTH_IN_DAYS = 30

function monthsSince(dateIso: string | null): number | null {
  if (!dateIso) return null
  const then = new Date(dateIso).getTime()
  const now = Date.now()
  return (now - then) / (MONTH_IN_DAYS * 24 * 60 * 60 * 1000)
}

/**
 * Progreso combinado km/tiempo: usa el mayor porcentaje entre ambos criterios
 * cuando el modo es 'both', igual que el prototipo validado.
 */
export function buildMaintView(
  currentKm: number,
  plan: MaintPlan,
  state: Record<string, VehicleMaintState | undefined>,
): MaintItemView[] {
  return itemsForPlan(plan).map((item) => {
    const st = state[item.id]
    const lastKm = st?.last_km ?? null
    const lastDate = st?.last_date ?? null

    let pctKm: number | null = null
    if (item.km_interval && lastKm !== null) {
      pctKm = Math.min(150, Math.round(((currentKm - lastKm) / item.km_interval) * 100))
    }

    let pctTime: number | null = null
    const monthsElapsed = monthsSince(lastDate)
    if (monthsElapsed !== null) {
      pctTime = Math.min(150, Math.round((monthsElapsed / item.month_interval) * 100))
    }

    const pct = Math.max(pctKm ?? 0, pctTime ?? 0, 0)
    const status: MaintItemView['status'] = pct >= 100 ? 'overdue' : pct >= 80 ? 'soon' : 'ok'

    return {
      ...item,
      last_km: lastKm,
      last_date: lastDate,
      alarm_on: st?.alarm_on ?? true,
      paused: st?.paused ?? false,
      pct: Math.min(100, pct),
      status,
    }
  })
}
