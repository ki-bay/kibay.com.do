import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight } from 'lucide-react';

const BlogPostCard = ({ post }) => {
  const { id, title, description, featured_image_url, author_email, created_at } = post;
  
  const formattedDate = new Date(created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="group bg-card rounded-xl overflow-hidden border border-foreground/5 hover:border-mango-500/30 transition-all duration-300 flex flex-col h-full shadow-lg"
    >
      <Link to={`/blog/${id}`} className="block relative aspect-video overflow-hidden bg-background">
        {featured_image_url ? (
          <img 
            src={featured_image_url} 
            alt={title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-card relative overflow-hidden">
             {/* Fallback pattern or placeholder */}
            <div className="absolute inset-0 bg-gradient-to-br from-card to-background" />
            <span className="relative z-10 text-foreground/10 text-4xl font-bold">Ki-BAY</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-60" />
      </Link>

      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-4 text-xs text-foreground/40 mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formattedDate}
          </span>
          {author_email && (
            <span className="flex items-center gap-1 truncate max-w-[150px]">
              <User className="w-3 h-3" />
              {author_email.split('@')[0]}
            </span>
          )}
        </div>

        <Link to={`/blog/${id}`} className="group-hover:text-mango-400 transition-colors">
          <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">{title}</h3>
        </Link>
        
        <p className="text-foreground/60 text-sm mb-4 line-clamp-3 flex-grow">
          {description}
        </p>

        <Link 
          to={`/blog/${id}`}
          className="inline-flex items-center text-mango-400 text-sm font-medium hover:text-mango-300 mt-auto"
        >
          Read Article <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </motion.div>
  );
};

export default BlogPostCard;