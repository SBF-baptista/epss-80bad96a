import { useState, useEffect, useMemo } from "react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, getWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScheduleFormModal } from "./ScheduleFormModal";
import { ScheduleEditModal, ScheduleEditFormData } from "./ScheduleEditModal";
import { CustomerScheduleSection } from "./CustomerScheduleSection";
import { TechnicianAgendaModal } from "./TechnicianAgendaModal";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, MapPin, Clock, GripVertical, User, Wrench, Filter, Plus, Send, Search, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { getTechnicians, Technician } from "@/services/technicianService";
import { useUserRole } from "@/hooks/useUserRole";

// Send WhatsApp notification to technician using Twilio template - returns success/failure info
const sendTechnicianWhatsApp = async (
  technicianId: string,
  scheduleData: {
    date: string;
    time: string;
    customer: string;
    address: string;
    local_contact: string;
    phone?: string;
  },
): Promise<{ success: boolean; technicianName?: string; error?: string }> => {
  try {
    console.log("[WhatsApp Template] Starting notification for technician:", technicianId);

    const { data: technician, error: techError } = await supabase
      .from("technicians")
      .select("name, phone")
      .eq("id", technicianId)
      .single();

    if (techError || !technician) {
      console.error("[WhatsApp Template] Error fetching technician:", techError);
      return { success: false, error: "Técnico não encontrado" };
    }

    console.log("[WhatsApp Template] Technician found:", technician.name, "Phone:", technician.phone);

    if (!technician.phone) {
      console.log("[WhatsApp Template] No phone number, skipping");
      return { success: false, error: "Técnico sem telefone cadastrado" };
    }

    // Twilio ContentVariables rejeita espaços/caracteres em determinados slots
    // (ex.: quando a variável é usada em parâmetro de URL do template). Enviar
    // somente "dd/MM/yyyy" evita o erro 21656 ao usar o dia da semana.
    const formattedDate = format(new Date(scheduleData.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR });

    console.log("[WhatsApp Template] Sending template to:", technician.phone);

    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: {
        orderId: "schedule-notification",
        orderNumber: `Agendamento - ${scheduleData.customer}`,
        recipientPhone: technician.phone,
        recipientName: technician.name,
        templateType: "technician_schedule",
        templateVariables: {
          technicianName: technician.name,
          scheduledDate: formattedDate,
          scheduledTime: scheduleData.time,
          customerName: scheduleData.customer,
          address: scheduleData.address,
          contactPhone: scheduleData.phone || scheduleData.local_contact || "Não informado",
        },
      },
    });

    if (error) {
      console.error("[WhatsApp Template] Error sending:", error);
      return { success: false, technicianName: technician.name, error: error.message || "Erro ao enviar" };
    }

    console.log("[WhatsApp Template] Response:", data);
    return { success: true, technicianName: technician.name };
  } catch (error) {
    console.error("[WhatsApp Template] Exception:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erro desconhecido" };
  }
};

const timeSlots = [
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
];

interface ScheduleEntry {
  id: string;
  scheduled_date: string;
  scheduled_time: string;
  technician_name: string;
  technician_whatsapp: string;
  customer: string;
  address: string;
  plate: string;
  service: string;
  vehicle_model: string;
  vehicle_year?: string | null;
  tracker_model: string;
  tipo_contrato?: string | null;
  scheduled_by: string;
  reference_point: string;
  phone: string;
  local_contact: string;
  observation: string;
  kit_schedule_id?: string | null;
  deletion_request_status?: string | null;
}

