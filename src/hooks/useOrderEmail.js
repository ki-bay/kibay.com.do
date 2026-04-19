import { useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { renderEmailHtml } from '@/utils/emailRenderer';
import { useToast } from '@/components/ui/use-toast';

export const useOrderEmail = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const sendEmail = async (emailType, to, subject, data) => {
    setLoading(true);
    setError(null);

    try {
      // 1. Render HTML on Client
      const html = renderEmailHtml(emailType, data);

      // 2. Call Edge Function with HTML payload
      // We pass the raw data too, just in case the backend wants to log it or use it for other logic
      const { data: responseData, error: responseError } = await supabase.functions.invoke('send-order-email', {
        body: {
          emailType,
          to,
          subject,
          html, // Pre-rendered HTML
          orderData: data.orderData, // Raw data for logging/metadata
          customerName: data.customerName
        }
      });

      if (responseError) throw responseError;

      // Optional: Log success or show dev toast
      console.log(`Email (${emailType}) sent successfully to ${to}`);
      
      return { success: true, data: responseData };

    } catch (err) {
      console.error('Failed to send email:', err);
      setError(err);
      
      // In production, you might not want to show email errors to users, 
      // but for dev/admin it's useful.
      // toast({
      //   variant: "destructive",
      //   title: "Email Delivery Failed",
      //   description: "Could not send confirmation email.",
      // });

      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  };

  const sendOrderConfirmation = async (to, orderData, customerName) => {
    return sendEmail(
      'order_confirmation',
      to,
      `Order Confirmation #${orderData.id} - Kibay`,
      { orderData, customerName }
    );
  };

  const sendPaymentConfirmation = async (to, orderData, paymentData, customerName) => {
    return sendEmail(
      'payment_confirmation',
      to,
      `Payment Receipt for Order #${orderData.id} - Kibay`,
      { orderData, paymentData, customerName }
    );
  };

  const sendShippingNotification = async (to, orderData, shippingData, customerName) => {
    return sendEmail(
      'shipping_notification',
      to,
      `Order #${orderData.id} Has Shipped! - Kibay`,
      { orderData, shippingData, customerName }
    );
  };

  const sendOrderCancellation = async (to, orderData, cancellationData, customerName) => {
    return sendEmail(
      'order_cancellation',
      to,
      `Order #${orderData.id} Cancelled - Kibay`,
      { orderData, cancellationData, customerName }
    );
  };

  return {
    loading,
    error,
    sendOrderConfirmation,
    sendPaymentConfirmation,
    sendShippingNotification,
    sendOrderCancellation
  };
};