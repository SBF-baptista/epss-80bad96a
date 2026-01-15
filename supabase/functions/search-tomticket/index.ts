import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm, maxPages = 50, debug = false } = await req.json();
    
    if (!searchTerm) {
      return new Response(
        JSON.stringify({ error: 'searchTerm é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Buscar tickets com paginação simples
    for (let page = 1; page <= maxPages; page++) {
      console.log(`Buscando página ${page}...`);
      
      const response = await fetch(`https://api.tomticket.com/v2.0/ticket/list?page=${page}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro API:', response.status, errorText);
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
      protocols: matchingTickets.map(t => t.protocol)
    };

    if (debug && sampleTicket) {
      result.debug = {
        sampleSubject: sampleTicket.subject,
        sampleCustomer: sampleTicket.customer?.name,
        sampleMessage: sampleTicket.message?.substring(0, 200)
      };
    }

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
