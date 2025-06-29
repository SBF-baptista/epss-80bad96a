
const SUPABASE_URL = "https://eeidevcyxpnorbgcskdf.supabase.co";

export interface VehicleVerificationResponse {
  success: true;
  vehicle: {
    id: string;
    brand: string;
    model: string;
    quantity: number;
    type: string | null;
    created_at: string;
  };
}

export interface VehicleNotFoundResponse {
  error: string;
  message: string;
}

export const verifyVehicle = async (
  brand: string, 
  model: string, 
  apiKey: string
): Promise<VehicleVerificationResponse | VehicleNotFoundResponse> => {
  const url = new URL(`${SUPABASE_URL}/functions/v1/verify-vehicle`);
  url.searchParams.set('brand', brand);
  url.searchParams.set('model', model);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
};
