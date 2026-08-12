import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

// Landing page after CARDNET's hosted payment page (with 3DS challenge, if
// the card supports it) redirects back here. We call cardnet-verify-session
// to ask CARDNET for the final result and flip the order to paid/failed —
// this is the only place that actually confirms a CARDNET payment; without
// it, orders stay stuck in `awaiting_payment` even after a real approval.

const CheckoutCardnetReturn = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation('checkout');
  const orderId = params.get('order_id');
  const guestToken = params.get('token');

  const [status, setStatus] = useState('verifying'); // verifying | paid | failed | error
  const [failureMessage, setFailureMessage] = useState('');

  useEffect(() => {
    if (!orderId) {
      setStatus('error');
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cardnet-verify-session', {
          body: { order_id: orderId, token: guestToken || undefined },
        });
        if (cancelled) return;
        if (error) throw error;
        if (data?.status === 'paid') {
          const tokenParam = guestToken ? `&token=${encodeURIComponent(guestToken)}` : '';
          navigate(`/checkout-success?order_id=${orderId}${tokenParam}`, { replace: true });
          return;
        }
        setFailureMessage(data?.message || '');
        setStatus('failed');
      } catch (err) {
        if (cancelled) return;
        console.error('cardnet-verify-session failed:', err);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orderId, guestToken, navigate]);

  return (
    <>
      <Navigation />
      <main className="min-h-[70vh] flex items-center justify-center px-4 pt-32 pb-16">
        <div className="max-w-md w-full text-center bg-card border border-foreground/10 rounded-2xl p-8">
          {status === 'verifying' && (
            <>
              <Loader2 className="w-12 h-12 text-[#D4A574] mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-light text-foreground mb-2">
                {t('cardnet.verifying', 'Confirmando tu pago…')}
              </h1>
              <p className="text-foreground/70 font-light text-sm">
                {t('cardnet.verifyingBody', 'Estamos confirmando el resultado con CARDNET. No cierres esta ventana.')}
              </p>
            </>
          )}

          {status === 'failed' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-light text-foreground mb-2">
                {t('cardnet.failedTitle', 'El pago no se completó')}
              </h1>
              <p className="text-foreground/70 font-light text-sm mb-6">
                {failureMessage || t('cardnet.failedBody', 'Tu banco o CARDNET rechazó la transacción. Tu carrito sigue intacto — puedes intentarlo de nuevo.')}
              </p>
              <Link
                to="/checkout"
                className="inline-block px-6 py-3 rounded-full bg-[#D4A574] text-stone-950 font-medium hover:bg-[#c29462] transition-colors"
              >
                {t('cardnet.backToCheckout', 'Volver al checkout')}
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-light text-foreground mb-2">
                {t('cardnet.returnNoOrderTitle', 'No pudimos confirmar tu pago')}
              </h1>
              <p className="text-foreground/70 font-light text-sm mb-6">
                {t(
                  'cardnet.returnErrorBody',
                  'Si tu banco confirmó el cargo, contáctanos con el número de tu pedido y lo verificamos manualmente.',
                )}
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => window.location.reload()}
                  className="bg-[#D4A574] hover:bg-[#c29462] text-white rounded-full"
                >
                  {t('cardnet.retryVerify', 'Reintentar confirmación')}
                </Button>
                <Link to="/contact" className="text-sm text-foreground/60 hover:text-[#D4A574] underline">
                  {t('cardnet.contactUs', 'Contactar a Kibay')}
                </Link>
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
