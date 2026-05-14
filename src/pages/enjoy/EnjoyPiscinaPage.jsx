import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Sun, Calendar, MapPin } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

const HERO_IMAGE = 'https://res.cloudinary.com/dwewurxla/image/upload/v1778724366/casa_Club_kibay_ocoa_bay_picina_fxtzv8.webp';
const GALLERY = [
  'https://res.cloudinary.com/dwewurxla/image/upload/v1778724360/Babula_Shots_Rd_-22_wqsudi.webp',
  'https://res.cloudinary.com/dwewurxla/image/upload/v1778724361/Babula_Shots_Rd_-13_payok4.webp',
  'https://res.cloudinary.com/dwewurxla/image/upload/v1778724363/Babula_Shots_Rd_-8_o2cjmw.webp',
];

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8 },
};

const EnjoyPiscinaPage = () => {
  const { t, i18n } = useTranslation('enjoyPiscina');
  const lang = (i18n.resolvedLanguage || i18n.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
  const [experiences, setExperiences] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, slug, title_es, title_en, subtitle_es, subtitle_en, thumbnail_url, sort_order, type, status, product_images(url, sort_order), metadata, product_variants(price_usd_cents, price_dop_cents, sort_order)')
          .eq('type', 'experience')
          .eq('status', 'published')
          .order('sort_order', { ascending: true });
        if (error) throw error;
        if (!cancelled) setExperiences(Array.isArray(data) ? data : []);
      } catch (_e) {
        if (!cancelled) setExperiences([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const formatPrice = (p) => {
    if (!p) return null;
    if (p.metadata?.price_by_consumption) {
      return { display: lang === 'en' ? 'By consumption' : 'Por consumo', perPerson: false };
    }
    if (!p.product_variants || !p.product_variants.length) return null;
    const v = [...p.product_variants].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))[0];
    const cents = lang === 'en' ? v.price_usd_cents : v.price_dop_cents;
    if (cents == null || cents === 0) return null;
    const symbol = lang === 'en' ? 'US$' : 'RD$';
    return { display: `${symbol}${(cents / 100).toFixed(0)}`, perPerson: true };
  };

  return (
    <>
      <Helmet>
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
      </Helmet>

      <Navigation />

      <main id="main" role="main" className="bg-background text-foreground">
        {/* Hero */}
        <section className="relative min-h-[88vh] flex items-end overflow-hidden">
          <img
            src={HERO_IMAGE}
            alt={t('hero.imageAlt')}
            width="2400"
            height="1600"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30" />

          <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-10 pb-20 pt-32 w-full">
            <m.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9 }}
            >
              <span className="inline-block text-xs sm:text-sm uppercase tracking-[0.3em] text-[#D4A574] font-medium mb-5">
                {t('hero.eyebrow')}
              </span>
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-white leading-[1.05] mb-6 drop-shadow-lg">
                {t('hero.title')}
              </h1>
              <p className="text-lg sm:text-xl text-white/90 font-light max-w-2xl leading-relaxed mb-10 drop-shadow">
                {t('hero.lead')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/blog">
                  <Button className="bg-[#D4A574] hover:bg-[#c29462] text-foreground rounded-full px-8 py-6 text-base shadow-lg">
                    {t('hero.ctaBlog')} <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/shop">
                  <Button variant="outline" className="bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/40 text-white hover:text-white rounded-full px-8 py-6 text-base">
                    <Calendar className="mr-2 w-4 h-4" /> {t('hero.ctaBook')}
                  </Button>
                </Link>
              </div>
            </m.div>
          </div>
        </section>

        {/* Story */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
          <m.div {...fadeIn} className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 text-[#D4A574] text-sm uppercase tracking-[0.25em] mb-6">
              <Sun size={16} aria-hidden="true" />
              <span>Piscina · Casa Club · Bahía de Ocoa</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-foreground mb-10 leading-tight">
              {t('story.heading')}
            </h2>
            <div className="space-y-6 text-lg text-foreground/80 font-light leading-relaxed">
              <p>{t('story.p1')}</p>
              <p>{t('story.p2')}</p>
              <p>{t('story.p3')}</p>
            </div>
          </m.div>
        </section>

        {/* Gallery */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card">
          <div className="max-w-7xl mx-auto">
            <m.h2 {...fadeIn} className="text-2xl sm:text-3xl font-serif text-foreground mb-10 text-center">
              {t('galleryHeading')}
            </m.h2>
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 sm:gap-6 [column-fill:_balance]">
              {GALLERY.map((src, i) => (
                <m.div
                  key={src}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  className="mb-4 sm:mb-6 break-inside-avoid overflow-hidden rounded-2xl shadow-xl bg-background"
                >
                  <img
                    src={src}
                    alt={`${t('hero.imageAlt')} — ${i + 1}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto block hover:scale-[1.02] transition-transform duration-700"
                  />
                </m.div>
              ))}
            </div>
          </div>
        </section>

        {/* Experiences */}
        {experiences.length > 0 && (
          <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
            <div className="max-w-7xl mx-auto">
              <m.div {...fadeIn} className="text-center mb-14">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A574]/10 text-[#D4A574] rounded-full text-sm font-medium tracking-wide uppercase mb-5">
                  <MapPin size={14} aria-hidden="true" /> Ocoa Bay
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-foreground mb-5">
                  {t('experiences.heading')}
                </h2>
                <p className="text-foreground/60 max-w-2xl mx-auto text-lg font-light">
                  {t('experiences.subheading')}
                </p>
              </m.div>

              <div className="grid md:grid-cols-3 gap-8">
                {experiences.slice(0, 3).map((p, i) => {
                  const title = lang === 'en' ? (p.title_en || p.title_es) : (p.title_es || p.title_en);
                  const subtitle = lang === 'en' ? (p.subtitle_en || p.subtitle_es) : (p.subtitle_es || p.subtitle_en);
                  const img = p.thumbnail_url || (p.product_images?.[0]?.url) || HERO_IMAGE;
                  const price = formatPrice(p);
                  return (
                    <m.div
                      key={p.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: i * 0.1 }}
                      className="bg-card rounded-2xl shadow-xl border border-foreground/5 overflow-hidden flex flex-col hover:-translate-y-2 transition-transform duration-300"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-background">
                        <img
                          src={img}
                          alt={title || 'Ocoa Bay experience'}
                          width="800"
                          height="600"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <h3 className="text-xl font-serif text-foreground mb-2">{title}</h3>
                        {subtitle && <p className="text-foreground/60 font-light text-sm mb-4 flex-1">{subtitle}</p>}
                        {price && (
                          <div className="text-2xl font-serif text-foreground mb-4">
                            {price.display} {price.perPerson && <span className="text-xs font-light text-foreground/50">{t('experiences.perPerson')}</span>}
                          </div>
                        )}
                        <Link to={`/product/${p.slug}`} className="mt-auto">
                          <Button className="w-full bg-[#D4A574] hover:bg-[#c29462] text-foreground rounded-xl py-5">
                            {t('experiences.reserve')} <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </m.div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Closing CTA */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-card text-center">
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl mx-auto"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-foreground mb-5">
              {t('closing.heading')}
            </h2>
            <p className="text-foreground/70 text-lg font-light mb-10 leading-relaxed">
              {t('closing.body')}
            </p>
            <Link to="/#enjoy">
              <Button className="bg-[#D4A574] hover:bg-[#c29462] text-foreground rounded-full px-10 py-7 text-lg shadow-lg hover:scale-105 transition-transform">
                {t('closing.cta')} <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </m.div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default EnjoyPiscinaPage;