export const ScheduleManagement = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleEntry | null>(null);
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [draggedSchedule, setDraggedSchedule] = useState<ScheduleEntry | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [selectedTechnicianFilter, setSelectedTechnicianFilter] = useState<string>("all");
  const [plateSearch, setPlateSearch] = useState<string>("");
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [unitCreationResult, setUnitCreationResult] = useState<{
    placa: string;
    sistema: string;
    tipoContrato: string;
    dispositivo: string;
    response?: unknown;
  } | null>(null);

  const { isAdmin, isGestor, canEditModule } = useUserRole();
  const canDispatchAgenda = isAdmin() || isGestor();
  const canEditScheduling = canEditModule('scheduling');

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const today = new Date();

  const fetchSchedules = async () => {
    const { data, error } = await supabase.from("installation_schedules").select("*");

    if (error) {
      console.error("Error fetching schedules:", error);
      return;
    }

    if (data) {
      setSchedules(data as ScheduleEntry[]);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const data = await getTechnicians();
      setTechnicians(data);
    } catch (error) {
      console.error("Error fetching technicians:", error);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchTechnicians();
  }, []);

  // Filter schedules by selected technician
  const filteredSchedules = useMemo(() => {
    const plate = plateSearch.trim().toLowerCase();
    return schedules.filter((s) => {
      if (selectedTechnicianFilter !== "all" && s.technician_name !== selectedTechnicianFilter) return false;
      if (plate && !(s.plate ?? "").toLowerCase().includes(plate)) return false;
      return true;
    });
  }, [schedules, selectedTechnicianFilter, plateSearch]);

  const handleDateSelect = (date: Date, time?: string) => {
    setSelectedDate(date);
    setSelectedTime(time || null);
    setIsModalOpen(true);
  };

  const handleScheduleClick = (schedule: ScheduleEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSchedule(schedule);
    setIsEditModalOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    // Fonte da verdade do tipo de contrato: base de pendências do Segsale.
    // O valor digitado no formulário é apenas fallback.
    const plateNorm = String(data.plate ?? "").toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean)[0] ?? "";
    let confirmedTipo: 'TELEMETRIA' | 'MENSALISTA' | null = null;
    if (plateNorm) {
      try {
        const { data: check } = await supabase.functions.invoke('frota-check-placa-pendente', {
          body: { placa: plateNorm },
        });
        if (check?.pendente && check?.data?.tipoContrato) {
          confirmedTipo = String(check.data.tipoContrato).toUpperCase() === 'TELEMETRIA'
            ? 'TELEMETRIA' : 'MENSALISTA';
        }
      } catch (e) {
        console.warn('[ScheduleManagement] falha ao confirmar tipo_contrato:', e);
      }
    }
    const finalTipo: 'TELEMETRIA' | 'MENSALISTA' =
      confirmedTipo ?? (data.tipo_contrato === 'MENSALISTA' ? 'MENSALISTA' : 'TELEMETRIA');
    if (confirmedTipo && data.tipo_contrato && confirmedTipo !== data.tipo_contrato) {
      console.warn(`[ScheduleManagement] tipo_contrato divergente: form=${data.tipo_contrato} base=${confirmedTipo} placa=${plateNorm}`);
      toast.info(`Tipo de contrato ajustado para ${confirmedTipo} conforme a base do Segsale.`);
    }

    const scheduleData: any = {
      scheduled_date: format(data.date, "yyyy-MM-dd"),
      scheduled_time: data.time,
      technician_name: data.technician_name,
      technician_whatsapp: data.technician_whatsapp,
      customer: data.customer,
      address: data.address,
      plate: data.plate,
      service: data.service,
      vehicle_model: data.vehicle_model,
      vehicle_year: data.vehicle_year || null,
      tracker_model: data.tracker_model,
      tipo_contrato: finalTipo,

      scheduled_by: "Sistema", // Auto-filled since field was removed
      reference_point: data.reference_point || null,
      phone: data.phone || null,
      local_contact: data.local_contact || null,
      observation: data.observation || null,
    };

    const { data: inserted, error } = await supabase.from("installation_schedules").insert(scheduleData).select().single();

    if (error) {
      console.error("Error creating schedule:", error);
      toast.error("Erro ao criar agendamento");
      return;
    }

    await fetchSchedules();
    toast.success("Agendamento criado com sucesso!");

    // Dispara integração externa conforme o tipo de contrato CONFIRMADO na base do Segsale:
    // - TELEMETRIA -> POST no Frota (create-frota-unidade)
    // - MENSALISTA -> publica no Kafka + também tenta criar unidade no Frota (rede de segurança)
    if (inserted?.id) {
      const tipoContrato = finalTipo;
      console.log(`[ScheduleManagement] installation_schedule=${inserted.id} tipoContrato=${tipoContrato} (confirmado=${confirmedTipo ?? 'nao'})`);

      if (tipoContrato === 'MENSALISTA') {
        supabase.functions
          .invoke('kafka-publish-agendamento', {
            body: { installationScheduleId: inserted.id, tipoContrato: 'MENSALISTA' },
          })
          .then(({ error }) => {
            if (error) console.warn('[kafka-publish-agendamento] falhou:', error.message);
          })
          .catch((e) => console.warn('[kafka-publish-agendamento] erro:', e));
      }

      // Sempre tenta criar a unidade na Frota (idempotente do lado da função)
      supabase.functions
        .invoke('create-frota-unidade', {
          body: { installationScheduleId: inserted.id, tipoContrato },
        })
        .then(({ data: fData, error }) => {
          if (error) {
            console.warn('[create-frota-unidade] falhou:', error.message);
            toast.error('Falha ao criar unidade na Frota: ' + error.message);
            return;
          }
          console.log('[create-frota-unidade] resultado:', fData);
          const fr = fData as any;
          if (fr?.ok && !fr?.skipped) {
            setUnitCreationResult({
              placa: fr?.request?.placa ?? data.plate,
              sistema: 'Frota',
              tipoContrato: fr?.request?.tipoContrato ?? finalTipo,
              dispositivo: fr?.request?.dispositivo ?? 'NT20',
              response: fr?.response,
            });
          } else if (fr?.skipped) {
            toast.info('Unidade já havia sido criada para este agendamento.');
          }
        })
        .catch((e) => {
          console.warn('[create-frota-unidade] erro:', e);
          toast.error('Erro ao criar unidade na Frota');
        });
    }



    // Send WhatsApp notification to technician with feedback
    if (data.technician_id) {
      toast.loading("Enviando notificação WhatsApp...", { id: "whatsapp-notification" });

      const result = await sendTechnicianWhatsApp(data.technician_id, {
        date: scheduleData.scheduled_date,
        time: scheduleData.scheduled_time,
        customer: scheduleData.customer,
        address: scheduleData.address,
        local_contact: scheduleData.local_contact || "",
        phone: scheduleData.phone || "",
      });

      if (result.success) {
        toast.success(`WhatsApp enviado para ${result.technicianName}!`, { id: "whatsapp-notification" });
      } else {
        toast.error(`Erro no WhatsApp: ${result.error}`, { id: "whatsapp-notification" });
      }
    }
  };

  const handleUpdateSchedule = async (id: string, data: ScheduleEditFormData) => {
    setIsLoading(true);

    const updatePayload: any = {
      technician_name: data.technician_name,
      technician_whatsapp: data.technician_whatsapp,
      scheduled_date: data.scheduled_date,
      scheduled_time: data.scheduled_time,
      scheduled_by: data.scheduled_by,
      service: data.service,
      tipo_contrato: data.tipo_contrato || null,
      plate: data.plate,
      vehicle_model: data.vehicle_model,
      vehicle_year: data.vehicle_year || null,
      tracker_model: data.tracker_model,
      customer: data.customer,
      address: data.address,
      reference_point: data.reference_point || null,
      phone: data.phone || null,
      local_contact: data.local_contact || null,
      observation: data.observation || null,
    };

    const { error } = await supabase
      .from("installation_schedules")
      .update(updatePayload)
      .eq("id", id);

    setIsLoading(false);

    if (error) {
      console.error("Error updating schedule:", error);
      toast.error("Erro ao atualizar agendamento");
      return;
    }

    await fetchSchedules();
    toast.success("Agendamento atualizado com sucesso!");
  };

  const handleDeleteSchedule = async (id: string, motivo?: string) => {
    setIsLoading(true);
    try {
      const schedule = schedules.find((s) => s.id === id);
      if (!schedule) {
        toast.error("Agendamento não encontrado");
        return;
      }

      if (schedule.deletion_request_status === "pending") {
        toast.info("Este agendamento já possui uma solicitação de exclusão pendente.");
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast.error("Sessão inválida");
        return;
      }

      // Descobrir tipo_contrato via usage_type do incoming_vehicle da placa (se existir)
      let tipoContrato: string | null = null;
      if (schedule.plate) {
        const { data: iv } = await supabase
          .from("incoming_vehicles")
          .select("usage_type")
          .eq("plate", schedule.plate.trim().toUpperCase())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const u = String(iv?.usage_type ?? "").toLowerCase();
        if (u.includes("telemetr")) tipoContrato = "TELEMETRIA";
        else if (u) tipoContrato = "MENSALISTA";
      }

      const motivoTrim = (motivo ?? "").trim();
      if (!motivoTrim) {
        toast.error("Informe o motivo da exclusão.");
        return;
      }

      const { error: insErr } = await supabase
        .from("solicitacoes_exclusao_agendamento")
        .insert([{
          agendamento_id: id,
          veiculo: schedule.plate ?? null,
          filial_contrato: null,
          tipo_contrato: tipoContrato,
          solicitado_por: userId,
          motivo: motivoTrim,
          snapshot: JSON.parse(JSON.stringify(schedule)),
        }] as never);

      if (insErr) {
        console.error("Error creating deletion request:", insErr);
        toast.error("Erro ao registrar solicitação de exclusão");
        return;
      }

      await supabase
        .from("installation_schedules")
        .update({ deletion_request_status: "pending" })
        .eq("id", id);

      await fetchSchedules();
      toast.success("Solicitação de exclusão enviada para aprovação.");
    } finally {
      setIsLoading(false);
    }
  };

  const getSchedulesForDateAndTime = (date: Date, timeSlot: string) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const [slotHour, slotMinute] = timeSlot.split(":").map(Number);

    return filteredSchedules.filter((schedule) => {
      const [scheduleHour, scheduleMinute] = schedule.scheduled_time.split(":").map(Number);
      // Match if schedule falls within this 30-minute slot
      if (schedule.scheduled_date !== dateStr) return false;
      if (scheduleHour !== slotHour) return false;
      // Check if minute is in the same 30-min block
      const slotBlock = slotMinute < 30 ? 0 : 30;
      const scheduleBlock = scheduleMinute < 30 ? 0 : 30;
      return slotBlock === scheduleBlock;
    });
  };

  const isToday = (date: Date) => {
    const todayStr = format(today, "yyyy-MM-dd");
    const dateStr = format(date, "yyyy-MM-dd");
    return todayStr === dateStr;
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const handleDragStart = (e: React.DragEvent, schedule: ScheduleEntry) => {
    setDraggedSchedule(schedule);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", schedule.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date, targetTime: string) => {
    e.preventDefault();
    if (!draggedSchedule) return;

    const newDate = format(targetDate, "yyyy-MM-dd");
    const newTime = targetTime;

    if (
      draggedSchedule.scheduled_date === newDate &&
      draggedSchedule.scheduled_time.startsWith(targetTime.split(":")[0])
    ) {
      setDraggedSchedule(null);
      return;
    }

    const { error } = await supabase
      .from("installation_schedules")
      .update({
        scheduled_date: newDate,
        scheduled_time: newTime,
      })
      .eq("id", draggedSchedule.id);

    if (error) {
      console.error("Error moving schedule:", error);
      toast.error("Erro ao mover agendamento");
    } else {
      await fetchSchedules();
      toast.success("Agendamento movido com sucesso!");
    }

    setDraggedSchedule(null);
  };

  const handleDragEnd = () => {
    setDraggedSchedule(null);
  };

  // Get technicians with activities today
  const techniciansWithActivitiesToday = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todaySchedules = schedules.filter((s) => s.scheduled_date === todayStr);
    const uniqueTechnicians = [...new Set(todaySchedules.map((s) => s.technician_name))];
    return uniqueTechnicians;
  }, [schedules]);

  return (
    <div className="space-y-6">
      {/* Enhanced Page Header */}
      <div className="flex flex-col gap-5 bg-muted/20 rounded-xl p-4 sm:p-6 border border-border/50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Title with improved hierarchy */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Agendamento</h1>
            <p className="text-sm text-muted-foreground/70 mt-0.5">Gerencie instalações e técnicos</p>
          </div>

          {/* Action buttons with better visual distinction */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Botão Disparar Agenda - Secondary action */}
            {canDispatchAgenda && (
              <Button 
                variant="outline" 
                onClick={() => setIsAgendaModalOpen(true)} 
                className="gap-2 h-10 border-border/60 hover:bg-muted/60 hover:border-border transition-all"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Disparar Agenda</span>
              </Button>
            )}

            {/* Botão Criar Agendamento - Primary action with enhanced styling */}
            {canEditScheduling && (
              <Button 
                onClick={() => handleDateSelect(new Date())} 
                className="gap-2 h-10 bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
              >
                <Plus className="h-4 w-4" />
                Criar Agendamento
              </Button>
            )}

            {/* Filtro por placa */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                placeholder="Buscar por placa..."
                value={plateSearch}
                onChange={(e) => setPlateSearch(e.target.value.toUpperCase())}
                className="pl-9 h-10 w-[160px] sm:w-[200px] border-border/60 focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Filtro de técnico - improved styling */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground/70" />
              <Select value={selectedTechnicianFilter} onValueChange={setSelectedTechnicianFilter}>
                <SelectTrigger className="w-[180px] sm:w-[200px] h-10 border-border/60 focus:ring-2 focus:ring-primary/20">
                  <SelectValue placeholder="Filtrar por técnico" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os técnicos</SelectItem>
                  {technicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.name}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Technicians with activities today - improved styling */}
        {techniciansWithActivitiesToday.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap py-3 px-4 bg-primary/8 rounded-lg border border-primary/15">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/15 rounded-md">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-primary">Técnicos com atividades hoje:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {techniciansWithActivitiesToday.map((name) => (
                <Badge 
                  key={name} 
                  variant="secondary" 
                  className="bg-primary/15 text-primary border-0 font-medium px-2.5 py-0.5 hover:bg-primary/20 transition-colors"
                >
                  {name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Customer Schedule Section - Grouped by Customer */}
      <CustomerScheduleSection onScheduleSuccess={fetchSchedules} />

      {/* Calendar Card with enhanced styling */}
      <Card className="overflow-hidden border-border/60 shadow-sm rounded-xl">
        <CardContent className="p-0">
          {/* Header com navegação - improved styling */}
          <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-5 border-b border-border/50 bg-muted/20 gap-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="h-9 w-9 border-border/60 hover:bg-muted/60">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek} className="h-9 w-9 border-border/60 hover:bg-muted/60">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="h-9 border-border/60 hover:bg-muted/60">
                Hoje
              </Button>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-semibold capitalize text-foreground">{format(currentWeekStart, "MMMM yyyy", { locale: ptBR })}</h3>
              <p className="text-sm text-muted-foreground/70">Semana {getWeek(currentWeekStart, { weekStartsOn: 1 })}</p>
            </div>

            <div className="w-[140px] hidden sm:block" />
          </div>

          {/* Grade semanal - tabela única com thead sticky e scroll discreto */}
          <div className="max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
            <table className="w-full border-collapse" style={{ tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "80px" }} />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
                <col />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-background shadow-sm">
                <tr className="border-b border-border/40">
                  <th className="p-2 border-r border-border/30 bg-muted/30" />
                  {weekDays.map((day, index) => {
                    const isTodayDate = isToday(day);
                    return (
                      <th
                        key={index}
                        className={cn(
                          "p-2 sm:p-3 text-center border-r border-border/30 last:border-r-0 cursor-pointer hover:bg-accent/40 transition-all font-normal",
                          isTodayDate ? "bg-primary/8" : "bg-background",
                        )}
                        onClick={() => handleDateSelect(day)}
                      >
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">
                          {format(day, "EEE", { locale: ptBR })}
                        </p>
                        <p className={cn("text-lg sm:text-2xl font-bold mt-1", isTodayDate ? "text-primary" : "text-foreground")}>
                          {format(day, "d")}
                        </p>
                        {isTodayDate && <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1.5" />}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((time, timeIndex) => (
                  <tr key={time} className="border-b border-border/30 last:border-b-0">
                    <td
                      className="p-2 text-xs text-muted-foreground/80 text-right pr-2 sm:pr-3 border-r border-border/30 bg-muted/25 align-top font-medium"
                      style={{ height: "110px" }}
                    >
                      {time}
                    </td>
                    {weekDays.map((day, dayIndex) => {
                      const isTodayDate = isToday(day);
                      const daySchedules = getSchedulesForDateAndTime(day, time);
                      return (
                        <td
                          key={`${timeIndex}-${dayIndex}`}
                          className={cn(
                            "border-r border-border/30 last:border-r-0 cursor-pointer hover:bg-accent/25 transition-all p-1 align-top",
                            isTodayDate && "bg-primary/5",
                            draggedSchedule && "bg-accent/15",
                          )}
                          style={{ height: "110px" }}
                          onClick={() => handleDateSelect(day, time)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day, time)}
                        >
                          <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted/50">
                            {daySchedules.map((schedule) => {
                              const pendingDeletion = schedule.deletion_request_status === "pending";
                              return (
                              <div
                                key={schedule.id}
                                draggable={!pendingDeletion}
                                onDragStart={(e) => handleDragStart(e, schedule)}
                                onDragEnd={handleDragEnd}
                                className={cn(
                                  "rounded-lg p-2 text-[10px] sm:text-xs mb-1.5 cursor-grab active:cursor-grabbing transition-all shadow-sm hover:shadow-md border",
                                  pendingDeletion
                                    ? "bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200"
                                    : "bg-primary/85 text-primary-foreground border-primary/20 hover:bg-primary/95",
                                  draggedSchedule?.id === schedule.id && "opacity-50 scale-95",
                                )}
                                onClick={(e) => handleScheduleClick(schedule, e)}
                              >
                                {pendingDeletion && (
                                  <div className="mb-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide">
                                    Aguardando aprovação de exclusão
                                  </div>
                                )}
                                {/* Drag handle and technician name as title */}
                                <div className={cn(
                                  "flex items-center gap-1.5 mb-1.5 pb-1 border-b",
                                  pendingDeletion ? "border-amber-300" : "border-primary-foreground/20"
                                )}>
                                  <GripVertical className="h-3 w-3 opacity-60 flex-shrink-0" />
                                  <span className="font-bold text-xs sm:text-sm truncate">
                                    {schedule.technician_name}
                                  </span>
                                </div>

                                {/* Schedule details with labels - improved hierarchy */}
                                <div className="space-y-0.5 pl-1">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Clock className="h-3 w-3 flex-shrink-0 opacity-60" />
                                    <span className="font-semibold">{schedule.scheduled_time}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <User className="h-3 w-3 flex-shrink-0 opacity-60" />
                                    <span className="font-medium truncate">{schedule.customer}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <Wrench className="h-3 w-3 flex-shrink-0 opacity-60" />
                                    <span className="opacity-80">{schedule.service}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 truncate">
                                    <MapPin className="h-3 w-3 flex-shrink-0 opacity-60" />
                                    <span className="opacity-75 text-[9px] sm:text-[10px] truncate">{schedule.address}</span>
                                  </div>
                                </div>
                              </div>
                              );
                            })}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ScheduleFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onSubmit={handleFormSubmit}
      />

      <ScheduleEditModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        schedule={selectedSchedule}
        onUpdate={handleUpdateSchedule}
        onDelete={handleDeleteSchedule}
        isLoading={isLoading}
      />

      <TechnicianAgendaModal isOpen={isAgendaModalOpen} onOpenChange={setIsAgendaModalOpen} />

      <AlertDialog open={unitCreationResult != null} onOpenChange={(open) => { if (!open) setUnitCreationResult(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary" />
              Unidade criada na Frota
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  A unidade da placa <b>{unitCreationResult?.placa}</b> foi criada com sucesso no sistema{" "}
                  <b>{unitCreationResult?.sistema}</b>.
                </p>
                <div className="rounded-md bg-muted p-3 space-y-1 text-xs">
                  <p>Sistema: <b>{unitCreationResult?.sistema}</b></p>
                  <p>Tipo de contrato: <b>{unitCreationResult?.tipoContrato}</b></p>
                  <p>Dispositivo: <b>{unitCreationResult?.dispositivo}</b></p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setUnitCreationResult(null)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
