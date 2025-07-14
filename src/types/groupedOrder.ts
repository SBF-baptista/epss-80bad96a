import { Order } from "@/services/orderService";

export interface GroupedOrder {
  company_name: string;
  orders: Order[];
  totalVehicles: number;
  totalTrackers: number;
  totalAccessories: number;
  status: "novos" | "producao" | "aguardando" | "enviado" | "standby";
  configurations: string[];
  createdAt: string; // Will use the earliest order's createdAt
}

export const groupOrdersByCompany = (orders: Order[]): GroupedOrder[] => {
  const groupedMap = new Map<string, Order[]>();
  
  // Group orders by company_name, using "Sem Empresa" for orders without company
  orders.forEach(order => {
    const companyKey = order.company_name || "Sem Empresa";
    if (!groupedMap.has(companyKey)) {
      groupedMap.set(companyKey, []);
    }
    groupedMap.get(companyKey)!.push(order);
  });

  // Convert to GroupedOrder array
  return Array.from(groupedMap.entries()).map(([company_name, companyOrders]) => {
    const totalVehicles = companyOrders.reduce((sum, order) => 
      sum + order.vehicles.reduce((vSum, vehicle) => vSum + vehicle.quantity, 0), 0
    );
    
    const totalTrackers = companyOrders.reduce((sum, order) => 
      sum + order.trackers.reduce((tSum, tracker) => tSum + tracker.quantity, 0), 0
    );
    
    const totalAccessories = companyOrders.reduce((sum, order) => 
      sum + (order.accessories?.reduce((aSum, accessory) => aSum + accessory.quantity, 0) || 0), 0
    );

    // Get unique configurations
    const configurations = [...new Set(companyOrders.map(order => order.configurationType))];
    
    // Use the status of the first order (they should all be in the same column)
    const status = companyOrders[0].status;
    
    // Use the earliest creation date
    const createdAt = companyOrders
      .map(order => order.createdAt)
      .sort()[0];

    return {
      company_name,
      orders: companyOrders,
      totalVehicles,
      totalTrackers,
      totalAccessories,
      status,
      configurations,
      createdAt
    };
  });
};