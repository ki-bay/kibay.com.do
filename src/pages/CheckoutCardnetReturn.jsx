import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useCart } from '@/hooks/useCart';

// Landing page after CARDNET redirects the customer back from its hosted
// payment form. We call cardnet-verify on the Edge Function side — it queries
// CARDNET server-side, validates the amount, and flips the order to 'paid'.
// On success we clear the cart and redirect to /order-confirmation/:orderId.
const CheckoutCardnetReturn = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const { t } = useTranslation('checkout');
  const [state, setState] = useState({ status: 'verifying', message: '' });

  const orderId = params.get('order_id');

  useEffect(() => {
    if (!orderId) {
      setState({ status: 'failed', message: 'Missing order_id in return URL.' });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        const { data, error } = await supabase.functions.invoke('cardnet-verify', {
          body: { order_id: orderId },
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
        if (cancelled) return;
        if (error) {
          setState({ status: 'failed', message: error.message || 'Verification failed' });
          return;
        }
        if (data?.status === 'paid') {
          clearCart();
          setTimeout(() => navigate(`/order-confirmation/${orderId}`, { replace: true }), 1000);
          setState({ status: 'paid', message: '' });
        } else {
          setState({
            status: 'failed',
            message: data?.message || `Payment declined (code ${data?.code || '—'})`,
          });
        }
      } catch (e) {
        if (cancelled) return;
        setState({ status: 'failed', message: e.message || 'Unexpected error during verification' });
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, navigate, clearCart]);

  return (
    <>
      <Navigation />
      <main className="min-h-[70vh] flex items-center justify-center px-4 pt-32 pb-16">
        <div className="max-w-md w-full text-center bg-card border border-foreground/10 rounded-2xl p-8">
          {state.status === 'verifying' && (
            <>
              <Loader2 className="w-10 h-10 animate-spin text-[#D4A574] mx-auto mb-4" />
              <h1 className="text-2xl font-light text-foreground mb-2">{t('cardnet.verifyingTitle', 'Confirmando pago')}</h1>
              <p className="text-foreground/60 font-light text-sm">{t('cardnet.verifyingBody', 'Estamos verificando tu pago con CARDNET. No cierres esta ventana.')}</p>
            </>
          )}
          {state.status === 'paid' && (
            <>
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-2xl font-light text-foreground mb-2">{t('cardnet.paidTitle', 'Pago confirmado')}</h1>
              <p className="text-foreground/70 font-light text-sm">{t('cardnet.paidBody', 'Redirigiendo a tu confirmación…')}</p>
            </>
          )}
          {state.status === 'failed' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-light text-foreground mb-2">{t('cardnet.failedTitle', 'No pudimos confirmar tu pago')}</h1>
              <p className="text-foreground/70 font-light text-sm mb-6">{state.message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/checkout" className="px-6 py-3 rounded-full bg-[#D4A574] text-stone-950 font-medium hover:bg-[#c29462] transition-colors">{t('cardnet.tryAgain', 'Intentar de nuevo')}</Link>
                <Link to="/cart" className="px-6 py-3 rounded-full border border-foreground/20 text-foreground hover:bg-foreground/5">{t('cardnet.backToCart', 'Volver al carrito')}</Link>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CheckoutCardnetReturn;
