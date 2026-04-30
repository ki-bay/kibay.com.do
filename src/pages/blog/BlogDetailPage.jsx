import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, ArrowLeft, Facebook, Twitter, Linkedin, Share2, Copy } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatBlogDate, calculateReadingTime } from '@/utils/blogUtils';

const BlogDetailPage = () => {
  const { slug } = useParams();
  const { toast } = useToast();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select(`
            *,
            author:users(full_name, avatar_url),
            category:blog_categories(name, slug)
          `)
          .eq('slug', slug)
          .single();

        if (error) throw error;
        setPost(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = post?.title || 'Kibay Blog';
    
    let shareUrl = '';
    
    switch(platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(url);
        toast({ title: "Link Copied", description: "Post URL copied to clipboard." });
        return;
      case 'tiktok':
      case 'instagram':
        navigator.clipboard.writeText(url);
        toast({ 
          title: "Link Copied", 
          description: `Link copied! Open ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} to share.` 
        });
        return;
      default:
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-mango-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-foreground">
        <h1 className="text-4xl font-bold mb-4">Post not found</h1>
        <Link to="/blog" className="text-mango-400 hover:underline">Back to Blog</Link>
      </div>
    );
  }

  // Calculate reading time on the fly if DB value is null, otherwise use DB value
  const readingTime = post.reading_time || calculateReadingTime(post.content);

  // Custom TikTok Icon
  const TikTokIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>
  );

  return (
    <>
      <Helmet>
        <title>{post.title} - Kibay Espumante</title>
        <meta name="description" content={post.excerpt} />
      </Helmet>
      <Navigation />
      
      <article className="min-h-screen bg-background pt-24 pb-20 font-lato">
        {/* Header Image */}
        {post.featured_image_url && (
          <div className="w-full h-[50vh] relative mb-12">
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
            <img 
              src={post.featured_image_url} 
              alt={post.title} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          {/* Back Link */}
          <Link to="/blog" className="inline-flex items-center text-foreground/60 hover:text-mango-400 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blog
          </Link>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/60 mb-6">
            <span className="bg-mango-500/20 text-mango-400 px-3 py-1 rounded-full font-medium">
              {post.category?.name}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formatBlogDate(post.created_at)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {readingTime} min read
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-8 leading-tight">
            {post.title}
          </h1>

          {/* Author & Share */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-y border-foreground/10 py-6 mb-12 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-foreground font-bold text-lg">
                {post.author?.full_name?.charAt(0) || 'K'}
              </div>
              <div>
                <p className="text-foreground font-medium text-lg">{post.author?.full_name || 'Kibay Team'}</p>
                <p className="text-foreground/40 text-sm">Author</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-foreground/40 text-sm mr-2">Share:</span>
              <Button variant="ghost" size="icon" onClick={() => handleShare('facebook')} className="text-foreground/60 hover:text-[#1877F2] hover:bg-foreground/5 transition-colors">
                <Facebook className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleShare('twitter')} className="text-foreground/60 hover:text-[#1DA1F2] hover:bg-foreground/5 transition-colors">
                <Twitter className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleShare('instagram')} className="text-foreground/60 hover:text-[#E4405F] hover:bg-foreground/5 transition-colors">
                <div className="w-5 h-5 flex items-center justify-center"><div className="w-4 h-4 border-2 border-current rounded-sm flex items-center justify-center"><div className="w-1 h-1 bg-current rounded-full"></div></div></div>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleShare('tiktok')} className="text-foreground/60 hover:text-[#ff0050] hover:bg-foreground/5 transition-colors">
                <TikTokIcon className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleShare('copy')} className="text-foreground/60 hover:text-green-400 hover:bg-foreground/5 transition-colors" title="Copy Link">
                <Copy className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none text-foreground/80 leading-relaxed">
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-foreground/10">
              <h3 className="text-sm font-medium text-foreground/60 mb-4 uppercase tracking-wider">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, idx) => (
                  <span key={idx} className="bg-card text-foreground/70 px-4 py-2 rounded-full text-sm hover:bg-slate-700 transition-colors cursor-default">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* Post Footer */}
          <div className="mt-16 bg-card rounded-xl p-8 text-center border border-foreground/5">
             <h3 className="text-2xl text-foreground font-light mb-4">Enjoyed this story?</h3>
             <p className="text-foreground/60 mb-6">Sign up for our newsletter to get the latest stories delivered to your inbox.</p>
             <Link to="/contact">
               <Button className="bg-mango-500 hover:bg-mango-600 text-foreground rounded-full px-8">Subscribe</Button>
             </Link>
          </div>
        </div>
      </article>
      <Footer />
    </>
  );
};

export default BlogDetailPage;