import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Lock, Loader2, ArrowLeft, Check, X, KeyRound } from "lucide-react";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { logLogin } from "@/services/logService";

const passwordRules = [
  { label: "Mínimo 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "1 letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "1 número", test: (p: string) => /[0-9]/.test(p) },
  { label: "1 caractere especial (!@#$%...)", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

type AuthStep = 'login' | 'setup-password';

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('login');
  const [forgotOpen, setForgotOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const mustChange = user.user_metadata?.must_change_password;
      if (mustChange) {
        // User logged in but needs password change — handled here now
        return;
      }
      navigate("/kanban");
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Erro", description: "Informe e-mail e senha", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          // Check if user exists and needs password setup
          const checkResponse = await supabase.functions.invoke('manage-users', {
            body: { action: 'check-email', email }
          });
          
          if (checkResponse.data?.exists && checkResponse.data?.needsPasswordSetup) {
            setStep('setup-password');
            setPassword("");
            toast({ 
              title: "Primeiro acesso", 
              description: "Este é seu primeiro acesso. Por favor, defina sua senha." 
            });
          } else {
            toast({ title: "Erro", description: "E-mail ou senha incorretos", variant: "destructive" });
          }
        } else if (error.message === 'Failed to fetch') {
          toast({ title: "Erro de conexão", description: "Não foi possível conectar ao servidor. Verifique sua internet e tente novamente.", variant: "destructive" });
        } else {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
      } else {
        setTimeout(() => logLogin(), 100);
        
        if (data?.user?.user_metadata?.must_change_password) {
          setStep('setup-password');
          setPassword("");
          return;
        }
        
        toast({ title: "Sucesso", description: "Login realizado com sucesso!" });
        navigate("/kanban");
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEmail = async () => {
    if (!email) {
      toast({ title: "Erro", description: "Informe seu e-mail", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'check-email', email }
      });

      if (error) {
        toast({ title: "Erro", description: "Erro ao verificar e-mail", variant: "destructive" });
        return;
      }

      if (!data?.exists) {
        toast({ title: "E-mail não cadastrado", description: "Este e-mail não está cadastrado no sistema. Solicite ao administrador.", variant: "destructive" });
        return;
      }

      if (data.needsPasswordSetup) {
        setStep('setup-password');
        toast({ title: "Primeiro acesso", description: "Defina sua senha para acessar o sistema." });
      } else {
        toast({ title: "Informação", description: "Este e-mail já possui senha. Use o login normalmente." });
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const allRulesPass = passwordRules.every(r => r.test(newPassword));
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleSetupPassword = async (e: React.FormEvent) => {
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
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'setup-password', email, password: newPassword }
      });

      if (error || !data?.success) {
        toast({ title: "Erro", description: data?.error || error?.message || "Falha ao definir senha", variant: "destructive" });
        return;
      }

      // Now sign in with the new password
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password: newPassword 
      });

      if (signInError) {
        toast({ title: "Senha definida!", description: "Sua senha foi criada. Faça login para continuar." });
        setStep('login');
        setPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setTimeout(() => logLogin(), 100);
        toast({ title: "Bem-vindo!", description: "Senha definida e login realizado com sucesso!" });
        navigate("/kanban");
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Forgot password is now handled by the modal

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <FolderKanban className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">OPM - SEGSAT</CardTitle>
            <CardDescription className="text-gray-600">
              {step === 'setup-password' 
                ? "Defina sua senha para acessar o sistema" 
                : "Informe suas credenciais para acessar"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {step === 'setup-password' ? (
            <form onSubmit={handleSetupPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={email} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Crie uma senha segura"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
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
                  const passes = rule.test(newPassword);
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
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                ) : (
                  <><KeyRound className="mr-2 h-4 w-4" /> Definir Senha e Entrar</>
                )}
              </Button>

              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm p-0" 
                  onClick={() => {
                    setStep('login');
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  disabled={loading}
                >
                  <ArrowLeft className="mr-1 h-3 w-3" /> Voltar ao login
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" /> Entrar</>
                )}
              </Button>
              <div className="flex justify-between">
                <Button type="button" variant="link" className="text-sm p-0" onClick={handleCheckEmail} disabled={loading}>
                  Primeiro acesso
                </Button>
                <Button type="button" variant="link" className="text-sm p-0" onClick={handleForgotPassword} disabled={loading}>
                  Esqueci minha senha
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
