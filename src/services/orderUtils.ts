
import { supabase } from '@/integrations/supabase/client'

export const generateOrderNumber = async (): Promise<string> => {
  console.log('Generating new order number...')
  
  try {
    // Get the count of existing orders (excluding automatic ones)
    const { data: orders, error } = await supabase
      .from('pedidos')
      .select('numero_pedido')
      .not('numero_pedido', 'like', 'AUTO-%')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error fetching orders for number generation:', error)
      return 'ORD-001'
    }

    if (!orders || orders.length === 0) {
      return 'ORD-001'
    }

    // Extract the number from the last order
    const lastOrder = orders[0].numero_pedido
    const match = lastOrder.match(/ORD-(\d+)/) || lastOrder.match(/(\d+)/)
    
    if (match) {
      const nextNumber = parseInt(match[1]) + 1
      return `ORD-${nextNumber.toString().padStart(3, '0')}`
    }

    return 'ORD-001'
  } catch (error) {
    console.error('Error generating order number:', error)
    return `ORD-${Date.now().toString().slice(-3)}`
  }
}

export const updateOrderStatus = async (orderId: string, status: string) => {
  console.log('Updating order status:', orderId, status)
  
  // Helper to normalize to E.164 where possible (basic heuristics)
  const normalizeToE164 = (phone?: string | null): string | null => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    // If already starts with country code (e.g., 55 for BR) and length is plausible
    if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
      return `+${digits}`;
    }
    // If user included leading +
    if (phone.trim().startsWith('+')) {
      const cleaned = `+${digits}`;
      return /^\+[1-9]\d{7,14}$/.test(cleaned) ? cleaned : null;
    }
    // Heuristic: assume Brazil if 10-11 local digits
    if (digits.length === 10 || digits.length === 11) {
      const br = `+55${digits}`;
      return /^\+[1-9]\d{7,14}$/.test(br) ? br : null;
    }
    // Fallback: try prefixing +
    const generic = `+${digits}`;
    return /^\+[1-9]\d{7,14}$/.test(generic) ? generic : null;
  };
  
  // Get order details for WhatsApp notification
  let orderData = null;
  if (status === 'enviado') {
    const { data } = await supabase
      .from('pedidos')
      .select(`
        *,
        shipment_recipients:shipment_recipient_id (
          name,
          phone
        )
      `)
      .eq('id', orderId)
      .single();
    
    orderData = data;
  }
  
  const { error } = await supabase
    .from('pedidos')
    .update({ status: status as any })
    .eq('id', orderId)

  if (error) {
    console.error('Error updating order status:', error)
    throw error
  }

  // Send WhatsApp notification when order is moved to "enviado"
  if (status === 'enviado' && orderData?.shipment_recipients) {
    try {
      const normalizedPhone = normalizeToE164(orderData.shipment_recipients.phone);
      if (!normalizedPhone) {
        console.warn('Skipping WhatsApp notification: invalid or missing phone number');
        return;
      }
      if (!orderData.correios_tracking_code) {
        console.warn('Skipping WhatsApp notification: missing Correios tracking code');
        return;
      }

      console.log('Sending WhatsApp notification for order:', orderData.numero_pedido);
      
      await supabase.functions.invoke('send-whatsapp', {
        body: {
          orderId: orderId,
          orderNumber: orderData.numero_pedido,
          trackingCode: orderData.correios_tracking_code,
          recipientPhone: normalizedPhone,
          recipientName: orderData.shipment_recipients.name,
          companyName: orderData.company_name
        }
      });
      
      console.log('WhatsApp notification sent request submitted');
    } catch (whatsappError) {
      console.error('Failed to send WhatsApp notification:', whatsappError);
      // Don't throw error here, as the status update was successful
    }
  }
}

export const deleteOrder = async (orderId: string) => {
  console.log('Deleting order:', orderId)
  
  const { error } = await supabase
    .from('pedidos')
    .delete()
    .eq('id', orderId)

  if (error) {
    console.error('Error deleting order:', error)
    throw error
  }
}
