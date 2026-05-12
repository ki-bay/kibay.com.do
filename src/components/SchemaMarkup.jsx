import React from 'react';
import { Helmet } from 'react-helmet';

const SchemaMarkup = ({ type, data }) => {
  let schemaData = {};

  if (type === 'Article') {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": data.headline,
      "description": data.description,
      "image": data.image,
      "datePublished": data.datePublished,
      "dateModified": data.dateModified || data.datePublished,
      "author": {
        "@type": "Person",
        "name": data.author || "Kibay Team"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Kibay",
        "logo": {
          "@type": "ImageObject",
          "url": `${window.location.origin}/logo.png`
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": data.url
      }
    };
  } else if (type === 'BreadcrumbList') {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": data.items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url ? `${window.location.origin}${item.url}` : undefined
      }))
    };
  } else if (type === 'Organization') {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Kibay",
      "url": window.location.origin,
      "logo": `${window.location.origin}/logo.png`,
      "sameAs": [
        "https://www.facebook.com/profile.php?id=61589761255222",
        "https://www.instagram.com/kibay",
        "https://www.tiktok.com/@kibay"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+1-555-555-5555",
        "contactType": "Customer Service"
      }
    };
  } else if (type === 'LocalBusiness') {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kibay.com.do';
    schemaData = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": "Kibay",
      "brand": {
        "@type": "Brand",
        "name": "Kibay"
      },
      "url": (data && data.url) || origin,
      "image": (data && data.image) || `${origin}/og-default.jpg`,
      "logo": `${origin}/logo.png`,
      "description": (data && data.description) || "Kibay crafts organic Caribbean sparkling wine in the Dominican Republic — made with mango and passion fruit at Ocoa Bay.",
      "priceRange": "$$",
      "areaServed": "Caribbean",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "DO"
      },
      "telephone": (data && data.telephone) || undefined
    };
  } else if (type === 'Product') {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": data.name,
      "image": data.image,
      "description": data.description,
      "sku": data.sku,
      "brand": {
        "@type": "Brand",
        "name": "Kibay"
      },
      "offers": {
        "@type": "Offer",
        "url": data.url,
        "priceCurrency": data.currency,
        "price": data.price,
        "availability": data.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "itemCondition": "https://schema.org/NewCondition"
      }
    };

    // Optional aggregate rating (only emit when reviewCount > 0).
    if (
      data.aggregateRating &&
      Number(data.aggregateRating.reviewCount) > 0 &&
      data.aggregateRating.ratingValue != null
    ) {
      schemaData.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": String(data.aggregateRating.ratingValue),
        "reviewCount": String(data.aggregateRating.reviewCount)
      };
    }

    // Optional review array (Schema.org Review). Each entry expects
    // { author, datePublished, ratingValue, reviewBody, name? }.
    if (Array.isArray(data.reviews) && data.reviews.length) {
      schemaData.review = data.reviews.map((r) => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": r.author || "Anonymous"
        },
        "datePublished": r.datePublished,
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": String(r.ratingValue),
          "bestRating": "5",
          "worstRating": "1"
        },
        "name": r.name,
        "reviewBody": r.reviewBody
      }));
    }
  } else if (type === 'FAQPage') {
    schemaData = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": (data?.questions || []).map((q) => ({
        "@type": "Question",
        "name": q.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": (q.answer || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        }
      }))
    };
  }

  if (!Object.keys(schemaData).length) return null;

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
};

export default SchemaMarkup;