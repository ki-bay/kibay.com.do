import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Search,
  Loader2,
  MoreVertical,
  Calendar,
  Share2,
  RefreshCw,
  Instagram,
  Facebook,
  Video,
  BarChart2,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import Navigation from '@/components/Navigation';
import BlogSeoAudit from '@/pages/blog/BlogSeoAudit';

const BlogAdminDashboard = () => {
  const { t } = useTranslation('adminBlog');
  const [posts, setPosts] = useState([]);
  const [socialStats, setSocialStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [postToDelete, setPostToDelete] = useState(null);
  const [triggeringSocial, setTriggeringSocial] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchSocialStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
      await fetchSocialStats(data);
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        variant: "destructive",
        title: t('toast.error'),
        description: t('toast.loadFailed'),
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSocialStats = async (currentPosts = posts) => {
    if (!currentPosts.length) return;
    
    try {
        const ids = currentPosts.map(p => p.id);
        const { data, error } = await supabase
            .from('blog_social_posts')
            .select('*')
            .in('blog_post_id', ids);
            
        if (error) throw error;
        
        const statsMap = {};
        data?.forEach(stat => {
            statsMap[stat.blog_post_id] = stat;
        });
        setSocialStats(statsMap);
    } catch (err) {
        console.error("Error fetching social stats", err);
    }
  };

  const handleTogglePublish = async (post) => {
    const newStatus = !post.published;
    try {
      const { error } = await supabase
        .from('blog_posts')
        .update({ published: newStatus })
        .eq('id', post.id);

      if (error) throw error;

      setPosts(posts.map(p => 
        p.id === post.id ? { ...p, published: newStatus } : p
      ));

      toast({
        title: t('toast.statusUpdated'),
        description: newStatus ? t('toast.publishedSuccess') : t('toast.unpublishedSuccess'),
      });

      if (newStatus) {
        handleTriggerSocial(post);
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: t('toast.error'),
        description: t('toast.updateFailed'),
      });
    }
  };

  const handleTriggerSocial = async (post) => {
    setTriggeringSocial(post.id);
    try {
        const { data, error } = await supabase.functions.invoke('trigger-social-media-posting', {
            body: {
                id: post.id,
                title: post.title,
                description: post.description,
                content: post.content,
                featured_image: post.featured_image_url,
                blog_url: `${window.location.origin}/blog/${post.id}`
            }
        });

        if (error) throw error;
        
        setSocialStats(prev => ({
            ...prev,
            [post.id]: {
                ...prev[post.id],
                instagram_status: 'processing',
                tiktok_status: 'processing',
                facebook_status: 'processing'
            }
        }));

        toast({
            title: t('toast.socialTriggered'),
            description: t('toast.socialTriggeredDesc'),
        });
    } catch (err) {
        console.error("Social trigger failed:", err);
        toast({
            variant: "destructive",
            title: t('toast.socialFailed'),
            description: t('toast.socialFailedDesc'),
        });
    } finally {
        setTriggeringSocial(null);
    }
  };

  const handleDelete = async () => {
    if (!postToDelete) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postToDelete);

      if (error) throw error;

      setPosts(posts.filter(post => post.id !== postToDelete));
      toast({
        title: t('toast.deleted'),
        description: t('toast.deletedDesc'),
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('toast.error'),
        description: t('toast.deleteFailed'),
      });
    } finally {
      setPostToDelete(null);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'success') return <span className="text-green-400">✓</span>;
    if (status === 'failed') return <span className="text-red-400">✕</span>;
    if (status === 'processing' || status === 'sent_to_workflow') return <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />;
    return <span className="text-foreground/20">•</span>;
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />

      <main id="main" role="main" className="max-w-7xl mx-auto px-4 pt-28">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{t('heading')}</h1>
            <p className="text-foreground/60">{t('subheading')}</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/orders">
              <Button variant="outline" className="border-foreground/20 text-foreground gap-2">
                <Package className="w-4 h-4" /> {t('buttons.shopOrders')}
              </Button>
            </Link>
            <Link to="/admin/blog/create">
              <Button className="bg-mango-500 hover:bg-mango-600 text-foreground gap-2">
                <Plus className="w-4 h-4" /> {t('buttons.createNew')}
              </Button>
            </Link>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-card border border-foreground/10">
                <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
                <TabsTrigger value="seo">{t('tabs.seo')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
                {/* Search and Filters */}
                <div className="bg-card p-4 rounded-xl border border-foreground/10 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-foreground/40" />
                    <input
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-background/50 border border-foreground/10 rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-mango-500 transition-colors"
                    />
                </div>
                </div>

                {/* Content Table */}
                <div className="bg-card border border-foreground/10 rounded-xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-12 flex justify-center">
                    <Loader2 className="w-8 h-8 text-mango-500 animate-spin" />
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="p-12 text-center text-foreground/40">
                    <p>{t('table.empty')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="border-b border-foreground/10 bg-background/30">
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-foreground/60 w-[35%]">{t('table.title')}</th>
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-foreground/60">{t('table.status')}</th>
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-foreground/60 text-center">{t('table.socialStatus')}</th>
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-foreground/60">{t('table.date')}</th>
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-foreground/60 text-right">{t('table.actions')}</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                        <AnimatePresence>
                            {filteredPosts.map((post) => {
                            const stats = socialStats[post.id];
                            return (
                                <m.tr 
                                    key={post.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="hover:bg-foreground/5 transition-colors group"
                                >
                                    <td className="p-4">
                                    <div className="font-medium text-foreground line-clamp-1">{post.title}</div>
                                    <div className="text-xs text-foreground/40 mt-1 line-clamp-1">{post.description}</div>
                                    </td>
                                    <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        post.published 
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    }`}>
                                        {post.published ? t('status.published') : t('status.draft')}
                                    </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="flex flex-col items-center gap-1" title="Instagram">
                                                <Instagram className="w-3 h-3 text-foreground/60" />
                                                {getStatusIcon(stats?.instagram_status)}
                                            </div>
                                            <div className="flex flex-col items-center gap-1" title="TikTok">
                                                <Video className="w-3 h-3 text-foreground/60" />
                                                {getStatusIcon(stats?.tiktok_status)}
                                            </div>
                                            <div className="flex flex-col items-center gap-1" title="Facebook">
                                                <Facebook className="w-3 h-3 text-foreground/60" />
                                                {getStatusIcon(stats?.facebook_status)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-foreground/60 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3" />
                                        {new Date(post.created_at).toLocaleDateString()}
                                    </div>
                                    </td>
                                    <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        {post.published && (
                                            <Button 
                                                variant="ghost" 
                                                size="sm"
                                                className="h-8 w-8 p-0 text-foreground/60 hover:text-foreground"
                                                onClick={() => handleTriggerSocial(post)}
                                                disabled={triggeringSocial === post.id}
                                                title={t('actions.retrySocial')}
                                            >
                                                {triggeringSocial === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            </Button>
                                        )}

                                        <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="h-8 w-8 p-0 text-foreground/60 hover:text-foreground"
                                        onClick={() => navigate(`/admin/blog/${post.id}/edit`)}
                                        title={t('actions.edit')}
                                        >
                                        <Edit className="w-4 h-4" />
                                        </Button>
                                        
                                        <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className={`h-8 w-8 p-0 ${post.published ? 'text-green-400 hover:text-green-300' : 'text-yellow-400 hover:text-yellow-300'}`}
                                        onClick={() => handleTogglePublish(post)}
                                        title={post.published ? t('actions.unpublish') : t('actions.publish')}
                                        >
                                        {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </Button>

                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-foreground/60 hover:text-foreground">
                                            <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-card border-foreground/10 text-foreground">
                                            <DropdownMenuItem 
                                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                                            onClick={() => setPostToDelete(post.id)}
                                            >
                                            <Trash2 className="w-4 h-4 mr-2" /> {t('buttons.delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    </td>
                                </m.tr>
                            );
                            })}
                        </AnimatePresence>
                        </tbody>
                    </table>
                    </div>
                )}
                </div>
            </TabsContent>
            
            <TabsContent value="seo">
                <BlogSeoAudit />
            </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
        <AlertDialogContent className="bg-card border-foreground/10 text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
            <AlertDialogDescription className="text-foreground/60">
              {t('delete.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-foreground/10 text-foreground hover:bg-foreground/5 hover:text-foreground">{t('buttons.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-foreground border-0"
            >
              {t('buttons.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogAdminDashboard;