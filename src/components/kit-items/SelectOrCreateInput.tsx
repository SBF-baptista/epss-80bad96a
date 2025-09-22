import React, { useState, useEffect } from 'react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ItemType } from '@/types/homologationKit';
import { KitItemOption, fetchKitItemOptions, createKitItemOption, deleteKitItemOption, checkIfItemExists } from '@/services/kitItemOptionsService';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SelectOrCreateInputProps {
  value: string;
  onChange: (value: string) => void;
  itemType: ItemType;
  placeholder?: string;
  className?: string;
}

const SelectOrCreateInput: React.FC<SelectOrCreateInputProps> = ({
  value,
  onChange,
  itemType,
  placeholder = "Selecione ou digite um item...",
  className
}) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<KitItemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { isAdmin } = useUserRole();

  // Load options when component mounts or itemType changes
  useEffect(() => {
    loadOptions();
  }, [itemType]);

  const loadOptions = async () => {
    try {
      setLoading(true);
      const fetchedOptions = await fetchKitItemOptions(itemType);
      setOptions(fetchedOptions);
    } catch (error) {
      console.error('Error loading options:', error);
      toast({
        title: "Erro ao carregar opções",
        description: "Não foi possível carregar as opções disponíveis.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewItem = async () => {
    if (!newItemName.trim()) return;

    try {
      setIsCreating(true);
      
      // Check if item already exists
      const exists = await checkIfItemExists(newItemName.trim(), itemType);
      if (exists) {
        toast({
          title: "Item já existe",
          description: "Este item já está cadastrado na lista.",
          variant: "destructive"
        });
        return;
      }

      // Create new item
      const newOption = await createKitItemOption({
        item_name: newItemName.trim(),
        item_type: itemType
      });

      // Add to options list
      setOptions(prev => [...prev, newOption].sort((a, b) => a.item_name.localeCompare(b.item_name)));
      
      // Select the new item
      onChange(newOption.item_name);
      
      // Reset form
      setNewItemName('');
      setShowCreateInput(false);
      setOpen(false);

      toast({
        title: "Item criado",
        description: "O novo item foi adicionado à lista com sucesso.",
      });
    } catch (error) {
      console.error('Error creating new item:', error);
      toast({
        title: "Erro ao criar item",
        description: "Não foi possível criar o novo item. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteOption = async (option: KitItemOption) => {
    try {
      await deleteKitItemOption(option.id);
      setOptions(prev => prev.filter(opt => opt.id !== option.id));
      
      // If the deleted item was selected, clear the selection
      if (value === option.item_name) {
        onChange('');
      }

      toast({
        title: "Item removido",
        description: "O item foi removido da lista com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting option:', error);
      toast({
        title: "Erro ao remover item",
        description: "Não foi possível remover o item. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const selectedOption = options.find(opt => opt.item_name === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between h-8", className)}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dropdown-content w-80 p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={`Buscar ${itemType === 'equipment' ? 'equipamentos' : itemType === 'accessory' ? 'acessórios' : 'insumos'}...`}
            value={newItemName}
            onValueChange={setNewItemName}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                Carregando...
              </div>
            )}
            
            {!loading && options.length === 0 && (
              <CommandEmpty>
                Nenhum item encontrado.
              </CommandEmpty>
            )}
            
            {!loading && options.length > 0 && (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.item_name}
                    onSelect={() => {
                      onChange(option.item_name);
                      setOpen(false);
                      setNewItemName('');
                    }}
                    className="flex items-center justify-between group command-item-hover"
                  >
                    <div className="flex items-center">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.item_name ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div>
                        <div className="font-medium">{option.item_name}</div>
                        {option.description && (
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {isAdmin && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{option.item_name}" da lista? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteOption(option)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            
            {/* Create new item option */}
            {newItemName.trim() && !options.some(opt => opt.item_name.toLowerCase() === newItemName.toLowerCase()) && (
              <CommandGroup>
                <CommandItem
                  onSelect={handleCreateNewItem}
                  disabled={isCreating}
                  className="flex items-center text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>
                    {isCreating ? 'Criando...' : `Criar "${newItemName}"`}
                  </span>
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SelectOrCreateInput;