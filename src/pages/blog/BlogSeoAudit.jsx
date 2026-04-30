import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { validateSeoScore } from '@/utils/seoUtils';
import { CheckCircle, AlertTriangle, XCircle, Search, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';

const BlogSeoAudit = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, title, slug, seo_title, seo_description, featured_image_url, alt_text, content, seo_keywords, canonical_url, published');

    if (error) {
      console.error('Error fetching posts:', error);
    } else {
      // Calculate scores
      const scoredPosts = data.map(post => ({
        ...post,
        seoScore: validateSeoScore(post)
      }));
      setPosts(scoredPosts);
    }
    setLoading(false);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (score >= 50) return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  const StatusIcon = ({ check }) => {
    if (check) return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <XCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-foreground">SEO Audit</h2>
           <p className="text-foreground/60 text-sm">Analyze and optimize search engine visibility.</p>
        </div>
        <Button onClick={fetchPosts} variant="outline" className="border-foreground/10 text-foreground hover:bg-foreground/5">
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh Analysis
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
           <Loader2 className="w-8 h-8 text-mango-500 animate-spin" />
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-foreground/10 overflow-hidden">
           <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead className="bg-background/50 border-b border-foreground/10">
                    <tr>
                        <th className="p-4 text-xs font-medium uppercase text-foreground/60">Post</th>
                        <th className="p-4 text-xs font-medium uppercase text-foreground/60 text-center">Score</th>
                        <th className="p-4 text-xs font-medium uppercase text-foreground/60 text-center">Title</th>
                        <th className="p-4 text-xs font-medium uppercase text-foreground/60 text-center">Desc</th>
                        <th className="p-4 text-xs font-medium uppercase text-foreground/60 text-center">Slug</th>
                        <th className="p-4 text-xs font-medium uppercase text-foreground/60 text-center">Image</th>
                        <th className="p-4 text-xs font-medium uppercase text-foreground/60 text-center">Alt</th>
                        <th className="p-4 text-xs font-medium uppercase text-foreground/60 text-right">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {posts.map(post => (
                        <tr key={post.id} className="hover:bg-foreground/5 transition-colors">
                            <td className="p-4">
                                <div className="font-medium text-foreground max-w-[200px] truncate">{post.title}</div>
                                <div className="text-xs text-foreground/40">{post.published ? 'Published' : 'Draft'}</div>
                            </td>
                            <td className="p-4 text-center">
                                <span className={`inline-block px-2 py-1 rounded border font-bold text-xs ${getScoreColor(post.seoScore)}`}>
                                    {post.seoScore}
                                </span>
                            </td>
                            <td className="p-4 text-center"><div className="flex justify-center"><StatusIcon check={!!post.seo_title} /></div></td>
                            <td className="p-4 text-center"><div className="flex justify-center"><StatusIcon check={!!post.seo_description} /></div></td>
                            <td className="p-4 text-center"><div className="flex justify-center"><StatusIcon check={!!post.slug} /></div></td>
                            <td className="p-4 text-center"><div className="flex justify-center"><StatusIcon check={!!post.featured_image_url} /></div></td>
                            <td className="p-4 text-center"><div className="flex justify-center"><StatusIcon check={!!post.alt_text} /></div></td>
                            <td className="p-4 text-right">
                                <Link to={`/admin/blog/${post.id}/edit`}>
                                    <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                        Fix
                                    </Button>
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
             </table>
           </div>
        </div>
      )}
    </div>
  );
};

export default BlogSeoAudit;