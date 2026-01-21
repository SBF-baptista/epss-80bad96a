import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
  descricaovenda: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, type } = await req.json();
    
    const apiToken = Deno.env.get('SEGSALE_ACCESSORIES_TOKEN');
    if (!apiToken) {
      throw new Error('SEGSALE_ACCESSORIES_TOKEN not configured');
    }

    // Fetch products if type is 'products'
    if (type === 'products') {
      console.log('Fetching Segsale products');
      
      const response = await fetch('https://ws-sale-teste.segsat.com/segsale/produto/6/itens', {
        method: 'GET',
        headers: {
          'Token': apiToken,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Segsale API error:', response.status, errorText);
        throw new Error(`Segsale API returned ${response.status}: ${errorText}`);
      }

      const data: SegsaleProduct[] = await response.json();
      console.log(`Received ${data.length} products from Segsale`);

      // Format products as "descricao - descricaovenda"
      const items = data.map(item => ({
        id: item.id,
        nome: `${item.descricao} - ${item.descricaovenda}`.trim(),
        descricao: item.descricao,
        descricaovenda: item.descricaovenda
      }));

      return new Response(JSON.stringify({ items }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: fetch extras (accessories/modules)
    console.log(`Fetching Segsale extras for category: ${category || 'all'}`);

    const response = await fetch('https://ws-sale-teste.segsat.com/segsale/produto/6/extras', {
      method: 'GET',
      headers: {
        'Token': apiToken,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Segsale API error:', response.status, errorText);
      throw new Error(`Segsale API returned ${response.status}: ${errorText}`);
    }

    const data: SegsaleExtra[] = await response.json();
    console.log(`Received ${data.length} extras from Segsale`);

    // Filter by category if specified
    let filteredData = data;
    if (category) {
      filteredData = data.filter(item => 
        item.categoria?.toLowerCase() === category.toLowerCase()
      );
      console.log(`Filtered to ${filteredData.length} items with category: ${category}`);
    }

    // Extract unique names
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
    return new Response(
      JSON.stringify({ 
        error: error.message,
        items: [] 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
