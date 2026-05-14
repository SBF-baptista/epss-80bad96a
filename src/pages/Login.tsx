
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { FullScreenLoader } from "@/components/ui/loading";
import { LoginTutorial } from "@/components/LoginTutorial";

const Login = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate("/kanban");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <FullScreenLoader message="Carregando..." />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <FolderKanban className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              OPM - SEGSAT
            </CardTitle>
            <CardDescription className="text-gray-600">
              Sistema de Gerenciamento de Pedidos
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-gray-600">
            <p>Gerencie seus pedidos de configuração de forma eficiente</p>
          </div>
          <Button 
            onClick={() => navigate("/auth")}
            className="w-full bg-blue-600 hover:bg-blue-700 flex items-center gap-2"
          >
            <LogIn className="w-5 h-5" />
            Entrar no Sistema
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
