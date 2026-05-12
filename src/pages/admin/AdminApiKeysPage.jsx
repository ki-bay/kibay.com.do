
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Key, Copy, AlertTriangle, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

const AdminApiKeysPage = () => {
  const { t } = useTranslation('adminApiKeys');
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyData, setNewKeyData] = useState(null);
  const [formName, setFormName] = useState('');
  const [formPermissions, setFormPermissions] = useState(['webhook_access']);
  const { toast } = useToast();

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKeys(data || []);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('toast.error'), description: t('toast.loadFailed') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const generateKey = async () => {
    if (!formName) return toast({ variant: 'destructive', title: t('toast.error'), description: t('toast.nameRequired') });
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'generate', name: formName, permissions: formPermissions }
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);

      setNewKeyData(data.api_key);
      setFormName('');
      fetchKeys();
      toast({ title: t('toast.success'), description: t('toast.keyGenerated') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('toast.error'), description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const revokeKey = async (id) => {
    if (!confirm(t('confirm.revoke'))) return;
    try {
      const { data, error } = await supabase.functions.invoke('manage-api-keys', {
        body: { action: 'revoke', id }
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);

      fetchKeys();
      toast({ title: t('toast.success'), description: t('toast.keyRevoked') });
    } catch (err) {
      toast({ variant: 'destructive', title: t('toast.error'), description: err.message });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: t('toast.copiedTitle'), description: t('toast.copiedDesc') });
  };

  return (
    <>
      <SEOHead title={t('seoTitle')} />
      <Navigation />

      <main id="main" role="main" className="min-h-screen bg-stone-50 pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-serif text-stone-900">{t('heading')}</h1>
              <p className="text-stone-500 mt-2">{t('subheading')}</p>
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="gap-2 bg-card text-foreground hover:bg-card">
              <Plus className="w-4 h-4" /> {t('buttons.generateNew')}
            </Button>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b">
                  <tr>
                    <th className="px-6 py-3">{t('table.name')}</th>
                    <th className="px-6 py-3">{t('table.prefix')}</th>
                    <th className="px-6 py-3">{t('table.permissions')}</th>
                    <th className="px-6 py-3">{t('table.createdLastUsed')}</th>
                    <th className="px-6 py-3">{t('table.status')}</th>
                    <th className="px-6 py-3 text-right">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading && keys.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-stone-400"/></td></tr>
                  ) : keys.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-12 text-stone-500">{t('table.empty')}</td></tr>
                  ) : keys.map(key => (
                    <tr key={key.id} className="hover:bg-stone-50">
                      <td className="px-6 py-4 font-medium text-stone-900">{key.name}</td>
                      <td className="px-6 py-4 font-mono text-stone-500">{key.key_prefix}...</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1 flex-wrap">
                          {key.permissions?.map(p => <Badge key={p} variant="secondary" className="text-[10px]">{p}</Badge>)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-stone-500 text-xs">
                        <div>{new Date(key.created_at).toLocaleDateString()}</div>
                        <div className="text-stone-400">{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : t('table.never')}</div>
                      </td>
                      <td className="px-6 py-4">
                        {key.is_active ?
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('status.active')}</Badge> :
                          <Badge variant="destructive">{t('status.revoked')}</Badge>
                        }
                      </td>
                      <td className="px-6 py-4 text-right">
                        {key.is_active && (
                          <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => revokeKey(key.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle>{t('modal.title')}</DialogTitle>
            <DialogDescription>{t('modal.description')}</DialogDescription>
          </DialogHeader>

          {!newKeyData ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t('modal.keyName')}</label>
                <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder={t('modal.namePlaceholder')} className="bg-stone-50" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">{t('modal.permissions')}</label>
                <div className="flex flex-wrap gap-2">
                  {['webhook_access', 'blog_create', 'social_media_post'].map(perm => (
                    <Badge
                      key={perm}
                      variant={formPermissions.includes(perm) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setFormPermissions(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm])}
                    >
                      {perm}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button onClick={generateKey} disabled={loading} className="w-full mt-4 bg-card text-foreground">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t('buttons.generate')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold">{t('modal.warningTitle')}</p>
                  <p>{t('modal.warningBody')}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input value={newKeyData} readOnly className="font-mono bg-stone-50 text-stone-600" />
                <Button variant="outline" onClick={() => copyToClipboard(newKeyData)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => { setIsModalOpen(false); setNewKeyData(null); }} className="w-full">{t('buttons.done')}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </>
  );
};

export default AdminApiKeysPage;
