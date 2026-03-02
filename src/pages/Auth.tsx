
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { FolderKanban, Mail, Shield, Lock, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { logLogin } from "@/services/logService";

type LoginStep = 'email' | 'code' | 'password';

const Auth = () => {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in (not during OTP flow)
  useEffect(() => {
    if (user && step === 'email') {
      navigate("/kanban");
    }
  }, [user, step, navigate]);

  // Handle magic link callback (user clicked link in email)
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=magiclink') || hash.includes('type=email'))) {
      supabase.auth.signOut().then(() => {
        setStep('password');
        window.history.replaceState(null, '', window.location.pathname);
        toast({
          title: "Identidade verificada",
          description: "Agora informe sua senha para acessar"
        });
      });
    }
  }, []);

  const isBlocked = blockedUntil && new Date() < blockedUntil;

  // Step 1: Send OTP via Supabase magic link
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Erro", description: "Informe seu e-mail", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth`
        }
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message.includes("Signups not allowed") || error.message.includes("otp")
            ? "E-mail não cadastrado no sistema"
            : "Erro ao enviar código de verificação",
          variant: "destructive"
        });
      } else {
        setStep('code');
        setOtpExpiry(new Date(Date.now() + 5 * 60 * 1000));
        setAttempts(0);
        setOtpCode("");
        toast({
          title: "Código enviado",
          description: "Verifique seu e-mail para o código de verificação"
        });
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBlocked) {
      const remainingMin = Math.ceil((blockedUntil!.getTime() - Date.now()) / 60000);
      toast({
        title: "Acesso bloqueado",
        description: `Muitas tentativas. Tente novamente em ${remainingMin} minuto(s)`,
        variant: "destructive"
      });
      return;
    }

    if (otpExpiry && new Date() > otpExpiry) {
      toast({
        title: "Código expirado",
        description: "O código expirou. Solicite um novo.",
        variant: "destructive"
      });
      setStep('email');
      return;
    }

    if (otpCode.length !== 6) {
      toast({ title: "Erro", description: "Informe o código de 6 dígitos", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });

      if (error) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= 5) {
          setBlockedUntil(new Date(Date.now() + 15 * 60 * 1000));
          toast({
            title: "Bloqueado",
            description: "Muitas tentativas incorretas. Aguarde 15 minutos.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Código inválido",
            description: `Código incorreto. ${5 - newAttempts} tentativa(s) restante(s)`,
            variant: "destructive"
          });
        }
      } else {
        // OTP verified → sign out OTP session → move to password step
        await supabase.auth.signOut();
        setStep('password');
        toast({
          title: "Código verificado",
          description: "Agora informe sua senha"
        });
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Sign in with password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      toast({ title: "Erro", description: "Informe sua senha", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({
          title: "Erro",
          description: error.message.includes("Invalid login credentials")
            ? "Senha incorreta"
            : "Erro na autenticação",
          variant: "destructive"
        });
      } else {
        setTimeout(() => logLogin(), 100);
        toast({ title: "Sucesso", description: "Login realizado com sucesso!" });
        navigate("/kanban");
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = ['email', 'code', 'password'].indexOf(step);

  const getStepDescription = () => {
    switch (step) {
      case 'email': return 'Informe seu e-mail para continuar';
      case 'code': return `Código enviado para ${email}`;
      case 'password': return 'Informe sua senha para acessar';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <FolderKanban className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">OPM - SEGSAT</CardTitle>
            <CardDescription className="text-gray-600">{getStepDescription()}</CardDescription>
          </div>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === stepIndex ? 'w-8 bg-blue-600' : i < stepIndex ? 'w-8 bg-blue-400' : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</> : (
                  <><Mail className="mr-2 h-4 w-4" /> Continuar</>
                )}
              </Button>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-3">
                <Label>Código de verificação</Label>
                <div className="flex justify-center">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} disabled={loading || !!isBlocked}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-xs text-center text-muted-foreground">
                  {isBlocked
                    ? `Bloqueado. Tente novamente em ${Math.ceil((blockedUntil!.getTime() - Date.now()) / 60000)} min`
                    : `Válido por 5 minutos • ${5 - attempts} tentativa(s) restante(s)`}
                </p>
                <p className="text-xs text-center text-muted-foreground">
                  Insira o código recebido por e-mail ou clique no link enviado.
                </p>
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading || !!isBlocked || otpCode.length !== 6}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</> : (
                  <><Shield className="mr-2 h-4 w-4" /> Verificar Código</>
                )}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => { setStep('email'); setOtpCode(''); }}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <Button type="button" variant="ghost" className="flex-1" onClick={handleEmailSubmit} disabled={loading}>
                  Reenviar código
                </Button>
              </div>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Digite sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Entrando...</> : (
                  <><Lock className="mr-2 h-4 w-4" /> Entrar</>
                )}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep('email'); setPassword(''); setOtpCode(''); }}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao início
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
