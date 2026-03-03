import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle, XCircle } from "lucide-react";

const UpdateBemTestPanel = () => {
  const [numbem, setNumbem] = useState("");
  const [codtombamento, setCodtombamento] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleSubmit = async () => {
    if (!numbem.trim()) {
      toast.error("Preencha o Num Bem");
      return;
    }
    if (!codtombamento.trim()) {
      toast.error("Preencha o Código de Tombamento");
      return;
    }

    setIsLoading(true);
    setResponse(null);
    setStatus("idle");

    try {
      const { data, error } = await supabase.functions.invoke("update-bem", {
        body: { numbem: numbem.trim(), codtombamento: codtombamento.trim() },
      });

      if (error) {
        setStatus("error");
        setResponse({ error: error.message });
        toast.error("Erro na chamada: " + error.message);
      } else {
        setStatus(data?.success ? "success" : "error");
        setResponse(data);
        if (data?.success) {
          toast.success("updateBem executado com sucesso");
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
    <Card className="p-4 border-dashed border-2 border-blue-300/50 bg-blue-50/30 space-y-3">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 text-xs">
          Teste API
        </Badge>
        <span className="text-sm font-semibold text-foreground">updateBem</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label className="text-xs font-medium">Num Bem (numbem)</Label>
          <Input
            value={numbem}
            onChange={(e) => setNumbem(e.target.value)}
            placeholder="Ex: 66646"
            className="mt-1 font-mono text-sm"
          />
        </div>
        <div>
          <Label className="text-xs font-medium">Código de Tombamento (codtombamento)</Label>
          <Input
            value={codtombamento}
            onChange={(e) => setCodtombamento(e.target.value)}
            placeholder="Ex: 89550532880012881314"
            className="mt-1 font-mono text-sm"
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
          <><Send className="h-4 w-4" /> Enviar POST updateBem</>
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

export default UpdateBemTestPanel;
