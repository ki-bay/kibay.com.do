import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { ArrowLeft, Calendar, User, Clock, Share2, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { sanitizeHtmlContent } from '@/utils/sanitizeHtmlContent';
import SEOHead from '@/components/SEOHead';
import SchemaMarkup from '@/components/SchemaMarkup';
import BreadcrumbNav from '@/components/BreadcrumbNav';
import pickLocalized from '@/lib/pickLocalized';
import '@/styles/editor.css';

// Strip the first <figure>...</figure> block in body HTML whose <img src>
// matches the featured image URL. The Drive pipeline always uses image[0]
// both as the hero (post.featured_image_url) AND as the body's first
// {{IMAGE_1}} placeholder, so without this the same photo renders twice on
// the detail page. Defensive: matches both quote styles, ignores any
// trailing query string, and only strips the FIRST match (so multi-image
// posts keep their gallery intact).
function stripFirstMatchingFigure(html, imageUrl) {
  if (!html || !imageUrl) return html;
  // Match the URL up to ? so storage cache-busters don't defeat the match
  const baseUrl = String(imageUrl).split('?')[0];
  if (!baseUrl) return html;
  const escaped = baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Find the first <figure>...</figure> whose inner <img src> begins with baseUrl
  const re = new RegExp(
    `<figure\\b[^>]*>[\\s\\S]*?<img\\b[^>]*\\bsrc=["']${escaped}(?:[^"']*)?["'][^>]*>[\\s\\S]*?<\\/figure>`,
    'i',
  );
  return html.replace(re, '');
}

const BlogPostDetailPage = () => {
  const { t, i18n } = useTranslation('blogPostDetail');
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const userEmail = user?.email?.toLowerCase() || null;

  useEffect(() => {
    let cancelled = false;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const column = UUID_RE.test(id) ? 'id' : 'slug';

    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq(column, id)
          .single();

        if (error) throw error;

        if (!data.published && userEmail !== 'info@kibay.com.do') {
          throw new Error('Post not found or unpublished');
        }

        if (!cancelled) setPost(data);
      } catch (err) {
        if (!cancelled) setError('Post not found');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPost();
    return () => {
      cancelled = true;
    };
  }, [id, userEmail]);

  if (loading) {
    return (
      <main id="main" role="main" className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-mango-500 animate-spin" />
      </main>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <main id="main" role="main" className="flex-grow flex items-center justify-center p-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-foreground mb-4">{t('notFound.title')}</h2>
            <p className="text-foreground/60 mb-8">{t('notFound.description')}</p>
            <Link to="/blog">
              <Button className="bg-mango-500 hover:bg-mango-600">{t('notFound.back')}</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const lang = i18n.language?.startsWith('en') ? 'en' : 'es';
  const title = pickLocalized(post, 'title', lang);
  const description = pickLocalized(post, 'description', lang);
  const content = pickLocalized(post, 'content', lang);
  const seoTitle = pickLocalized(post, 'seo_title', lang) || title;
  const seoDescription = pickLocalized(post, 'seo_description', lang) || description;
  const seoKeywords = pickLocalized(post, 'seo_keywords', lang);
  const altText = pickLocalized(post, 'alt_text', lang) || title;

  const wordCount = content ? content.replace(/<[^>]*>/g, '').split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const schemaData = {
    headline: seoTitle,
    description: seoDescription,
    image: post.featured_image_url,
    datePublished: post.created_at,
    dateModified: post.updated_at,
    author: t('defaultAuthor'), // Or dynamic if we have author names
    url: window.location.href
  };

  const locale = lang === 'en' ? 'en-US' : 'es-DO';

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        image={post.featured_image_url}
        url={post.canonical_url || window.location.href}
        type="article"
        keywords={seoKeywords}
        canonicalUrl={post.canonical_url}
      />

      <SchemaMarkup type="Article" data={schemaData} />

      <Navigation />

      <main id="main" role="main">
      <article className="pt-28 pb-20">
        {/* Breadcrumb & Header */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mb-8">
            <BreadcrumbNav items={[
                { name: t('breadcrumbBlog'), url: '/blog' },
                { name: title, url: '#' }
            ]} />

          <Link to="/blog" className="inline-flex items-center text-mango-400 hover:text-mango-300 mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t('backToArticles')}
          </Link>

          {!post.published && (
             <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg inline-block text-sm font-medium">
                {t('draftBadge')}
             </div>
          )}

          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
            {title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-foreground/60 border-b border-foreground/10 pb-8">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-mango-500" />
              {new Date(post.created_at).toLocaleDateString(locale, {
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
               {t('minRead', { count: readTime })}
            </div>
          </div>
        </div>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-12">
            <m.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-video rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src={post.featured_image_url}
                alt={altText}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </m.div>
          </div>
        )}

        {/* Content — strip the first inline <figure> whose <img src> matches
            the featured image so it doesn't render twice (Drive pipeline
            uses image[0] as both the hero and the body's first {{IMAGE_1}}
            placeholder). Defensive against quote style + minor URL drift. */}
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div
            className="blog-content-renderer"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtmlContent(
                stripFirstMatchingFigure(content, post.featured_image_url),
              ),
            }}
          />

          {/* Share Section */}
          <div className="mt-16 pt-8 border-t border-foreground/10 flex items-center justify-between">
            <span className="text-foreground/60 font-medium">{t('share')}</span>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-foreground/10 text-foreground hover:bg-foreground/5" onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    // could show toast here
                }}>
                    <Share2 className="w-4 h-4 mr-2" /> {t('copyLink')}
                </Button>
            </div>
          </div>
        </div>
      </article>
      </main>

      <Footer />
    </div>
  );
};

export default BlogPostDetailPage;