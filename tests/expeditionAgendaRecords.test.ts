import { describe, expect, test } from 'bun:test';
import { combineAgendaRecords, type Row } from '../supabase/functions/agendamentos/records';

const kit = { id: 'kit-a', status: 'shipped', incoming_vehicle_id: 'vehicle-a', vehicle_plate: 'TST1A09', customer_name: 'Cliente A', vehicle_model: 'FH 460', vehicle_year: 2024, shipped_at: '2026-10-22T17:18:00Z', scheduled_date: '2026-10-20', technician_id: 'production-technician' };
const vehicles = [
  { id: 'vehicle-b', plate: 'TST1A09', pending_contract_id: 999, usage_type: 'plus_2_gps' },
  { id: 'vehicle-a', plate: 'TST1A09', pending_contract_id: 123, usage_type: 'telemetria_gps' },
];
const agenda = (installations: Row[] = [], shipments: Row[] = [kit], filters = {}) =>
  combineAgendaRecords(installations, shipments, [kit], vehicles, { limit: 100, page: 1, ...filters });

describe('Expedição no endpoint agendamentos', () => {
  test('Enviado aparece imediatamente com os dados do próprio veículo', () => {
    expect(agenda()[0]).toMatchObject({ placa: 'TST1A09', cliente: 'Cliente A', modelo_veiculo: 'FH 460', contractcode: '123', tipo_contrato: 'telemetria_gps', status: 'enviado', kit_schedule_id: 'kit-a' });
  });
  test('não publica veículos que ainda não foram enviados', () => {
    expect(agenda([], [{ ...kit, status: 'completed' }])).toEqual([]);
  });
  test('não transforma data e técnico de produção em instalação', () => {
    expect(agenda()[0]).toMatchObject({ data: null, hora: null, tecnico: null, servico: null });
  });
  test('agendamento substitui o pendente sem duplicar o veículo', () => {
    const result = agenda([{ kit_schedule_id: 'kit-a', plate: 'TST1A09', scheduled_date: '2026-10-25', scheduled_time: '09:30', technician_name: 'Técnico instalação' }]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ status: 'agendado', contractcode: '123', data: '2026-10-25', tecnico: 'Técnico instalação' });
  });
  test('filtros e paginação valem para a lista unificada', () => {
    expect(agenda([], [kit], { placa: 'TST1A09' })).toHaveLength(1);
    expect(agenda([], [kit], { placa: 'ZZZ9999' })).toEqual([]);
    expect(agenda([], [kit], { data_inicio: '2026-10-22' })).toEqual([]);
    expect(agenda([], [kit], { tecnico: 'production-technician' })).toEqual([]);
    expect(agenda([], [kit, { ...kit, id: 'kit-b' }], { page: 2, limit: 1 })).toHaveLength(1);
  });
});