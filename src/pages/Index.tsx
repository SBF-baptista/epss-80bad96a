
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    // Redirect authenticated users to homologation page by default
    if (user) {
      navigate("/homologation");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Sistema de Homologação</h1>
        <p className="text-xl text-gray-600 mb-8">Gerencie o processo de homologação de veículos</p>
        {!user && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600">Faça login para acessar o sistema</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
