import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ProcessEvent {
  id: string;
  type: 'vehicle_received' | 'homologation_created' | 'homologation_status_change' | 'schedule_created' | 'schedule_status_change' | 'order_created' | 'order_status_change';
  title: string;
  description: string;
  timestamp: string;
  formattedDate: string;
  timeAgo: string;
  status?: string;
  module: string;
  icon: string;
}

export interface ProcessHistory {
  events: ProcessEvent[];
  currentStage: string;
  currentStageSince: string | null;
}

// Status labels for display
const homologationStatusLabels: Record<string, string> = {
  homologar: "Aguardando Homologação",
  em_homologacao: "Em Homologação",
  em_testes_finais: "Em Testes Finais",
  homologado: "Homologado",
  agendamento_teste: "Agendamento de Teste",
  execucao_teste: "Execução de Teste",
  armazenamento_plataforma: "Armazenamento na Plataforma"
};

const scheduleStatusLabels: Record<string, string> = {
  scheduled: "Pedido Criado",
  confirmed: "Confirmado",
  in_progress: "Em Produção",
  completed: "Aguardando Envio",
  shipped: "Enviado",
  cancelled: "Cancelado"
};

const orderStatusLabels: Record<string, string> = {
  novos: "Novo",
  producao: "Em Produção",
  aguardando: "Aguardando Envio",
  enviado: "Enviado",
  standby: "Standby"
};

/**
 * Fetch complete process history for a kit schedule
 * This includes: vehicle reception, homologation stages, schedule changes, and order status
 */
