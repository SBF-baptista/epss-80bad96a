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

      const response = await fetch('https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/receive-vehicle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'test-key-123' // This should be configured in your environment
        },
        body: JSON.stringify(testPayload)
      });

      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Teste API concluído",
          description: `Veículo processado: ${result.processing_summary?.total_orders_created || 0} pedidos criados, ${result.processing_summary?.total_homologations_created || 0} homologações criadas`
        });
      } else {
        toast({
          title: "Erro no teste API",
          description: result.message || "Erro desconhecido",
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
          <Button 
            onClick={testApiVehicleProcessing} 
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testando..." : "Testar API de Veículos"}
          </Button>
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