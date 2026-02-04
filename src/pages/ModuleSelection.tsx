import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { AppModule } from "@/types/permissions";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ClipboardCheck,
  Calendar,
  Users,
  Truck,
  History,
  UserCog,
  Rocket,
  UserCheck,
  Clock,
} from "lucide-react";

interface ModuleCard {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  module: AppModule;
  gradient: string;
  iconBg: string;
  iconColor: string;
}

// Ordered according to sidebar hierarchy
const modules: ModuleCard[] = [
  {
    title: "Kickoff",
    description: "Recepção e processamento de veículos novos",
    icon: Rocket,
    path: "/kickoff",
    module: "kickoff",
    gradient: "from-violet-500 to-purple-600",
    iconBg: "bg-violet-500/10",
    iconColor: "text-violet-600",
  },
  {
    title: "Homologação",
    description: "Gerenciamento de homologações de veículos",
    icon: ClipboardCheck,
    path: "/homologation",
    module: "homologation",
    gradient: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  {
    title: "Planejamento",
    description: "Planejamento de instalações e recursos",
    icon: Calendar,
    path: "/planning",
    module: "planning",
    gradient: "from-orange-500 to-amber-600",
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600",
  },
  {
    title: "Logística",
    description: "Esteira de pedidos, produção e envios",
    icon: Truck,
    path: "/kanban",
    module: "kanban",
    gradient: "from-blue-500 to-indigo-600",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
  },
  {
    title: "Agendamento",
    description: "Agenda de técnicos e instalações",
    icon: Clock,
    path: "/config",
    module: "scheduling",
    gradient: "from-cyan-500 to-sky-600",
    iconBg: "bg-cyan-500/10",
    iconColor: "text-cyan-600",
  },
  {
    title: "Acompanhamento",
    description: "Tracking de clientes e pedidos",
    icon: UserCheck,
    path: "/customer-tracking",
    module: "customer_tracking",
    gradient: "from-pink-500 to-rose-600",
    iconBg: "bg-pink-500/10",
    iconColor: "text-pink-600",
  },
  {
    title: "Kits",
    description: "Gerenciamento de kits de instalação",
    icon: Package,
    path: "/kits",
    module: "kits",
    gradient: "from-slate-500 to-zinc-600",
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-600",
  },
  {
    title: "Técnicos",
    description: "Cadastro e gestão de técnicos",
    icon: UserCog,
    path: "/technicians",
    module: "technicians",
    gradient: "from-slate-500 to-zinc-600",
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-600",
  },
  {
    title: "Usuários",
    description: "Gerenciamento de usuários do sistema",
    icon: Users,
    path: "/users",
    module: "users",
    gradient: "from-slate-500 to-zinc-600",
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-600",
  },
  {
    title: "Histórico",
    description: "Logs e histórico de ações",
    icon: History,
    path: "/history",
    module: "users",
    gradient: "from-slate-500 to-zinc-600",
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-600",
  },
  {
    title: "Dashboard",
    description: "Visão geral e métricas do sistema",
    icon: LayoutDashboard,
    path: "/dashboard",
    module: "dashboard",
    gradient: "from-slate-500 to-zinc-600",
    iconBg: "bg-slate-500/10",
    iconColor: "text-slate-600",
  },
];

// Main modules that should be highlighted
const mainModules = ["kickoff", "homologation", "planning", "kanban", "scheduling", "customer_tracking"];

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
    if (role === "admin") return true;
    return canViewModule(module.module);
  });

  // Remove duplicates
  const uniqueModules = availableModules.filter((module, index, self) => 
    index === self.findIndex(m => m.path === module.path)
  );

  // Separate main modules from secondary
  const primaryModules = uniqueModules.filter(m => mainModules.includes(m.module));
  const secondaryModules = uniqueModules.filter(m => !mainModules.includes(m.module));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 15,
      }
    },
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div 
        className="text-center space-y-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
          OPM - SEGSAT
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Selecione o módulo que deseja acessar
        </p>
      </motion.div>

      {/* Primary Modules Grid */}
      {primaryModules.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {primaryModules.map((module) => (
            <motion.div
              key={module.path + module.title}
              variants={cardVariants}
              whileHover={{ 
                y: -6,
                transition: { type: "spring", stiffness: 400, damping: 17 }
              }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(module.path)}
              className="group cursor-pointer"
            >
              <div className="relative h-full bg-card rounded-2xl border border-border/50 shadow-sm hover:shadow-xl hover:border-border transition-all duration-300 overflow-hidden">
                {/* Gradient accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${module.gradient}`} />
                
                <div className="p-6 flex flex-col h-full min-h-[160px]">
                  {/* Icon with circular background */}
                  <div className={`w-14 h-14 rounded-full ${module.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <module.icon className={`h-6 w-6 ${module.iconColor}`} />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {module.title}
                  </h3>
                  
                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    {module.description}
                  </p>

                  {/* Hover indicator */}
                  <div className="mt-4 flex items-center text-sm font-medium text-muted-foreground/0 group-hover:text-primary transition-all duration-300">
                    <span className="opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                      Acessar →
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Secondary Modules Section */}
      {secondaryModules.length > 0 && (
        <div className="space-y-4">
          <motion.h2 
            className="text-sm font-medium text-muted-foreground uppercase tracking-wider px-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            Configurações e Ferramentas
          </motion.h2>
          
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
          >
            {secondaryModules.map((module) => (
              <motion.div
                key={module.path + module.title}
                variants={cardVariants}
                whileHover={{ 
                  y: -4,
                  transition: { type: "spring", stiffness: 400, damping: 17 }
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(module.path)}
                className="group cursor-pointer"
              >
                <div className="relative bg-card rounded-xl border border-border/50 shadow-sm hover:shadow-lg hover:border-border transition-all duration-300 p-4">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full ${module.iconBg} flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300`}>
                    <module.icon className={`h-5 w-5 ${module.iconColor}`} />
                  </div>
                  
                  {/* Title */}
                  <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {module.title}
                  </h3>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* No modules message */}
      {uniqueModules.length === 0 && (
        <motion.div 
          className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground text-lg font-medium">
            Você não possui permissão para acessar nenhum módulo.
          </p>
          <p className="text-muted-foreground text-sm mt-2">
            Entre em contato com o administrador do sistema.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ModuleSelection;
