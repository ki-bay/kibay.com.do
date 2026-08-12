import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';

const CheckoutCardnetCancel = () => {
  const { t } = useTranslation('checkout');
  const [params] = useSearchParams();
  const orderId = params.get('order_id');
  const guestToken = params.get('token');

  // CARDNET sends buyers here both for a genuine user-cancel and for other
  // failure modes (e.g. a session timing out mid-3DS) — the UI stays the
  // same friendly "try again" message either way, but we still ask CARDNET
  // what actually happened so it's recorded (cardnet_response_code /
  // cardnet_response_message) instead of the order sitting unexplained in
  // awaiting_payment. Best-effort — never blocks or changes this page.
  useEffect(() => {
    if (!orderId) return;
    supabase.functions
      .invoke('cardnet-verify-session', { body: { order_id: orderId, token: guestToken || undefined } })
      .catch((err) => console.error('cardnet-verify-session (cancel page, best-effort) failed:', err));
  }, [orderId, guestToken]);

  return (
    <>
      <Navigation />
      <main className="min-h-[70vh] flex items-center justify-center px-4 pt-32 pb-16">
        <div className="max-w-md w-full text-center bg-card border border-foreground/10 rounded-2xl p-8">
          <XCircle className="w-12 h-12 text-foreground/40 mx-auto mb-4" />
          <h1 className="text-2xl font-light text-foreground mb-2">{t('cardnet.cancelTitle', 'Pago cancelado')}</h1>
          <p className="text-foreground/70 font-light text-sm mb-6">{t('cardnet.cancelBody', 'Tu carrito sigue intacto. Puedes intentar de nuevo cuando quieras.')}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/checkout" className="px-6 py-3 rounded-full bg-[#D4A574] text-stone-950 font-medium hover:bg-[#c29462] transition-colors">{t('cardnet.tryAgain', 'Intentar de nuevo')}</Link>
            <Link to="/shop" className="px-6 py-3 rounded-full border border-foreground/20 text-foreground hover:bg-foreground/5">{t('cardnet.keepShopping', 'Seguir comprando')}</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CheckoutCardnetCancel;
