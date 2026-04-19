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
        "https://www.facebook.com/kibay",
        "https://www.instagram.com/kibay",
        "https://www.tiktok.com/@kibay"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "telephone": "+1-555-555-5555",
        "contactType": "Customer Service"
      }
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
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
};

export default SchemaMarkup;