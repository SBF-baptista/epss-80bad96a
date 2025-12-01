import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

export const ScheduleManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Agendamento</h2>
          <p className="text-muted-foreground">
            Gerencie os agendamentos de instalação
          </p>
        </div>
        <Button className="gap-2">
          <Calendar className="w-4 h-4" />
          Novo Agendamento
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Em desenvolvimento</h3>
        <p className="text-muted-foreground">
          A funcionalidade de agendamento estará disponível em breve.
        </p>
      </div>
    </div>
  );
};
