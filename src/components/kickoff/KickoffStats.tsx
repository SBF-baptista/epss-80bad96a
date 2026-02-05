import { motion } from "framer-motion";
import { Users, Car, AlertTriangle, Clock } from "lucide-react";
import type { KickoffSummary } from "@/services/kickoffService";

interface KickoffStatsProps {
  kickoffData: KickoffSummary | undefined;
  kickoffDates: Map<number, Date> | undefined;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  accentColor: string;
  iconBgColor: string;
  delay?: number;
}

const StatCard = ({ icon, label, value, accentColor, iconBgColor, delay = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="bg-card border border-border/60 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
  >
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${iconBgColor} flex items-center justify-center flex-shrink-0`}>
        <div className={accentColor}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className={`text-3xl font-bold tracking-tight ${accentColor}`}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground font-medium truncate mt-0.5">
          {label}
        </p>
      </div>
    </div>
  </motion.div>
);

export const KickoffStats = ({ kickoffData, kickoffDates }: KickoffStatsProps) => {
  const getDaysInKickoff = (saleSummaryId: number): number => {
    if (!kickoffDates) return 0;
    const startDate = kickoffDates.get(saleSummaryId);
    if (!startDate) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const totalClients = kickoffData?.clients.length || 0;
  const totalVehicles = kickoffData?.total_vehicles || 0;

  const criticalClients =
    kickoffData?.clients.filter((client) => getDaysInKickoff(client.sale_summary_id) > 7).length || 0;

  const warningClients =
    kickoffData?.clients.filter((client) => {
      const days = getDaysInKickoff(client.sale_summary_id);
      return days >= 5 && days <= 7;
    }).length || 0;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
      <StatCard
        icon={<Users className="w-5 h-5" />}
        label="Clientes Pendentes"
        value={totalClients}
        accentColor="text-primary"
        iconBgColor="bg-primary/10"
        delay={0}
      />
      <StatCard
        icon={<Car className="w-5 h-5" />}
        label="Total de Veículos"
        value={totalVehicles}
        accentColor="text-primary"
        iconBgColor="bg-primary/10"
        delay={0.05}
      />
      <StatCard
        icon={<Clock className="w-5 h-5" />}
        label="Atenção (5-7 dias)"
        value={warningClients}
        accentColor="text-amber-600 dark:text-amber-500"
        iconBgColor="bg-amber-100 dark:bg-amber-900/30"
        delay={0.1}
      />
      <StatCard
        icon={<AlertTriangle className="w-5 h-5" />}
        label="Críticos (+7 dias)"
        value={criticalClients}
        accentColor="text-red-600 dark:text-red-500"
        iconBgColor="bg-red-100 dark:bg-red-900/30"
        delay={0.15}
      />
    </div>
  );
};
