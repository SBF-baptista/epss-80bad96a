
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const passwordRules = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "1 letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 número", test: (p: string) => /[0-9]/.test(p) },
  { label: "1 caractere especial (!@#$%...)", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

const ActivateAccount = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for Supabase to process the invite/recovery token from the URL hash
    const checkSession = async () => {
      // Give Supabase client time to process the hash
      await new Promise(resolve => setTimeout(resolve, 1500));
      const { data: { session } } = await supabase.auth.getSession();
      setHasSession(!!session);
      setCheckingSession(false);
    };
    checkSession();

    // Also listen for auth state changes (the hash processing triggers this)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY')) {
        setHasSession(true);
        setCheckingSession(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const allRulesPass = passwordRules.every(r => r.test(password));
  const passwordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!allRulesPass) {
      toast({ title: "Erro", description: "A senha não atende todos os requisitos", variant: "destructive" });
      return;
    }
    if (!passwordsMatch) {
      toast({ title: "Erro", description: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
      } else {
        await supabase.auth.signOut();
        toast({ title: "Conta ativada!", description: "Sua senha foi definida com sucesso. Faça login para continuar." });
        navigate("/auth");
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600 mb-4" />
            <p className="text-muted-foreground">Verificando link de ativação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6 text-center space-y-4">
            <X className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-lg font-semibold">Link inválido ou expirado</h2>
            <p className="text-sm text-muted-foreground">
              O link de ativação expirou ou já foi utilizado. Entre em contato com o administrador para receber um novo convite.
            </p>
            <Button variant="outline" onClick={() => navigate("/auth")}>
              Ir para o login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <FolderKanban className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">Ative sua conta</CardTitle>
            <CardDescription className="text-gray-600">
              Defina sua senha para acessar o OPM - SEGSAT
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Crie uma senha segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirmar senha</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {/* Password validation rules */}
            <div className="space-y-1 p-3 rounded-md bg-muted/50">
              {passwordRules.map((rule) => {
                const passes = rule.test(password);
                return (
                  <div key={rule.label} className={`flex items-center gap-2 text-xs ${passes ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passes ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {rule.label}
                  </div>
                );
              })}
              <div className={`flex items-center gap-2 text-xs ${passwordsMatch ? 'text-green-600' : 'text-muted-foreground'}`}>
                {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                Senhas coincidem
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || !allRulesPass || !passwordsMatch}
            >
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Ativando...</> : 'Ativar Conta'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivateAccount;
