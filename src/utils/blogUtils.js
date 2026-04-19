/**
 * Calculates the estimated reading time for a given text.
 * Assumes an average reading speed of 200 words per minute.
 * 
 * @param {string} content - The text content to analyze
 * @returns {number} - Reading time in minutes (minimum 1)
 */
export const calculateReadingTime = (content) => {
  if (!content) return 0;
  
  // Strip HTML tags if present
  const plainText = content.replace(/<[^>]*>/g, '');
  
  // Count words (splitting by whitespace)
  const words = plainText.trim().split(/\s+/).length;
  
  // Calculate time (words / 200 wpm)
  const time = Math.ceil(words / 200);
  
  // Return at least 1 minute if there is content
  return time < 1 ? 1 : time;
};

/**
 * Formats a date for display
 * @param {string} dateString 
 * @returns {string}
 */
export const formatBlogDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};