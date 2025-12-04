import { ScheduleManagement } from '@/components/configuration/ScheduleManagement';

const Scheduling = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-foreground mb-6">Agendamento</h1>
        <ScheduleManagement />
      </div>
    </div>
  );
};

export default Scheduling;
