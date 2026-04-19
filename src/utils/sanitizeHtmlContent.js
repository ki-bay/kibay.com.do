import DOMPurify from 'dompurify';

export const sanitizeHtmlContent = (htmlContent) => {
  if (!htmlContent) return '';
  
  return DOMPurify.sanitize(htmlContent, {
    ADD_TAGS: ['iframe'], // Allow YouTube embeds
    ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'src', 'width', 'height', 'target'],
  });
};