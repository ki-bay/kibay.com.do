import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { m } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const BlogLoginPage = () => {
  const { t } = useTranslation('blogLogin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: t('toast.missingTitle'),
        description: t('toast.missingDescription'),
      });
      return;
    }

    setIsLoading(true);
    const { success, error } = await signInWithPassword(email, password);
    setIsLoading(false);

    if (success) {
      // Check if user is the admin
      if (email === 'info@kibay.com.do') {
        navigate('/dashboard/blog');
      } else {
        // Just regular user login via this portal
        navigate('/account');
      }
    }
  };

  const handleForgotPassword = () => {
    toast({
        title: t('toast.forgotTitle'),
        description: t('toast.forgotDescription'),
    })
  }

  return (
    <>
      <Helmet>
        <title>{t('seo.title')}</title>
      </Helmet>
      
      <Navigation />

      <main id="main" role="main" className="min-h-screen bg-background flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <m.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card border border-foreground/10 rounded-2xl p-8 shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mango-500/10 mb-4 border border-mango-500/20">
                <Lock className="w-8 h-8 text-mango-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">{t('header.h1')}</h1>
              <p className="text-foreground/60">{t('header.subtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">{t('form.emailLabel')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <Input
                    type="email"
                    placeholder={t('form.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-foreground/10 text-foreground placeholder:text-foreground/20 focus:border-mango-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <label className="text-sm font-medium text-foreground/80">{t('form.passwordLabel')}</label>
                   <button
                     type="button"
                     onClick={handleForgotPassword}
                     className="text-xs text-mango-500 hover:text-mango-400"
                   >
                     {t('form.forgot')}
                   </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <Input
                    type="password"
                    placeholder={t('form.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-background border-foreground/10 text-foreground placeholder:text-foreground/20 focus:border-mango-500"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-mango-500 hover:bg-mango-600 text-foreground h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    {t('form.submit')} <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-foreground/10 text-center">
              <p className="text-sm text-foreground/40">
                {t('footer.authorized')} <br/>{t('footer.logged')}
              </p>
            </div>
          </m.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default BlogLoginPage;