
export interface Order {
  id: string
  number: string
  company_name?: string
  vehicles: Array<{
    brand: string
    model: string
    quantity: number
    year?: string
  }>
  trackers: Array<{
    model: string
    quantity: number
  }>
  accessories: Array<{
    name: string
    quantity: number
  }>
  configurationType: string
  status: "novos" | "producao" | "aguardando" | "enviado" | "standby"
  priority?: "high" | "medium" | "low"
  createdAt: string
  estimatedDelivery?: string
  isAutomatic?: boolean
  shipment_recipient_id?: string
  shipment_address_street?: string
  shipment_address_number?: string
  shipment_address_neighborhood?: string
  shipment_address_city?: string
  shipment_address_state?: string
  shipment_address_postal_code?: string
  shipment_address_complement?: string
  shipment_prepared_at?: string
  trackingCode?: string
  technicianName?: string
}
