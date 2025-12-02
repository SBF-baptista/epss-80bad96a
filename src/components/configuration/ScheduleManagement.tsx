import { useState } from 'react';
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, getWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScheduleFormModal } from './ScheduleFormModal';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const timeSlots = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export const ScheduleManagement = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const today = new Date();

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (data: any) => {
    console.log('Agendamento criado:', data);
    toast.success('Agendamento criado com sucesso!');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agendamento</h2>
          <p className="text-muted-foreground">
            Clique em uma data para criar um novo agendamento
          </p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* Header com navegação */}
          <div className="flex items-center justify-between p-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={goToNextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Hoje
              </Button>
            </div>
            
            <div className="text-center">
              <h3 className="text-xl font-semibold">
                {format(currentWeekStart, "MMMM yyyy", { locale: ptBR })}
              </h3>
              <p className="text-sm text-muted-foreground">
                Semana {getWeek(currentWeekStart, { weekStartsOn: 1 })}
              </p>
            </div>

            <div className="w-[140px]" /> {/* Spacer para centralizar */}
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b">
            <div className="p-2 border-r bg-muted/20" />
            {weekDays.map((day, index) => {
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={index}
                  className={cn(
                    "p-3 text-center border-r last:border-r-0 cursor-pointer hover:bg-accent/50 transition-colors",
                    isToday && "bg-primary/10"
                  )}
                  onClick={() => handleDateSelect(day)}
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {format(day, 'EEE', { locale: ptBR })}
                  </p>
                  <p className={cn(
                    "text-2xl font-bold mt-1",
                    isToday && "text-primary"
                  )}>
                    {format(day, 'd')}
                  </p>
                  {isToday && (
                    <div className="w-2 h-2 rounded-full bg-primary mx-auto mt-1" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Grade de horários */}
          <div className="max-h-[500px] overflow-y-auto">
            {timeSlots.map((time, timeIndex) => (
              <div key={time} className="grid grid-cols-[80px_repeat(7,1fr)] border-b last:border-b-0">
                <div className="p-2 text-xs text-muted-foreground text-right pr-3 border-r bg-muted/20 flex items-center justify-end">
                  {time}
                </div>
                {weekDays.map((day, dayIndex) => {
                  const isToday = isSameDay(day, today);
                  return (
                    <div
                      key={`${timeIndex}-${dayIndex}`}
                      className={cn(
                        "min-h-[60px] border-r last:border-r-0 cursor-pointer hover:bg-accent/30 transition-colors",
                        isToday && "bg-primary/5"
                      )}
                      onClick={() => handleDateSelect(day)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ScheduleFormModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedDate={selectedDate}
        onSubmit={handleFormSubmit}
      />
    </div>
  );
};