export const fetchProcessHistory = async (
  scheduleId: string,
  incomingVehicleId?: string | null
): Promise<ProcessHistory> => {
  const events: ProcessEvent[] = [];
  let currentStage = "Desconhecido";
  let currentStageSince: string | null = null;

  try {
    // 1. Fetch kit schedule info
    const { data: schedule, error: scheduleError } = await supabase
      .from('kit_schedules')
      .select('*, technician:technicians(name)')
      .eq('id', scheduleId)
      .single();

    if (scheduleError) {
      console.error('Error fetching schedule:', scheduleError);
    }

    // 2. Fetch incoming vehicle info (if available)
    let incomingVehicle = null;
    let homologationCard = null;
    let order = null;

    if (incomingVehicleId || schedule?.incoming_vehicle_id) {
      const vehicleId = incomingVehicleId || schedule?.incoming_vehicle_id;
      
      const { data: vehicleData, error: vehicleError } = await supabase
        .from('incoming_vehicles')
        .select('*')
        .eq('id', vehicleId)
        .single();

      if (!vehicleError && vehicleData) {
        incomingVehicle = vehicleData;

        // Add vehicle received event
        events.push({
          id: `vehicle-${vehicleData.id}`,
          type: 'vehicle_received',
          title: 'Veículo Recebido',
          description: `${vehicleData.brand} ${vehicleData.vehicle}${vehicleData.year ? ` (${vehicleData.year})` : ''} recebido no sistema`,
          timestamp: vehicleData.received_at || vehicleData.created_at,
          formattedDate: format(new Date(vehicleData.received_at || vehicleData.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
          timeAgo: formatDistanceToNow(new Date(vehicleData.received_at || vehicleData.created_at), { addSuffix: true, locale: ptBR }),
          module: 'Kickoff',
          icon: '🚗'
        });

        // 3. Fetch homologation card (if linked)
        if (vehicleData.created_homologation_id) {
          const { data: homologationData, error: homologationError } = await supabase
            .from('homologation_cards')
            .select('*')
            .eq('id', vehicleData.created_homologation_id)
            .single();

          if (!homologationError && homologationData) {
            homologationCard = homologationData;

            // Add homologation created event
            events.push({
              id: `homologation-created-${homologationData.id}`,
              type: 'homologation_created',
              title: 'Homologação Iniciada',
              description: `Processo de homologação para ${homologationData.brand} ${homologationData.model} iniciado`,
              timestamp: homologationData.created_at,
              formattedDate: format(new Date(homologationData.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
              timeAgo: formatDistanceToNow(new Date(homologationData.created_at), { addSuffix: true, locale: ptBR }),
              status: homologationStatusLabels[homologationData.status] || homologationData.status,
              module: 'Homologação',
              icon: '🔧'
            });

            // If homologation is approved (homologado)
            if (homologationData.status === 'homologado' && homologationData.updated_at !== homologationData.created_at) {
              events.push({
                id: `homologation-approved-${homologationData.id}`,
                type: 'homologation_status_change',
                title: 'Homologação Concluída',
                description: `Veículo ${homologationData.brand} ${homologationData.model} homologado com sucesso`,
                timestamp: homologationData.updated_at,
                formattedDate: format(new Date(homologationData.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
                timeAgo: formatDistanceToNow(new Date(homologationData.updated_at), { addSuffix: true, locale: ptBR }),
                status: 'Homologado',
                module: 'Homologação',
                icon: '✅'
              });
            }

            // 4. Fetch order (if linked)
            if (homologationData.created_order_id) {
              const { data: orderData, error: orderError } = await supabase
                .from('pedidos')
                .select('*')
                .eq('id', homologationData.created_order_id)
                .single();

              if (!orderError && orderData) {
                order = orderData;

                events.push({
                  id: `order-created-${orderData.id}`,
                  type: 'order_created',
                  title: 'Pedido Criado',
                  description: `Pedido ${orderData.numero_pedido} criado automaticamente`,
                  timestamp: orderData.created_at,
                  formattedDate: format(new Date(orderData.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
                  timeAgo: formatDistanceToNow(new Date(orderData.created_at), { addSuffix: true, locale: ptBR }),
                  status: orderStatusLabels[orderData.status] || orderData.status,
                  module: 'Logística',
                  icon: '🚚'
                });
              }
            }
          }
        }
      }
    }

    // 5. Fetch installation schedules (actual appointments)
    const { data: installationSchedules, error: installationError } = await supabase
      .from('installation_schedules')
      .select('*')
      .eq('kit_schedule_id', scheduleId)
      .order('created_at', { ascending: true });

    if (!installationError && installationSchedules && installationSchedules.length > 0) {
      installationSchedules.forEach((installation) => {
        events.push({
          id: `installation-${installation.id}`,
          type: 'schedule_created',
          title: 'Instalação Agendada',
          description: `Instalação agendada para ${format(new Date(installation.scheduled_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} às ${installation.scheduled_time} com técnico ${installation.technician_name}`,
          timestamp: installation.created_at,
          formattedDate: format(new Date(installation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
          timeAgo: formatDistanceToNow(new Date(installation.created_at), { addSuffix: true, locale: ptBR }),
          status: 'Agendado',
          module: 'Agendamento',
          icon: '📅'
        });
      });
    }

    // 6. Add schedule created event (kit schedule creation)
    if (schedule) {
      events.push({
        id: `schedule-created-${schedule.id}`,
        type: 'schedule_created',
        title: 'Kit Vinculado',
        description: `Kit agendado para ${format(new Date(schedule.scheduled_date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}${schedule.technician?.name ? ` com técnico ${schedule.technician.name}` : ''}`,
        timestamp: schedule.created_at,
        formattedDate: format(new Date(schedule.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
        timeAgo: formatDistanceToNow(new Date(schedule.created_at), { addSuffix: true, locale: ptBR }),
        status: scheduleStatusLabels[schedule.status] || schedule.status,
        module: 'Logística',
        icon: '🚚'
      });
    }

    // 7. Fetch kit schedule status history
    const { data: statusHistory, error: statusHistoryError } = await supabase
      .from('kit_schedule_status_history')
      .select('*')
      .eq('kit_schedule_id', scheduleId)
      .order('changed_at', { ascending: true });

    if (!statusHistoryError && statusHistory) {
      statusHistory.forEach((entry, index) => {
        // Skip initial status if it's the same as schedule creation
        if (index === 0 && entry.previous_status === null && entry.new_status === 'scheduled') {
          return;
        }

        // Skip status changes from shipped to scheduled (this is installation scheduling, not going back to order)
        if (entry.previous_status === 'shipped' && entry.new_status === 'scheduled') {
          return;
        }

        events.push({
          id: `status-change-${entry.id}`,
          type: 'schedule_status_change',
          title: 'Status Atualizado',
          description: entry.previous_status 
            ? `Status alterado de "${scheduleStatusLabels[entry.previous_status] || entry.previous_status}" para "${scheduleStatusLabels[entry.new_status] || entry.new_status}"`
            : `Status definido como "${scheduleStatusLabels[entry.new_status] || entry.new_status}"`,
          timestamp: entry.changed_at,
          formattedDate: format(new Date(entry.changed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }),
          timeAgo: formatDistanceToNow(new Date(entry.changed_at), { addSuffix: true, locale: ptBR }),
          status: scheduleStatusLabels[entry.new_status] || entry.new_status,
          module: 'Logística',
          icon: '🔄'
        });
      });
    }

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Determine current stage
    if (schedule) {
      if (homologationCard && homologationCard.status !== 'homologado') {
        currentStage = `Em Homologação (${homologationStatusLabels[homologationCard.status] || homologationCard.status})`;
        currentStageSince = homologationCard.updated_at || homologationCard.created_at;
      } else {
        currentStage = scheduleStatusLabels[schedule.status] || schedule.status;
        // Find when this status started
        const lastStatusChange = statusHistory?.filter(h => h.new_status === schedule.status).pop();
        currentStageSince = lastStatusChange?.changed_at || schedule.created_at;
      }
    }

  } catch (error) {
    console.error('Error fetching process history:', error);
  }

  return {
    events,
    currentStage,
    currentStageSince
  };
};

/**
 * Subscribe to real-time updates for process history
 */
export const subscribeToProcessHistory = (
  scheduleId: string,
  onUpdate: () => void
) => {
  const channel = supabase
    .channel(`process-history-${scheduleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'kit_schedule_status_history',
        filter: `kit_schedule_id=eq.${scheduleId}`
      },
      () => onUpdate()
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'kit_schedules',
        filter: `id=eq.${scheduleId}`
      },
      () => onUpdate()
    )
    .subscribe();

  return channel;
};
