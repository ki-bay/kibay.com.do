import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { m } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, ArrowRight, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useToast } from '@/components/ui/use-toast';

const VerifyOtpPage = () => {
  const { t } = useTranslation('verifyOtp');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0); // 60s cooldown for resend
  
  const { verifyOtp, user, sendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const emailFromState = location.state?.email;
  const [email, setEmail] = useState(emailFromState || '');

  // Handle successful authentication
  useEffect(() => {
    if (user) {
      toast({
        title: t('toast.authenticatedTitle'),
        description: t('toast.authenticatedDescription'),
      });
      navigate('/account'); 
    }
  }, [user, navigate, toast]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Handle Manual Code Verification
  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email) {
      setErrorMsg(t('errors.emailMissing'));
      return;
    }

    if (!token || token.length < 6) {
      setErrorMsg(t('errors.fullCode'));
      return;
    }
    
    setIsLoading(true);

    const { error } = await verifyOtp({ 
      email, 
      token, 
      type: 'email' // Specifically verifying numeric OTP
    });
    
    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message || t('errors.invalidCode'));
      // We also show a toast for visibility
      toast({
        variant: "destructive",
        title: t('toast.failedTitle'),
        description: error.message,
      });
    } else {
      setSuccessMsg(t('success.verified'));
    }
  };

  const handleResend = async () => {
    if (!email) {
      setErrorMsg(t('errors.emailForResend'));
      return;
    }
    
    if (cooldown > 0) return;

    setIsLoading(true);
    const { error } = await sendOtp(email);
    setIsLoading(false);
    
    if (!error) {
      toast({
        title: t('toast.codeSentTitle'),
        description: t('toast.codeSentDescription'),
      });
      setErrorMsg('');
      setSuccessMsg(t('success.newCodeSent'));
      setCooldown(60); // Reset cooldown
    } else {
      setErrorMsg(error.message);
    }
  };

  return (
    <>
      <Helmet>
        <title>{t('seo.title')}</title>
      </Helmet>
      <Navigation />
      <main id="main" role="main" className="min-h-screen flex items-center justify-center bg-background pt-20 px-4">
        <m.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card p-8 rounded-2xl border border-foreground/10 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('header.h1')}</h1>
            {isLoading ? (
              <p className="text-foreground/60">{t('header.verifying')}</p>
            ) : (
              <div className="text-foreground/60">
                {email ? (
                  <>
                    <p>{t('header.codeSentTo')}</p>
                    <p className="text-mango-400 font-medium mt-1">{email}</p>
                  </>
                ) : (
                  t('header.fallback')
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          {successMsg && !errorMsg && (
             <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
             <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
             <p className="text-sm text-green-300">{successMsg}</p>
           </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {!emailFromState && (
               <div className="space-y-2">
               <label className="text-sm font-medium text-foreground/80">{t('form.emailLabel')}</label>
               <input
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 placeholder={t('form.emailPlaceholder')}
                 className="w-full bg-background/50 border border-foreground/10 rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-mango-500"
                 disabled={isLoading}
               />
             </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">{t('form.codeLabel')}</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-foreground/40" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    // Only allow numbers and limit to 6 chars
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setToken(val);
                  }}
                  placeholder={t('form.codePlaceholder')}
                  className="w-full bg-background/50 border border-foreground/10 rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 transition-colors tracking-[0.5em] text-lg font-mono text-center"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-mango-500 hover:bg-mango-600 text-foreground py-6 text-lg"
              disabled={isLoading || token.length < 6}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {t('form.submit')} <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={handleResend}
              className={`text-sm transition-colors flex items-center justify-center w-full gap-2 ${
                cooldown > 0 ? 'text-foreground/30 cursor-not-allowed' : 'text-foreground/50 hover:text-foreground'
              }`}
              disabled={isLoading || cooldown > 0}
            >
              {cooldown > 0 ? (
                <>
                   <Clock className="w-4 h-4" /> {t('resend.cooldown', { seconds: cooldown })}
                </>
              ) : (
                t('resend.prompt')
              )}
            </button>
          </div>
        </m.div>
      </main>
      <Footer />
    </>
  );
};

export default VerifyOtpPage;