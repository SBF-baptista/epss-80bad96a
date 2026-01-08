const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppMessage {
  orderId: string;
  orderNumber: string;
  trackingCode?: string;
  recipientPhone: string;
  recipientName: string;
  companyName?: string;
  customMessage?: string;
  // Template support
  templateType?: 'order_shipped' | 'technician_schedule' | 'technician_next_day_agenda';
  templateVariables?: {
    technicianName?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    customerName?: string;
    address?: string;
    contactPhone?: string;
    referencePoint?: string;
    localContact?: string;
    scheduleList?: string;
  };
}

function normalizeToE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  // If already includes country code BR (55)
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return `+${digits}`;
  }
  // If original had +, keep it
  if (phone.trim().startsWith('+')) {
    const cleaned = `+${digits}`;
    return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
  }
  // Heuristic: assume Brazil if 10-11 local digits
  if (digits.length === 10 || digits.length === 11) {
    const br = `+55${digits}`;
    return /^\+[1-9]\d{7,14}$/.test(br) ? br : null;
  }
  const generic = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(generic) ? generic : null;
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
    const orderShippedContentSid = Deno.env.get('WHATSAPP_ORDER_SHIPPED_CONTENT_SID') || '';
    const technicianScheduleContentSid = Deno.env.get('TECHNICIAN_SCHEDULE_CONTENT_SID') || '';
    const nextDayAgendaContentSid = Deno.env.get('TECHNICIAN_NEXT_DAY_AGENDA_CONTENT_SID') || '';

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsAppNumber) {
      console.error('Missing Twilio credentials');
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      orderId, 
      orderNumber, 
      trackingCode, 
      recipientPhone, 
      recipientName, 
      companyName, 
      customMessage,
      templateType,
      templateVariables 
    }: WhatsAppMessage = await req.json();

    const toPhone = normalizeToE164(recipientPhone);
    if (!toPhone) {
      console.warn('Invalid phone number provided:', recipientPhone);
      return new Response(
        JSON.stringify({ error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending WhatsApp message for:', orderNumber, 'to', toPhone);
    console.log('Template type:', templateType || 'none');
    console.log('Has customMessage:', !!customMessage);

    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
    formData.append('To', `whatsapp:${toPhone}`);

    // Determine which template/message to use
    if (templateType === 'technician_next_day_agenda' && nextDayAgendaContentSid) {
      // Use next day agenda template
      console.log('Using next day agenda template:', nextDayAgendaContentSid);
      formData.append('ContentSid', nextDayAgendaContentSid);

      // Some Twilio Content templates use NAMED variables (not numeric placeholders).
      // To maximize compatibility, we send named variables for this template.
      const variables = {
        technicianName: String(templateVariables?.technicianName || recipientName || ''),
        scheduledDate: String(templateVariables?.scheduledDate || ''),
        scheduleList: String(templateVariables?.scheduleList || ''),
      } as Record<string, string>;

      formData.append('ContentVariables', JSON.stringify(variables));
    } else if (templateType === 'technician_schedule' && technicianScheduleContentSid) {
      // Use technician schedule template
      console.log('Using technician schedule template:', technicianScheduleContentSid);
      formData.append('ContentSid', technicianScheduleContentSid);
      
      // Map variables to template placeholders (1-indexed)
      const variables = {
        '1': templateVariables?.technicianName || recipientName,
        '2': templateVariables?.scheduledDate || '',
        '3': templateVariables?.scheduledTime || 'A definir',
        '4': templateVariables?.customerName || '',
        '5': templateVariables?.address || '',
        '6': templateVariables?.contactPhone || 'Não informado',
      } as Record<string, string>;
      formData.append('ContentVariables', JSON.stringify(variables));
      
    } else if (templateType === 'order_shipped' && orderShippedContentSid) {
      // Use order shipped template
      console.log('Using order shipped template:', orderShippedContentSid);
      formData.append('ContentSid', orderShippedContentSid);
      const variables = {
        '1': orderNumber,
        '2': recipientName,
        '3': companyName || '',
        order_number: orderNumber,
        orderNumber: trackingCode || orderNumber,
        recipient_name: recipientName,
        company_name: companyName || '',
      } as Record<string, string>;
      formData.append('ContentVariables', JSON.stringify(variables));
      
    } else if (customMessage) {
      // Use custom message (only works within 24h window)
      console.log('Using custom message (freeform) - requires 24h window');
      formData.append('Body', customMessage);
      
    } else if (orderShippedContentSid) {
      // Fallback to order shipped template for backward compatibility
      console.log('Fallback to order shipped template');
      formData.append('ContentSid', orderShippedContentSid);
      const variables = {
        '1': orderNumber,
        '2': recipientName,
        '3': companyName || '',
        order_number: orderNumber,
        orderNumber: trackingCode || orderNumber,
        recipient_name: recipientName,
        company_name: companyName || '',
      } as Record<string, string>;
      formData.append('ContentVariables', JSON.stringify(variables));
      
    } else {
      // No template available, use fallback body message (may fail outside 24h window)
      console.warn('No template configured, using fallback body message');
      const message = `🚚 *Pedido Enviado - ${orderNumber}*\n\n` +
        `Olá ${recipientName}!\n\n` +
        `Seu pedido foi enviado e está a caminho! 📦\n\n` +
        `${companyName ? `Empresa: ${companyName}\n` : ''}` +
        `${trackingCode ? `Código de Rastreamento: ${trackingCode}\n` : ''}` +
        `Número do Pedido: ${orderNumber}\n\n` +
        `Em breve você receberá mais informações sobre a entrega.\n\n` +
        `Obrigado por escolher nossos serviços! 🙏`;
      formData.append('Body', message);
    }

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    const resultText = await response.text();
    console.log('Twilio response status:', response.status);
    console.log('Twilio response:', resultText);

    if (!response.ok) {
      console.error('Failed to send WhatsApp message:', resultText);
      return new Response(
        JSON.stringify({ error: 'Failed to send WhatsApp message', details: resultText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let twilioResult: any;
    try { twilioResult = JSON.parse(resultText); } catch (_) { twilioResult = { sid: 'unknown', raw: resultText }; }
    console.log('WhatsApp message sent successfully:', twilioResult.sid);

    return new Response(
      JSON.stringify({ success: true, messageSid: twilioResult.sid, message: 'WhatsApp message sent successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error?.message || String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
