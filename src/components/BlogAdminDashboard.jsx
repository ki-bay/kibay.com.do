import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  BarChart2
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
        title: "Error",
        description: "Could not load blog posts.",
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
        title: "Status Updated",
        description: `Post ${newStatus ? 'published' : 'unpublished'} successfully.`,
      });

      if (newStatus) {
        handleTriggerSocial(post);
      }

    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update status.",
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
            title: "Social Workflow Triggered",
            description: "Content is being processed by Make.com for Instagram, TikTok, and Facebook.",
        });
    } catch (err) {
        console.error("Social trigger failed:", err);
        toast({
            variant: "destructive",
            title: "Posting Failed",
            description: "Could not trigger social media workflow.",
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
        title: "Deleted",
        description: "Post has been removed permanently.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete post.",
      });
    } finally {
      setPostToDelete(null);
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'success') return <span className="text-green-400">✓</span>;
    if (status === 'failed') return <span className="text-red-400">✕</span>;
    if (status === 'processing' || status === 'sent_to_workflow') return <Loader2 className="w-3 h-3 animate-spin text-yellow-400" />;
    return <span className="text-white/20">•</span>;
  };

  const filteredPosts = posts.filter(post => 
    post.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 pt-28">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Blog Dashboard</h1>
            <p className="text-white/60">Manage your blog posts, create new content, and track status.</p>
          </div>
          
          <Link to="/admin/blog/create">
            <Button className="bg-mango-500 hover:bg-mango-600 text-white gap-2">
              <Plus className="w-4 h-4" /> Create New Post
            </Button>
          </Link>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-800 border border-white/10">
                <TabsTrigger value="overview">Posts Overview</TabsTrigger>
                <TabsTrigger value="seo">SEO Audit</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
                {/* Search and Filters */}
                <div className="bg-slate-800 p-4 rounded-xl border border-white/10 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-grow max-w-md">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-white/40" />
                    <input
                    type="text"
                    placeholder="Search posts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-mango-500 transition-colors"
                    />
                </div>
                </div>

                {/* Content Table */}
                <div className="bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                {loading ? (
                    <div className="p-12 flex justify-center">
                    <Loader2 className="w-8 h-8 text-mango-500 animate-spin" />
                    </div>
                ) : filteredPosts.length === 0 ? (
                    <div className="p-12 text-center text-white/40">
                    <p>No posts found.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                        <tr className="border-b border-white/10 bg-slate-900/30">
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-white/60 w-[35%]">Title</th>
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-white/60">Status</th>
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-white/60 text-center">Social Status</th>
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-white/60">Date</th>
                            <th className="p-4 text-xs font-medium uppercase tracking-wider text-white/60 text-right">Actions</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                        <AnimatePresence>
                            {filteredPosts.map((post) => {
                            const stats = socialStats[post.id];
                            return (
                                <motion.tr 
                                    key={post.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="p-4">
                                    <div className="font-medium text-white line-clamp-1">{post.title}</div>
                                    <div className="text-xs text-white/40 mt-1 line-clamp-1">{post.description}</div>
                                    </td>
                                    <td className="p-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                        post.published 
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                        : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                                    }`}>
                                        {post.published ? 'Published' : 'Draft'}
                                    </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="flex flex-col items-center gap-1" title="Instagram">
                                                <Instagram className="w-3 h-3 text-white/60" />
                                                {getStatusIcon(stats?.instagram_status)}
                                            </div>
                                            <div className="flex flex-col items-center gap-1" title="TikTok">
                                                <Video className="w-3 h-3 text-white/60" />
                                                {getStatusIcon(stats?.tiktok_status)}
                                            </div>
                                            <div className="flex flex-col items-center gap-1" title="Facebook">
                                                <Facebook className="w-3 h-3 text-white/60" />
                                                {getStatusIcon(stats?.facebook_status)}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-white/60 whitespace-nowrap">
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
                                                className="h-8 w-8 p-0 text-white/60 hover:text-white"
                                                onClick={() => handleTriggerSocial(post)}
                                                disabled={triggeringSocial === post.id}
                                                title="Retry Social Posting via Make.com"
                                            >
                                                {triggeringSocial === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            </Button>
                                        )}

                                        <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="h-8 w-8 p-0 text-white/60 hover:text-white"
                                        onClick={() => navigate(`/admin/blog/${post.id}/edit`)}
                                        title="Edit"
                                        >
                                        <Edit className="w-4 h-4" />
                                        </Button>
                                        
                                        <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className={`h-8 w-8 p-0 ${post.published ? 'text-green-400 hover:text-green-300' : 'text-yellow-400 hover:text-yellow-300'}`}
                                        onClick={() => handleTogglePublish(post)}
                                        title={post.published ? "Unpublish" : "Publish"}
                                        >
                                        {post.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                        </Button>

                                        <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white/60 hover:text-white">
                                            <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-white">
                                            <DropdownMenuItem 
                                            className="text-red-400 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
                                            onClick={() => setPostToDelete(post.id)}
                                            >
                                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                    </td>
                                </motion.tr>
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
      </div>

      <AlertDialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
        <AlertDialogContent className="bg-slate-800 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              This action cannot be undone. This will permanently delete the blog post and its analytics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/10 text-white hover:bg-white/5 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlogAdminDashboard;