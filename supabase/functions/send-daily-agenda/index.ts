import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Technician {
  id: string;
  name: string;
  phone: string | null;
}

interface Schedule {
  scheduled_time: string;
  customer: string;
  phone: string | null;
  address: string;
  reference_point: string | null;
  local_contact: string | null;
  service: string;
  kit_schedule_id: string | null;
}

interface SendResult {
  technicianName: string;
  phone: string | null;
  scheduleCount: number;
  success: boolean;
  error?: string;
}

// Format a schedule entry for WhatsApp
function formatSchedule(s: Schedule, protocol: string): string {
  const time = s.scheduled_time?.substring(0, 5) || '--:--';
  const customer = s.customer || 'Cliente';
  const service = s.service || 'Instalação';
  const phone = s.phone || '-';
  const address = s.address || 'Endereço a confirmar';
  const refPoint = s.reference_point || '-';
  const localContact = s.local_contact || '-';
  return `📌 *Horário:* ${time} | *Cliente:* ${customer} | *Serviço:* ${service} | *Endereço:* ${address} | *Ponto de referência:* ${refPoint} | *Telefone cliente:* ${phone} | *Contato local:* ${localContact} | *Protocolo:* ${protocol}`;
}

// Get tomorrow's date formatted as YYYY-MM-DD
function getTomorrowDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

