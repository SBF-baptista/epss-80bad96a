
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { verifyVehicle } from "@/services/vehicleVerificationService";

const VehicleVerificationTest = () => {
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!brand || !model || !apiKey) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await verifyVehicle(brand, model, apiKey);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to verify vehicle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Vehicle Verification API Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Ex: VOLKSWAGEN"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Ex: Golf"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="apiKey">API Key</Label>
          <Input
            id="apiKey"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
          />
        </div>

        <Button onClick={handleTest} disabled={loading} className="w-full">
          {loading ? 'Testing...' : 'Test Vehicle Verification'}
        </Button>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {'success' in result ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="default" className="bg-green-600">Vehicle Found</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>ID:</strong> {result.vehicle.id}</p>
                  <p><strong>Brand:</strong> {result.vehicle.brand}</p>
                  <p><strong>Model:</strong> {result.vehicle.model}</p>
                  <p><strong>Quantity:</strong> {result.vehicle.quantity}</p>
                  <p><strong>Type:</strong> {result.vehicle.type || 'N/A'}</p>
                  <p><strong>Created:</strong> {new Date(result.vehicle.created_at).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-3">
                  <Badge variant="secondary" className="bg-orange-600 text-white">Not Found</Badge>
                </div>
                <p className="text-sm text-orange-700">{result.message}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">API Endpoint Information:</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <p><strong>URL:</strong> https://eeidevcyxpnorbgcskdf.supabase.co/functions/v1/verify-vehicle</p>
            <p><strong>Method:</strong> GET</p>
            <p><strong>Query Parameters:</strong> brand, model</p>
            <p><strong>Headers:</strong> x-api-key</p>
            <p><strong>Response:</strong> 200 (found) or 404 (not found)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VehicleVerificationTest;
