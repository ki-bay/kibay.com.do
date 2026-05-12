import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const BlogSubscribeForm = () => {
  const { t } = useTranslation('blogSubscribe');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const { toast } = useToast();

  const handleSubscribe = async (e) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      toast({
        variant: "destructive",
        title: t('toast.invalidEmailTitle'),
        description: t('toast.invalidEmailDescription'),
      });
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      const normalized = email.trim().toLowerCase();
      const { error } = await supabase.from('blog_subscribers').upsert(
        { email: normalized, subscribed: true },
        { onConflict: 'email' },
      );

      if (error) throw error;

      setStatus('success');
      toast({
        title: t('toast.successTitle'),
        description: t('toast.successDescription'),
      });
      setEmail('');
    } catch (error) {
      console.error('Subscription error:', error);
      setStatus('error');
      toast({
        variant: "destructive",
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-foreground/10 p-8 md:p-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-mango-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 text-mango-400 font-medium mb-2">
            <Mail className="w-5 h-5" />
            <span>{t('tagline')}</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            {t('title')}
          </h3>
          <p className="text-foreground/60 text-lg">
            {t('description')}
          </p>
        </div>

        <div className="w-full md:w-auto min-w-[300px] flex-shrink-0">
          {status === 'success' ? (
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-400 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-foreground font-bold text-lg">{t('successBoxTitle')}</h4>
              <p className="text-foreground/60 text-sm mt-1">{t('successBoxDescription')}</p>
              <Button
                variant="ghost"
                className="mt-4 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                onClick={() => setStatus('idle')}
              >
                {t('subscribeAnother')}
              </Button>
            </m.div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-foreground/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  required
                  className="w-full bg-background/50 border border-foreground/10 rounded-xl py-3 pl-10 pr-4 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 transition-all shadow-inner"
                  disabled={loading}
                />
              </div>
              <Button
                type="submit"
                className="bg-mango-500 hover:bg-mango-600 text-foreground py-6 text-lg font-medium rounded-xl shadow-lg shadow-mango-500/20 w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {t('submitting')}
                  </>
                ) : (
                  t('submit')
                )}
              </Button>
              <p className="text-xs text-foreground/30 text-center mt-2">
                {t('privacyNote')}
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogSubscribeForm;