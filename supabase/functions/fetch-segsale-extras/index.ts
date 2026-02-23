import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SegsaleExtra {
  id: number;
  nome: string;
  categoria: string;
  descricao?: string;
}

interface SegsaleProduct {
  id: number;
  descricao: string;
  descricaoVenda: string;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2, timeoutMs = 15000): Promise<Response> {
  let lastError: Error | null = null;
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options, timeoutMs);
      if (response.ok) return response;
      // On 5xx, retry
      if (response.status >= 500 && i < retries) {
        console.warn(`Attempt ${i + 1} failed with ${response.status}, retrying...`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        continue;
      }
      return response; // Return non-retryable error response
    } catch (err) {
      lastError = err;
      if (i < retries) {
        console.warn(`Attempt ${i + 1} failed with ${err.message}, retrying...`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
  }
  throw lastError || new Error('All retry attempts failed');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, type } = await req.json();

    if (type === 'products') {
      const productsToken = Deno.env.get('SEGSALE_PRODUTOSS');
      if (!productsToken) {
        throw new Error('SEGSALE_PRODUTOSS not configured');
      }
      
      console.log('Fetching Segsale products with SEGSALE_PRODUTOSS token');
      
      const response = await fetchWithRetry('https://ws-sale-teste.segsat.com/segsale/produto/6/itens', {
        method: 'GET',
        headers: { 'Token': productsToken, 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Segsale API error after retries:', response.status);
        // Return empty items instead of throwing - graceful degradation
        return new Response(JSON.stringify({ items: [], error: `Segsale API indisponível (${response.status})` }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data: SegsaleProduct[] = await response.json();
      console.log(`Received ${data.length} products from Segsale`);

      const items = data.map(item => ({
        id: item.id,
        nome: item.descricaoVenda ? `${item.descricao} - ${item.descricaoVenda}`.trim() : item.descricao,
        descricao: item.descricao,
        descricaovenda: item.descricaoVenda || ''
      }));

      return new Response(JSON.stringify({ items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: fetch extras (accessories/modules)
    const accessoriesToken = Deno.env.get('SEGSALE_ACCESSORIES_TOKEN');
    if (!accessoriesToken) {
      throw new Error('SEGSALE_ACCESSORIES_TOKEN not configured');
    }
    
    console.log(`Fetching Segsale extras for category: ${category || 'all'}`);

    const response = await fetchWithRetry('https://ws-sale-teste.segsat.com/segsale/produto/6/extras', {
      method: 'GET',
      headers: { 'Token': accessoriesToken, 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.error('Segsale API error after retries:', response.status);
      return new Response(JSON.stringify({ items: [], error: `Segsale API indisponível (${response.status})` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data: SegsaleExtra[] = await response.json();
    console.log(`Received ${data.length} extras from Segsale`);

    let filteredData = data;
    if (category) {
      filteredData = data.filter(item => 
        item.categoria?.toLowerCase() === category.toLowerCase()
      );
      console.log(`Filtered to ${filteredData.length} items with category: ${category}`);
    }

    const items = filteredData.map(item => ({
      id: item.id,
      nome: item.nome,
      categoria: item.categoria,
      descricao: item.descricao
    }));

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in fetch-segsale-extras:', error);
    // Return empty items with 200 to avoid breaking the UI
    return new Response(
      JSON.stringify({ 
        error: error.message,
        items: [] 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
