
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AdminSocialMediaDashboard = () => {
  const [blogPosts, setBlogPosts] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: bData } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false }).limit(10);
      const { data: sData } = await supabase.from('social_media_posts').select('*, blog_posts(title)').order('created_at', { ascending: false }).limit(20);
      
      if (bData) setBlogPosts(bData);
      if (sData) setSocialPosts(sData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRetry = async (platform, socialPostId, blogPostId) => {
    toast({ title: 'Retrying...', description: `Retrying post for ${platform}` });
    try {
      const { data, error } = await supabase.functions.invoke(`post-to-${platform}`, {
        body: JSON.stringify({ blog_post_id: blogPostId, social_post_id: socialPostId })
      });
      if (error || data?.error) throw new Error(error?.message || data?.error);
      
      toast({ title: 'Success', description: `Successfully retried post for ${platform}` });
      fetchData();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Retry Failed', description: err.message });
    }
  };

  // Metrics
  const totalCreated = socialPosts.length;
  const totalFailed = socialPosts.filter(p => p.status === 'failed').length;
  const successRate = totalCreated ? Math.round(((totalCreated - totalFailed) / totalCreated) * 100) : 0;

  return (
    <>
      <SEOHead title="Social Media Dashboard | Admin" />
      <Navigation />
      
      <main className="min-h-screen bg-stone-50 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-serif text-stone-900">Social Media Automation</h1>
              <p className="text-stone-500 mt-2">Manage and monitor automated social posts.</p>
            </div>
            <Button onClick={fetchData} variant="outline" className="gap-2">
              <RefreshCw className={loading ? "animate-spin w-4 h-4" : "w-4 h-4"} /> Refresh
            </Button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <h3 className="text-sm font-medium text-stone-500">Total Posts Generated</h3>
              <p className="text-3xl font-semibold text-stone-900 mt-2">{totalCreated}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <h3 className="text-sm font-medium text-stone-500">Success Rate</h3>
              <p className="text-3xl font-semibold text-stone-900 mt-2">{successRate}%</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <h3 className="text-sm font-medium text-stone-500">Failed Posts</h3>
              <p className="text-3xl font-semibold text-red-600 mt-2">{totalFailed}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Social Posts Table */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-stone-100 bg-stone-50">
                <h2 className="text-lg font-medium text-stone-900">Recent Social Posts</h2>
              </div>
              <div className="overflow-x-auto p-0">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Platform</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Date</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loading ? (
                      <tr><td colSpan="4" className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400"/></td></tr>
                    ) : socialPosts.length === 0 ? (
                      <tr><td colSpan="4" className="text-center py-8 text-stone-500">No posts found</td></tr>
                    ) : socialPosts.map(post => (
                      <tr key={post.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4 font-medium text-stone-900 capitalize">{post.platform}</td>
                        <td className="px-6 py-4">
                          {post.status === 'posted' ? <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="w-3 h-3 mr-1"/> Posted</Badge> :
                           post.status === 'failed' ? <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1"/> Failed</Badge> :
                           <Badge variant="outline" className="text-stone-500">Pending</Badge>}
                        </td>
                        <td className="px-6 py-4 text-stone-500">
                          {new Date(post.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {post.status === 'failed' && (
                            <Button size="sm" variant="outline" onClick={() => handleRetry(post.platform, post.id, post.blog_post_id)}>
                              Retry
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Blog Posts Table */}
            <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
              <div className="p-6 border-b border-stone-100 bg-stone-50">
                <h2 className="text-lg font-medium text-stone-900">Recent Auto-Generated Blogs</h2>
              </div>
              <div className="overflow-x-auto p-0">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-stone-500 uppercase bg-stone-50 border-b">
                    <tr>
                      <th className="px-6 py-3">Title</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Keywords</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {loading ? (
                      <tr><td colSpan="3" className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-stone-400"/></td></tr>
                    ) : blogPosts.length === 0 ? (
                      <tr><td colSpan="3" className="text-center py-8 text-stone-500">No blogs found</td></tr>
                    ) : blogPosts.map(post => (
                      <tr key={post.id} className="hover:bg-stone-50">
                        <td className="px-6 py-4 font-medium text-stone-900 truncate max-w-[200px]">{post.title}</td>
                        <td className="px-6 py-4">
                          {post.published ? 
                            <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50">Published</Badge> : 
                            <Badge variant="secondary">Draft</Badge>
                          }
                        </td>
                        <td className="px-6 py-4 text-stone-500 truncate max-w-[150px]">
                          {post.seo_keywords || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
};

export default AdminSocialMediaDashboard;
