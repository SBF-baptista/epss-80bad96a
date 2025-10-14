import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Truck } from "lucide-react";
import { processKickoffVehicles } from "@/services/kickoffProcessingService";
import type { KickoffVehicle } from "@/services/kickoffService";
import { fetchSegsaleProductsDirect } from "@/services/segsaleService";
import { KickoffVehiclesTable } from "./KickoffVehiclesTable";

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
  const [needsBlocking, setNeedsBlocking] = useState(false);
  const [needsEngineBlocking, setNeedsEngineBlocking] = useState(false);
  const [needsFuelBlocking, setNeedsFuelBlocking] = useState(false);
  const [needsAcceleratorBlocking, setNeedsAcceleratorBlocking] = useState(false);
  const [hasParticularity, setHasParticularity] = useState(false);
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [installationLocations, setInstallationLocations] = useState<InstallationLocation[]>([
    { city: "", state: "" }
  ]);
  const [particularityDetails, setParticularityDetails] = useState("");
  const [notes, setNotes] = useState("");

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
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('sale_summary_id', saleSummaryId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setNeedsBlocking(data.needs_blocking || false);
        setNeedsEngineBlocking(data.needs_engine_blocking || false);
        setNeedsFuelBlocking(data.needs_fuel_blocking || false);
        setNeedsAcceleratorBlocking(data.needs_accelerator_blocking || false);
        setHasParticularity(data.has_installation_particularity || false);
        setParticularityDetails(data.installation_particularity_details || "");
        setNotes(data.kickoff_notes || "");
        setContacts(Array.isArray(data.contacts) ? (data.contacts as unknown as Contact[]) : []);
        setInstallationLocations(
          Array.isArray(data.installation_locations) && data.installation_locations.length > 0
            ? (data.installation_locations as unknown as InstallationLocation[])
            : [{ city: "", state: "" }]
        );
      }
    } catch (error) {
      console.error("Error loading customer data:", error);
    }
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
      const { error } = await supabase
        .from("customers")
        .update({
          needs_blocking: needsBlocking,
          needs_engine_blocking: needsBlocking ? needsEngineBlocking : false,
          needs_fuel_blocking: needsBlocking ? needsFuelBlocking : false,
          contacts: contacts.filter(c => c.name) as any,
          installation_locations: installationLocations.filter(loc => loc.city) as any,
          has_installation_particularity: hasParticularity,
          installation_particularity_details: hasParticularity ? particularityDetails : null,
          kickoff_notes: notes || null,
        })
        .eq("sale_summary_id", saleSummaryId);

      if (error) throw error;

      // Mark ALL incoming_vehicles with this sale_summary_id as kickoff_completed
      const { error: vehiclesError } = await supabase
        .from("incoming_vehicles")
        .update({ kickoff_completed: true })
        .eq("sale_summary_id", saleSummaryId);

      if (vehiclesError) {
        console.error("Error marking vehicles as kickoff completed:", vehiclesError);
        throw vehiclesError;
      }

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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="kickoff-details-desc">
        <DialogHeader>
          <DialogTitle>Detalhes do Kickoff - {companyName}</DialogTitle>
        </DialogHeader>
        <p id="kickoff-details-desc" className="sr-only">Preencha os detalhes do kickoff do cliente {companyName}.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicles Section */}
          <div className="space-y-3 border-b pb-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-base">Veículos</h3>
            </div>
            <KickoffVehiclesTable vehicles={vehicles} />
          </div>

          {/* Checklist Bloqueio */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="needs-blocking"
                checked={needsBlocking}
                onCheckedChange={(checked) => setNeedsBlocking(checked as boolean)}
              />
              <Label htmlFor="needs-blocking">Necessita de bloqueio</Label>
            </div>
            
            {needsBlocking && (
              <div className="ml-6 space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="engine-blocking"
                    checked={needsEngineBlocking}
                    onCheckedChange={(checked) => setNeedsEngineBlocking(checked as boolean)}
                  />
                  <Label htmlFor="engine-blocking">Bloqueio de partida</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="fuel-blocking"
                    checked={needsFuelBlocking}
                    onCheckedChange={(checked) => setNeedsFuelBlocking(checked as boolean)}
                  />
                  <Label htmlFor="fuel-blocking">Bloqueio de combustível</Label>
                </div>
              </div>
            )}
          </div>

          {/* Contatos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Contatos</h3>
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
                <div className="grid grid-cols-2 gap-2">
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Locais de Instalação</h3>
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
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Cidade</Label>
                    <Input
                      value={location.city}
                      onChange={(e) => updateLocation(index, "city", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input
                      value={location.state}
                      onChange={(e) => updateLocation(index, "state", e.target.value)}
                      maxLength={2}
                      placeholder="SP"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Particularidade de Instalação */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="has-particularity"
                checked={hasParticularity}
                onCheckedChange={(checked) => setHasParticularity(checked as boolean)}
              />
              <Label htmlFor="has-particularity">
                Particularidade de Instalação (Disponibilidade)
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
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações gerais do kickoff..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
