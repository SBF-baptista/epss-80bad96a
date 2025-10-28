import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Truck, Users, MapPin, Settings, FileText, Package } from "lucide-react";
import { processKickoffVehicles } from "@/services/kickoffProcessingService";
import type { KickoffVehicle } from "@/services/kickoffService";
import { fetchSegsaleProductsDirect } from "@/services/segsaleService";
import { KickoffVehiclesTable } from "./KickoffVehiclesTable";
import { LocationSelector } from "@/components/shipment";

interface KickoffDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleSummaryId: number;
  companyName: string;
  vehicles: KickoffVehicle[];
  onSuccess: () => void;
}

interface InstallationLocation {
  city: string;
  state: string;
}

interface Contact {
  type: 'decisor' | 'influenciador' | 'operacoes';
  name: string;
  role: string;
  email: string;
  phone: string;
}

export const KickoffDetailsModal = ({
  open,
  onOpenChange,
  saleSummaryId,
  companyName,
  vehicles,
  onSuccess,
}: KickoffDetailsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [hasParticularity, setHasParticularity] = useState(false);
  const [kickoffCreatedAt, setKickoffCreatedAt] = useState<Date | null>(null);
  const [customerInfo, setCustomerInfo] = useState<{
    name: string;
    services: string[];
    city: string;
    state: string;
  } | null>(null);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [installationLocations, setInstallationLocations] = useState<InstallationLocation[]>([
    { city: "", state: "" }
  ]);
  const [particularityDetails, setParticularityDetails] = useState("");
  const [notes, setNotes] = useState("");
  
  const [selectedModules, setSelectedModules] = useState<Map<string, Set<string>>>(
    new Map(vehicles.map(v => {
      const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
      const modulesList = v.modules.filter(m => normalize(m.categories || '') === 'modulos');
      return [v.id, new Set(modulesList.map(m => m.name))];
    }))
  );
  
  const [vehicleBlocking, setVehicleBlocking] = useState<Map<string, { needsBlocking: boolean; engineBlocking: boolean; fuelBlocking: boolean }>>(
    new Map(vehicles.map(v => [v.id, { needsBlocking: false, engineBlocking: false, fuelBlocking: false }]))
  );

  const [vehicleSiren, setVehicleSiren] = useState<Map<string, boolean>>(
    new Map(vehicles.map(v => [v.id, false]))
  );

  // Load existing customer data when modal opens
  useEffect(() => {
    if (open && saleSummaryId) {
      loadCustomerData();
      checkAndBackfillAccessories();
    }
  }, [open, saleSummaryId]);

  const checkAndBackfillAccessories = async () => {
    try {
      // 1. Get incoming_vehicles for this sale_summary_id
      const { data: incomingVehicles } = await supabase
        .from('incoming_vehicles')
        .select('id')
        .eq('sale_summary_id', saleSummaryId);

      if (!incomingVehicles || incomingVehicles.length === 0) {
        console.log(`No incoming vehicles found for sale_summary_id ${saleSummaryId}`);
        return;
      }

      // 2. Check if accessories already exist for these vehicles
      const { data: existingAccessories } = await supabase
        .from('accessories')
        .select('id')
        .in('vehicle_id', incomingVehicles.map(v => v.id));

      // 3. If no accessories found, import from Segsale
      if (!existingAccessories || existingAccessories.length === 0) {
        console.log(`No accessories found for sale_summary_id ${saleSummaryId}, importing from Segsale...`);
        toast.info('Importando módulos e acessórios do Segsale...');
        
        try {
          await fetchSegsaleProductsDirect(saleSummaryId);
          toast.success('Módulos e acessórios importados com sucesso!');
          
          // Refetch kickoff data to update UI
          setTimeout(() => {
            onSuccess();
          }, 1000);
        } catch (error) {
          console.error('Error importing from Segsale:', error);
          toast.error('Erro ao importar dados do Segsale');
        }
      } else {
        console.log(`Found ${existingAccessories.length} accessories for sale_summary_id ${saleSummaryId}`);
      }
    } catch (error) {
      console.error('Error checking accessories:', error);
    }
  };

  const loadCustomerData = async () => {
    try {
      // First try to get customer data from customers table
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('sale_summary_id', saleSummaryId)
        .maybeSingle();

      if (customerData) {
        setHasParticularity(customerData.has_installation_particularity || false);
        setParticularityDetails(customerData.installation_particularity_details || "");
        setNotes(customerData.kickoff_notes || "");
        setContacts(Array.isArray(customerData.contacts) ? (customerData.contacts as unknown as Contact[]) : []);
        setInstallationLocations(
          Array.isArray(customerData.installation_locations) && customerData.installation_locations.length > 0
            ? (customerData.installation_locations as unknown as InstallationLocation[])
            : [{ city: "", state: "" }]
        );
        
        // Load customer info from customers table
        const modules = Array.isArray(customerData.modules) ? customerData.modules : [];
        setCustomerInfo({
          name: customerData.company_name || customerData.name || companyName || "Cliente não identificado",
          services: modules,
          city: customerData.address_city || "Não informado",
          state: customerData.address_state || "Não informado"
        });
      } else {
        // If no customer data, get from incoming_vehicles
        const { data: vehicleData } = await supabase
          .from('incoming_vehicles')
          .select('company_name, address_city, received_at')
          .eq('sale_summary_id', saleSummaryId)
          .order('received_at', { ascending: true })
          .limit(1)
          .maybeSingle();
        
        if (vehicleData) {
          setKickoffCreatedAt(new Date(vehicleData.received_at));
          
          setCustomerInfo({
            name: vehicleData.company_name || companyName || "Cliente não identificado",
            services: [],
            city: vehicleData.address_city || "Não informado",
            state: "SP"
          });
        } else {
          // Final fallback
          setCustomerInfo({
            name: companyName || "Cliente não identificado",
            services: [],
            city: "Não informado",
            state: "Não informado"
          });
        }
      }
      
      // Load kickoff created date from first incoming vehicle if not set
      if (!kickoffCreatedAt) {
        const { data: vehicleData } = await supabase
          .from('incoming_vehicles')
          .select('received_at')
          .eq('sale_summary_id', saleSummaryId)
          .order('received_at', { ascending: true })
          .limit(1)
          .maybeSingle();
          
        if (vehicleData) {
          setKickoffCreatedAt(new Date(vehicleData.received_at));
        }
      }
    } catch (error) {
      console.error("Error loading customer data:", error);
      // Set basic info from props as fallback
      setCustomerInfo({
        name: companyName || "Cliente não identificado",
        services: [],
        city: "Não informado",
        state: "Não informado"
      });
    }
  };

  const calculateDaysSinceKickoff = (): number => {
    if (!kickoffCreatedAt) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - kickoffCreatedAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleModuleToggle = (vehicleId: string, moduleName: string) => {
    setSelectedModules(prev => {
      const newMap = new Map(prev);
      const vehicleModules = new Set(newMap.get(vehicleId) || []);
      
      if (vehicleModules.has(moduleName)) {
        vehicleModules.delete(moduleName);
      } else {
        vehicleModules.add(moduleName);
      }
      
      newMap.set(vehicleId, vehicleModules);
      return newMap;
    });
  };

  const handleBlockingToggle = (vehicleId: string, field: 'needsBlocking' | 'engineBlocking' | 'fuelBlocking', value: boolean) => {
    setVehicleBlocking(prev => {
      const newMap = new Map(prev);
      const vehicleBlock = { ...(newMap.get(vehicleId) || { needsBlocking: false, engineBlocking: false, fuelBlocking: false }) };
      
      vehicleBlock[field] = value;
      
      // If disabling needsBlocking, also disable sub-options
      if (field === 'needsBlocking' && !value) {
        vehicleBlock.engineBlocking = false;
        vehicleBlock.fuelBlocking = false;
      }
      
      newMap.set(vehicleId, vehicleBlock);
      return newMap;
    });
  };

  const handleSirenToggle = (vehicleId: string, value: boolean) => {
    setVehicleSiren(prev => {
      const newMap = new Map(prev);
      newMap.set(vehicleId, value);
      return newMap;
    });
  };

  const addContact = () => {
    setContacts([...contacts, { type: 'decisor', name: "", role: "", email: "", phone: "" }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index][field] = value as any;
    setContacts(updated);
  };

  const addLocation = () => {
    setInstallationLocations([...installationLocations, { city: "", state: "" }]);
  };

  const removeLocation = (index: number) => {
    setInstallationLocations(installationLocations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof InstallationLocation, value: string) => {
    const updated = [...installationLocations];
    updated[index][field] = value;
    setInstallationLocations(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Save customer kickoff details
      const { error: customerError } = await supabase
        .from("customers")
        .update({
          contacts: contacts.filter(c => c.name) as any,
          installation_locations: installationLocations.filter(loc => loc.city) as any,
          has_installation_particularity: hasParticularity,
          installation_particularity_details: hasParticularity ? particularityDetails : null,
          kickoff_notes: notes || null,
        })
        .eq("sale_summary_id", saleSummaryId);

      if (customerError) throw customerError;

      // Prepare vehicles data for history
      const vehiclesData = vehicles.map(vehicle => {
        const modules = Array.from(selectedModules.get(vehicle.id) || []);
        const blocking = vehicleBlocking.get(vehicle.id) || { needsBlocking: false, engineBlocking: false, fuelBlocking: false };
        const hasSiren = vehicleSiren.get(vehicle.id) || false;
        
        return {
          id: vehicle.id,
          brand: vehicle.brand,
          model: vehicle.model,
          year: vehicle.year,
          plate: vehicle.plate,
          quantity: vehicle.quantity,
          selected_modules: modules,
          blocking_info: blocking,
          has_siren: hasSiren,
          accessories: vehicle.modules.filter(m => {
            const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
            return normalize(m.categories || '') !== 'modulos';
          })
        };
      });

      // Store selected modules info and sirene accessory (will be processed by processKickoffVehicles)
      for (const vehicle of vehicles) {
        const modules = Array.from(selectedModules.get(vehicle.id) || []);
        const hasSiren = vehicleSiren.get(vehicle.id) || false;
        
        if (modules.length > 0) {
          const { error: vehicleError } = await supabase
            .from("incoming_vehicles")
            .update({
              processing_notes: `Módulos selecionados: ${modules.join(', ')}`,
            })
            .eq("id", vehicle.id);

          if (vehicleError) {
            console.error(`Error updating vehicle ${vehicle.id} modules:`, vehicleError);
          }
        }

        // Add sirene as accessory if has_siren is true
        if (hasSiren) {
          const { error: sirenError } = await supabase
            .from("accessories")
            .upsert({
              vehicle_id: vehicle.id,
              company_name: companyName,
              usage_type: (vehicle as any).usage_type || 'outros',
              name: 'Sirene',
              categories: 'Acessórios',
              quantity: 1,
              received_at: new Date().toISOString()
            }, {
              onConflict: 'vehicle_id,name,categories',
              ignoreDuplicates: false
            });

          if (sirenError) {
            console.error(`Error adding sirene for vehicle ${vehicle.id}:`, sirenError);
          } else {
            console.log(`Successfully added sirene accessory for vehicle ${vehicle.id}`);
          }
        }
      }

      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();

      // Save to kickoff history
      const { error: historyError } = await supabase
        .from("kickoff_history")
        .insert({
          sale_summary_id: saleSummaryId,
          company_name: companyName,
          total_vehicles: vehicles.length,
          contacts: contacts.filter(c => c.name) as any,
          installation_locations: installationLocations.filter(loc => loc.city) as any,
          has_installation_particularity: hasParticularity,
          installation_particularity_details: hasParticularity ? particularityDetails : null,
          kickoff_notes: notes || null,
          vehicles_data: vehiclesData as any,
          approved_by: user?.id || null,
        });

      if (historyError) throw historyError;


      // Process vehicles for homologation after kickoff completion
      console.log("Processing kickoff vehicles for homologation...");
      const processingResult = await processKickoffVehicles(saleSummaryId);
      
      if (!processingResult.success) {
        console.error("Errors during vehicle processing:", processingResult.errors);
        toast.error(`Kickoff salvo, mas houve erros ao processar veículos: ${processingResult.errors.join(', ')}`);
      } else {
        const messages = [];
        if (processingResult.homologations_created > 0) {
          messages.push(`${processingResult.homologations_created} homologação(ões) criada(s)`);
        }
        if (processingResult.already_homologated_count > 0) {
          messages.push(`${processingResult.already_homologated_count} veículo(s) já homologado(s)`);
        }
        
        toast.success(`Kickoff finalizado com sucesso! ${messages.join(', ')}`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving kickoff details:", error);
      toast.error("Erro ao salvar detalhes do kickoff");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0" aria-describedby="kickoff-details-desc">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Detalhes do Kickoff - {companyName}</DialogTitle>
        </DialogHeader>
        <p id="kickoff-details-desc" className="sr-only">Preencha os detalhes do kickoff do cliente {companyName}.</p>

        <ScrollArea className="flex-1 px-6">
          <form id="kickoff-form" onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Vehicles Section */}
          <div className="space-y-4 border rounded-lg p-4 shadow-sm bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Validação de Frota</h3>
              </div>
              {kickoffCreatedAt && (
                <div className="text-sm text-muted-foreground">
                  Kickoff em andamento há <span className="font-semibold text-foreground">{calculateDaysSinceKickoff()}</span> dias
                </div>
              )}
            </div>

            {/* Customer Info Card */}
            {customerInfo && (
              <div className="bg-muted/50 border rounded-lg p-3 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome do Cliente</Label>
                    <p className="font-semibold mt-1">{customerInfo.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cidade</Label>
                    <p className="font-semibold mt-1">{customerInfo.city}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Estado</Label>
                    <p className="font-semibold mt-1">{customerInfo.state}</p>
                  </div>
                </div>
              </div>
            )}

            <KickoffVehiclesTable
              vehicles={vehicles}
              selectedModules={selectedModules}
              onModuleToggle={handleModuleToggle}
              vehicleBlocking={vehicleBlocking}
              onBlockingToggle={handleBlockingToggle}
              vehicleSiren={vehicleSiren}
              onSirenToggle={handleSirenToggle}
              saleSummaryId={saleSummaryId}
              onVehicleUpdate={onSuccess}
            />
          </div>

          {/* Contatos */}
          <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Contatos</h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addContact}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Contato
              </Button>
            </div>
            {contacts.map((contact, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <Select
                    value={contact.type}
                    onValueChange={(value) => updateContact(index, "type", value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="decisor">Decisor</SelectItem>
                      <SelectItem value="influenciador">Influenciador</SelectItem>
                      <SelectItem value="operacoes">Operações</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeContact(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      value={contact.name}
                      onChange={(e) => updateContact(index, "name", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Função</Label>
                    <Input
                      value={contact.role}
                      onChange={(e) => updateContact(index, "role", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={contact.email}
                      onChange={(e) => updateContact(index, "email", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input
                      value={contact.phone}
                      onChange={(e) => updateContact(index, "phone", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Locais de Instalação */}
          <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Locais de Instalação</h3>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLocation}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Local
              </Button>
            </div>
            {installationLocations.map((location, index) => (
              <div key={index} className="border rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Local {index + 1}</span>
                  {installationLocations.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLocation(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <LocationSelector
                  selectedUF={location.state}
                  selectedCity={location.city}
                  onUFChange={(value) => updateLocation(index, "state", value)}
                  onCityChange={(value) => updateLocation(index, "city", value)}
                  disabled={loading}
                />
              </div>
            ))}
          </div>

          {/* Particularidade de Instalação */}
          <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg">Particularidades da Instalação</h3>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-particularity"
                checked={hasParticularity}
                onCheckedChange={(checked) => setHasParticularity(checked as boolean)}
              />
              <Label htmlFor="has-particularity">
                Disponibilidade para Instalação Especial
              </Label>
            </div>
            {hasParticularity && (
              <Textarea
                value={particularityDetails}
                onChange={(e) => setParticularityDetails(e.target.value)}
                placeholder="Descreva as particularidades de instalação..."
                rows={4}
              />
            )}
          </div>

          {/* Observações */}
          <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-lg">Observações</h3>
            </div>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações gerais do kickoff..."
              rows={4}
            />
          </div>

          </form>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" form="kickoff-form" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Package className="h-4 w-4 mr-2" />
            Realizar Kickoff
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
