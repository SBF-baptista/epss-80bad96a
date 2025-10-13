import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface KickoffDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleSummaryId: number;
  companyName: string;
  onSuccess: () => void;
}

interface InstallationLocation {
  address: string;
  city: string;
  state: string;
}

export const KickoffDetailsModal = ({
  open,
  onOpenChange,
  saleSummaryId,
  companyName,
  onSuccess,
}: KickoffDetailsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [needsBlocking, setNeedsBlocking] = useState(false);
  const [hasParticularity, setHasParticularity] = useState(false);
  
  // Decision maker
  const [decisionMakerName, setDecisionMakerName] = useState("");
  const [decisionMakerRole, setDecisionMakerRole] = useState("");
  const [decisionMakerEmail, setDecisionMakerEmail] = useState("");
  const [decisionMakerPhone, setDecisionMakerPhone] = useState("");
  
  // Influencer
  const [influencerName, setInfluencerName] = useState("");
  const [influencerRole, setInfluencerRole] = useState("");
  const [influencerEmail, setInfluencerEmail] = useState("");
  const [influencerPhone, setInfluencerPhone] = useState("");
  
  // Operations
  const [operationsName, setOperationsName] = useState("");
  const [operationsRole, setOperationsRole] = useState("");
  const [operationsEmail, setOperationsEmail] = useState("");
  const [operationsPhone, setOperationsPhone] = useState("");
  
  const [installationLocations, setInstallationLocations] = useState<InstallationLocation[]>([
    { address: "", city: "", state: "" }
  ]);
  const [particularityDetails, setParticularityDetails] = useState("");
  const [notes, setNotes] = useState("");

  const addLocation = () => {
    setInstallationLocations([...installationLocations, { address: "", city: "", state: "" }]);
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
      const { error } = await supabase
        .from("customers")
        .update({
          needs_blocking: needsBlocking,
          decision_maker_name: decisionMakerName || null,
          decision_maker_role: decisionMakerRole || null,
          decision_maker_email: decisionMakerEmail || null,
          decision_maker_phone: decisionMakerPhone || null,
          influencer_name: influencerName || null,
          influencer_role: influencerRole || null,
          influencer_email: influencerEmail || null,
          influencer_phone: influencerPhone || null,
          operations_contact_name: operationsName || null,
          operations_contact_role: operationsRole || null,
          operations_contact_email: operationsEmail || null,
          operations_contact_phone: operationsPhone || null,
          installation_locations: installationLocations.filter(loc => loc.address || loc.city) as any,
          has_installation_particularity: hasParticularity,
          installation_particularity_details: hasParticularity ? particularityDetails : null,
          kickoff_notes: notes || null,
        })
        .eq("sale_summary_id", saleSummaryId);

      if (error) throw error;

      toast.success("Detalhes do kickoff salvos com sucesso!");
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Kickoff - {companyName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Checklist Bloqueio */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="needs-blocking"
              checked={needsBlocking}
              onCheckedChange={(checked) => setNeedsBlocking(checked as boolean)}
            />
            <Label htmlFor="needs-blocking">Necessita de bloqueio</Label>
          </div>

          {/* Decisor */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Decisor</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="decision-name">Nome</Label>
                <Input
                  id="decision-name"
                  value={decisionMakerName}
                  onChange={(e) => setDecisionMakerName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="decision-role">Função</Label>
                <Input
                  id="decision-role"
                  value={decisionMakerRole}
                  onChange={(e) => setDecisionMakerRole(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="decision-email">E-mail</Label>
                <Input
                  id="decision-email"
                  type="email"
                  value={decisionMakerEmail}
                  onChange={(e) => setDecisionMakerEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="decision-phone">Telefone</Label>
                <Input
                  id="decision-phone"
                  value={decisionMakerPhone}
                  onChange={(e) => setDecisionMakerPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Influenciador */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Influenciador</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="influencer-name">Nome</Label>
                <Input
                  id="influencer-name"
                  value={influencerName}
                  onChange={(e) => setInfluencerName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="influencer-role">Função</Label>
                <Input
                  id="influencer-role"
                  value={influencerRole}
                  onChange={(e) => setInfluencerRole(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="influencer-email">E-mail</Label>
                <Input
                  id="influencer-email"
                  type="email"
                  value={influencerEmail}
                  onChange={(e) => setInfluencerEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="influencer-phone">Telefone</Label>
                <Input
                  id="influencer-phone"
                  value={influencerPhone}
                  onChange={(e) => setInfluencerPhone(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Operações */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Operações (Ponto Focal)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="operations-name">Nome</Label>
                <Input
                  id="operations-name"
                  value={operationsName}
                  onChange={(e) => setOperationsName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="operations-role">Função</Label>
                <Input
                  id="operations-role"
                  value={operationsRole}
                  onChange={(e) => setOperationsRole(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="operations-email">E-mail</Label>
                <Input
                  id="operations-email"
                  type="email"
                  value={operationsEmail}
                  onChange={(e) => setOperationsEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="operations-phone">Telefone</Label>
                <Input
                  id="operations-phone"
                  value={operationsPhone}
                  onChange={(e) => setOperationsPhone(e.target.value)}
                />
              </div>
            </div>
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
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-3">
                    <Label>Endereço</Label>
                    <Input
                      value={location.address}
                      onChange={(e) => updateLocation(index, "address", e.target.value)}
                      placeholder="Rua, número, bairro"
                    />
                  </div>
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
