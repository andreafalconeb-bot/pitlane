export type Role = 'client' | 'taller_free' | 'taller_paid' | 'master'

export type MaintPlan = 'basic' | 'advanced' | 'configurable'

export type MaintMode = 'km' | 'time' | 'both'

export type Criticality = 'alta' | 'media' | 'baja'

export type MaintStatus = 'overdue' | 'soon' | 'ok'

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
}

export interface MaintItemView extends MaintCatalogItem {
  last_km: number | null
  last_date: string | null
  alarm_on: boolean
  paused: boolean
  pct: number
  status: MaintStatus
}
