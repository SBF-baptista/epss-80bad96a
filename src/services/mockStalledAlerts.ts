import type { StalledAlert } from "@/services/stalledAlertsService";

/**
 * Alertas fictícios de teste — usados apenas para demonstração visual
 * do banner e do popup na Dashboard e no Kickoff.
 *
 * Para desativar: exporte um array vazio ou remova a importação nas páginas.
 */
export const MOCK_STALLED_ALERTS: StalledAlert[] = [
  {
    id: "mock-planning-1",
    type: "planning",
    stageLabel: "Planejamento",
    customerName: "TRANSPORTADORA EXEMPLO LTDA",
    companyName: "TRANSPORTADORA EXEMPLO LTDA",
    plate: "ABC1D23",
    daysStalled: 4,
    since: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    link: "/planning",
  },
  {
    id: "mock-planning-2",
    type: "planning",
    stageLabel: "Planejamento",
    customerName: "LOGÍSTICA FICTÍCIA S/A",
    companyName: "LOGÍSTICA FICTÍCIA S/A",
    plate: "XYZ9K88",
    daysStalled: 3,
    since: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    link: "/planning",
  },
  {
    id: "mock-production-1",
    type: "production",
    stageLabel: "Em Produção (Logística)",
    customerName: "FROTA TESTE COMERCIAL",
    plate: "TST0A00",
    daysStalled: 6,
    since: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    link: "/kanban",
  },
  {
    id: "mock-production-2",
    type: "production",
    stageLabel: "Em Produção (Logística)",
    customerName: "AGROPECUÁRIA MODELO",
    plate: "MDL2B45",
    daysStalled: 8,
    since: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    link: "/kanban",
  },
  {
    id: "mock-scheduling-1",
    type: "scheduling",
    stageLabel: "Agendamento",
    customerName: "DISTRIBUIDORA DEMO",
    plate: "DEM4C56",
    daysStalled: 5,
    since: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    link: "/scheduling",
  },
];
