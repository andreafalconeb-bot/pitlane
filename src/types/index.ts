export type Role = 'client' | 'taller_free' | 'taller_paid' | 'master'

export type MaintPlan = 'basic' | 'advanced' | 'configurable'

export type MaintMode = 'km' | 'time' | 'both'

export type Criticality = 'alta' | 'media' | 'baja'

export type MaintStatus = 'overdue' | 'soon' | 'ok'

export type KmCheckFreq = 'never' | 'monthly' | 'quarterly'

export interface Profile {
  id: string
  role: Role
  name: string
  phone: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
}

export interface Vehicle {
  vin: string
  plate: string | null
  brand: string
  model: string
  year: number
  color: string | null
  serial_motor: string | null
  oil: string | null
  photo_url: string | null
  status: 'active' | 'transferred' | 'decommissioned'
  current_owner: string | null
  transfer_code: string | null
  created_at: string
  updated_at: string
}

export interface MaintCatalogItem {
  id: string
  category: string
  label: string
  km_interval: number | null
  month_interval: number
  mode: MaintMode
  criticality: Criticality
  plan_basic: boolean
  plan_advanced: boolean
  plan_config: boolean
  sort_order: number
}

export interface VehicleMaintState {
  id: string
  vin: string
  catalog_id: string | null
  last_km: number | null
  last_date: string | null
  alarm_on: boolean
  paused: boolean
  km_interval_override: number | null
  month_interval_override: number | null
}

export interface MaintItemView extends MaintCatalogItem {
  last_km: number | null
  last_date: string | null
  alarm_on: boolean
  paused: boolean
  pct: number
  status: MaintStatus
  /** true when km_interval/month_interval reflect a per-vehicle override rather than the catalog default. */
  isCustomInterval: boolean
}

export interface CustomMaintItem {
  id: string
  vin: string
  owner_id: string
  label: string
  category: string | null
  km_interval: number | null
  month_interval: number | null
  mode: MaintMode | null
  criticality: Criticality | null
  alarm_on: boolean
  last_km: number | null
  last_date: string | null
  created_at: string
}

export type WorkshopTier = 'free' | 'paid'
export type WorkshopLevel = 'basico' | 'tecnico' | 'especialista' | 'experto' | 'master'

export interface Workshop {
  id: string
  owner_id: string
  name: string
  address: string | null
  phone: string | null
  tier: WorkshopTier
  points: number
  level: WorkshopLevel
  active: boolean
  created_at: string
}

export type ServiceStatus = 'pending' | 'approved' | 'modified' | 'rejected'

export type ServiceEventType = 'service' | 'major_engine'

export interface ServiceHistoryEntry {
  id: string
  vin: string
  workshop_id: string | null
  workshop_name: string
  date: string
  km_at_service: number | null
  description: string
  price: number | null
  receipt_url: string | null
  status: ServiceStatus
  event_type: ServiceEventType
  modified_price: number | null
  modified_desc: string | null
  approved_at: string | null
  created_at: string
}

export type DocType = 'carnet' | 'titulo' | 'otro'

export interface VehicleDocument {
  id: string
  vin: string
  owner_id: string
  doc_type: DocType | null
  file_url: string
  file_name: string | null
  mime_type: string | null
  file_size_kb: number | null
  active: boolean
  created_at: string
}

export type WorkshopVehicleStatus = 'pending' | 'invited' | 'active'

export interface WorkshopVehicle {
  id: string
  workshop_id: string
  vin: string
  status: WorkshopVehicleStatus
  invite_code: string | null
  created_at: string
}

export type DictionaryStatus = 'pending' | 'approved' | 'rejected'

export interface DictionaryTerm {
  id: string
  term: string
  definition: string
  proposed_by: string | null
  status: DictionaryStatus
  reviewed_by: string | null
  created_at: string
}

export interface PointsLogEntry {
  id: string
  workshop_id: string
  points: number
  reason: string
  ref_id: string | null
  created_at: string
}
