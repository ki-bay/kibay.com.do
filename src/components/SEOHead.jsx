import React from 'react';
import { mediaUrl } from '@/config/mediaCdn';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';

const SEOHead = ({
  title,
  description,
  image,
  url,
  type = 'website',
  author,
  canonicalUrl,
  keywords,
  locale,
  noindex = false,
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n && i18n.language ? i18n.language : 'en').toLowerCase().split('-')[0];
  const resolvedLocale = locale || (currentLang === 'es' ? 'es_DO' : 'en_US');
  const alternateLocale = resolvedLocale === 'es_DO' ? 'en_US' : 'es_DO';

  const siteTitle = 'Kibay';
  const fullTitle = title ? title : 'Kibay – Espumante & Caribbean Wine Shop';
  const metaDescription = description || 'Kibay offers modern Caribbean wines and Kibay Espumante, crafted in the Dominican Republic from organic fruits.';
  const metaImage = image || mediaUrl('bc5a0b64ce661332da23e928299b7c41.jpg');
  const metaUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://kibay.com.do/');
  const canonical = canonicalUrl || metaUrl;

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{fullTitle}</title>
      <meta name="description" content={metaDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={canonical} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, follow" />}

      {/* hreflang — single-URL multi-lang setup, same canonical for both */}
      <link rel="alternate" hrefLang="es" href={canonical} />
      <link rel="alternate" hrefLang="en" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={metaDescription} />
      <meta property="og:image" content={metaImage} />
      <meta property="og:url" content={metaUrl} />
      <meta property="og:site_name" content="Kibay" />
      <meta property="og:locale" content={resolvedLocale} />
      <meta property="og:locale:alternate" content={alternateLocale} />

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
