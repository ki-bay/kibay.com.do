
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { ShieldAlert, Save, KeyRound } from 'lucide-react';

const AdminSocialMediaSettings = () => {
  const { t } = useTranslation('adminSocialSettings');
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Note: For real environment, these would be saved to Supabase Vault via Edge Functions.
  // Here we mock the form interaction as direct secure access isn't strictly available client-side.
  const [keys, setKeys] = useState({
    FACEBOOK_PAGE_ACCESS_TOKEN: '************************',
    FACEBOOK_PAGE_ID: '************************',
    INSTAGRAM_BUSINESS_ACCOUNT_ID: '************************',
    INSTAGRAM_ACCESS_TOKEN: '************************',
    X_API_KEY: '************************',
    X_API_SECRET: '************************',
  });

  const handleChange = (e) => {
    setKeys({ ...keys, [e.target.name]: e.target.value });
  };

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: t('toast.saved'),
        description: t('toast.savedDesc'),
      });
    }, 1000);
  };

  return (
    <>
      <SEOHead title={t('seoTitle')} />
      <Navigation />

      <main id="main" role="main" className="min-h-screen bg-stone-50 pt-32 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          <div>
            <h1 className="text-3xl font-serif text-stone-900">{t('heading')}</h1>
            <p className="text-stone-500 mt-2">{t('subheading')}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-4 items-start">
            <ShieldAlert className="w-6 h-6 text-amber-600 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">{t('warning.title')}</p>
              <p>{t('warning.body')}</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6 bg-white p-8 rounded-xl border border-stone-200 shadow-sm">

            <div className="space-y-4">
              <h2 className="text-xl font-medium text-stone-900 flex items-center gap-2 border-b pb-2">
                <KeyRound className="w-5 h-5 text-stone-400" /> {t('facebook.title')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('facebook.pageId')}</label>
                  <Input type="password" name="FACEBOOK_PAGE_ID" value={keys.FACEBOOK_PAGE_ID} onChange={handleChange} className="font-mono text-sm bg-stone-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('facebook.pageAccessToken')}</label>
                  <Input type="password" name="FACEBOOK_PAGE_ACCESS_TOKEN" value={keys.FACEBOOK_PAGE_ACCESS_TOKEN} onChange={handleChange} className="font-mono text-sm bg-stone-50" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-xl font-medium text-stone-900 flex items-center gap-2 border-b pb-2">
                <KeyRound className="w-5 h-5 text-stone-400" /> {t('instagram.title')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('instagram.businessAccountId')}</label>
                  <Input type="password" name="INSTAGRAM_BUSINESS_ACCOUNT_ID" value={keys.INSTAGRAM_BUSINESS_ACCOUNT_ID} onChange={handleChange} className="font-mono text-sm bg-stone-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('instagram.accessToken')}</label>
                  <Input type="password" name="INSTAGRAM_ACCESS_TOKEN" value={keys.INSTAGRAM_ACCESS_TOKEN} onChange={handleChange} className="font-mono text-sm bg-stone-50" />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <h2 className="text-xl font-medium text-stone-900 flex items-center gap-2 border-b pb-2">
                <KeyRound className="w-5 h-5 text-stone-400" /> {t('twitter.title')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('twitter.apiKey')}</label>
                  <Input type="password" name="X_API_KEY" value={keys.X_API_KEY} onChange={handleChange} className="font-mono text-sm bg-stone-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">{t('twitter.apiSecret')}</label>
                  <Input type="password" name="X_API_SECRET" value={keys.X_API_SECRET} onChange={handleChange} className="font-mono text-sm bg-stone-50" />
                </div>
              </div>
            </div>

            <div className="pt-6 flex justify-end gap-4 border-t">
              <Button type="button" variant="outline" onClick={() => toast({title: t('toast.testMocked')})}>{t('buttons.testConnections')}</Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? <span className="animate-spin text-xl leading-none">⍥</span> : <Save className="w-4 h-4" />} {t('buttons.save')}
              </Button>
            </div>
          </form>

        </div>
      </main>
      <Footer />
    </>
  );
};

export default AdminSocialMediaSettings;
