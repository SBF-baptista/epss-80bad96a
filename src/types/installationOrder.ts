export interface InstallationOrder {
  id: string;
  customerName: string;
  technicianName: string;
  status: 'scheduled' | 'in_progress' | 'awaiting_shipment' | 'shipped' | 'cancelled';
  scheduledDate: string;
  vehicleBrand?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePlate?: string;
  configuration?: string;
  trackerModel?: string;
  accessories: Array<{
    name: string;
    quantity: number;
    description?: string;
  }>;
  supplies: Array<{
    name: string;
    quantity: number;
    description?: string;
  }>;
  trackingCode?: string;
  kitId: string;
  technicianId: string;
  notes?: string;
  customerPhone?: string;
  customerEmail?: string;
  installationAddress?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    postalCode: string;
    complement?: string;
  };
}
