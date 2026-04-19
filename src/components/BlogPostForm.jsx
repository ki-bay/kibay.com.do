import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Loader2, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import Navigation from '@/components/Navigation';
import ImageUploadField from '@/components/ImageUploadField';
import RichTextEditor from '@/components/RichTextEditor';
import { 
  generateSlug, 
  generateSeoTitle, 
  generateSeoDescription, 
  generateKeywords,
  generateCanonicalUrl,
  isSlugUnique,
  validateSeoScore
} from '@/utils/seoUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BlogPostForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [activeTab, setActiveTab] = useState("content");
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    featured_image_url: '',
    published: false,
    seo_title: '',
    seo_description: '',
    seo_keywords: '',
    slug: '',
    canonical_url: '',
    alt_text: ''
  });
  
  const [seoScore, setSeoScore] = useState(0);
  const [sendNotification, setSendNotification] = useState(false);
  const [slugError, setSlugError] = useState('');

  useEffect(() => {
    if (id) {
      fetchPost();
    }
  }, [id]);

  useEffect(() => {
    setSeoScore(validateSeoScore(formData));
  }, [formData]);

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setFormData(data);
    } catch (error) {
      console.error('Error fetching post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not load the blog post.",
      });
      navigate('/dashboard/blog');
    } finally {
      setFetching(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'slug') {
      setSlugError('');
    }
  };

  const handleEditorChange = (html) => {
    setFormData(prev => ({ ...prev, content: html }));
  };

  const handleImageChange = (url) => {
    setFormData(prev => ({ ...prev, featured_image_url: url }));
  };

  const handleAutoGenerateSEO = async () => {
    const slug = generateSlug(formData.title);
    const seoTitle = generateSeoTitle(formData.title);
    const seoDesc = generateSeoDescription(formData.description);
    const keywords = generateKeywords(formData.content);
    const canonical = generateCanonicalUrl(slug);

    setFormData(prev => ({
      ...prev,
      slug: prev.slug || slug,
      seo_title: prev.seo_title || seoTitle,
      seo_description: prev.seo_description || seoDesc,
      seo_keywords: prev.seo_keywords || keywords,
      canonical_url: prev.canonical_url || canonical,
    }));
    
    setSlugError('');
    toast({
      title: "SEO Generated",
      description: "SEO fields populated based on content.",
    });
  };

  const validateSlug = async (slugToValidate) => {
     if (!slugToValidate) return false;
     
     // Check for duplicates
     // We pass id if we are editing, or null if we are creating new
     // This ensures we don't flag the current post as a duplicate of itself during edit
     const isUnique = await isSlugUnique(slugToValidate, id || null); 

     if (!isUnique) {
        setSlugError('This slug is already in use. Please choose another one.');
        toast({
          variant: "destructive",
          title: "Duplicate Slug",
          description: "The URL slug must be unique.",
        });
        setActiveTab("seo");
        return false;
     }
     
     return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Basic Validation
    if (!formData.title || !formData.description) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Title and description are required.",
      });
      return;
    }
    
    // 2. Slug Preparation
    let finalSlug = formData.slug;
    if (!finalSlug) {
        finalSlug = generateSlug(formData.title);
        setFormData(prev => ({ ...prev, slug: finalSlug }));
    }

    if (!finalSlug) {
        toast({
            variant: "destructive",
            title: "Invalid Title",
            description: "Could not generate a valid URL slug from the title.",
        });
        return;
    }

    // 3. Uniqueness Check
    const isSlugValid = await validateSlug(finalSlug);
    if (!isSlugValid) return;

    setLoading(true);

    try {
      // Prepare payload with the DEFINITIVE finalSlug
      const postData = {
        ...formData,
        slug: finalSlug, 
        author_email: user?.email,
        updated_at: new Date().toISOString(),
      };

      let error;
      let postId = id;

      if (id) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', id);
        error = updateError;
      } else {
        const { data: newPost, error: insertError } = await supabase
          .from('blog_posts')
          .insert([postData])
          .select('id')
          .single();
        error = insertError;
        postId = newPost?.id;
      }

      if (error) throw error;

      // Handle Sitemap Regeneration via Edge Function
      try {
        await supabase.functions.invoke('generate-sitemap');
      } catch (e) {
        console.warn('Sitemap generation trigger failed, but post saved.', e);
      }

      if (sendNotification && formData.published) {
        try {
            await supabase.functions.invoke('send-blog-notification-email', {
                body: JSON.stringify({
                    postId: postId,
                    postTitle: formData.title,
                    postDescription: formData.description,
                    featuredImageUrl: formData.featured_image_url,
                    postUrl: `${window.location.origin}/blog/${postId}`
                })
            });
            toast({ title: "Notifications Sent" });
        } catch (notifyErr) {
            console.error("Notification Error:", notifyErr);
        }
      }

      toast({
        title: "Success",
        description: `Blog post ${id ? 'updated' : 'created'} successfully!`,
      });
      
      navigate('/dashboard/blog');
    } catch (error) {
      console.error('Error saving post:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save the blog post. Please check your connection.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-mango-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 pt-28">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
            <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard/blog')}
                className="text-white/60 hover:text-white"
            >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <h1 className="text-3xl font-bold text-white">
                {id ? 'Edit Post' : 'Create New Post'}
            </h1>
            </div>
            
            {/* SEO Score Badge */}
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${
                seoScore >= 80 ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                seoScore >= 50 ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
                <span className="text-xs font-bold uppercase">SEO Score</span>
                <span className="font-bold">{seoScore}/100</span>
            </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-slate-800 border border-white/10">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="seo">SEO & Metadata</TabsTrigger>
            </TabsList>

            <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-800 border border-white/10 rounded-xl p-8 shadow-xl"
            >
            <form onSubmit={handleSubmit} className="space-y-6">
                
                <TabsContent value="content" className="space-y-6 mt-0">
                    {/* Title */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">Title *</label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Enter post title"
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/20 focus:border-mango-500 focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">Excerpt / Description *</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Short summary for the card view..."
                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/20 focus:border-mango-500 focus:outline-none transition-colors resize-none"
                        />
                    </div>

                    {/* Featured Image */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">Featured Image</label>
                        <ImageUploadField 
                            value={formData.featured_image_url} 
                            onChange={handleImageChange} 
                        />
                    </div>

                    {/* Rich Text Content */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-white/80">Content</label>
                        <RichTextEditor 
                            content={formData.content} 
                            onChange={handleEditorChange} 
                        />
                    </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-8 mt-0">
                    <div className="flex items-center justify-between bg-slate-900/30 p-4 rounded-lg border border-white/10">
                        <div>
                            <h3 className="text-white font-medium flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-mango-500" />
                                Auto-Generate SEO Fields
                            </h3>
                            <p className="text-white/60 text-sm mt-1">
                                Automatically populate SEO fields based on your content.
                            </p>
                        </div>
                        <Button type="button" onClick={handleAutoGenerateSEO} variant="outline" className="border-mango-500/50 text-mango-400 hover:text-mango-300 hover:bg-mango-500/10">
                            Generate Now
                        </Button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            {/* SEO Title */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <label className="font-medium text-white/80">SEO Title</label>
                                    <span className={`${formData.seo_title.length > 60 ? 'text-red-400' : 'text-white/40'}`}>
                                        {formData.seo_title.length}/60
                                    </span>
                                </div>
                                <input
                                    type="text"
                                    name="seo_title"
                                    value={formData.seo_title}
                                    onChange={handleChange}
                                    placeholder="Title for search engines"
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/20 focus:border-mango-500 focus:outline-none transition-colors"
                                />
                            </div>

                             {/* Slug */}
                             <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">URL Slug</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-white/40 text-sm bg-slate-900/50 px-3 py-3 border border-white/10 rounded-l-lg border-r-0">
                                        kibay.com.do/blog/
                                    </span>
                                    <input
                                        type="text"
                                        name="slug"
                                        value={formData.slug}
                                        onChange={handleChange}
                                        placeholder="url-slug-here"
                                        className={`w-full bg-slate-900/50 border rounded-r-lg p-3 text-white placeholder:text-white/20 focus:outline-none transition-colors ${slugError ? 'border-red-500' : 'border-white/10 focus:border-mango-500'}`}
                                    />
                                </div>
                                {slugError && <p className="text-red-400 text-xs">{slugError}</p>}
                            </div>

                            {/* SEO Description */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <label className="font-medium text-white/80">SEO Description</label>
                                    <span className={`${formData.seo_description.length > 160 ? 'text-red-400' : 'text-white/40'}`}>
                                        {formData.seo_description.length}/160
                                    </span>
                                </div>
                                <textarea
                                    name="seo_description"
                                    value={formData.seo_description}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Description for search results..."
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/20 focus:border-mango-500 focus:outline-none transition-colors resize-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Search Preview */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Google Search Preview</label>
                                <div className="bg-white p-4 rounded-lg font-sans">
                                    <div className="flex items-center gap-1 text-[#202124] text-sm mb-1">
                                        <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-[10px] overflow-hidden">
                                            <img src="/logo.png" alt="logo" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
                                        </div>
                                        <div className="flex flex-col leading-tight">
                                            <span className="text-[#202124]">Kibay</span>
                                            <span className="text-[#5f6368] text-xs">kibay.com.do › blog › {formData.slug || '...'}</span>
                                        </div>
                                    </div>
                                    <h3 className="text-[#1a0dab] text-xl font-normal hover:underline cursor-pointer truncate">
                                        {formData.seo_title || formData.title || 'Your Post Title'}
                                    </h3>
                                    <p className="text-[#4d5156] text-sm mt-1 line-clamp-2">
                                        {formData.seo_description || formData.description || 'This is how your description will appear in search results...'}
                                    </p>
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Keywords (Comma separated)</label>
                                <input
                                    type="text"
                                    name="seo_keywords"
                                    value={formData.seo_keywords}
                                    onChange={handleChange}
                                    placeholder="tropical, mango, drink, ..."
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/20 focus:border-mango-500 focus:outline-none transition-colors"
                                />
                            </div>

                             {/* Alt Text */}
                             <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Featured Image Alt Text</label>
                                <input
                                    type="text"
                                    name="alt_text"
                                    value={formData.alt_text}
                                    onChange={handleChange}
                                    placeholder="Describe the image for accessibility"
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/20 focus:border-mango-500 focus:outline-none transition-colors"
                                />
                            </div>

                            {/* Canonical */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Canonical URL (Optional)</label>
                                <input
                                    type="text"
                                    name="canonical_url"
                                    value={formData.canonical_url}
                                    onChange={handleChange}
                                    placeholder="https://..."
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/20 focus:border-mango-500 focus:outline-none transition-colors"
                                />
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* Publishing Options Footer */}
                <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-col space-y-2 w-full md:w-auto">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="published"
                                name="published"
                                checked={formData.published}
                                onChange={handleChange}
                                className="w-5 h-5 rounded border-white/20 bg-slate-800 text-mango-500 focus:ring-mango-500"
                            />
                            <label htmlFor="published" className="text-white cursor-pointer select-none font-medium">
                                Publish immediately
                            </label>
                        </div>
                        
                        <div className="flex items-center gap-3 pl-1">
                            <input
                                type="checkbox"
                                id="sendNotification"
                                checked={sendNotification}
                                onChange={(e) => setSendNotification(e.target.checked)}
                                disabled={!formData.published}
                                className={`w-5 h-5 rounded border-white/20 bg-slate-800 text-mango-500 focus:ring-mango-500 ${!formData.published && 'opacity-50 cursor-not-allowed'}`}
                            />
                            <label htmlFor="sendNotification" className={`text-white cursor-pointer select-none flex items-center gap-2 ${!formData.published && 'opacity-50'}`}>
                                <Send className="w-4 h-4" />
                                Send email notification
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                         <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => navigate('/dashboard/blog')}
                            className="border-white/10 text-white hover:bg-white/5"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="bg-mango-500 hover:bg-mango-600 text-white min-w-[150px]"
                        >
                            {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Saving...
                            </>
                            ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Post
                            </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
            </motion.div>
        </Tabs>
      </div>
    </div>
  );
};

export default BlogPostForm;