import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { FolderKanban, Lock, Loader2, ArrowLeft, Check, X, KeyRound, Eye, EyeOff, AlertCircle, UserPlus } from "lucide-react";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { logLogin } from "@/services/logService";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const mustChange = user.user_metadata?.must_change_password;
      if (mustChange) return;
      navigate("/kanban");
    }
  }, [user, navigate]);

  const validateEmail = (val: string) => {
    if (!val) return "Informe seu e-mail";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return "E-mail inválido";
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setEmailError(null);

    const eErr = validateEmail(email);
    if (eErr) { setEmailError(eErr); return; }
    if (!password) { setLoginError("Informe sua senha"); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          const checkResponse = await supabase.functions.invoke('manage-users', {
            body: { action: 'check-email', email }
          });
          if (checkResponse.data?.exists && checkResponse.data?.needsPasswordSetup) {
            setStep('setup-password');
            setPassword("");
            setLoginError(null);
            toast({ title: "Primeiro acesso", description: "Este é seu primeiro acesso. Defina sua senha." });
          } else if (checkResponse.data?.exists) {
            setLoginError("Senha incorreta. Tente novamente.");
          } else {
            setLoginError("Usuário não encontrado. Verifique o e-mail.");
          }
        } else if (error.message === 'Failed to fetch') {
          setLoginError("Erro de conexão. Verifique sua internet.");
        } else {
          setLoginError(error.message);
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
      setLoginError("Erro inesperado. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEmail = async () => {
    setEmailError(null);
    const eErr = validateEmail(email);
    if (eErr) { setEmailError(eErr); return; }

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
        setEmailError("E-mail não cadastrado. Solicite ao administrador.");
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
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: newPassword });
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

  return (
    <TooltipProvider>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
        {/* Decorative circles */}
        <div className="fixed top-0 left-0 w-72 h-72 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="fixed bottom-0 right-0 w-96 h-96 bg-primary/8 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />

        <Card className="w-full max-w-md shadow-2xl shadow-primary/10 border-border/50 relative z-10">
          <CardHeader className="text-center space-y-3 pb-2">
            <div className="mx-auto w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <FolderKanban className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                OPM - SEGSAT
              </h1>
              <p className="text-sm text-muted-foreground font-normal">
                {step === 'setup-password'
                  ? "Defina sua senha para acessar o sistema"
                  : "Acesse sua conta"}
              </p>
            </div>
          </CardHeader>

          <CardContent className="pt-2">
            {step === 'setup-password' ? (
              <form onSubmit={handleSetupPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">E-mail</Label>
                  <Input value={email} disabled className="bg-muted/50 text-muted-foreground" />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="newPassword" className="text-xs font-medium">Nova senha</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Crie uma senha segura"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={loading}
                      autoFocus
                      className="pr-10 border-input focus-visible:ring-primary focus-visible:ring-2 focus-visible:border-primary transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirmPassword" className="text-xs font-medium">Confirmar senha</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Repita a senha"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={loading}
                      className="pr-10 border-input focus-visible:ring-primary focus-visible:ring-2 focus-visible:border-primary transition-all"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border border-border/50">
                  {passwordRules.map((rule) => {
                    const passes = rule.test(newPassword);
                    return (
                      <div key={rule.label} className={`flex items-center gap-2 text-xs transition-colors ${passes ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {passes ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                        {rule.label}
                      </div>
                    );
                  })}
                  <div className={`flex items-center gap-2 text-xs transition-colors ${passwordsMatch ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    Senhas coincidem
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
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
                    variant="ghost"
                    className="text-sm text-muted-foreground hover:text-foreground"
                    onClick={() => { setStep('login'); setNewPassword(""); setConfirmPassword(""); setLoginError(null); }}
                    disabled={loading}
                  >
                    <ArrowLeft className="mr-1 h-3 w-3" /> Voltar ao login
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu.email@empresa.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null); setLoginError(null); }}
                    disabled={loading}
                    autoFocus
                    className={`h-11 border-input focus-visible:ring-primary focus-visible:ring-2 focus-visible:border-primary transition-all ${emailError ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                  />
                  {emailError && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" /> {emailError}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-medium">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
                      disabled={loading}
                      className={`h-11 pr-10 border-input focus-visible:ring-primary focus-visible:ring-2 focus-visible:border-primary transition-all ${loginError ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginError && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 flex-shrink-0" /> {loginError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 shadow-md shadow-primary/20 transition-all hover:shadow-lg hover:shadow-primary/30"
                  disabled={loading}
                >
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                  ) : (
                    <><Lock className="mr-2 h-4 w-4" /> Entrar</>
                  )}
                </Button>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/5 gap-1.5 px-2 h-8"
                    onClick={handleCheckEmail}
                    disabled={loading}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Primeiro acesso
                  </Button>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-xs text-muted-foreground hover:text-foreground px-2 h-8"
                        onClick={() => setForgotOpen(true)}
                        disabled={loading}
                      >
                        Esqueci minha senha
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Enviaremos um link para redefinir sua senha
                    </TooltipContent>
                  </Tooltip>
                </div>
              </form>
            )}
            <ForgotPasswordModal open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={email} />
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default Auth;
