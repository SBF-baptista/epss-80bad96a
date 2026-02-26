import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AppModule, 
  PermissionLevel, 
  MODULE_GROUPS,
  PERMISSION_LABELS
} from '@/types/permissions';

interface PermissionMatrixProps {
  permissions: Record<AppModule, PermissionLevel>;
  onChange: (permissions: Record<AppModule, PermissionLevel>) => void;
  disabled?: boolean;
}

const PERMISSION_LEVELS: PermissionLevel[] = ['view', 'edit', 'approve', 'admin'];

// Ordered hierarchy for enforcement
const LEVEL_ORDER: PermissionLevel[] = ['none', 'view', 'edit', 'approve', 'admin'];

export const PermissionMatrix = ({ 
  permissions, 
  onChange, 
  disabled = false 
}: PermissionMatrixProps) => {
  const getLevelIndex = (level: PermissionLevel): number => LEVEL_ORDER.indexOf(level);

  const handlePermissionChange = (module: AppModule, level: PermissionLevel, checked: boolean) => {
    const newPermissions = { ...permissions };
    
    if (checked) {
      // Setting a level also requires all levels below it
      newPermissions[module] = level;
    } else {
      // Unchecking a level drops to the level below it
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

  // A level is disabled if the previous required level is not checked
  const isLevelDisabled = (module: AppModule, level: PermissionLevel): boolean => {
    if (disabled) return true;
    const idx = getLevelIndex(level);
    if (idx <= 1) return false; // 'view' is always available
    // Check that the previous level is active
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
            <div className="space-y-4 border rounded-lg p-4">
              {/* Header row */}
              <div className="grid grid-cols-5 gap-2 text-xs font-medium text-muted-foreground border-b pb-2">
                <div>Módulo</div>
                {PERMISSION_LEVELS.map(level => (
                  <div key={level} className="text-center">
                    {PERMISSION_LABELS[level]}
                  </div>
                ))}
              </div>
              
              {/* Module rows */}
              {group.modules.map(module => (
                <div key={module.key} className="grid grid-cols-5 gap-2 items-center">
                  <div>
                    <Label className="text-sm font-medium">{module.label}</Label>
                    <p className="text-xs text-muted-foreground">{module.description}</p>
                  </div>
                  {PERMISSION_LEVELS.map(level => (
                    <div key={level} className="flex justify-center">
                      <Checkbox
                        checked={isChecked(module.key, level)}
                        onCheckedChange={(checked) => 
                          handlePermissionChange(module.key, level, checked as boolean)
                        }
                        disabled={isLevelDisabled(module.key, level)}
                        className="h-5 w-5"
                      />
                    </div>
                  ))}
                </div>
              ))}
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