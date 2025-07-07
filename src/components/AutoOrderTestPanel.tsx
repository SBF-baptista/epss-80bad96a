import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const AutoOrderTestPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [apiTestData, setApiTestData] = useState({
    brand: "TOYOTA",
    vehicle: "COROLLA",
    year: 2024,
    usageType: "particular"
  });
  const [homologationTestData, setHomologationTestData] = useState({
    brand: "HONDA",
    model: "CIVIC",
    year: 2024,
    configuration: "CONFIG_TEST_001"
  });

  const testConnectivity = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?test=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Conectividade OK",
          description: "Endpoint está acessível e funcionando"
        });
      } else {
        toast({
          title: "Teste de conectividade",
          description: `Status: ${response.status} - ${result.message || 'Teste básico funcionando'}`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Connectivity test error:', error);
      toast({
        title: "Erro de conectividade",
        description: "Não foi possível conectar ao endpoint",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testAuthConfiguration = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('receive-vehicle', {
        method: 'GET',
        body: { 'auth-debug': true }
      });

      toast({
        title: "Diagnóstico de Autenticação",
        description: response.error 
          ? `❌ Erro de autenticação: ${response.error.message}` 
          : "✅ Autenticação via JWT funcionando",
        variant: response.error ? "destructive" : "default"
      });

      console.log('Auth diagnostics:', response);
    } catch (error) {
      console.error('Auth test error:', error);
      toast({
        title: "Erro no teste de autenticação",
        description: "Erro ao verificar configuração",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testServerConfiguration = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle?config-debug=true', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      toast({
        title: "Configuração do Servidor",
        description: result.environment_configuration?.vehicle_api_key?.configured 
          ? "✅ VEHICLE_API_KEY configurada" 
          : "❌ VEHICLE_API_KEY não configurada",
        variant: result.environment_configuration?.vehicle_api_key?.configured ? "default" : "destructive"
      });

      console.log('Server config diagnostics:', result);
    } catch (error) {
      console.error('Config test error:', error);
      toast({
        title: "Erro no teste de configuração",
        description: "Erro ao verificar configuração do servidor",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testApiVehicleProcessing = async () => {
    setLoading(true);
    try {
      const testPayload = [{
        company_name: "Teste Automatico",
        usage_type: apiTestData.usageType,
        vehicles: [{
          vehicle: apiTestData.vehicle,
          brand: apiTestData.brand,
          year: apiTestData.year,
          quantity: 1
        }]
      }];

      const response = await supabase.functions.invoke('receive-vehicle', {
        body: testPayload
      });

      if (!response.error) {
        toast({
          title: "Teste API concluído",
          description: `Veículo processado: ${response.data?.processing_summary?.total_orders_created || 0} pedidos criados, ${response.data?.processing_summary?.total_homologations_created || 0} homologações criadas`
        });
      } else {
        toast({
          title: "Erro no teste API",
          description: response.error.message || "Erro desconhecido",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('API test error:', error);
      toast({
        title: "Erro no teste",
        description: "Erro ao conectar com a API",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testHomologationApproval = async () => {
    setLoading(true);
    try {
      // First create a homologation card
      const { data: homologationCard, error: createError } = await supabase
        .from('homologation_cards')
        .insert({
          brand: homologationTestData.brand,
          model: homologationTestData.model,
          year: homologationTestData.year,
          configuration: homologationTestData.configuration,
          status: 'homologar',
          notes: 'Teste automático de homologação'
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Wait a moment for the insert to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Then approve it (this should trigger the automatic order creation)
      const { error: updateError } = await supabase
        .from('homologation_cards')
        .update({ status: 'homologado' })
        .eq('id', homologationCard.id);

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Teste Homologação concluído",
        description: `Homologação aprovada para ${homologationTestData.brand} ${homologationTestData.model}. Verifique se o pedido foi criado automaticamente.`
      });

    } catch (error) {
      console.error('Homologation test error:', error);
      toast({
        title: "Erro no teste de homologação",
        description: error.message || "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle>Teste API de Veículos</CardTitle>
          <CardDescription>
            Simula o recebimento de veículos via API externa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="api-brand">Marca</Label>
              <Input
                id="api-brand"
                value={apiTestData.brand}
                onChange={(e) => setApiTestData(prev => ({ ...prev, brand: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="api-vehicle">Modelo</Label>
              <Input
                id="api-vehicle"
                value={apiTestData.vehicle}
                onChange={(e) => setApiTestData(prev => ({ ...prev, vehicle: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="api-year">Ano</Label>
              <Input
                id="api-year"
                type="number"
                value={apiTestData.year}
                onChange={(e) => setApiTestData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="api-usage">Tipo de Uso</Label>
              <Select value={apiTestData.usageType} onValueChange={(value) => setApiTestData(prev => ({ ...prev, usageType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="particular">Particular</SelectItem>
                  <SelectItem value="comercial">Comercial</SelectItem>
                  <SelectItem value="frota">Frota</SelectItem>
                  <SelectItem value="telemetria_gps">Telemetria GPS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Button 
              onClick={testConnectivity} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? "Testando..." : "1. Testar Conectividade"}
            </Button>
            <Button 
              onClick={testServerConfiguration} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? "Testando..." : "2. Verificar Configuração do Servidor"}
            </Button>
            <Button 
              onClick={testAuthConfiguration} 
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? "Testando..." : "3. Testar Autenticação"}
            </Button>
            <Button 
              onClick={testApiVehicleProcessing} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testando..." : "4. Testar API de Veículos"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste Homologação</CardTitle>
          <CardDescription>
            Cria e aprova uma homologação para testar criação automática de pedidos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="homo-brand">Marca</Label>
              <Input
                id="homo-brand"
                value={homologationTestData.brand}
                onChange={(e) => setHomologationTestData(prev => ({ ...prev, brand: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="homo-model">Modelo</Label>
              <Input
                id="homo-model"
                value={homologationTestData.model}
                onChange={(e) => setHomologationTestData(prev => ({ ...prev, model: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="homo-year">Ano</Label>
              <Input
                id="homo-year"
                type="number"
                value={homologationTestData.year}
                onChange={(e) => setHomologationTestData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
              />
            </div>
            <div>
              <Label htmlFor="homo-config">Configuração</Label>
              <Input
                id="homo-config"
                value={homologationTestData.configuration}
                onChange={(e) => setHomologationTestData(prev => ({ ...prev, configuration: e.target.value }))}
              />
            </div>
          </div>
          <Button 
            onClick={testHomologationApproval} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testando..." : "Testar Homologação"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoOrderTestPanel;