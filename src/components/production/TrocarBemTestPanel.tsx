import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle, XCircle } from "lucide-react";

const TrocarBemTestPanel = () => {
  const [codLocal, setCodLocal] = useState("");
  const [codigosTombamento, setCodigosTombamento] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async () => {
    if (!codLocal.trim()) {
      toast.error("Preencha o Código Local Bem");
      return;
    }
    if (!codigosTombamento.trim()) {
      toast.error("Preencha os Códigos de Tombamento");
      return;
    }

    const codes = codigosTombamento
      .split(/[\n,]+/)
      .map((c) => c.trim())
      .filter(Boolean);

    if (codes.length === 0) {
      toast.error("Nenhum código de tombamento válido");
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke("trocar-bem", {
        body: { codLocal: codLocal.trim(), codigosTombamento: codes },
      });

      if (error) {
        setStatus("error");
        setResponse({ error: error.message });
        toast.error("Erro na chamada: " + error.message);
      } else {
        setStatus(data?.success ? "success" : "error");
        setResponse(data);
        if (data?.success) {
          toast.success(`trocarLocalBemList executado com sucesso (${codes.length} itens)`);
        } else {
          toast.error("API retornou erro");
        }
      }
    } catch (err: any) {
      setStatus("error");
      setResponse({ error: err.message });
      toast.error("Erro inesperado: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-4 border-dashed border-2 border-amber-300/50 bg-amber-50/30 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-300 text-xs">
          Teste API
        </Badge>
        <span className="text-sm font-semibold text-foreground">trocarLocalBemList</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label className="text-xs font-medium">Código Local Bem (codLocal)</Label>
          <Input
            value={codLocal}
            onChange={(e) => setCodLocal(e.target.value)}
            placeholder="Ex: 66665"
            className="mt-1 font-mono text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Códigos de Tombamento (um por linha ou separados por vírgula)</Label>
          <Textarea
            value={codigosTombamento}
            onChange={(e) => setCodigosTombamento(e.target.value)}
            placeholder={"89550532880012881314\n351247007304902\n351559038887750"}
            className="mt-1 font-mono text-xs min-h-[100px]"
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full gap-2"
        variant={status === "success" ? "default" : status === "error" ? "destructive" : "default"}
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Enviando...</>
        ) : status === "success" ? (
          <><CheckCircle className="h-4 w-4" /> Enviado com sucesso</>
        ) : status === "error" ? (
          <><XCircle className="h-4 w-4" /> Tentar novamente</>
        ) : (
          <><Send className="h-4 w-4" /> Enviar POST trocarLocalBemList</>
        )}
      </Button>

      {response && (
        <div className="mt-2">
          <Label className="text-xs font-medium text-muted-foreground">Resposta da API:</Label>
          <pre className="mt-1 p-3 bg-muted/50 rounded-lg text-xs font-mono overflow-auto max-h-48 border">
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </Card>
  );
};

export default TrocarBemTestPanel;
