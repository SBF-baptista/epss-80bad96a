
export interface Order {
  id: string
  number: string
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
  configurationType: string
  status: "novos" | "producao" | "aguardando" | "enviado" | "standby"
  priority?: "high" | "medium" | "low"
  createdAt: string
  estimatedDelivery?: string
  isAutomatic?: boolean
}
