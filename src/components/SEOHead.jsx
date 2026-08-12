import React from 'react';
import { mediaUrl } from '@/config/mediaCdn';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';

// Bilingual share-card images, rendered by Cloudinary's text-overlay API.
// The hero photo gets a brightness reduction + 3 text layers (wordmark,
// tagline, kibay.com.do). Update either string here to change what link
// previews show on Facebook, WhatsApp, LinkedIn, iMessage, etc.
const OG_IMAGE_ES =
  'https://res.cloudinary.com/dwewurxla/image/upload/w_1200,h_630,c_fill,g_center,e_brightness:-40/l_text:Arial_150_700:KiB%CE%9BY,co_rgb:D4A574,g_south_west,x_70,y_260/fl_layer_apply/l_text:Arial_40_400:El%20arte%20de%20fermentar%20mango%20y%20fruta%20de%20la%20pasi%C3%B3n.,co_white,g_south_west,x_70,y_180/fl_layer_apply/l_text:Arial_28_400:kibay.com.do,co_rgb:D4A574,g_south_west,x_70,y_90/fl_layer_apply/v1779053427/kibay_-vino_copy_q9mvz8.jpg';
const OG_IMAGE_EN =
  'https://res.cloudinary.com/dwewurxla/image/upload/w_1200,h_630,c_fill,g_center,e_brightness:-40/l_text:Arial_150_700:KiB%CE%9BY,co_rgb:D4A574,g_south_west,x_70,y_260/fl_layer_apply/l_text:Arial_40_400:The%20art%20of%20fermenting%20mango%20and%20passion%20fruit.,co_white,g_south_west,x_70,y_180/fl_layer_apply/l_text:Arial_28_400:kibay.com.do,co_rgb:D4A574,g_south_west,x_70,y_90/fl_layer_apply/v1779053427/kibay_-vino_copy_q9mvz8.jpg';

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
  const metaDescription = description || 'Kibay offers modern Caribbean wines and Kibay Espumante, crafted in the Dominican Republic from sustainable fruits.';
  // Default OG image flips per language. Pages that pass an explicit `image`
  // (e.g. a blog post's hero) override this.
  const defaultOgImage = currentLang === 'es' ? OG_IMAGE_ES : OG_IMAGE_EN;
  const metaImage = image || defaultOgImage;
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
