
// Main order service - re-exports from specialized modules
export { fetchOrders } from './orderFetchService'
export { createOrder } from './orderCreationService'
export { generateOrderNumber, updateOrderStatus } from './orderUtils'
export { applyAutomationRules } from './orderAutomationService'
export type { Order } from './orderTypes'
