import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export const PermissionMatrix = ({ 
  permissions, 
  onChange, 
  disabled = false 
}: PermissionMatrixProps) => {
  const handlePermissionChange = (module: AppModule, level: PermissionLevel, checked: boolean) => {
    const newPermissions = { ...permissions };
    
    if (checked) {
      newPermissions[module] = level;
    } else {
      // If unchecking, go to the previous level or none
      const levels = ['none', ...PERMISSION_LEVELS];
      const currentIndex = levels.indexOf(level);
      newPermissions[module] = levels[currentIndex - 1] as PermissionLevel;
    }
    
    onChange(newPermissions);
  };

  const isChecked = (module: AppModule, level: PermissionLevel): boolean => {
    const levels: PermissionLevel[] = ['none', 'view', 'edit', 'approve', 'admin'];
    const moduleLevel = levels.indexOf(permissions[module] || 'none');
    const checkLevel = levels.indexOf(level);
    return moduleLevel >= checkLevel;
  };

  const getPermissionBadgeVariant = (level: PermissionLevel): "default" | "secondary" | "destructive" | "outline" => {
    switch (level) {
      case 'admin': return 'destructive';
      case 'approve': return 'default';
      case 'edit': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {Object.entries(MODULE_GROUPS).map(([groupKey, group]) => (
        <Card key={groupKey}>
          <CardHeader className="py-3">
            <CardTitle className="text-base font-medium">{group.label}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
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
                        disabled={disabled}
                        className="h-5 w-5"
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Summary */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base font-medium">Resumo de Permissões</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {Object.entries(permissions)
              .filter(([_, level]) => level !== 'none')
              .map(([module, level]) => {
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
              })}
            {Object.values(permissions).every(level => level === 'none') && (
              <span className="text-sm text-muted-foreground">
                Nenhuma permissão configurada
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
