import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, User, Clock, Share2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { sanitizeHtmlContent } from '@/utils/sanitizeHtmlContent';
import SEOHead from '@/components/SEOHead';
import SchemaMarkup from '@/components/SchemaMarkup';
import BreadcrumbNav from '@/components/BreadcrumbNav';
import '@/styles/editor.css'; 

const BlogPostDetailPage = () => {
  const { id } = useParams(); // Note: Ideally we should also support slug here, but existing router uses ID.
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPost = async () => {
      try {
        // Try to fetch by ID (UUID format)
        let query = supabase.from('blog_posts').select('*');
        
        // Simple regex to check for UUID. If not UUID, assume slug.
        // Or simpler: supabase handles types. But 'id' from params is a string.
        // Assuming current routing only uses /blog/:id where :id is the PK. 
        // If user wants /blog/:slug, router needs update. 
        // For now sticking to ID logic as per previous implementation but handling 404 gracefully.
        
        query = query.eq('id', id).single();
        const { data, error } = await query;

        if (error) throw error;
        
        if (!data.published) {
            if (!user || user.email !== 'info@kibay.com.do') {
                throw new Error("Post not found or unpublished");
            }
        }
        
        setPost(data);
      } catch (err) {
        console.error('Error details:', err);
        setError("Post not found");
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-mango-500 animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">Post Not Found</h2>
            <p className="text-foreground/60 mb-8">The article you're looking for doesn't exist or has been removed.</p>
            <Link to="/blog">
              <Button className="bg-mango-500 hover:bg-mango-600">Back to Blog</Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const wordCount = post.content ? post.content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  
  const schemaData = {
    headline: post.seo_title || post.title,
    description: post.seo_description || post.description,
    image: post.featured_image_url,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    author: "Kibay Team", // Or dynamic if we have author names
    url: window.location.href
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title={post.seo_title || post.title}
        description={post.seo_description || post.description}
        image={post.featured_image_url}
        url={post.canonical_url || window.location.href}
        type="article"
        keywords={post.seo_keywords}
        canonicalUrl={post.canonical_url}
      />
      
      <SchemaMarkup type="Article" data={schemaData} />
      
      <Navigation />
      
      <article className="pt-28 pb-20">
        {/* Breadcrumb & Header */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8">
            <BreadcrumbNav items={[
                { name: 'Blog', url: '/blog' },
                { name: post.title, url: '#' }
            ]} />
            
          <Link to="/blog" className="inline-flex items-center text-mango-400 hover:text-mango-300 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Articles
          </Link>
          
          {!post.published && (
             <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg inline-block text-sm font-medium">
                Draft Preview Mode
             </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-foreground/60 border-b border-foreground/10 pb-8">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-mango-500" />
              {new Date(post.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
            {post.author_email && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-mango-500" />
                {post.author_email.split('@')[0]}
              </div>
            )}
            <div className="flex items-center gap-2">
               <Clock className="w-4 h-4 text-mango-500" />
               {readTime} min read
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-video rounded-2xl overflow-hidden shadow-2xl"
            >
              <img 
                src={post.featured_image_url} 
                alt={post.alt_text || post.title} 
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </motion.div>
          </div>
        )}

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div 
            className="blog-content-renderer"
            dangerouslySetInnerHTML={{ __html: sanitizeHtmlContent(post.content) }}
          />
          
          {/* Share Section */}
          <div className="mt-16 pt-8 border-t border-foreground/10 flex items-center justify-between">
            <span className="text-foreground/60 font-medium">Share this article</span>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-foreground/10 text-foreground hover:bg-foreground/5" onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    // could show toast here
                }}>
                    <Share2 className="w-4 h-4 mr-2" /> Copy Link
                </Button>
            </div>
          </div>
        </div>
      </article>

      <Footer />
    </div>
  );
};

export default BlogPostDetailPage;