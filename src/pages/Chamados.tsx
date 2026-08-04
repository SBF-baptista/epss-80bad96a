import { TicketManagementTab } from "@/components/chamados/TicketManagementTab";

const Chamados = () => {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Chamados</h1>
        <p className="text-sm text-muted-foreground">
          Service desk interno: registro, acompanhamento e indicadores de SLA dos
          atendimentos de suporte.
        </p>
      </header>
      <TicketManagementTab />
    </div>
  );
};

export default Chamados;
