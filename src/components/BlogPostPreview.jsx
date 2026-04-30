import React from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatBlogDate, calculateReadingTime } from '@/utils/blogUtils';

const BlogPostPreview = ({ post, onClose, authorName }) => {
  // Calculate reading time on the fly for preview if not saved yet
  const readingTime = calculateReadingTime(post.content);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-background w-full max-w-4xl rounded-2xl border border-foreground/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-4 border-b border-foreground/10 bg-card">
          <h3 className="text-foreground font-medium">Preview Mode</h3>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-foreground/60 hover:text-foreground">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 p-0">
          <article className="min-h-full bg-background pb-12">
            {/* Header Image */}
            {post.featured_image_url ? (
              <div className="w-full h-64 md:h-80 relative mb-8">
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent z-10"></div>
                <img 
                  src={post.featured_image_url} 
                  alt={post.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-32 bg-card mb-8 flex items-center justify-center text-foreground/20">
                No Featured Image
              </div>
            )}

            <div className="max-w-3xl mx-auto px-6">
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-foreground/60 mb-6">
                <span className="bg-mango-500/20 text-mango-400 px-3 py-1 rounded-full font-medium">
                  {post.category_name || 'Uncategorized'}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {post.scheduled_publish_at 
                    ? `Scheduled: ${formatBlogDate(post.scheduled_publish_at)}` 
                    : formatBlogDate(new Date())}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {readingTime} min read
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight">
                {post.title || 'Untitled Post'}
              </h1>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-xl text-foreground/70 font-light mb-8 italic border-l-4 border-mango-500 pl-4">
                  {post.excerpt}
                </p>
              )}

              {/* Author */}
              <div className="flex items-center justify-between border-y border-foreground/10 py-6 mb-10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-foreground font-bold">
                    {authorName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-foreground font-medium">{authorName || 'Current User'}</p>
                    <p className="text-foreground/40 text-xs">Author</p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-invert prose-lg max-w-none text-foreground/80">
                <div dangerouslySetInnerHTML={{ __html: post.content || '<p>Start writing your content...</p>' }} />
              </div>

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mt-12 pt-8 border-t border-foreground/10">
                  <h3 className="text-sm font-medium text-foreground/60 mb-4 uppercase tracking-wider">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag, idx) => (
                      <span key={idx} className="bg-card text-foreground/70 px-3 py-1 rounded text-sm">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </article>
        </div>
      </motion.div>
    </div>
  );
};

export default BlogPostPreview;