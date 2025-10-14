export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

export interface VehicleData {
  vehicle: string
  brand: string
  year?: number
  quantity?: number
  accessories?: AccessoryData[]
  modules?: string[]
}

export interface AccessoryData {
  accessory_name: string
  quantity?: number
}

export interface VehicleGroup {
  company_name: string
  cpf?: string
  phone?: string
  usage_type: string
  sale_summary_id?: number
  pending_contract_id?: number
  vehicles: VehicleData[]
  accessories?: AccessoryData[]
  address?: {
    city?: string
    district?: string
    street?: string
    number?: string
    zip_code?: string
    complement?: string
  }
}

export interface ProcessingResult {
  vehicle: string
  quantity: number
  incoming_vehicle_id: string
  status?: string
  order_number?: string
  order_id?: string
  homologation_id?: string
  homologation_created?: boolean
  processing_notes?: string
  error?: string
}

export interface GroupResult {
  group_index: number
  company_name: string
  usage_type: string
  vehicles_processed: ProcessingResult[]
  total_vehicles: number
  processing_summary: {
    orders_created: number
    homologations_created: number
    errors: number
  }
}