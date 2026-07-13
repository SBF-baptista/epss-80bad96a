import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AppModule,
  PermissionLevel,
  MODULE_GROUPS,
  PERMISSION_LABELS,
} from '@/types/permissions';
import { Eye, Pencil, ShieldCheck, Crown, Ban, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface PermissionMatrixProps {
  permissions: Record<AppModule, PermissionLevel>;
  onChange: (permissions: Record<AppModule, PermissionLevel>) => void;
  disabled?: boolean;
}

const LEVEL_ORDER: PermissionLevel[] = ['none', 'view', 'edit', 'approve', 'admin'];

const LEVEL_ICONS: Record<PermissionLevel, React.ReactNode> = {
  none: <Ban className="h-3.5 w-3.5" />,
  view: <Eye className="h-3.5 w-3.5" />,
  edit: <Pencil className="h-3.5 w-3.5" />,
  approve: <ShieldCheck className="h-3.5 w-3.5" />,
  admin: <Crown className="h-3.5 w-3.5" />,
};

// Colored classes for badges per hierarchy level
const LEVEL_BADGE_CLASS: Record<PermissionLevel, string> = {
  none: 'bg-muted text-muted-foreground border-muted',
  view: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  edit: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
  approve: 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  admin: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
};

const LEVEL_DESCRIPTIONS: Record<PermissionLevel, string> = {
  none: 'Sem acesso ao módulo',
  view: 'Consultar registros e telas do módulo',
  edit: 'Inclui Visualizar. Permite criar e alterar registros',
  approve: 'Inclui Editar. Permite aprovar/reverter ações críticas',
  admin: 'Inclui Aprovar. Acesso total: excluir, configurar integrações',
};

export const PermissionMatrix = ({
  permissions,
  onChange,
  disabled = false,
}: PermissionMatrixProps) => {
  const groupEntries = Object.entries(MODULE_GROUPS);
  const firstGroupKey = groupEntries[0]?.[0] || 'kickoff';

  const handleChange = (module: AppModule, level: PermissionLevel) => {
    onChange({ ...permissions, [module]: level });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4">
        {/* Legend */}
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Níveis (cada nível inclui todos os anteriores)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {LEVEL_ORDER.map((lvl) => (
              <Tooltip key={lvl}>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className={`gap-1 text-[11px] cursor-help ${LEVEL_BADGE_CLASS[lvl]}`}>
                    {LEVEL_ICONS[lvl]}
                    {PERMISSION_LABELS[lvl]}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[240px] text-xs">
                  {LEVEL_DESCRIPTIONS[lvl]}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>

        <Tabs defaultValue={firstGroupKey} className="w-full">
          {/* Regra 3 — Abas com scroll horizontal no mobile em vez de wrap */}
          <div className="scroll-x-mobile -mx-1 px-1">
            <TabsList className="w-max sm:w-full flex-nowrap sm:flex-wrap h-auto gap-1 bg-muted p-1">
              {groupEntries.map(([groupKey, group]) => (
                <TabsTrigger
                  key={groupKey}
                  value={groupKey}
                  className="sm:flex-1 sm:min-w-[100px] text-xs sm:text-sm whitespace-nowrap px-3"
                >
                  {group.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {groupEntries.map(([groupKey, group]) => (
            <TabsContent key={groupKey} value={groupKey} className="mt-3">
              {/* Desktop: tabela / Mobile: cards empilhados (Regra 4) */}
              <div className="hidden md:block border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium w-1/2">Módulo</th>
                      <th className="text-left px-3 py-2 font-medium">Nível de permissão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.modules.map((module) => {
                      const currentLevel = permissions[module.key] || 'none';
                      const currentDesc =
                        currentLevel === 'none'
                          ? LEVEL_DESCRIPTIONS.none
                          : module.levelDescriptions[currentLevel] || LEVEL_DESCRIPTIONS[currentLevel];
                      return (
                        <tr key={module.key} className="border-t hover:bg-muted/20">
                          <td className="px-3 py-2 align-top">
                            <div className="font-medium text-sm">{module.label}</div>
                            <div className="text-[11px] text-muted-foreground">{module.description}</div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Select
                                value={currentLevel}
                                onValueChange={(v) => handleChange(module.key, v as PermissionLevel)}
                                disabled={disabled}
                              >
                                <SelectTrigger className="h-8 w-[170px] text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {LEVEL_ORDER.map((lvl) => (
                                    <SelectItem key={lvl} value={lvl}>
                                      <span className="flex items-center gap-2">
                                        {LEVEL_ICONS[lvl]}
                                        {PERMISSION_LABELS[lvl]}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-[260px] text-xs">
                                  {currentDesc}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile: cada módulo vira um card empilhado */}
              <div className="md:hidden space-y-2">
                {group.modules.map((module) => {
                  const currentLevel = permissions[module.key] || 'none';
                  const currentDesc =
                    currentLevel === 'none'
                      ? LEVEL_DESCRIPTIONS.none
                      : module.levelDescriptions[currentLevel] || LEVEL_DESCRIPTIONS[currentLevel];
                  return (
                    <div key={module.key} className="rounded-md border p-3 space-y-2 bg-card">
                      <div>
                        <div className="font-medium text-sm">{module.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{module.description}</div>
                      </div>
                      <Select
                        value={currentLevel}
                        onValueChange={(v) => handleChange(module.key, v as PermissionLevel)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="h-11 w-full text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVEL_ORDER.map((lvl) => (
                            <SelectItem key={lvl} value={lvl}>
                              <span className="flex items-center gap-2">
                                {LEVEL_ICONS[lvl]}
                                {PERMISSION_LABELS[lvl]}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground leading-snug">
                        {currentDesc}
                      </p>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Summary */}
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium mb-3">Resumo de Permissões</h4>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const active = Object.entries(permissions).filter(([_, lvl]) => lvl !== 'none');
              if (active.length === 0) {
                return (
                  <span className="text-sm text-muted-foreground">Nenhuma permissão configurada</span>
                );
              }
              return active.map(([module, level]) => {
                const moduleConfig = Object.values(MODULE_GROUPS)
                  .flatMap((g) => g.modules)
                  .find((m) => m.key === module);
                return (
                  <Badge
                    key={module}
                    variant="outline"
                    className={`text-xs gap-1 ${LEVEL_BADGE_CLASS[level as PermissionLevel]}`}
                  >
                    {LEVEL_ICONS[level as PermissionLevel]}
                    {moduleConfig?.label}: {PERMISSION_LABELS[level as PermissionLevel]}
                  </Badge>
                );
              });
            })()}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
