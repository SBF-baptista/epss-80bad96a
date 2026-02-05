import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  Filter, 
  ChevronDown, 
  X, 
  Star,
  StarOff,
  SlidersHorizontal,
  Calendar
} from "lucide-react";

interface FilterState {
  searchTerm: string;
  moduleFilter: string;
  actionFilter: string;
  actionTypeFilter: string;
  impactFilter: string;
  originFilter: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  ipFilter: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
}

interface HistoryFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  uniqueModules: string[];
  uniqueActions: string[];
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

const ACTION_TYPES = [
  { value: "all", label: "Todos os tipos" },
  { value: "create", label: "Criação", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { value: "update", label: "Edição", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { value: "delete", label: "Exclusão", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  { value: "login", label: "Login", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { value: "approval", label: "Aprovação", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  { value: "cancel", label: "Cancelamento", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "error", label: "Erro", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" },
];

const IMPACT_LEVELS = [
  { value: "all", label: "Todos os níveis" },
  { value: "low", label: "Baixo", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
  { value: "medium", label: "Médio", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  { value: "high", label: "Alto", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  { value: "critical", label: "Crítico", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
];

const ACTION_ORIGINS = [
  { value: "all", label: "Todas as origens" },
  { value: "web", label: "Web" },
  { value: "api", label: "API" },
  { value: "integration", label: "Integração" },
  { value: "system", label: "Sistema" },
  { value: "mobile", label: "Mobile" },
];

const HistoryFilters = ({
  filters,
  onFiltersChange,
  uniqueModules,
  uniqueActions,
  pageSize,
  onPageSizeChange,
}: HistoryFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    const stored = localStorage.getItem("history-saved-filters");
    return stored ? JSON.parse(stored) : [];
  });
  const [filterName, setFilterName] = useState("");

  const updateFilter = (key: keyof FilterState, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: "",
      moduleFilter: "all",
      actionFilter: "all",
      actionTypeFilter: "all",
      impactFilter: "all",
      originFilter: "all",
      startDate: "",
      endDate: "",
      startTime: "",
      endTime: "",
      ipFilter: "",
    });
  };

  const saveCurrentFilter = () => {
    if (!filterName.trim()) return;
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: { ...filters },
    };
    
    const updated = [...savedFilters, newFilter];
    setSavedFilters(updated);
    localStorage.setItem("history-saved-filters", JSON.stringify(updated));
    setFilterName("");
  };

  const loadSavedFilter = (filter: SavedFilter) => {
    onFiltersChange(filter.filters);
  };

  const deleteSavedFilter = (id: string) => {
    const updated = savedFilters.filter(f => f.id !== id);
    setSavedFilters(updated);
    localStorage.setItem("history-saved-filters", JSON.stringify(updated));
  };

  const activeFiltersCount = [
    filters.moduleFilter !== "all",
    filters.actionFilter !== "all",
    filters.actionTypeFilter !== "all",
    filters.impactFilter !== "all",
    filters.originFilter !== "all",
    filters.startDate !== "",
    filters.endDate !== "",
    filters.ipFilter !== "",
  ].filter(Boolean).length;

  return (
    <Card className="p-5 border-border/60 shadow-sm">
      {/* Linha principal de busca e filtros rápidos */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Busca global com autocomplete visual */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, ação, módulo, detalhes..."
              value={filters.searchTerm}
              onChange={(e) => updateFilter("searchTerm", e.target.value)}
              className="pl-10 h-11 border-border/60 focus:border-primary/50 bg-background/50"
            />
            {filters.searchTerm && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => updateFilter("searchTerm", "")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Filtros rápidos */}
        <div className="flex gap-2 flex-wrap">
          <Select value={filters.moduleFilter} onValueChange={(v) => updateFilter("moduleFilter", v)}>
            <SelectTrigger className="w-[160px] h-11 border-border/60">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os módulos</SelectItem>
              {uniqueModules.map((module) => (
                <SelectItem key={module} value={module}>
                  {module}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.actionTypeFilter} onValueChange={(v) => updateFilter("actionTypeFilter", v)}>
            <SelectTrigger className="w-[150px] h-11 border-border/60">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center gap-2">
                    {type.value !== "all" && (
                      <span className={`w-2 h-2 rounded-full ${type.color.split(" ")[0]}`} />
                    )}
                    {type.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(Number(v))}>
            <SelectTrigger className="w-[130px] h-11 border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25 por página</SelectItem>
              <SelectItem value="50">50 por página</SelectItem>
              <SelectItem value="100">100 por página</SelectItem>
              <SelectItem value="250">250 por página</SelectItem>
            </SelectContent>
          </Select>

          {/* Toggle filtros avançados */}
          <Button
            variant={showAdvanced ? "secondary" : "outline"}
            className="h-11 gap-2"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Avançados
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-primary/10 text-primary">
                {activeFiltersCount}
              </Badge>
            )}
            <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Filtros avançados */}
      <Collapsible open={showAdvanced}>
        <CollapsibleContent className="mt-4 pt-4 border-t border-border/40">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro por ação específica */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Ação Específica
              </label>
              <Select value={filters.actionFilter} onValueChange={(v) => updateFilter("actionFilter", v)}>
                <SelectTrigger className="border-border/60">
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as ações</SelectItem>
                  {uniqueActions.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nível de impacto */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Nível de Impacto
              </label>
              <Select value={filters.impactFilter} onValueChange={(v) => updateFilter("impactFilter", v)}>
                <SelectTrigger className="border-border/60">
                  <SelectValue placeholder="Todos os níveis" />
                </SelectTrigger>
                <SelectContent>
                  {IMPACT_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        {level.value !== "all" && (
                          <span className={`w-2 h-2 rounded-full ${level.color.split(" ")[0]}`} />
                        )}
                        {level.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Origem da ação */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Origem
              </label>
              <Select value={filters.originFilter} onValueChange={(v) => updateFilter("originFilter", v)}>
                <SelectTrigger className="border-border/60">
                  <SelectValue placeholder="Todas as origens" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_ORIGINS.map((origin) => (
                    <SelectItem key={origin.value} value={origin.value}>
                      {origin.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por IP */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Endereço IP
              </label>
              <Input
                placeholder="Ex: 192.168.1.1"
                value={filters.ipFilter}
                onChange={(e) => updateFilter("ipFilter", e.target.value)}
                className="border-border/60 font-mono text-sm"
              />
            </div>

            {/* Data inicial */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Data Inicial
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => updateFilter("startDate", e.target.value)}
                  className="flex-1 border-border/60"
                />
                <Input
                  type="time"
                  value={filters.startTime}
                  onChange={(e) => updateFilter("startTime", e.target.value)}
                  className="w-24 border-border/60"
                  placeholder="00:00"
                />
              </div>
            </div>

            {/* Data final */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Data Final
              </label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => updateFilter("endDate", e.target.value)}
                  className="flex-1 border-border/60"
                />
                <Input
                  type="time"
                  value={filters.endTime}
                  onChange={(e) => updateFilter("endTime", e.target.value)}
                  className="w-24 border-border/60"
                  placeholder="23:59"
                />
              </div>
            </div>

            {/* Salvar filtro favorito */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Salvar Filtro
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do filtro"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="border-border/60"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={saveCurrentFilter}
                  disabled={!filterName.trim()}
                >
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Carregar filtros salvos */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Filtros Salvos
              </label>
              {savedFilters.length > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <StarOff className="h-4 w-4 text-amber-500" />
                        {savedFilters.length} filtro(s) salvo(s)
                      </span>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="space-y-1">
                      {savedFilters.map((filter) => (
                        <div
                          key={filter.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                        >
                          <button
                            className="flex-1 text-left text-sm"
                            onClick={() => loadSavedFilter(filter)}
                          >
                            {filter.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => deleteSavedFilter(filter.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                <div className="h-10 flex items-center px-3 text-sm text-muted-foreground border border-dashed border-border/60 rounded-md">
                  Nenhum filtro salvo
                </div>
              )}
            </div>
          </div>

          {/* Ações dos filtros */}
          <div className="flex justify-end mt-4 pt-4 border-t border-border/40">
            <Button
              variant="ghost"
              onClick={clearAllFilters}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Filter className="h-4 w-4" />
              Limpar Todos os Filtros
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default HistoryFilters;
