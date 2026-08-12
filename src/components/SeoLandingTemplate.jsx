import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { m } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, MapPin, Wine, Grape, ExternalLink } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

// Shared template for the keyword-cluster landing pages
// (/wine-tasting-near-me, /passion-fruit-mango-wine, ...). Each topic page
// passes a `slug` map (es + en URL slugs for hreflang) and a `content` map
// (per-language copy + featured cards + FAQs). The template handles SEO
// head, schema JSON-LD (Product / TouristAttraction / FAQPage /
// BreadcrumbList) and the visual layout. No i18n JSON namespaces — the
// copy lives in the page config so each landing page is one self-contained
// file that's easy to tweak per keyword intent.
//
// Language is picked from the URL slug, NOT from the user's i18n choice —
// /wine-tasting-near-me always renders English; /cata-de-vinos-cerca-de-mi
// always renders Spanish. This keeps the URL language consistent with the
// page content so Google indexes each slug to the right locale. On mount
// the global i18n language is also synced so nav + footer match.

const SITE = 'https://kibay.com.do';

const SeoLandingTemplate = ({ slug, content }) => {
  const { i18n } = useTranslation();
  const location = useLocation();
  // URL is the source of truth for which language to render.
  const lang = location.pathname === `/${slug.en}` ? 'en' : 'es';
  const c = content[lang];

  useEffect(() => {
    if (i18n.language?.startsWith(lang)) return;
    i18n.changeLanguage(lang);
  }, [lang, i18n]);
  const altLang = lang === 'en' ? 'es' : 'en';
  const currentPath = `/${slug[lang]}`;
  const altPath = `/${slug[altLang]}`;
  const canonical = `${SITE}${currentPath}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: lang === 'es' ? 'Inicio' : 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: c.title, item: canonical },
    ],
  };

  const faqSchema = c.faqs?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: c.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  const productSchemas = (c.cards || [])
    .filter((card) => card.schema)
    .map((card) => ({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: card.schema.name,
      image: card.image,
      description: card.body,
      brand: { '@type': 'Brand', name: 'Kibay' },
      offers: {
        '@type': 'Offer',
        url: `${SITE}${card.ctaUrl}`,
        priceCurrency: card.schema.currency || 'USD',
        price: String(card.schema.price),
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
      },
    }));

  const touristAttractionSchema = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: 'Ocoa Bay Vineyard',
    description:
      lang === 'es'
        ? 'Viñedo sostenible caribeño y bodega de Kibay en Bahía de Ocoa, Azua, República Dominicana. Catas de vino, recorridos guiados y Casa Club frente al mar.'
        : 'Caribbean sustainable vineyard and Kibay winery at Bahía de Ocoa, Azua, Dominican Republic. Wine tastings, guided tours and ocean-front Casa Club.',
    image: c.heroImage,
    url: 'https://ocoabay.com',
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Km 6½ Hatillo',
      addressLocality: 'Bahía de Ocoa',
      addressRegion: 'Azua',
      addressCountry: 'DO',
    },
    isAccessibleForFree: false,
    publicAccess: true,
    touristType: lang === 'es' ? ['Amantes del vino', 'Turistas', 'Locales'] : ['Wine lovers', 'Tourists', 'Locals'],
  };

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>{c.seoTitle}</title>
        <meta name="description" content={c.seoDescription} />
        <meta name="keywords" content={c.seoKeywords} />
        <link rel="canonical" href={canonical} />
        <link rel="alternate" hrefLang={lang} href={canonical} />
        <link rel="alternate" hrefLang={altLang} href={`${SITE}${altPath}`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE}${altPath}`} />

        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:title" content={c.seoTitle} />
        <meta property="og:description" content={c.seoDescription} />
        <meta property="og:image" content={c.heroImage} />
        <meta property="og:locale" content={lang === 'es' ? 'es_DO' : 'en_US'} />
        <meta property="og:locale:alternate" content={lang === 'es' ? 'en_US' : 'es_DO'} />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={c.seoTitle} />
        <meta name="twitter:description" content={c.seoDescription} />
        <meta name="twitter:image" content={c.heroImage} />

        <link rel="preload" as="image" href={c.heroImage} fetchpriority="high" />

        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(touristAttractionSchema)}</script>
        {productSchemas.map((s, i) => (
          <script key={i} type="application/ld+json">
            {JSON.stringify(s)}
          </script>
        ))}
        {faqSchema && <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>}
      </Helmet>

      <Navigation />

      <main id="main" role="main" className="bg-background">
        {/* Hero */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-20">
          <div className="absolute inset-0 z-0">
            <img
              src={c.heroImage}
              alt={c.heroImageAlt}
              width="1920"
              height="1080"
              fetchpriority="high"
              decoding="async"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-background"></div>
          </div>

          <m.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9 }}
            className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          >
            <span className="inline-block text-xs sm:text-sm uppercase tracking-[0.3em] text-[#D4A574] font-medium mb-4">
              {c.eyebrow}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-light mb-6 text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
              {c.title}
            </h1>
            <p className="text-lg sm:text-xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
              {c.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
              <Link
                to={c.ctaPrimary.url}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#D4A574] text-stone-950 font-medium hover:bg-[#c29462] transition-colors shadow-lg"
              >
                {c.ctaPrimary.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={c.ctaSecondary.url}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-white/40 bg-white/5 backdrop-blur-sm text-white font-medium hover:bg-white/15 transition-colors"
              >
                {c.ctaSecondary.label}
              </Link>
            </div>
          </m.div>
        </section>

        {/* Story */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <m.h2
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="text-3xl sm:text-4xl font-light text-foreground mb-8 text-center"
            >
              {c.storyHeading}
            </m.h2>
            <div className="w-20 h-1 bg-[#D4A574] mx-auto mb-12"></div>
            <div className="space-y-6 text-lg text-foreground/80 leading-relaxed font-light">
              {c.storyParagraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>

        {/* Featured cards (2 CTAs) */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-4 text-center">
              {c.cardsHeading}
            </h2>
            <p className="text-foreground/70 text-lg font-light max-w-2xl mx-auto text-center mb-12">
              {c.cardsSubheading}
            </p>
            <div className="grid md:grid-cols-2 gap-8">
              {c.cards.map((card) => (
                <Link
                  key={card.ctaUrl}
                  to={card.ctaUrl}
                  className="group block bg-background rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.imageAlt}
                      loading="lazy"
                      decoding="async"
                      width="1200"
                      height="900"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </div>
                  <div className="p-7">
                    <div className="flex items-center gap-2 text-[#D4A574] text-xs uppercase tracking-[0.2em] mb-3 font-medium">
                      {card.kind === 'experience' ? <MapPin className="w-3.5 h-3.5" /> : <Wine className="w-3.5 h-3.5" />}
                      {card.kindLabel}
                    </div>
                    <h3 className="text-2xl font-normal text-foreground mb-3">{card.title}</h3>
                    <p className="text-foreground/75 leading-relaxed font-light mb-5">{card.body}</p>
                    <span className="inline-flex items-center gap-2 text-[#D4A574] font-medium group-hover:gap-3 transition-all">
                      {card.ctaLabel}
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Ocoa Bay context */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <Grape className="w-10 h-10 text-[#D4A574] mx-auto mb-6" strokeWidth={1.5} />
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">
              {c.ocoaHeading}
            </h2>
            <div className="w-20 h-1 bg-[#D4A574] mx-auto mb-8"></div>
            <p className="text-lg text-foreground/80 leading-relaxed font-light mb-8">
              {c.ocoaBody}
            </p>
            <a
              href="https://ocoabay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#D4A574] font-medium hover:text-[#c29462] transition-colors"
            >
              {c.ocoaCta}
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* FAQ */}
        {c.faqs?.length > 0 && (
          <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-12 text-center">
                {c.faqHeading}
              </h2>
              <div className="space-y-6">
                {c.faqs.map((f, i) => (
                  <m.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="bg-background rounded-2xl p-6 sm:p-7 border border-foreground/10"
                  >
                    <h3 className="text-lg font-medium text-foreground mb-2">{f.q}</h3>
                    <p className="text-foreground/75 leading-relaxed font-light">{f.a}</p>
                  </m.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Closing CTA */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl sm:text-4xl font-light text-foreground mb-6">
              {c.closingHeading}
            </h2>
            <p className="text-foreground/75 text-lg font-light leading-relaxed mb-10">
              {c.closingBody}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={c.ctaPrimary.url}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#D4A574] text-stone-950 font-medium hover:bg-[#c29462] transition-colors shadow-lg"
              >
                {c.ctaPrimary.label}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to={c.ctaSecondary.url}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full border border-foreground/30 text-foreground font-medium hover:bg-foreground/5 transition-colors"
              >
                {c.ctaSecondary.label}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default SeoLandingTemplate;
