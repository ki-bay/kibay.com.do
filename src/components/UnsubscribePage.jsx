import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const UnsubscribePage = () => {
  const { t } = useTranslation('unsubscribe');
  const { email } = useParams();
  const [status, setStatus] = useState('confirming'); // confirming, processing, success, error
  const [loading, setLoading] = useState(false);

  const decodedEmail = decodeURIComponent(email || '');

  const handleUnsubscribe = async () => {
    setLoading(true);
    setStatus('processing');

    try {
      const { error } = await supabase
        .from('blog_subscribers')
        .update({ subscribed: false })
        .eq('email', decodedEmail);

      if (error) throw error;
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />

      <main id="main" role="main" className="flex-grow flex items-center justify-center p-4 pt-24">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border border-foreground/10 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          {status === 'confirming' && (
            <>
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t('confirm.title')}</h1>
              <p className="text-foreground/60 mb-8">
                <Trans
                  i18nKey="confirm.question"
                  t={t}
                  values={{ email: decodedEmail }}
                  components={[<span className="text-foreground font-medium" />]}
                />
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleUnsubscribe}
                  className="w-full bg-red-500 hover:bg-red-600 text-foreground py-6"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      {t('confirm.processing')}
                    </>
                  ) : (
                    t('confirm.confirmBtn')
                  )}
                </Button>
                <Link to="/">
                  <Button variant="ghost" className="w-full text-foreground/60 hover:text-foreground">
                    {t('confirm.cancel')}
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === 'processing' && (
            <div className="py-12">
               <Loader2 className="w-12 h-12 text-mango-500 animate-spin mx-auto mb-4" />
               <p className="text-foreground/60">{t('processing')}</p>
            </div>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t('success.title')}</h1>
              <p className="text-foreground/60 mb-8">
                {t('success.description')}
              </p>
              <Link to="/">
                <Button className="w-full bg-slate-700 hover:bg-slate-600 text-foreground py-6">
                  {t('success.returnHome')}
                </Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t('error.title')}</h1>
              <p className="text-foreground/60 mb-8">
                {t('error.description')}
              </p>
              <Button
                onClick={() => setStatus('confirming')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-foreground py-6"
              >
                {t('error.retry')}
              </Button>
            </>
          )}
        </m.div>
      </main>

      <Footer />
    </div>
  );
};

export default UnsubscribePage;