import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, CheckCircle, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ForgotPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultEmail?: string;
}

const COOLDOWN_SUCCESS_MS = 60_000;
const COOLDOWN_ERROR_MS = 180_000;
const COOLDOWN_KEY = "forgot_password_cooldown";

const getCooldownRemaining = (): number => {
  const stored = localStorage.getItem(COOLDOWN_KEY);
  if (!stored) return 0;
  const { until } = JSON.parse(stored);
  const remaining = until - Date.now();
  return remaining > 0 ? remaining : 0;
};

const setCooldown = (ms: number) => {
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify({ until: Date.now() + ms }));
};

export function ForgotPasswordModal({ open, onOpenChange, defaultEmail = "" }: ForgotPasswordModalProps) {
  const [email, setEmail] = useState(defaultEmail);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const { toast } = useToast();

  const startCooldownTimer = (ms: number) => {
    setCooldownSeconds(Math.ceil(ms / 1000));
    const interval = setInterval(() => {
      const remaining = getCooldownRemaining();
      if (remaining <= 0) {
        setCooldownSeconds(0);
        clearInterval(interval);
      } else {
        setCooldownSeconds(Math.ceil(remaining / 1000));
      }
    }, 1000);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setEmail(defaultEmail);
      setSent(false);
      const remaining = getCooldownRemaining();
      if (remaining > 0) {
        startCooldownTimer(remaining);
      }
    }
    onOpenChange(isOpen);
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({ title: "Campo obrigatório", description: "Informe seu e-mail.", variant: "destructive" });
      return;
    }

    if (!isValidEmail(email)) {
      toast({ title: "E-mail inválido", description: "Informe um e-mail válido.", variant: "destructive" });
      return;
    }

    const remaining = getCooldownRemaining();
    if (remaining > 0) {
      toast({
        title: "Aguarde",
        description: `Tente novamente em ${Math.ceil(remaining / 1000)} segundos.`,
        variant: "destructive",
      });
      startCooldownTimer(remaining);
      return;
    }

    setLoading(true);
    try {
      // Check if user exists and is NOT a first-access user
      const { data: checkData } = await supabase.functions.invoke("manage-users", {
        body: { action: "check-email", email: email.trim() },
      });

      if (checkData?.exists && checkData?.needsPasswordSetup) {
        toast({
          title: "Primeiro acesso pendente",
          description: "Sua conta ainda não foi ativada. Use o fluxo de 'Primeiro acesso' na tela de login.",
          variant: "destructive",
        });
        setCooldown(COOLDOWN_ERROR_MS);
        startCooldownTimer(COOLDOWN_ERROR_MS);
        setLoading(false);
        return;
      }

      // Always send (Supabase handles non-existing emails silently)
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      setCooldown(COOLDOWN_SUCCESS_MS);
      startCooldownTimer(COOLDOWN_SUCCESS_MS);
      setSent(true);
    } catch {
      setCooldown(COOLDOWN_ERROR_MS);
      startCooldownTimer(COOLDOWN_ERROR_MS);
      toast({ title: "Erro", description: "Erro inesperado. Tente novamente mais tarde.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            <DialogHeader className="text-center">
              <DialogTitle className="text-xl">E-mail enviado</DialogTitle>
              <DialogDescription className="text-sm">
                Se o e-mail estiver cadastrado, você receberá instruções para redefinir sua senha. Verifique também a caixa de spam.
              </DialogDescription>
            </DialogHeader>
            <Button variant="outline" className="w-full" onClick={() => handleOpen(false)}>
              Fechar
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <div className="mx-auto w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-2">
                <Mail className="h-7 w-7 text-blue-600" />
              </div>
              <DialogTitle className="text-xl text-center">Esqueci minha senha</DialogTitle>
              <DialogDescription className="text-center">
                Informe seu e-mail cadastrado para receber o link de redefinição.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              {cooldownSeconds > 0 && (
                <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded-md">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>Aguarde {cooldownSeconds}s antes de solicitar novamente.</span>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={loading || cooldownSeconds > 0}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar"
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
