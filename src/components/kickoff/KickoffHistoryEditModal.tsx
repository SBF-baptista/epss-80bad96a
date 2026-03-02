import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Users, MapPin, Settings, FileText, Camera, Package, Save } from "lucide-react";
import { fetchAddressByCEP, isValidCEP, formatCEP } from "@/services/cepService";
import type { KickoffHistoryRecord } from "@/services/kickoffHistoryService";

interface KickoffHistoryEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: KickoffHistoryRecord;
  onSuccess: () => void;
}

interface Contact {
  type: "decisor" | "influenciador" | "operacoes" | "ponto_focal";
  name: string;
  role: string;
  email: string;
  phone: string;
}

interface InstallationLocation {
  cep?: string;
  state: string;
  city: string;
  neighborhood?: string;
  street?: string;
  plates?: string[];
}

interface AccessorySaleItem {
  description: string;
  quantity: number | "";
  unitPrice: number | "";
  total?: number;
}

export const KickoffHistoryEditModal = ({ open, onOpenChange, record, onSuccess }: KickoffHistoryEditModalProps) => {
  const [loading, setLoading] = useState(false);

  // Initialize state from record
  const [contacts, setContacts] = useState<Contact[]>(
    Array.isArray(record.contacts) ? (record.contacts as unknown as Contact[]) : []
  );

  const [installationLocations, setInstallationLocations] = useState<InstallationLocation[]>(
    Array.isArray(record.installation_locations) && record.installation_locations.length > 0
      ? (record.installation_locations as unknown as InstallationLocation[])
      : [{ cep: "", state: "", city: "", neighborhood: "", street: "", plates: [] }]
  );

  const [particularityDetails, setParticularityDetails] = useState(
    record.installation_particularity_details || ""
  );
  const [notes, setNotes] = useState(record.kickoff_notes || "");

  const [cameraExtraSale, setCameraExtraSale] = useState<{ quantity: number | ""; unitPrice: number | "" }>({
    quantity: (record as any).camera_extra_sale?.quantity || "",
    unitPrice: (record as any).camera_extra_sale?.unitPrice || "",
  });

  const [accessoriesSaleItems, setAccessoriesSaleItems] = useState<AccessorySaleItem[]>(
    Array.isArray((record as any).accessories_sale) && (record as any).accessories_sale.length > 0
      ? (record as any).accessories_sale.map((item: any) => ({
          description: item.description || "",
          quantity: item.quantity || "",
          unitPrice: item.unitPrice || "",
        }))
      : [{ description: "", quantity: "", unitPrice: "" }]
  );

  const [cepLoading, setCepLoading] = useState<Map<number, boolean>>(new Map());

  // Get all plates from vehicles_data
  const allPlates: string[] = Array.isArray(record.vehicles_data)
    ? record.vehicles_data
        .map((v: any) => v.plate)
        .filter((p: any): p is string => !!p && p !== "Não informada")
    : [];

  // Contact helpers
  const addContact = () => {
    setContacts([...contacts, { type: "decisor", name: "", role: "", email: "", phone: "" }]);
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index: number, field: keyof Contact, value: string) => {
    const updated = [...contacts];
    updated[index] = { ...updated[index], [field]: value };
    setContacts(updated);
  };

  // Location helpers
  const addLocation = () => {
    setInstallationLocations([
      ...installationLocations,
      { cep: "", state: "", city: "", neighborhood: "", street: "", plates: [] },
    ]);
  };

  const removeLocation = (index: number) => {
    setInstallationLocations(installationLocations.filter((_, i) => i !== index));
  };

  const updateLocation = (index: number, field: keyof InstallationLocation, value: any) => {
    const updated = [...installationLocations];
    updated[index] = { ...updated[index], [field]: value };
    setInstallationLocations(updated);
  };

  const updateLocationMultiple = (index: number, fields: Partial<InstallationLocation>) => {
    setInstallationLocations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...fields };
      return updated;
    });
  };

  const fetchAndFillCEP = async (index: number, cep: string) => {
    if (!isValidCEP(cep)) return;
    setCepLoading((prev) => new Map(prev).set(index, true));
    try {
      const data = await fetchAddressByCEP(cep);
      if (data) {
        updateLocationMultiple(index, {
          state: data.uf,
          city: data.localidade,
          neighborhood: data.bairro || "",
          street: data.logradouro || "",
        });
      }
    } catch (err: any) {
      toast.error(err?.message || "CEP não encontrado");
    } finally {
      setCepLoading((prev) => new Map(prev).set(index, false));
    }
  };

  const togglePlateForLocation = (locationIndex: number, plate: string) => {
    const loc = installationLocations[locationIndex];
    const currentPlates = loc.plates || [];
    const newPlates = currentPlates.includes(plate)
      ? currentPlates.filter((p) => p !== plate)
      : [...currentPlates, plate];
    updateLocation(locationIndex, "plates", newPlates);
  };

  const toggleAllPlatesForLocation = (locationIndex: number) => {
    const loc = installationLocations[locationIndex];
    const currentPlates = loc.plates || [];
    const newPlates = currentPlates.length === allPlates.length ? [] : [...allPlates];
    updateLocation(locationIndex, "plates", newPlates);
  };

  // Accessories sale helpers
  const addAccessorySaleItem = () => {
    setAccessoriesSaleItems((prev) => [...prev, { description: "", quantity: "", unitPrice: "" }]);
  };

  const removeAccessorySaleItem = (index: number) => {
    setAccessoriesSaleItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateAccessorySaleItem = (index: number, field: keyof AccessorySaleItem, value: any) => {
    setAccessoriesSaleItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const cameraExtraSaleData =
        (Number(cameraExtraSale.quantity) || 0) > 0
          ? {
              quantity: Number(cameraExtraSale.quantity) || 0,
              unitPrice: Number(cameraExtraSale.unitPrice) || 0,
              total: (Number(cameraExtraSale.quantity) || 0) * (Number(cameraExtraSale.unitPrice) || 0),
            }
          : null;

      const accessoriesSaleData = accessoriesSaleItems
        .filter((item) => item.description.trim() !== "" && (Number(item.quantity) || 0) > 0)
        .map((item) => ({
          description: item.description,
          quantity: Number(item.quantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          total: (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        }));

      const { error } = await supabase
        .from("kickoff_history")
        .update({
          contacts: contacts.filter((c) => c.name) as any,
          installation_locations: installationLocations.filter((loc) => loc.city) as any,
          has_installation_particularity: !!particularityDetails,
          installation_particularity_details: particularityDetails || null,
          kickoff_notes: notes || null,
          camera_extra_sale: cameraExtraSaleData as any,
          accessories_sale: (accessoriesSaleData.length > 0 ? accessoriesSaleData : null) as any,
        })
        .eq("id", record.id);

      if (error) throw error;

      toast.success("Kickoff atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating kickoff history:", error);
      toast.error("Erro ao atualizar kickoff");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] xl:max-w-[85vw] h-[90vh] flex flex-col p-0"
        aria-describedby="kickoff-edit-desc"
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>Editar Kickoff - {record.company_name}</DialogTitle>
        </DialogHeader>
        <p id="kickoff-edit-desc" className="sr-only">
          Edite os detalhes do kickoff do cliente {record.company_name}.
        </p>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-6 py-4">
            {/* Venda Câmeras Extras */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Câmeras Extras</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min={0}
                    value={cameraExtraSale.quantity === "" ? "" : cameraExtraSale.quantity}
                    onChange={(e) =>
                      setCameraExtraSale((prev) => ({
                        ...prev,
                        quantity: e.target.value === "" ? "" : parseInt(e.target.value) || 0,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Valor unitário (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={cameraExtraSale.unitPrice === "" ? "" : cameraExtraSale.unitPrice}
                    onChange={(e) =>
                      setCameraExtraSale((prev) => ({
                        ...prev,
                        unitPrice: e.target.value === "" ? "" : parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Total (R$)</Label>
                  <Input
                    type="text"
                    readOnly
                    value={(
                      (Number(cameraExtraSale.quantity) || 0) * (Number(cameraExtraSale.unitPrice) || 0)
                    ).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    className="mt-1 bg-muted"
                  />
                </div>
              </div>
            </div>

            {/* Venda de Acessórios */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Venda de Acessórios</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAccessorySaleItem}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
              <div className="space-y-3">
                {accessoriesSaleItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_80px_120px_120px_40px] gap-3 items-end">
                    <div>
                      <Label>Descrição</Label>
                      <Input
                        placeholder="Ex: Sensor de temperatura"
                        value={item.description}
                        onChange={(e) => updateAccessorySaleItem(idx, "description", e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        min={0}
                        value={item.quantity === "" ? "" : item.quantity}
                        onChange={(e) =>
                          updateAccessorySaleItem(idx, "quantity", e.target.value === "" ? "" : parseInt(e.target.value) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Valor unit. (R$)</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.unitPrice === "" ? "" : item.unitPrice}
                        onChange={(e) =>
                          updateAccessorySaleItem(idx, "unitPrice", e.target.value === "" ? "" : parseFloat(e.target.value) || 0)
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Total (R$)</Label>
                      <Input
                        type="text"
                        readOnly
                        value={((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                        className="mt-1 bg-muted"
                      />
                    </div>
                    <div>
                      {accessoriesSaleItems.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeAccessorySaleItem(idx)} className="mt-1">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contatos */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h3 className="font-bold text-lg">Contatos</h3>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addContact}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Contato
                </Button>
              </div>
              {contacts.map((contact, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <Select value={contact.type} onValueChange={(value) => updateContact(index, "type", value)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="decisor">Decisor</SelectItem>
                        <SelectItem value="influenciador">Influenciador</SelectItem>
                        <SelectItem value="operacoes">Operações</SelectItem>
                        <SelectItem value="ponto_focal">Ponto focal da implantação</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeContact(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <Label>Nome</Label>
                      <Input value={contact.name} onChange={(e) => updateContact(index, "name", e.target.value)} />
                    </div>
                    <div>
                      <Label>Função</Label>
                      <Input value={contact.role} onChange={(e) => updateContact(index, "role", e.target.value)} />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input type="email" value={contact.email} onChange={(e) => updateContact(index, "email", e.target.value)} />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input value={contact.phone} onChange={(e) => updateContact(index, "phone", e.target.value)} />
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
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Local
                </Button>
              </div>
              {installationLocations.map((location, index) => {
                const selectedPlates = location.plates || [];
                const allSelected = allPlates.length > 0 && selectedPlates.length === allPlates.length;

                return (
                  <div key={index} className="border rounded-lg p-3 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Local {index + 1}</span>
                      {installationLocations.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeLocation(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Plate selection */}
                    {allPlates.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Placas neste local</Label>
                        <div className="flex flex-wrap gap-2 items-center">
                          <div className="flex items-center gap-2 mr-3 border-r pr-3">
                            <Checkbox
                              id={`all-plates-${index}`}
                              checked={allSelected}
                              onCheckedChange={() => toggleAllPlatesForLocation(index)}
                            />
                            <Label htmlFor={`all-plates-${index}`} className="text-xs cursor-pointer font-medium">
                              Todas
                            </Label>
                          </div>
                          {allPlates.map((plate) => (
                            <div key={plate} className="flex items-center gap-1.5">
                              <Checkbox
                                id={`plate-${index}-${plate}`}
                                checked={selectedPlates.includes(plate)}
                                onCheckedChange={() => togglePlateForLocation(index, plate)}
                              />
                              <Label
                                htmlFor={`plate-${index}-${plate}`}
                                className={`text-xs cursor-pointer ${
                                  selectedPlates.includes(plate) ? "text-primary font-medium" : "text-muted-foreground"
                                }`}
                              >
                                {plate}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <Label className="text-sm">CEP</Label>
                        <div className="relative">
                          <Input
                            value={location.cep || ""}
                            onChange={(e) => {
                              const formatted = formatCEP(e.target.value);
                              updateLocation(index, "cep", formatted);
                              if (isValidCEP(formatted)) {
                                fetchAndFillCEP(index, formatted);
                              }
                            }}
                            placeholder="00000-000"
                            maxLength={9}
                            className="mt-1"
                          />
                          {cepLoading.get(index) && (
                            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground mt-0.5" />
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm">UF (Estado)</Label>
                        <Input
                          value={location.state}
                          onChange={(e) => updateLocation(index, "state", e.target.value)}
                          placeholder="UF"
                          maxLength={2}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Cidade</Label>
                        <Input
                          value={location.city}
                          onChange={(e) => updateLocation(index, "city", e.target.value)}
                          placeholder="Cidade"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Bairro</Label>
                        <Input
                          value={location.neighborhood || ""}
                          onChange={(e) => updateLocation(index, "neighborhood", e.target.value)}
                          placeholder="Bairro"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">Logradouro/Nome</Label>
                        <Input
                          value={location.street || ""}
                          onChange={(e) => updateLocation(index, "street", e.target.value)}
                          placeholder="Rua, Avenida..."
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Particularidades */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Particularidades da Instalação</h3>
              </div>
              <Textarea
                value={particularityDetails}
                onChange={(e) => setParticularityDetails(e.target.value)}
                placeholder="Descreva as particularidades de instalação..."
                rows={4}
              />
            </div>

            {/* Observações */}
            <div className="space-y-3 border rounded-lg p-4 shadow-sm bg-card">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary" />
                <h3 className="font-bold text-lg">Observações</h3>
              </div>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações gerais do kickoff..."
                rows={4}
              />
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
