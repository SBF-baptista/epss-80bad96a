
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        console.error("Auth error:", error);
        let errorMessage = "Erro na autenticação";
        
        if (error.message.includes("Invalid login credentials")) {
          errorMessage = "Email ou senha incorretos";
        } else if (error.message.includes("User already registered")) {
          errorMessage = "Usuário já cadastrado";
        } else if (error.message.includes("Password should be at least")) {
          errorMessage = "A senha deve ter pelo menos 6 caracteres";
        }

        toast({
          title: "Erro",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        if (isLogin) {
          toast({
            title: "Sucesso",
            description: "Login realizado com sucesso!"
          });
          navigate("/kanban");
        } else {
          toast({
            title: "Sucesso", 
            description: "Conta criada com sucesso! Faça login para continuar."
          });
          setIsLogin(true);
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast({
        title: "Erro",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive"
      });
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
            <CardTitle className="text-2xl font-bold text-gray-800">
              EPSS
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isLogin ? "Entre em sua conta" : "Crie sua conta"}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu.email@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
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
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Processando..." : (isLogin ? "Entrar" : "Criar Conta")}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setIsLogin(!isLogin)}
              disabled={loading}
            >
              {isLogin ? "Não tem conta? Cadastre-se" : "Já tem conta? Faça login"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
