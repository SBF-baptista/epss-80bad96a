import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simple in-memory cache (persists for the function instance lifetime)
const cache = new Map<string, { result: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm, maxPages = 20, debug = false } = await req.json();
    
    if (!searchTerm) {
      return new Response(
        JSON.stringify({ error: 'searchTerm é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cacheKey = searchTerm.toUpperCase();
    
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log(`Cache hit para "${searchTerm}"`);
      return new Response(
        JSON.stringify({ ...cached.result, fromCache: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = Deno.env.get('TOMTICKET_API_TOKEN');
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'TOMTICKET_API_TOKEN não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Buscando "${searchTerm}" no TomTicket (max ${maxPages} páginas)...`);

    const searchTermUpper = searchTerm.toUpperCase();
    const matchingTickets = [];
    let totalTicketsSearched = 0;
    let sampleTicket = null;
    let rateLimitHit = false;

    // Buscar tickets com paginação e delays para evitar rate limiting
    for (let page = 1; page <= maxPages; page++) {
      // Add delay between requests (500ms) to avoid rate limiting
      if (page > 1) {
        await delay(500);
      }
      
      console.log(`Buscando página ${page}...`);
      
      let retries = 3;
      let response = null;
      
      while (retries > 0) {
        response = await fetch(`https://api.tomticket.com/v2.0/ticket/list?page=${page}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.status === 429) {
          retries--;
          console.log(`Rate limit atingido, aguardando 2s... (${retries} tentativas restantes)`);
          await delay(2000);
          continue;
        }
        
        break;
      }

      if (!response || !response.ok) {
        const errorText = response ? await response.text() : 'No response';
        console.error('Erro API:', response?.status, errorText);
        
        if (response?.status === 429) {
          rateLimitHit = true;
          console.log('Rate limit persistente, finalizando com resultados parciais.');
        }
        break;
      }

      const data = await response.json();
      const tickets = data.data || [];
      
      console.log(`Página ${page}: ${tickets.length} tickets`);
      
      if (tickets.length === 0) {
        console.log('Sem mais tickets, finalizando busca.');
        break;
      }
      
      // Guardar exemplo para debug
      if (!sampleTicket && tickets.length > 0) {
        sampleTicket = tickets[0];
      }

      totalTicketsSearched += tickets.length;

      // Buscar em todos os campos do ticket
      for (const ticket of tickets) {
        const ticketString = JSON.stringify(ticket).toUpperCase();
        
        if (ticketString.includes(searchTermUpper)) {
          matchingTickets.push({
            protocol: ticket.protocol,
            id: ticket.id,
            subject: ticket.subject,
            situation: ticket.situation,
            status: ticket.status?.description || 'N/A',
            created_at: ticket.creation_date,
            customer_name: ticket.customer?.name || 'N/A',
            department: ticket.department?.name || 'N/A',
            operator: ticket.operator?.name || 'N/A',
            page_found: page
          });
          console.log(`✓ Encontrado! Protocolo: ${ticket.protocol}`);
        }
      }

      // Se encontrou algum resultado, podemos parar a busca (otimização)
      if (matchingTickets.length > 0) {
        console.log('Protocolo encontrado, finalizando busca.');
        break;
      }

      // Verificar paginação - se retornou menos de 50, não há mais
      if (tickets.length < 50) {
        console.log('Última página alcançada.');
        break;
      }
    }

    console.log(`Busca finalizada: ${totalTicketsSearched} tickets verificados, ${matchingTickets.length} encontrados`);

    const result: any = {
      success: true,
      searchTerm,
      totalTicketsSearched,
      matchingTickets,
      found: matchingTickets.length > 0,
      protocols: matchingTickets.map(t => t.protocol),
      rateLimitHit
    };

    if (debug && sampleTicket) {
      result.debug = {
        sampleSubject: sampleTicket.subject,
        sampleCustomer: sampleTicket.customer?.name,
        sampleMessage: sampleTicket.message?.substring(0, 200)
      };
    }

    // Store in cache
    cache.set(cacheKey, { result, timestamp: Date.now() });

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
