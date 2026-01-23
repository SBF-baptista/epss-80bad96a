import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppModule } from "@/types/permissions";
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  Calendar,
  Users,
  Truck,
  Settings,
  History,
  UserCog,
  Rocket,
  UserCheck,
  Clock,
} from "lucide-react";

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  module: AppModule;
  gradient: string;
}

const modules: ModuleCard[] = [
  {
    title: "Dashboard",
    description: "Visão geral e métricas do sistema",
    icon: <LayoutDashboard className="h-8 w-8" />,
    path: "/dashboard",
    module: "dashboard",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    title: "Kickoff",
    description: "Recepção e processamento de veículos",
    icon: <Rocket className="h-8 w-8" />,
    path: "/kickoff",
    module: "kickoff",
    gradient: "from-purple-500 to-purple-600",
  },
  {
    title: "Homologação",
    description: "Gerenciamento de homologações de veículos",
    icon: <ClipboardCheck className="h-8 w-8" />,
    path: "/homologation",
    module: "homologation",
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    title: "Planejamento",
    description: "Planejamento de instalações",
    icon: <Calendar className="h-8 w-8" />,
    path: "/planning",
    module: "planning",
    gradient: "from-orange-500 to-orange-600",
  },
  {
    title: "Agendamento",
    description: "Agenda de técnicos e instalações",
    icon: <Clock className="h-8 w-8" />,
    path: "/config",
    module: "scheduling",
    gradient: "from-teal-500 to-teal-600",
  },
  {
    title: "Logística",
    description: "Esteira de pedidos e envios",
    icon: <Truck className="h-8 w-8" />,
    path: "/kanban",
    module: "kanban",
    gradient: "from-amber-500 to-amber-600",
  },
  {
    title: "Acompanhamento",
    description: "Tracking de clientes e pedidos",
    icon: <UserCheck className="h-8 w-8" />,
    path: "/customer-tracking",
    module: "customer_tracking",
    gradient: "from-indigo-500 to-indigo-600",
  },
  {
    title: "Kits",
    description: "Gerenciamento de kits de instalação",
    icon: <Package className="h-8 w-8" />,
    path: "/kits",
    module: "kits",
    gradient: "from-cyan-500 to-cyan-600",
  },
  {
    title: "Técnicos",
    description: "Cadastro e gestão de técnicos",
    icon: <UserCog className="h-8 w-8" />,
    path: "/technicians",
    module: "technicians",
    gradient: "from-rose-500 to-rose-600",
  },
  {
    title: "Usuários",
    description: "Gerenciamento de usuários do sistema",
    icon: <Users className="h-8 w-8" />,
    path: "/users",
    module: "users",
    gradient: "from-slate-500 to-slate-600",
  },
  {
    title: "Histórico",
    description: "Logs e histórico de ações",
    icon: <History className="h-8 w-8" />,
    path: "/history",
    module: "users", // Requires user management access
    gradient: "from-gray-500 to-gray-600",
  },
  {
    title: "Configurações",
    description: "Regras de automação e configurações",
    icon: <Settings className="h-8 w-8" />,
    path: "/config",
    module: "scheduling",
    gradient: "from-zinc-500 to-zinc-600",
  },
];

const ModuleSelection = () => {
  const navigate = useNavigate();
  const { role, canViewModule, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando módulos...</p>
        </div>
      </div>
    );
  }

  // Filter modules based on user permissions
  const availableModules = modules.filter((module) => {
    // Admin has access to everything
    if (role === "admin") return true;
    // Check module-specific permission
    return canViewModule(module.module);
  });

  // Remove duplicates (config appears twice with different titles)
  const uniqueModules = availableModules.filter((module, index, self) => 
    index === self.findIndex(m => m.path === module.path)
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Bem-vindo ao OPM - SEGSAT
        </h1>
        <p className="text-muted-foreground text-lg">
          Selecione o módulo que deseja acessar
        </p>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {uniqueModules.map((module) => (
          <Card
            key={module.path + module.title}
            className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border overflow-hidden"
            onClick={() => navigate(module.path)}
          >
            <div className={`h-2 bg-gradient-to-r ${module.gradient}`} />
            <CardHeader className="pb-3">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${module.gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                {module.icon}
              </div>
              <CardTitle className="text-lg mt-3">{module.title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CardDescription className="text-sm leading-relaxed">
                {module.description}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No modules message */}
      {uniqueModules.length === 0 && (
        <div className="text-center py-12 bg-muted/50 rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-lg font-medium">
            Você não possui permissão para acessar nenhum módulo.
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Entre em contato com o administrador do sistema.
          </p>
        </div>
      )}
    </div>
  );
};

export default ModuleSelection;