// Get tomorrow's date formatted for display (DD/MM/YYYY)
function getTomorrowDisplayDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = String(tomorrow.getDate()).padStart(2, '0');
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const year = tomorrow.getFullYear();
  return `${day}/${month}/${year}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('=== Daily Agenda Dispatch Started ===');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Parse request body for optional test parameters
    let testMode = false;
    let testTechnicianName: string | null = null;
    
    try {
      const body = await req.json();
      testMode = body?.testMode === true;
      testTechnicianName = body?.technicianName || null;
      console.log('Request body:', JSON.stringify(body));
    } catch {
      // Empty body is fine for cron calls
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const tomorrowStr = getTomorrowDateString();
    const formattedTomorrow = getTomorrowDisplayDate();
    console.log(`Looking for schedules on: ${tomorrowStr} (${formattedTomorrow})`);

    // Get all technicians
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id, name, phone');

    if (techError) {
      console.error('Error fetching technicians:', techError);
      throw new Error(`Failed to fetch technicians: ${techError.message}`);
    }

    console.log(`Found ${technicians?.length || 0} technicians`);

    // If test mode with specific technician, filter
    let targetTechnicians = technicians || [];
    if (testMode && testTechnicianName) {
      targetTechnicians = targetTechnicians.filter(
        t => t.name.toLowerCase().includes(testTechnicianName!.toLowerCase())
      );
      console.log(`Test mode: Filtering to ${targetTechnicians.length} technician(s) matching "${testTechnicianName}"`);
    }

    const results: SendResult[] = [];

    for (const tech of targetTechnicians) {
      console.log(`\n--- Processing: ${tech.name} ---`);

      if (!tech.phone) {
        console.log(`Skipping ${tech.name}: No phone number`);
        results.push({
          technicianName: tech.name,
          phone: null,
          scheduleCount: 0,
          success: false,
          error: 'Sem telefone cadastrado'
        });
        continue;
      }

      // Get schedules for this technician for tomorrow
      const { data: schedules, error: schedError } = await supabase
        .from('installation_schedules')
        .select('scheduled_time, customer, phone, address, reference_point, local_contact, service, kit_schedule_id')
        .eq('scheduled_date', tomorrowStr)
        .eq('technician_name', tech.name)
        .order('scheduled_time', { ascending: true });

      if (schedError) {
        console.error(`Error fetching schedules for ${tech.name}:`, schedError);
        results.push({
          technicianName: tech.name,
          phone: tech.phone,
          scheduleCount: 0,
          success: false,
          error: `Erro ao buscar agendamentos: ${schedError.message}`
        });
        continue;
      }

      if (!schedules || schedules.length === 0) {
        console.log(`No schedules for ${tech.name} on ${tomorrowStr}`);
        // Don't add to results - only technicians with schedules matter
        continue;
      }

      console.log(`Found ${schedules.length} schedule(s) for ${tech.name}`);

      // Fetch TomTicket protocols
      const kitScheduleIds = schedules.map(s => s.kit_schedule_id).filter(Boolean) as string[];
      const protocolMap = new Map<string, string>();

      if (kitScheduleIds.length > 0) {
        const { data: kitSchedulesData } = await supabase
          .from('kit_schedules')
          .select('id, incoming_vehicle_id')
          .in('id', kitScheduleIds);

        if (kitSchedulesData) {
          const incomingVehicleIds = kitSchedulesData
            .map(k => k.incoming_vehicle_id)
            .filter(Boolean) as string[];

          if (incomingVehicleIds.length > 0) {
            const { data: vehiclesData } = await supabase
              .from('incoming_vehicles')
              .select('id, tomticket_protocol')
              .in('id', incomingVehicleIds);

            if (vehiclesData) {
              for (const ks of kitSchedulesData) {
                if (ks.incoming_vehicle_id) {
                  const vehicle = vehiclesData.find(v => v.id === ks.incoming_vehicle_id);
                  if (vehicle?.tomticket_protocol) {
                    protocolMap.set(ks.id, vehicle.tomticket_protocol);
                  }
                }
              }
            }
          }
        }
      }

      // Format schedules (up to 5 slots, overflow in last)
      const formattedSchedules: string[] = [];
      
      for (let i = 0; i < Math.min(schedules.length, 5); i++) {
        const sched = schedules[i];
        const protocol = sched.kit_schedule_id ? (protocolMap.get(sched.kit_schedule_id) || '-') : '-';
        formattedSchedules.push(formatSchedule(sched, protocol));
      }

      // Overflow handling
      if (schedules.length > 5) {
        const overflow = schedules.slice(5).map(sched => {
          const protocol = sched.kit_schedule_id ? (protocolMap.get(sched.kit_schedule_id) || '-') : '-';
          return formatSchedule(sched, protocol);
        }).join(' • ');
        formattedSchedules[4] = formattedSchedules[4] + ' • ' + overflow;
      }

      // Pad to 5 slots
      while (formattedSchedules.length < 5) {
        formattedSchedules.push('');
      }

      // Call send-whatsapp edge function
      console.log(`Sending WhatsApp to ${tech.name} (${tech.phone})`);
      
      const { data: sendData, error: sendError } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          orderId: 'daily-agenda-auto',
          orderNumber: `Agenda ${formattedTomorrow} - ${tech.name}`,
          recipientPhone: tech.phone,
          recipientName: tech.name,
          templateType: 'daily_agenda',
          templateVariables: {
            technicianName: tech.name,
            scheduledDate: formattedTomorrow,
            schedule1: formattedSchedules[0],
            schedule2: formattedSchedules[1],
            schedule3: formattedSchedules[2],
            schedule4: formattedSchedules[3],
            schedule5: formattedSchedules[4]
          }
        }
      });

      if (sendError) {
        console.error(`Failed to send to ${tech.name}:`, sendError);
        results.push({
          technicianName: tech.name,
          phone: tech.phone,
          scheduleCount: schedules.length,
          success: false,
          error: sendError.message
        });
        continue;
      }

      if (!sendData?.success || sendData?.errorCode) {
        const errorMsg = sendData?.friendlyMessage || sendData?.errorMessage || 'Falha no envio';
        console.error(`WhatsApp error for ${tech.name}:`, errorMsg);
        results.push({
          technicianName: tech.name,
          phone: tech.phone,
          scheduleCount: schedules.length,
          success: false,
          error: errorMsg
        });
        continue;
      }

      console.log(`Successfully sent to ${tech.name}, SID: ${sendData?.messageSid}`);
      results.push({
        technicianName: tech.name,
        phone: tech.phone,
        scheduleCount: schedules.length,
        success: true
      });
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success && r.scheduleCount > 0).length;

    console.log(`\n=== Daily Agenda Dispatch Complete ===`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        scheduledFor: formattedTomorrow,
        techniciansProcessed: results.length,
        successCount,
        errorCount,
        results,
        durationMs: duration
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Fatal error in send-daily-agenda:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
