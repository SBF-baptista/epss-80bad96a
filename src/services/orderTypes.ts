
export interface Order {
  id: string
  number: string
  company_name?: string
  customer_phone?: string
  customer_email?: string
  customer_document_number?: string
  installation_address_street?: string
  installation_address_number?: string
  installation_address_neighborhood?: string
  installation_address_city?: string
  installation_address_state?: string
  installation_address_postal_code?: string
  installation_address_complement?: string
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
  selectedKitNames?: string[]
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
