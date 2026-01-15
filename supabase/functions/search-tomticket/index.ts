import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm } = await req.json();
    
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

    console.log(`Buscando placa "${searchTerm}" no TomTicket...`);

    // Buscar tickets recentes da API do TomTicket
    const response = await fetch('https://api.tomticket.com/v2.0/ticket/list', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na API TomTicket:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao consultar TomTicket', 
          status: response.status,
          details: errorText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Recebidos ${data.data?.length || 0} tickets do TomTicket`);

    // Buscar o termo nos tickets (subject, message, ou campos personalizados)
    const searchTermUpper = searchTerm.toUpperCase();
    const matchingTickets = [];

    if (data.data && Array.isArray(data.data)) {
      for (const ticket of data.data) {
        const subject = (ticket.subject || '').toUpperCase();
        const message = (ticket.message || '').toUpperCase();
        const customFields = JSON.stringify(ticket.custom_fields || {}).toUpperCase();

        if (subject.includes(searchTermUpper) || 
            message.includes(searchTermUpper) || 
            customFields.includes(searchTermUpper)) {
          matchingTickets.push({
            protocol: ticket.protocol,
            id: ticket.id,
            subject: ticket.subject,
            status: ticket.status,
            created_at: ticket.created_at,
            customer_name: ticket.customer?.name || 'N/A'
          });
        }
      }
    }

    console.log(`Encontrados ${matchingTickets.length} tickets com "${searchTerm}"`);

    return new Response(
      JSON.stringify({
        success: true,
        searchTerm,
        totalTicketsSearched: data.data?.length || 0,
        matchingTickets,
        found: matchingTickets.length > 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na edge function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
