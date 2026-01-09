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
  templateType?: 'order_shipped' | 'technician_schedule' | 'technician_next_day_agenda' | 'technician_schedule_notification' | 'daily_agenda';
  templateVariables?: {
    technicianName?: string;
    scheduledDate?: string;
    scheduledTime?: string;
    serviceType?: string;
    customerName?: string;
    customerPhone?: string;
    address?: string;
    referencePoint?: string;
    localContact?: string;
    contactPhone?: string;
    scheduleList?: string;
    totalCount?: string;
  };
}

function normalizeToE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
    return `+${digits}`;
  }
  if (phone.trim().startsWith('+')) {
    const cleaned = `+${digits}`;
    return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
  }
  if (digits.length === 10 || digits.length === 11) {
    const br = `+55${digits}`;
    return /^\+[1-9]\d{7,14}$/.test(br) ? br : null;
  }
  const generic = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(generic) ? generic : null;
}

// Helper to send message with specific ContentVariables format
async function sendWithVariables(
  twilioUrl: string,
  authHeader: string,
  fromNumber: string,
  toPhone: string,
  contentSid: string,
  variables: Record<string, string>,
  attemptLabel: string
): Promise<{ ok: boolean; status: number; body: string }> {
  console.log(`Attempt [${attemptLabel}] with variables:`, JSON.stringify(variables));
  
  const formData = new URLSearchParams();
  formData.append('From', `whatsapp:${fromNumber}`);
  formData.append('To', `whatsapp:${toPhone}`);
  formData.append('ContentSid', contentSid);
  formData.append('ContentVariables', JSON.stringify(variables));

  const response = await fetch(twilioUrl, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData,
  });

  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

// Sanitize string for WhatsApp template variables
// Twilio Content API may reject newlines or special characters in variables
function sanitizeTemplateVar(value: string | undefined | null, maxLength: number = 1000): string {
  if (!value) return '-';
  
  let sanitized = String(value)
    // Replace newlines with bullet separator for readability
    .replace(/\r\n/g, ' • ')
    .replace(/\n/g, ' • ')
    .replace(/\r/g, ' • ')
    // Remove any control characters except space
    .replace(/[\x00-\x1F\x7F]/g, '')
    // Normalize multiple spaces
    .replace(/\s+/g, ' ')
    .trim();
  
  // Truncate if too long (Twilio has variable length limits)
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...';
  }
  
  return sanitized || '-';
}

// Twilio error code to user-friendly message mapping
const twilioErrorMessages: Record<number, string> = {
  63013: 'Template não aprovado ou SID incorreto - verifique no Twilio Console',
  63049: 'Técnico precisa enviar mensagem primeiro para receber notificações (opt-in)',
  63016: 'Template não aprovado pelo WhatsApp',
  63007: 'Número não está registrado no WhatsApp',
  63003: 'Conta WhatsApp Business não configurada corretamente',
  21211: 'Número de telefone inválido',
  21408: 'Permissão negada para enviar para este número',
  21610: 'Número bloqueou mensagens',
  21614: 'Número não é um celular válido',
  21656: 'Variáveis do template inválidas - verifique formato e caracteres especiais',
  30003: 'Número não alcançável',
  30005: 'Número desconhecido',
  30006: 'Número bloqueou o remetente',
};

function getErrorMessage(errorCode: number | undefined): string | undefined {
  if (!errorCode) return undefined;
  return twilioErrorMessages[errorCode] || `Erro Twilio ${errorCode}`;
}

