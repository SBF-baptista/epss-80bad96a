
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { logLogin } from "@/services/logService";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Check if user must change password on first login
      const mustChange = user.user_metadata?.must_change_password;
      if (mustChange) {
        navigate("/ativar");
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
          toast({ title: "Erro", description: "E-mail ou senha incorretos", variant: "destructive" });
        } else {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
      } else {
        setTimeout(() => logLogin(), 100);
        
        // Check if must change password
        if (data?.user?.user_metadata?.must_change_password) {
          toast({ title: "Atenção", description: "Você precisa definir uma nova senha para continuar." });
          navigate("/ativar");
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

  const handleForgotPassword = async () => {
    if (!email) {
      toast({ title: "Erro", description: "Informe seu e-mail primeiro", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      toast({
        title: "E-mail enviado",
        description: "Se o e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha."
      });
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({ title: "Erro", description: "Informe e-mail e senha para criar conta", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Erro", description: "A senha deve ter no mínimo 6 caracteres", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth` }
      });
      if (error) {
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          toast({ title: "Erro", description: "Este e-mail já está cadastrado. Use 'Esqueci minha senha' se necessário.", variant: "destructive" });
        } else {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        }
      } else {
        toast({
          title: "Conta criada!",
          description: "Verifique seu e-mail para confirmar o cadastro."
        });
      }
    } catch {
      toast({ title: "Erro", description: "Erro inesperado", variant: "destructive" });
    } finally {
      setLoading(false);
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
            <CardDescription className="text-gray-600">Informe suas credenciais para acessar</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
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
              <Button type="button" variant="link" className="text-sm p-0" onClick={handleForgotPassword} disabled={loading}>
                Esqueci minha senha
              </Button>
              <Button type="button" variant="link" className="text-sm p-0" onClick={handleSignUp} disabled={loading}>
                Criar conta
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
