import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AppModule, 
  PermissionLevel, 
  MODULE_GROUPS,
  PERMISSION_LABELS,
  ModuleConfig
} from '@/types/permissions';
import { Eye, Pencil, ShieldCheck, Crown } from 'lucide-react';

interface PermissionMatrixProps {
  permissions: Record<AppModule, PermissionLevel>;
  onChange: (permissions: Record<AppModule, PermissionLevel>) => void;
  disabled?: boolean;
}

const PERMISSION_LEVELS: PermissionLevel[] = ['view', 'edit', 'approve', 'admin'];
const LEVEL_ORDER: PermissionLevel[] = ['none', 'view', 'edit', 'approve', 'admin'];

const LEVEL_ICONS: Record<PermissionLevel, React.ReactNode> = {
  none: null,
  view: <Eye className="h-3.5 w-3.5" />,
  edit: <Pencil className="h-3.5 w-3.5" />,
  approve: <ShieldCheck className="h-3.5 w-3.5" />,
  admin: <Crown className="h-3.5 w-3.5" />,
};

const LEVEL_COLORS: Record<PermissionLevel, string> = {
  none: '',
  view: 'text-blue-600 border-blue-200 bg-blue-50',
  edit: 'text-amber-600 border-amber-200 bg-amber-50',
  approve: 'text-emerald-600 border-emerald-200 bg-emerald-50',
  admin: 'text-red-600 border-red-200 bg-red-50',
};

export const PermissionMatrix = ({ 
  permissions, 
  onChange, 
  disabled = false 
}: PermissionMatrixProps) => {
  const getLevelIndex = (level: PermissionLevel): number => LEVEL_ORDER.indexOf(level);

  const handlePermissionChange = (module: AppModule, level: PermissionLevel, checked: boolean) => {
    const newPermissions = { ...permissions };
    if (checked) {
      newPermissions[module] = level;
    } else {
      const idx = getLevelIndex(level);
      newPermissions[module] = idx > 0 ? LEVEL_ORDER[idx - 1] : 'none';
    }
    onChange(newPermissions);
  };

  const isChecked = (module: AppModule, level: PermissionLevel): boolean => {
    const moduleLevel = getLevelIndex(permissions[module] || 'none');
    const checkLevel = getLevelIndex(level);
    return moduleLevel >= checkLevel;
  };

  const isLevelDisabled = (module: AppModule, level: PermissionLevel): boolean => {
    if (disabled) return true;
    const idx = getLevelIndex(level);
    if (idx <= 1) return false;
    const prevLevel = LEVEL_ORDER[idx - 1];
    return !isChecked(module, prevLevel);
  };

  const getPermissionBadgeVariant = (level: PermissionLevel): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'admin': return 'destructive';
      case 'approve': return 'default';
      case 'edit': return 'secondary';
      default: return 'outline';
    }
  };

  const groupEntries = Object.entries(MODULE_GROUPS);
  const firstGroupKey = groupEntries[0]?.[0] || 'kickoff';
  const activePermissions = Object.entries(permissions).filter(([_, level]) => level !== 'none');

  const renderModuleCard = (module: ModuleConfig) => {
    const currentLevel = permissions[module.key] || 'none';

    return (
      <div key={module.key} className="border rounded-lg p-4 space-y-3">
        {/* Module header */}
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-semibold">{module.label}</Label>
            <p className="text-xs text-muted-foreground">{module.description}</p>
          </div>
          {currentLevel !== 'none' && (
            <Badge variant={getPermissionBadgeVariant(currentLevel)} className="text-xs">
              {PERMISSION_LABELS[currentLevel]}
            </Badge>
          )}
        </div>

        {/* Permission levels as cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PERMISSION_LEVELS.map(level => {
            const checked = isChecked(module.key, level);
            const levelDisabled = isLevelDisabled(module.key, level);
            const desc = module.levelDescriptions[level];

            return (
              <label
                key={level}
                className={`
                  flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all
                  ${checked ? LEVEL_COLORS[level] : 'border-border/50 bg-background hover:bg-muted/30'}
                  ${levelDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                `}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(c) => handlePermissionChange(module.key, level, c as boolean)}
                  disabled={levelDisabled}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {LEVEL_ICONS[level]}
                    <span className="text-xs font-semibold">{PERMISSION_LABELS[level]}</span>
                  </div>
                  <p className="text-[11px] leading-tight text-muted-foreground">
                    {desc}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue={firstGroupKey} className="w-full">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 bg-muted p-1">
          {groupEntries.map(([groupKey, group]) => (
            <TabsTrigger 
              key={groupKey} 
              value={groupKey}
              className="flex-1 min-w-[100px] text-xs sm:text-sm"
            >
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {groupEntries.map(([groupKey, group]) => (
          <TabsContent key={groupKey} value={groupKey} className="mt-4">
            <div className="space-y-4">
              {group.modules.map(module => renderModuleCard(module))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary */}
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-medium mb-3">Resumo de Permissões</h4>
        <div className="flex flex-wrap gap-2">
          {activePermissions.length > 0 ? (
            activePermissions.map(([module, level]) => {
              const moduleConfig = Object.values(MODULE_GROUPS)
                .flatMap(g => g.modules)
                .find(m => m.key === module);
              return (
                <Badge 
                  key={module} 
                  variant={getPermissionBadgeVariant(level)}
                  className="text-xs"
                >
                  {moduleConfig?.label}: {PERMISSION_LABELS[level]}
                </Badge>
              );
            })
          ) : (
            <span className="text-sm text-muted-foreground">
              Nenhuma permissão configurada
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