// Check message status after sending
async function checkMessageStatus(
  twilioAccountSid: string,
  authHeader: string,
  messageSid: string
): Promise<{ status: string; errorCode?: number; errorMessage?: string; friendlyMessage?: string }> {
  try {
    // Wait a moment for status to update
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const statusUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages/${messageSid}.json`;
    const response = await fetch(statusUrl, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });
    
    if (response.ok) {
      const data = await response.json();
      const errorCode = data.error_code || undefined;
      return {
        status: data.status || 'unknown',
        errorCode,
        errorMessage: data.error_message || undefined,
        friendlyMessage: getErrorMessage(errorCode),
      };
    }
  } catch (e) {
    console.error('Error checking message status:', e);
  }
  return { status: 'unknown' };
}

Deno.serve(async (req) => {
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
    const dailyAgendaContentSid = Deno.env.get('DAILY_AGENDA_CONTENT_SID') || '';

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
    const authHeader = `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`;
    
    let twilioResult: any = null;
    let usedContentSid = '';
    let usedVariablesFormat = '';

    // daily_agenda template: {{1}} Name, {{2}} Date, {{3}} Schedule List (with newlines), {{4}} Total count
    if (templateType === 'daily_agenda') {
      if (!dailyAgendaContentSid) {
        console.error('DAILY_AGENDA_CONTENT_SID not configured');
        return new Response(
          JSON.stringify({
            error: 'Template daily_agenda não configurado',
            templateType,
            hint: 'Adicione o secret DAILY_AGENDA_CONTENT_SID no Supabase com o Content SID do template do Twilio.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      usedContentSid = dailyAgendaContentSid;
      usedVariablesFormat = 'numeric';
      
      // Twilio Content API variables do NOT accept newlines - must sanitize
      const scheduleListSanitized = (templateVariables?.scheduleList || '-')
        .replace(/\n\n/g, ' | ')  // Double newlines become separator
        .replace(/\n/g, ' • ')    // Single newlines become bullet
        .replace(/[\x00-\x1F\x7F]/g, '') // Remove control chars
        .substring(0, 1500);
      
      const numericVars: Record<string, string> = {
        '1': sanitizeTemplateVar(templateVariables?.technicianName || recipientName, 100),
        '2': sanitizeTemplateVar(templateVariables?.scheduledDate, 50),
        '3': scheduleListSanitized,
        '4': sanitizeTemplateVar(templateVariables?.totalCount || '0', 20),
      };
      
      console.log('Sending daily_agenda with numeric variables:', JSON.stringify(numericVars));
      
      const result = await sendWithVariables(
        twilioUrl, authHeader, twilioWhatsAppNumber, toPhone,
        dailyAgendaContentSid, numericVars, 'numeric'
      );

      if (!result.ok) {
        console.error('Failed to send WhatsApp message:', result.body);
        return new Response(
          JSON.stringify({
            error: 'Failed to send WhatsApp message',
            contentSid: usedContentSid,
            templateType,
            variablesFormat: usedVariablesFormat,
            receivedTemplateVariables: templateVariables || null,
            attemptedVariables: numericVars,
            details: result.body,
            hint: 'O template daily_agenda espera 4 variáveis numéricas (1-4).',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try { twilioResult = JSON.parse(result.body); } catch (_) { twilioResult = { sid: 'unknown' }; }

    } else if (templateType === 'technician_next_day_agenda') {
      if (!nextDayAgendaContentSid) {
        console.error('TECHNICIAN_NEXT_DAY_AGENDA_CONTENT_SID not configured');
        return new Response(
          JSON.stringify({
            error: 'Template technician_next_day_agenda não configurado',
            templateType,
            hint: 'Adicione o secret TECHNICIAN_NEXT_DAY_AGENDA_CONTENT_SID no Supabase.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Fallback to old template if daily_agenda not configured
      usedContentSid = nextDayAgendaContentSid;
      usedVariablesFormat = 'numeric';
      
      const numericVars: Record<string, string> = {
        '1': sanitizeTemplateVar(templateVariables?.technicianName || recipientName, 100),
        '2': sanitizeTemplateVar(templateVariables?.scheduledDate, 50),
        '3': sanitizeTemplateVar(templateVariables?.totalServices || 'Ver agenda', 50),
        '4': sanitizeTemplateVar(templateVariables?.periodSummary || 'Agenda do dia', 80),
        '5': sanitizeTemplateVar(templateVariables?.scheduleList, 900),
        '6': sanitizeTemplateVar(templateVariables?.firstTime || '-', 50),
      };
      
      console.log('Sending technician_next_day_agenda with numeric variables:', JSON.stringify(numericVars));
      
      const result = await sendWithVariables(
        twilioUrl, authHeader, twilioWhatsAppNumber, toPhone,
        nextDayAgendaContentSid, numericVars, 'numeric'
      );

      if (!result.ok) {
        console.error('Failed to send WhatsApp message:', result.body);
        return new Response(
          JSON.stringify({
            error: 'Failed to send WhatsApp message',
            contentSid: usedContentSid,
            templateType,
            variablesFormat: usedVariablesFormat,
            receivedTemplateVariables: templateVariables || null,
            attemptedVariables: numericVars,
            details: result.body,
            hint: 'O template espera variáveis numéricas (1-6). Caracteres especiais foram sanitizados.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try { twilioResult = JSON.parse(result.body); } catch (_) { twilioResult = { sid: 'unknown' }; }

    } else if (templateType === 'technician_schedule' || templateType === 'technician_schedule_notification') {
      if (!technicianScheduleContentSid) {
        console.error('TECHNICIAN_SCHEDULE_CONTENT_SID not configured');
        return new Response(
          JSON.stringify({
            error: 'Template technician_schedule não configurado',
            templateType,
            hint: 'Adicione o secret TECHNICIAN_SCHEDULE_CONTENT_SID no Supabase.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      usedContentSid = technicianScheduleContentSid;
      usedVariablesFormat = 'numeric';
      
      const numericVars: Record<string, string> = {
        '1': sanitizeTemplateVar(templateVariables?.technicianName || recipientName, 100),
        '2': sanitizeTemplateVar(templateVariables?.scheduledDate, 50),
        '3': sanitizeTemplateVar(templateVariables?.scheduledTime, 50),
        '4': sanitizeTemplateVar(templateVariables?.customerName, 100),
        '5': sanitizeTemplateVar(templateVariables?.address, 300),
        '6': sanitizeTemplateVar(templateVariables?.contactPhone || templateVariables?.customerPhone || templateVariables?.localContact, 50),
      };
      
      console.log('technician_schedule received templateVariables:', JSON.stringify(templateVariables));
      console.log('Sending technician_schedule with numeric variables:', JSON.stringify(numericVars));
      
      const result = await sendWithVariables(
        twilioUrl, authHeader, twilioWhatsAppNumber, toPhone,
        technicianScheduleContentSid, numericVars, 'numeric'
      );

      if (!result.ok) {
        console.error('Failed to send WhatsApp message:', result.body);
        return new Response(
          JSON.stringify({
            error: 'Failed to send WhatsApp message',
            contentSid: usedContentSid,
            templateType,
            variablesFormat: usedVariablesFormat,
            receivedTemplateVariables: templateVariables || null,
            attemptedVariables: numericVars,
            details: result.body,
            hint: 'O template espera variáveis numéricas (1-6). Caracteres especiais foram sanitizados.',
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try { twilioResult = JSON.parse(result.body); } catch (_) { twilioResult = { sid: 'unknown' }; }

    } else {
      // Handle other templates and custom messages with original logic
      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${twilioWhatsAppNumber}`);
      formData.append('To', `whatsapp:${toPhone}`);

      if (templateType === 'order_shipped' && orderShippedContentSid) {
        usedContentSid = orderShippedContentSid;
        usedVariablesFormat = 'mixed';
        formData.append('ContentSid', orderShippedContentSid);
        const variables = {
          '1': orderNumber,
          '2': recipientName,
          '3': companyName || '',
          order_number: orderNumber,
          orderNumber: trackingCode || orderNumber,
          recipient_name: recipientName,
          company_name: companyName || '',
        };
        formData.append('ContentVariables', JSON.stringify(variables));
      } else if (customMessage) {
        usedVariablesFormat = 'custom_body';
        formData.append('Body', customMessage);
      } else if (orderShippedContentSid) {
        usedContentSid = orderShippedContentSid;
        usedVariablesFormat = 'fallback';
        formData.append('ContentSid', orderShippedContentSid);
        const variables = {
          '1': orderNumber,
          '2': recipientName,
          '3': companyName || '',
          order_number: orderNumber,
          orderNumber: trackingCode || orderNumber,
          recipient_name: recipientName,
          company_name: companyName || '',
        };
        formData.append('ContentVariables', JSON.stringify(variables));
      } else {
        usedVariablesFormat = 'fallback_body';
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
          'Authorization': authHeader,
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

      try { twilioResult = JSON.parse(resultText); } catch (_) { twilioResult = { sid: 'unknown' }; }
    }

    const messageSid = twilioResult?.sid || 'unknown';
    const initialStatus = twilioResult?.status || 'unknown';
    
    console.log('WhatsApp message sent successfully:', messageSid, 'initial status:', initialStatus);

    // Check message status after a brief delay
    const statusCheck = await checkMessageStatus(twilioAccountSid, authHeader, messageSid);
    console.log('Post-send status check:', statusCheck);

    // Determine if it was truly successful
    const isDeliveryError = statusCheck.errorCode || ['failed', 'undelivered'].includes(statusCheck.status);
    
    return new Response(
      JSON.stringify({ 
        success: !isDeliveryError, 
        messageSid,
        to: toPhone,
        templateType: templateType || 'none',
        contentSid: usedContentSid || 'none',
        variablesFormat: usedVariablesFormat,
        initialStatus,
        finalStatus: statusCheck.status,
        errorCode: statusCheck.errorCode,
        errorMessage: statusCheck.errorMessage,
        friendlyMessage: statusCheck.friendlyMessage,
        message: isDeliveryError 
          ? statusCheck.friendlyMessage || statusCheck.errorMessage || `Erro ${statusCheck.errorCode}`
          : 'WhatsApp message sent successfully'
      }),
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
