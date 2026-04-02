
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderKanban, Lock, Loader2, ArrowLeft, Check, X, KeyRound, Eye, EyeOff, AlertCircle, UserPlus, Shield, BarChart3, Zap } from "lucide-react";
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
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const features = [
    { icon: BarChart3, title: "Gestão inteligente", desc: "Controle total dos seus pedidos em tempo real" },
    { icon: Zap, title: "Automação completa", desc: "Processos otimizados do início ao fim" },
    { icon: Shield, title: "Segurança avançada", desc: "Dados protegidos com criptografia de ponta" },
  ];

  return (
    <TooltipProvider>
      <div className="min-h-screen flex">
        {/* LEFT PANEL - Branding */}
        <div className="hidden lg:flex lg:w-[40%] bg-primary relative overflow-hidden flex-col justify-between p-12">
          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-[0.07]">
            <div className="absolute top-20 -left-10 w-72 h-72 rounded-full border border-white/40" />
            <div className="absolute top-40 left-20 w-96 h-96 rounded-full border border-white/20" />
            <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full border border-white/30" />
            <div className="absolute bottom-40 right-10 w-48 h-48 rounded-full bg-white/5" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-primary-foreground/90 font-semibold text-lg tracking-tight">OPM — SEGSAT</span>
            </div>
          </div>

          <div className="relative z-10 flex-1 flex flex-col justify-center -mt-8">
            <h2 className="text-3xl xl:text-4xl font-bold text-primary-foreground leading-tight mb-4">
              Gerencie suas operações com{" "}
              <span className="text-white/80">inteligência e controle total</span>
            </h2>
            <p className="text-primary-foreground/60 text-base leading-relaxed max-w-md">
              Plataforma completa para gestão de pedidos, homologação de veículos e acompanhamento de instalações.
            </p>

            <div className="mt-10 space-y-5">
              {features.map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon className="w-4.5 h-4.5 text-primary-foreground/80" />
                  </div>
                  <div>
                    <p className="text-primary-foreground font-medium text-sm">{f.title}</p>
                    <p className="text-primary-foreground/50 text-sm">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10">
            <p className="text-primary-foreground/30 text-xs">
              © {new Date().getFullYear()} SEGSAT. Todos os direitos reservados.
            </p>
          </div>
        </div>

        {/* RIGHT PANEL - Login Form */}
        <div className="flex-1 flex items-center justify-center bg-background p-6 sm:p-8 lg:p-12">
          <div
            className={`w-full max-w-[420px] transition-all duration-500 ease-out ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                <FolderKanban className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-foreground font-bold text-xl tracking-tight">OPM — SEGSAT</span>
            </div>

            {/* Card */}
            <div className="bg-card rounded-2xl border border-border/60 shadow-xl shadow-black/[0.03] p-8">
              {/* Header */}
              <div className="mb-8">
                <div className="hidden lg:flex w-11 h-11 bg-primary rounded-xl items-center justify-center shadow-md shadow-primary/25 mb-5">
                  <FolderKanban className="w-5 h-5 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold text-foreground tracking-tight">
                  {step === 'setup-password' ? "Definir nova senha" : "Acessar plataforma"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {step === 'setup-password'
                    ? "Crie uma senha segura para sua conta"
                    : "Entre com seus dados para continuar"}
                </p>
              </div>

              {step === 'setup-password' ? (
                <form onSubmit={handleSetupPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">E-mail</Label>
                    <Input value={email} disabled className="h-11 bg-muted/40 text-muted-foreground rounded-xl border-border/50" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="newPassword" className="text-xs font-medium text-foreground">Nova senha</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Crie uma senha segura"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        disabled={loading}
                        autoFocus
                        className="h-11 pr-10 rounded-xl border-border/80 focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:border-primary transition-all"
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
                    <Label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">Confirmar senha</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Repita a senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={loading}
                        className="h-11 pr-10 rounded-xl border-border/80 focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:border-primary transition-all"
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

                  <div className="space-y-1 p-3 rounded-xl bg-muted/30 border border-border/40">
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
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 rounded-xl shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px active:translate-y-0"
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
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium text-foreground">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu.email@empresa.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(null); setLoginError(null); }}
                      disabled={loading}
                      autoFocus
                      className={`h-11 rounded-xl border-border/80 focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:border-primary transition-all ${emailError ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
                    />
                    {emailError && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" /> {emailError}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium text-foreground">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Digite sua senha"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setLoginError(null); }}
                        disabled={loading}
                        className={`h-11 pr-10 rounded-xl border-border/80 focus-visible:ring-primary/30 focus-visible:ring-2 focus-visible:border-primary transition-all ${loginError ? 'border-destructive ring-1 ring-destructive/30' : ''}`}
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
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11 rounded-xl shadow-md shadow-primary/20 transition-all duration-200 hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-px active:translate-y-0"
                    disabled={loading}
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</>
                    ) : (
                      <><Lock className="mr-2 h-4 w-4" /> Entrar no painel</>
                    )}
                  </Button>

                  {/* Microcopy */}
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground/60">
                    <Shield className="h-3 w-3" />
                    <span>Seus dados são protegidos com criptografia segura</span>
                  </div>

                  {/* Links auxiliares */}
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
            </div>

            <ForgotPasswordModal open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={email} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default Auth;
