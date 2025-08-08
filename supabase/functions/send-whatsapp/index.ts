import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppMessage {
  orderId: string;
  orderNumber: string;
  recipientPhone: string;
  recipientName: string;
  companyName?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const { orderId, orderNumber, recipientPhone, recipientName, companyName }: WhatsAppMessage = await req.json();

    console.log('Sending WhatsApp message for order:', orderNumber);

    // Create the message content
    const message = `🚚 *Pedido Enviado - ${orderNumber}*

Olá ${recipientName}!

Seu pedido foi enviado e está a caminho! 📦

${companyName ? `**Empresa:** ${companyName}` : ''}
**Número do Pedido:** ${orderNumber}

Em breve você receberá mais informações sobre a entrega.

Obrigado por escolher nossos serviços! 🙏`;

    // Send WhatsApp message via Twilio
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
    formData.append('To', `whatsapp:${recipientPhone}`);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData
    });

    const result = await response.text();
    console.log('Twilio response:', result);

    if (!response.ok) {
      console.error('Failed to send WhatsApp message:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: result }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const twilioResult = JSON.parse(result);
    console.log('WhatsApp message sent successfully:', twilioResult.sid);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageSid: twilioResult.sid,
        message: 'WhatsApp message sent successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});