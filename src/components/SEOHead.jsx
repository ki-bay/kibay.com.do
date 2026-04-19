import React from 'react';
import { mediaUrl } from '@/config/mediaCdn';
import { Helmet } from 'react-helmet';

const SEOHead = ({ 
  title, 
  description, 
  image, 
  url, 
  type = 'website', 
  author,
  canonicalUrl,
  keywords
}) => {
  const siteTitle = 'Kibay';
  const fullTitle = title ? title : 'Kibay – Espumante & Caribbean Wine Shop';
  const metaDescription = description || 'Kibay offers modern Caribbean wines and Kibay Espumante, crafted in the Dominican Republic from organic fruits.';
  const metaImage = image || mediaUrl('bc5a0b64ce661332da23e928299b7c41.jpg');
  const metaUrl = url || window.location.href;
  const canonical = canonicalUrl || metaUrl;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:site_name" content="Kibay" />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={metaDescription} />
      <meta name="twitter:image" content={metaImage} />
      
      {/* Article Specific */}
      {type === 'article' && author && <meta name="author" content={author} />}
    </Helmet>
  );
};

export default SEOHead;