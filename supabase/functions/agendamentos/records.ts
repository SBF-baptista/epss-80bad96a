export type Row = Record<string, unknown>;

export interface AgendaFilters {
  placa?: string;
  data_inicio?: string;
  data_fim?: string;
  tecnico?: string;
  cliente?: string;
  tipo_contrato?: string;
  limit: number;
  page: number;
}

export function combineAgendaRecords(
  installations: Row[],
  shipments: Row[],
  kits: Row[],
  vehicles: Row[],
  filters: AgendaFilters,
) {
  const kitById = new Map(kits.map(k => [String(k.id), k]));
  const vehicleById = new Map(vehicles.map(v => [String(v.id), v]));
  // Vehicles arrive newest-first. Plate fallback is only for legacy external appointments.
  const vehicleByPlate = new Map<string, Row>();
  for (const vehicle of vehicles) {
    const plate = String(vehicle.plate ?? '').trim().toUpperCase();
    if (plate && !vehicleByPlate.has(plate)) vehicleByPlate.set(plate, vehicle);
  }
  const vehicleFor = (kit: Row | undefined, plate: unknown) => kit?.incoming_vehicle_id
    ? vehicleById.get(String(kit.incoming_vehicle_id))
    : vehicleByPlate.get(String(plate ?? '').trim().toUpperCase());
  const contractCode = (vehicle: Row | undefined) => vehicle?.pending_contract_id == null
    ? null : String(vehicle.pending_contract_id);
  const scheduledKitIds = new Set(installations.map(s => String(s.kit_schedule_id ?? '')));

  const records = installations.map(s => {
    const kit = kitById.get(String(s.kit_schedule_id ?? ''));
    return {
      data: s.scheduled_date ?? null,
      hora: s.scheduled_time ?? null,
      servico: s.service ?? null,
      cliente: s.customer ?? null,
      placa: s.plate ?? null,
      modelo_rastreador: s.tracker_model ?? null,
      tipo_contrato: s.tipo_contrato ?? null,
      tecnico: s.technician_name ?? null,
      contractcode: contractCode(vehicleFor(kit, s.plate)),
      kit_schedule_id: s.kit_schedule_id ?? null,
      status: 'agendado',
      marca_veiculo: kit?.vehicle_brand ?? null,
      modelo_veiculo: s.vehicle_model ?? kit?.vehicle_model ?? null,
      ano_veiculo: s.vehicle_year ?? kit?.vehicle_year ?? null,
      enviado_em: kit?.shipped_at ?? null,
    };
  });

  for (const shipment of shipments) {
    if (shipment.status !== 'shipped' || scheduledKitIds.has(String(shipment.id))) continue;
    const vehicle = vehicleFor(shipment, shipment.vehicle_plate);
    records.push({
      // Production dates and technicians are NOT installation appointments.
      data: null,
      hora: null,
      servico: null,
      cliente: shipment.customer_name ?? vehicle?.company_name ?? null,
      placa: shipment.vehicle_plate ?? vehicle?.plate ?? null,
      modelo_rastreador: shipment.equipment_model ?? null,
      tipo_contrato: vehicle?.usage_type ?? null,
      tecnico: null,
      contractcode: contractCode(vehicle),
      kit_schedule_id: shipment.id,
      status: 'enviado',
      marca_veiculo: shipment.vehicle_brand ?? vehicle?.brand ?? null,
      modelo_veiculo: shipment.vehicle_model ?? vehicle?.vehicle ?? null,
      ano_veiculo: shipment.vehicle_year ?? vehicle?.year ?? null,
      enviado_em: shipment.shipped_at ?? null,
    });
  }

  const contains = (value: unknown, term?: string) => !term || String(value ?? '').toUpperCase().includes(term.toUpperCase());
  const filtered = records.filter(r =>
    contains(r.placa, filters.placa) && contains(r.cliente, filters.cliente) &&
    (!filters.tecnico || (r.tecnico != null && contains(r.tecnico, filters.tecnico))) &&
    (!filters.tipo_contrato || r.tipo_contrato === filters.tipo_contrato) &&
    (!filters.data_inicio || (r.data != null && String(r.data) >= filters.data_inicio)) &&
    (!filters.data_fim || (r.data != null && String(r.data) <= filters.data_fim))
  );
  filtered.sort((a, b) =>
    String(b.data ?? b.enviado_em ?? '').localeCompare(String(a.data ?? a.enviado_em ?? '')) ||
    String(a.hora ?? '').localeCompare(String(b.hora ?? '')) ||
    String(a.kit_schedule_id ?? '').localeCompare(String(b.kit_schedule_id ?? ''))
  );
  const from = (filters.page - 1) * filters.limit;
  return filtered.slice(from, from + filters.limit);
}