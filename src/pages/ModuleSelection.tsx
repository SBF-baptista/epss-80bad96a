import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  Calendar,
  Users,
  Truck,
  FileText,
  Settings,
  History,
  UserCog,
} from "lucide-react";

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  allowedRoles: string[];
  bgColor: string;
  iconColor: string;
}

const modules: ModuleCard[] = [
  {
    title: "Dashboard",
    description: "Visão geral e métricas do sistema",
    icon: <LayoutDashboard className="h-8 w-8" />,
    path: "/dashboard",
    allowedRoles: ["admin", "gestor"],
    bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
    iconColor: "text-blue-600",
  },
  {
    title: "Kickoff",
    description: "Recepção e processamento de veículos",
    icon: <FileText className="h-8 w-8" />,
    path: "/kickoff",
    allowedRoles: ["admin", "gestor", "operador_kickoff"],
    bgColor: "bg-purple-500/10 hover:bg-purple-500/20",
    iconColor: "text-purple-600",
  },
  {
    title: "Homologação",
    description: "Gerenciamento de homologações de veículos",
    icon: <ClipboardCheck className="h-8 w-8" />,
    path: "/homologation",
    allowedRoles: ["admin", "gestor", "operador_homologacao"],
    bgColor: "bg-green-500/10 hover:bg-green-500/20",
    iconColor: "text-green-600",
  },
  {
    title: "Planejamento",
    description: "Planejamento de instalações",
    icon: <Calendar className="h-8 w-8" />,
    path: "/planning",
    allowedRoles: ["admin", "gestor", "operador_agendamento"],
    bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
    iconColor: "text-orange-600",
  },
  {
    title: "Agendamento",
    description: "Agenda de técnicos e instalações",
    icon: <Calendar className="h-8 w-8" />,
    path: "/scheduling",
    allowedRoles: ["admin", "gestor", "operador_agendamento"],
    bgColor: "bg-teal-500/10 hover:bg-teal-500/20",
    iconColor: "text-teal-600",
  },
  {
    title: "Logística",
    description: "Esteira de pedidos e envios",
    icon: <Truck className="h-8 w-8" />,
    path: "/kanban",
    allowedRoles: ["admin", "gestor", "operador_suprimentos"],
    bgColor: "bg-amber-500/10 hover:bg-amber-500/20",
    iconColor: "text-amber-600",
  },
  {
    title: "Acompanhamento",
    description: "Tracking de clientes e pedidos",
    icon: <Users className="h-8 w-8" />,
    path: "/customer-tracking",
    allowedRoles: ["admin", "gestor", "operador_kickoff"],
    bgColor: "bg-indigo-500/10 hover:bg-indigo-500/20",
    iconColor: "text-indigo-600",
  },
  {
    title: "Kits",
    description: "Gerenciamento de kits de instalação",
    icon: <Package className="h-8 w-8" />,
    path: "/kits",
    allowedRoles: ["admin", "gestor", "operador_homologacao"],
    bgColor: "bg-cyan-500/10 hover:bg-cyan-500/20",
    iconColor: "text-cyan-600",
  },
  {
    title: "Técnicos",
    description: "Cadastro e gestão de técnicos",
    icon: <UserCog className="h-8 w-8" />,
    path: "/technicians",
    allowedRoles: ["admin"],
    bgColor: "bg-rose-500/10 hover:bg-rose-500/20",
    iconColor: "text-rose-600",
  },
  {
    title: "Usuários",
    description: "Gerenciamento de usuários do sistema",
    icon: <Users className="h-8 w-8" />,
    path: "/users",
    allowedRoles: ["admin"],
    bgColor: "bg-slate-500/10 hover:bg-slate-500/20",
    iconColor: "text-slate-600",
  },
  {
    title: "Histórico",
    description: "Logs e histórico de ações",
    icon: <History className="h-8 w-8" />,
    path: "/history",
    allowedRoles: ["admin"],
    bgColor: "bg-gray-500/10 hover:bg-gray-500/20",
    iconColor: "text-gray-600",
  },
  {
    title: "Configurações",
    description: "Regras de automação e configurações",
    icon: <Settings className="h-8 w-8" />,
    path: "/config",
    allowedRoles: ["admin"],
    bgColor: "bg-zinc-500/10 hover:bg-zinc-500/20",
    iconColor: "text-zinc-600",
  },
];

const ModuleSelection = () => {
  const navigate = useNavigate();
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Filter modules based on user role
  const availableModules = modules.filter((module) => {
    if (role === "admin" || role === "gestor") return true;
    return module.allowedRoles.includes(role || "");
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-2">EPSS</h1>
          <p className="text-lg text-muted-foreground">Selecione o módulo que deseja acessar</p>
        </div>

        {/* Modules Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {availableModules.map((module) => (
            <Card
              key={module.path}
              className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-2 hover:border-primary/30 ${module.bgColor}`}
              onClick={() => navigate(module.path)}
            >
              <CardHeader className="pb-2">
                <div className={`${module.iconColor} mb-2`}>{module.icon}</div>
                <CardTitle className="text-lg">{module.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">{module.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* No modules message */}
        {availableModules.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">Você não possui permissão para acessar nenhum módulo.</p>
            <p className="text-muted-foreground text-sm mt-2">Entre em contato com o administrador do sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleSelection;
