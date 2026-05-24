import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

// Landing page after the CARDNET 3DS challenge completes.
//
// In the normal flow this page is loaded inside a hidden iframe that
// CheckoutPage opened to host the bank's 3DS challenge. CARDNET redirects
// back to /checkout/cardnet/return after the user finishes the challenge.
// Our only job here is to postMessage the parent window so it can move on
// to cardnet-finalize-sale (which actually charges the card, using the
// PAN/CVV still held in the parent's React state).
//
// If the page is NOT inside an iframe (e.g. the user opened the link
// directly, or their browser blocked iframes), we still show a friendly
// fallback UI pointing them back to /checkout.

const CheckoutCardnetReturn = () => {
  const [params] = useSearchParams();
  const { t } = useTranslation('checkout');
  const orderId = params.get('order_id');
  const guestToken = params.get('token');
  const integratorTxId = params.get('tx');
  const [posted, setPosted] = useState(false);
  const isInIframe = typeof window !== 'undefined' && window.parent !== window;

  useEffect(() => {
    if (!isInIframe) return;
    try {
      window.parent.postMessage(
        {
          type: 'cardnet-3ds-return',
          order_id: orderId,
          token: guestToken,
          tx: integratorTxId,
        },
        window.location.origin,
      );
      setPosted(true);
    } catch {
      // ignore — fallback UI below
    }
  }, [orderId, guestToken, integratorTxId, isInIframe]);

  if (isInIframe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-4 text-center">
        <div>
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A574] mx-auto mb-3" />
          <p className="text-sm font-light text-foreground/70">
            {posted
              ? t('cardnet.returnPosted', 'Volviendo a la confirmación…')
              : t('cardnet.returnPosting', 'Conectando con la pasarela…')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Navigation />
      <main className="min-h-[70vh] flex items-center justify-center px-4 pt-32 pb-16">
        <div className="max-w-md w-full text-center bg-card border border-foreground/10 rounded-2xl p-8">
          {orderId ? (
            <>
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-2xl font-light text-foreground mb-2">
                {t('cardnet.returnDirectTitle', 'Regreso de CARDNET')}
              </h1>
              <p className="text-foreground/70 font-light text-sm mb-6">
                {t(
                  'cardnet.returnDirectBody',
                  'Si llegaste aquí desde la ventana de tu banco, vuelve a la ventana de Kibay para completar tu pedido.',
                )}
              </p>
              <Link
                to="/checkout"
                className="inline-block px-6 py-3 rounded-full bg-[#D4A574] text-stone-950 font-medium hover:bg-[#c29462] transition-colors"
              >
                {t('cardnet.backToCheckout', 'Volver al checkout')}
              </Link>
            </>
          ) : (
            <>
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-2xl font-light text-foreground mb-2">
                {t('cardnet.returnNoOrderTitle', 'Sin información de pedido')}
              </h1>
              <p className="text-foreground/70 font-light text-sm mb-6">
                {t(
                  'cardnet.returnNoOrderBody',
                  'No pudimos identificar el pedido. Si tu pago fue exitoso lo verás en tu historial de pedidos.',
                )}
              </p>
              <Link
                to="/cart"
                className="inline-block px-6 py-3 rounded-full border border-foreground/20 text-foreground hover:bg-foreground/5"
              >
                {t('cardnet.backToCart', 'Volver al carrito')}
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CheckoutCardnetReturn;
