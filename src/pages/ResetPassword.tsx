import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Lock, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("type=recovery")) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsValidSession(true);
        }
      } else {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsValidSession(true);
        }
      }
      setChecking(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsValidSession(true);
        setChecking(false);
      }
    });

    checkSession();
    return () => subscription.unsubscribe();
  }, []);

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) return "A senha deve ter no mínimo 8 caracteres";
    if (!/[A-Z]/.test(pwd)) return "A senha deve conter ao menos uma letra maiúscula";
    if (!/[0-9]/.test(pwd)) return "A senha deve conter ao menos um número";
    if (!/[^A-Za-z0-9]/.test(pwd)) return "A senha deve conter ao menos um caractere especial";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validatePassword(password);
    if (validationError) {
      toast({ title: "Senha fraca", description: validationError, variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Erro", description: "As senhas não coincidem", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: "Erro", description: "Não foi possível redefinir a senha: " + error.message, variant: "destructive" });
      } else {
        setSuccess(true);
        await supabase.auth.signOut();
        toast({ title: "Senha redefinida", description: "Sua senha foi alterada com sucesso. Faça login novamente." });
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <FolderKanban className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl text-gray-800">Link inválido ou expirado</CardTitle>
            <CardDescription>Solicite um novo link de redefinição de senha na tela de login.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/auth")}>
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-xl text-gray-800">Senha redefinida!</CardTitle>
            <CardDescription>Agora você pode fazer login com sua nova senha.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => navigate("/auth")}>
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
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">Redefinir senha</CardTitle>
            <CardDescription>Crie uma nova senha para sua conta</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input id="password" type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha</Label>
              <Input id="confirmPassword" type="password" placeholder="Repita a senha" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={loading} />
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li className={password.length >= 8 ? "text-green-600" : ""}>• Mínimo 8 caracteres</li>
              <li className={/[A-Z]/.test(password) ? "text-green-600" : ""}>• Uma letra maiúscula</li>
              <li className={/[0-9]/.test(password) ? "text-green-600" : ""}>• Um número</li>
              <li className={/[^A-Za-z0-9]/.test(password) ? "text-green-600" : ""}>• Um caractere especial</li>
            </ul>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Redefinir senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
