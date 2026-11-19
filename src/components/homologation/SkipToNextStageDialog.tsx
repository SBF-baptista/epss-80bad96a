import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { countWords, MIN_SKIP_REASON_WORDS } from "@/utils/skipHomologation";

interface Props {
  cardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => void;
}

const SkipToNextStageDialog = ({ cardId, open, onOpenChange, onDone }: Props) => {
  const [reason, setReason] = useState("");
  const [kitId, setKitId] = useState("");
  const [saving, setSaving] = useState(false);
  const words = useMemo(() => countWords(reason), [reason]);

  const { data: kits = [], isLoading } = useQuery({
    queryKey: ["skip-homologation-kits"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from("homologation_kits").select("id, name, category").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const canSubmit = words >= MIN_SKIP_REASON_WORDS && !!kitId && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("skip_homologation_to_logistics" as any, {
        p_card_id: cardId,
        p_kit_id: kitId,
        p_reason: reason.trim(),
      });
      if (error) throw error;
      toast.success("Veículo enviado para Planejamento e Logística");
      setReason("");
      setKitId("");
      onOpenChange(false);
      onDone();
    } catch (e: any) {
      toast.error(`Não foi possível avançar: ${e?.message ?? "erro desconhecido"}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Próxima etapa do processo</DialogTitle>
          <DialogDescription>
            O veículo vai direto para o Planejamento e para a Logística, sem passar pelos testes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Kit do veículo *</Label>
            <Select value={kitId} onValueChange={setKitId}>
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Carregando kits..." : "Selecione o kit"} />
              </SelectTrigger>
              <SelectContent>
                {kits.map((k: any) => (
                  <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isLoading && kits.length === 0 && (
              <p className="text-xs text-destructive">Nenhum kit cadastrado. Cadastre um kit antes de continuar.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Motivo para pular a homologação *</Label>
            <Textarea rows={6} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Explique por que este veículo vai para a próxima etapa sem passar pelos testes..." />
            <p className={`text-xs ${words >= MIN_SKIP_REASON_WORDS ? "text-success" : "text-muted-foreground"}`}>
              {words}/{MIN_SKIP_REASON_WORDS} palavras mínimas
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SkipToNextStageDialog;
