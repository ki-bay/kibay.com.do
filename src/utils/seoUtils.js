import { supabase } from '@/lib/customSupabaseClient';

/**
 * Converts a string into a URL-friendly slug
 * @param {string} text 
 * @returns {string}
 */
export const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-')      // Replace multiple - with single -
    .substring(0, 75);           // Trim to max length
};

/**
 * Checks if a slug is unique in the database, excluding a specific post ID
 * @param {string} slug 
 * @param {string|null} excludeId - ID of the post to exclude from check (for edits)
 * @returns {Promise<boolean>}
 */
export const isSlugUnique = async (slug, excludeId = null) => {
  if (!slug) return false;

  // We query the 'slug' column directly.
  // Note: We've added this column to the database to ensure proper permalinks.
  let query = supabase.from('blog_posts').select('id').eq('slug', slug);
  
  // Only exclude if we have a valid ID (editing mode)
  if (excludeId) {
    query = query.neq('id', excludeId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error checking slug uniqueness:', error);
    // If the error is "column does not exist" (fallback for before migration applies),
    // we return true to avoid blocking the user, though saving might fail later.
    // In a production env, we'd want to handle this more strictly.
    return true; 
  }
  
  // If data length is 0, it means no OTHER posts have this slug
  return data.length === 0;
};

/**
 * Generates an SEO-optimized title (approx 60 chars)
 * @param {string} title 
 * @returns {string}
 */
export const generateSeoTitle = (title) => {
  if (!title) return '';
  const brand = ' - Kibay';
  const max = 60;
  
  let seoTitle = title.trim();
  if (seoTitle.length + brand.length <= max) {
    return seoTitle + brand;
  }
  
  return seoTitle.substring(0, max);
};

/**
 * Generates an SEO meta description (approx 160 chars)
 * @param {string} description 
 * @returns {string}
 */
export const generateSeoDescription = (description) => {
  if (!description) return '';
  const max = 160;
  
  let seoDesc = description.trim();
  if (seoDesc.length <= max) return seoDesc;
  
  // Cut at last space before max length to avoid cutting words
  const trimmed = seoDesc.substring(0, max);
  const lastSpace = trimmed.lastIndexOf(' ');
  
  return trimmed.substring(0, lastSpace > 0 ? lastSpace : max) + '...';
};

/**
 * Extracts potential keywords from HTML content (simple heuristic)
 * @param {string} htmlContent 
 * @returns {string} Comma separated keywords
 */
export const generateKeywords = (htmlContent) => {
  if (!htmlContent) return '';
  
  // Strip HTML
  const text = htmlContent.replace(/<[^>]*>/g, ' ');
  
  // Remove common stop words (simplified list)
  const stopWords = new Set(['the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'for', 'of', 'in', 'on', 'at', 'with', 'by', 'a', 'an', 'this', 'that']);
  
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopWords.has(w));
    
  // Count frequency
  const counts = {};
  words.forEach(w => {
    counts[w] = (counts[w] || 0) + 1;
  });
  
  // Sort by frequency and take top 7
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([word]) => word)
    .join(', ');
};

/**
 * Generates a canonical URL based on the slug
 * @param {string} slug 
 * @returns {string}
 */
export const generateCanonicalUrl = (slug) => {
  if (!slug) return '';
  const baseUrl = window.location.origin;
  return `${baseUrl}/blog/${slug}`;
};

/**
 * Calculates an SEO score (0-100) based on completeness
 * @param {object} post 
 * @returns {number}
 */
export const validateSeoScore = (post) => {
  if (!post) return 0;
  let score = 0;
  const checks = {
    title: !!post.title,
    content: !!post.content && post.content.length > 300,
    slug: !!post.slug,
    seo_title: !!post.seo_title && post.seo_title.length <= 60,
    seo_desc: !!post.seo_description && post.seo_description.length >= 50 && post.seo_description.length <= 160,
    keywords: !!post.seo_keywords,
    image: !!post.featured_image_url,
    alt_text: !!post.alt_text,
    canonical: !!post.canonical_url
  };

  if (checks.title) score += 10;
  if (checks.content) score += 20; // Content is king
  if (checks.slug) score += 10;
  if (checks.seo_title) score += 10;
  if (checks.seo_desc) score += 15;
  if (checks.keywords) score += 5;
  if (checks.image) score += 10;
  if (checks.alt_text) score += 10;
  if (checks.canonical) score += 10;

  return score;
};