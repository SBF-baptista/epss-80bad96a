
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, X, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Order } from "@/services/orderService";

interface DashboardFiltersProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  filters: {
    status: string;
    brand: string;
    configurationType: string;
  };
  onFiltersChange: (filters: any) => void;
  orders: Order[];
}

const DashboardFilters = ({
  dateRange,
  onDateRangeChange,
  filters,
  onFiltersChange,
  orders
}: DashboardFiltersProps) => {
  const [showCalendar, setShowCalendar] = useState(false);

  const statuses = [...new Set(orders.map(order => order.status))].filter(Boolean);
  const brands = [...new Set(orders.flatMap(order => order.vehicles.map(v => v.brand)))].filter(Boolean);
  const configTypes = [...new Set(orders.map(order => order.configurationType))].filter(Boolean);

  const statusLabels: Record<string, string> = {
    novos: "Novos",
    producao: "Em Produção",
    aguardando: "Aguardando",
    enviado: "Enviado",
    standby: "Stand-by"
  };

  const activeFilters = [
    filters.status && { key: "status", label: statusLabels[filters.status] || filters.status },
    filters.brand && { key: "brand", label: filters.brand },
    filters.configurationType && { key: "configurationType", label: filters.configurationType },
  ].filter(Boolean) as { key: string; label: string }[];

  const clearFilters = () => {
    onFiltersChange({ status: "", brand: "", configurationType: "" });
  };

  const removeFilter = (key: string) => {
    onFiltersChange({ ...filters, [key]: "" });
  };

  return (
    <Card className="border-border/60">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />

            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 font-normal">
                  <CalendarIcon className="h-3 w-3" />
                  {format(dateRange.from, "dd/MM/yy", { locale: ptBR })} — {format(dateRange.to, "dd/MM/yy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      onDateRangeChange({ from: range.from, to: range.to });
                      setShowCalendar(false);
                    }
                  }}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            <Select value={filters.status || "all"} onValueChange={(v) => onFiltersChange({ ...filters, status: v === "all" ? "" : v })}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {statuses.map((s) => (
                  <SelectItem key={s} value={s}>{statusLabels[s] || s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.brand || "all"} onValueChange={(v) => onFiltersChange({ ...filters, brand: v === "all" ? "" : v })}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as marcas</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filters.configurationType || "all"} onValueChange={(v) => onFiltersChange({ ...filters, configurationType: v === "all" ? "" : v })}>
              <SelectTrigger className="w-[150px] h-8 text-xs">
                <SelectValue placeholder="Configuração" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as config.</SelectItem>
                {configTypes.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {activeFilters.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1">
                <X className="h-3 w-3" /> Limpar
              </Button>
            )}
          </div>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {activeFilters.map((f) => (
                <Badge
                  key={f.key}
                  variant="secondary"
                  className="text-[10px] h-5 gap-1 pl-2 pr-1 cursor-pointer hover:bg-destructive/10"
                  onClick={() => removeFilter(f.key)}
                >
                  {f.label}
                  <X className="h-2.5 w-2.5" />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFilters;
