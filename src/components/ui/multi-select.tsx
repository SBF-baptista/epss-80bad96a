import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione...",
  className,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    const isSelected = selected.includes(value);
    if (isSelected) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  const selectedLabels = selected
    .map((value) => options.find((opt) => opt.value === value)?.label || value)
    .slice(0, 2);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between h-9 font-normal",
            !selected.length && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-1 flex-1 overflow-hidden">
            {selected.length === 0 ? (
              <span>{placeholder}</span>
            ) : selected.length <= 2 ? (
              <div className="flex gap-1 flex-wrap">
                {selectedLabels.map((label, index) => (
                  <Badge
                    key={selected[index]}
                    variant="secondary"
                    className="text-xs px-1 py-0 h-5 max-w-[100px] truncate"
                  >
                    {label}
                    <X
                      className="ml-1 h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => handleRemove(selected[index], e)}
                    />
                  </Badge>
                ))}
              </div>
            ) : (
              <Badge variant="secondary" className="text-xs px-1 py-0 h-5">
                {selected.length} selecionados
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-50" align="start">
        <div className="max-h-60 overflow-y-auto p-1">
          {options.length === 0 ? (
            <div className="py-2 px-3 text-sm text-muted-foreground">
              Nenhuma opção disponível
            </div>
          ) : (
            options.map((option) => {
              const isSelected = selected.includes(option.value);
              return (
                <div
                  key={option.value}
                  onClick={() => handleToggle(option.value)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground",
                    isSelected && "bg-accent/50"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <span className="truncate">{option.label}</span>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
