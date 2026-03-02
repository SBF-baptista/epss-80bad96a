
import { useState, useEffect, useCallback } from "react";
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

// --- Persistent cooldown helpers (localStorage) ---
const COOLDOWN_KEY_PREFIX = 'otp_cooldown_';
const COOLDOWN_NORMAL_MS = 60_000; // 60s after successful send
const COOLDOWN_RATE_LIMITED_MS = 180_000; // 3min after 429

function getCooldownKey(email: string) {
  return COOLDOWN_KEY_PREFIX + email.toLowerCase().trim();
}

function getPersistedCooldownEnd(email: string): number {
  try {
    const val = localStorage.getItem(getCooldownKey(email));
    return val ? parseInt(val, 10) : 0;
  } catch {
    return 0;
  }
}

function setPersistedCooldown(email: string, durationMs: number) {
  try {
    localStorage.setItem(getCooldownKey(email), String(Date.now() + durationMs));
  } catch { /* ignore */ }
}

function getRemainingCooldownSeconds(email: string): number {
  const end = getPersistedCooldownEnd(email);
  return Math.max(0, Math.ceil((end - Date.now()) / 1000));
}

const Auth = () => {
  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState<Date | null>(null);
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if already logged in (not during OTP flow)
  useEffect(() => {
    if (user && step === 'email') {
      navigate("/kanban");
    }
  }, [user, step, navigate]);

  // Handle magic link callback
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

  // Timer for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isBlocked = blockedUntil && new Date() < blockedUntil;
  const cooldownSeconds = getRemainingCooldownSeconds(email);
  const isCooldownActive = cooldownSeconds > 0;

  // Forgot password
  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Erro", description: "Informe seu e-mail primeiro", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      // Always show success message for security
      toast({
        title: "E-mail enviado",
        description: "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha."
      });
      if (error) {
        console.warn('Reset password error (hidden from user):', error.message);
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Helper: advance to code step safely
  const advanceToCodeStep = useCallback(() => {
    setStep('code');
    if (!otpExpiry || new Date() > otpExpiry) {
      setOtpExpiry(new Date(Date.now() + 5 * 60 * 1000));
    }
  }, [otpExpiry]);

  // Step 1: Send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Erro", description: "Informe seu e-mail", variant: "destructive" });
      return;
    }

    // If cooldown active, advance to code step without making API call
    if (isCooldownActive) {
      advanceToCodeStep();
      toast({
        title: "Código já solicitado",
        description: `Use o código recebido no e-mail. Novo envio disponível em ${cooldownSeconds}s.`
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      });

      if (error) {
        const isRateLimit = error.message.includes("rate") || error.message.includes("security") || error.status === 429 || (error as any).code === 'over_email_send_rate_limit';

        if (isRateLimit) {
          // Apply longer cooldown on 429
          setPersistedCooldown(email, COOLDOWN_RATE_LIMITED_MS);
          advanceToCodeStep();
          toast({
            title: "Limite de envio atingido",
            description: "Use o último código recebido. Verifique também a caixa de spam. Novo envio em 3 minutos."
          });
        } else if (error.message.includes("Signups not allowed") || error.message.includes("not found") || error.message.includes("otp_disabled")) {
          // Auto-register: create account and send password reset email
          try {
            const tempPassword = crypto.randomUUID() + 'A1!';
            const { error: signUpError } = await supabase.auth.signUp({
              email,
              password: tempPassword,
              options: { emailRedirectTo: `${window.location.origin}/reset-password` }
            });
            if (signUpError) {
              const isSignUpRateLimit = signUpError.message.includes("rate") || signUpError.message.includes("security") || (signUpError as any).status === 429 || (signUpError as any).code === 'over_email_send_rate_limit';
              
              if (isSignUpRateLimit) {
                setPersistedCooldown(email, COOLDOWN_RATE_LIMITED_MS);
                toast({
                  title: "Limite de envio atingido",
                  description: "Muitas tentativas. Aguarde alguns minutos e tente novamente."
                });
              } else if (signUpError.message.includes("already registered") || signUpError.message.includes("already been registered")) {
                await supabase.auth.resetPasswordForEmail(email, {
                  redirectTo: `${window.location.origin}/reset-password`
                });
                toast({
                  title: "E-mail enviado",
                  description: "Enviamos um link para você redefinir sua senha. Verifique seu e-mail e a caixa de spam."
                });
              } else {
                toast({
                  title: "Erro",
                  description: "Não foi possível criar sua conta: " + signUpError.message,
                  variant: "destructive"
                });
              }
            } else {
              // New user created, send password reset so they can set their own password
              await supabase.auth.signOut(); // sign out the auto-created session
              await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
              });
              toast({
                title: "Conta criada!",
                description: "Enviamos um e-mail para você definir sua senha. Verifique seu e-mail e a caixa de spam."
              });
            }
          } catch {
            toast({
              title: "Erro",
              description: "Erro ao processar cadastro. Tente novamente.",
              variant: "destructive"
            });
          }
        } else {
          toast({
            title: "Erro",
            description: "Erro ao enviar código de verificação: " + error.message,
            variant: "destructive"
          });
        }
      } else {
        // Successful send — apply normal cooldown
        setPersistedCooldown(email, COOLDOWN_NORMAL_MS);
        setStep('code');
        setOtpExpiry(new Date(Date.now() + 5 * 60 * 1000));
        setAttempts(0);
        setOtpCode("");
        toast({
          title: "Código enviado",
          description: "Verifique seu e-mail para o código de 6 dígitos. Confira também a caixa de spam."
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

  // Resend code — respects cooldown
  const handleResendCode = async () => {
    if (isCooldownActive) {
      toast({
        title: "Aguarde",
        description: `Novo envio disponível em ${cooldownSeconds}s. Use o último código recebido.`
      });
      return;
    }
    // Reuse email submit logic (without form event)
    await handleEmailSubmit({ preventDefault: () => {} } as React.FormEvent);
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
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                ) : isCooldownActive ? (
                  <><Mail className="mr-2 h-4 w-4" /> Continuar (código já enviado)</>
                ) : (
                  <><Mail className="mr-2 h-4 w-4" /> Continuar</>
                )}
              </Button>
              {isCooldownActive && (
                <p className="text-xs text-center text-muted-foreground">
                  Novo envio disponível em {cooldownSeconds}s. Clique em Continuar para inserir o código já recebido.
                </p>
              )}
              <Button type="button" variant="link" className="w-full text-sm" onClick={handleForgotPassword} disabled={loading}>
                Esqueci minha senha
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
                  Insira o código recebido por e-mail. Verifique também a caixa de spam.
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
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  onClick={handleResendCode}
                  disabled={loading || isCooldownActive}
                >
                  {isCooldownActive ? `Reenviar (${cooldownSeconds}s)` : "Reenviar código"}
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
