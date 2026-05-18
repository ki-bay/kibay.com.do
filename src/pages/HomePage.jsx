import React, { useEffect, useState } from 'react';
import { m, useScroll } from 'framer-motion';
import { Leaf, Zap, ArrowRight, ShoppingBag, MapPin, GlassWater, Sun, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Card from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProducts } from '@/api/EcommerceApi';
import SEOHead from '@/components/SEOHead';
import SchemaMarkup from '@/components/SchemaMarkup';
import { mediaUrl } from '@/config/mediaCdn';

const HomePage = () => {
  const { scrollY } = useScroll();
  const { t } = useTranslation('home');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data.products || []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Helper to find specific product images or use safe fallbacks
  const getProductImage = (term, fallbackUrl) => {
    if (!products.length) return fallbackUrl;
    const product = products.find(p => p.title.toLowerCase().includes(term.toLowerCase()));
    // Try to get image from various possible API structures
    return product?.image || product?.images?.[0]?.url || fallbackUrl;
  };

  const sparklingImage = getProductImage('sparkling', mediaUrl('bc5a0b64ce661332da23e928299b7c41.jpg'));
  const wineImage = getProductImage('wine', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2940&auto=format&fit=crop');

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <>
      <SEOHead
        title={t('seo.title')}
        description={t('seo.description')}
      />
      <SchemaMarkup type="LocalBusiness" />
      <SchemaMarkup type="Organization" />

      <Navigation />

      <main id="main" role="main">
      {/* Hero Section — wide cinematic full-bleed image with text overlay */}
      <section className="relative min-h-[88vh] lg:min-h-screen flex items-center overflow-hidden font-lato">
        {/* Background image — fills the section, served from Cloudinary
            with f_auto for AVIF/WebP, q_auto for quality, and a 2400px cap.
            object-cover keeps the framing intact across viewports. */}
        <picture className="absolute inset-0 w-full h-full">
          <source
            media="(min-width: 1024px)"
            srcSet="https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_2400/v1779053427/kibay_-vino_copy_q9mvz8.webp"
          />
          <img
            src="https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1779053427/kibay_-vino_copy_q9mvz8.webp"
            alt={t('hero.imgAlt')}
            width="2428"
            height="1366"
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </picture>

        {/* Legibility gradient — heavier on the left (where the text lives)
            on desktop; vertical fade on mobile so the whole image stays visible. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/80 lg:bg-gradient-to-r lg:from-black/80 lg:via-black/55 lg:to-transparent"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full pt-28 pb-16 lg:py-32">
          <m.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="flex flex-col items-start text-left space-y-6 lg:space-y-8 max-w-2xl"
          >
            <m.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-400/30 text-orange-300 text-sm font-medium tracking-wider uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
              {t('hero.badge')}
            </m.div>

            <m.h1
              variants={fadeIn}
              aria-label="KIBAY"
              className="brand-wordmark text-6xl sm:text-7xl lg:text-8xl xl:text-9xl text-white leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-300 to-orange-500">
                {t('hero.h1')}
              </span>
            </m.h1>

            <m.div variants={fadeIn} className="space-y-4 max-w-xl">
              <p className="text-xl sm:text-2xl lg:text-3xl text-white font-light leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)]">
                {t('hero.tagline')}
              </p>
              <p className="text-base sm:text-lg text-white/85 font-light leading-relaxed drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                {t('hero.description')}
              </p>
            </m.div>

            <m.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 pt-2">
              <Link to="/shop" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-normal rounded-full px-8 py-6 text-lg shadow-[0_0_30px_rgba(249,115,22,0.4)] hover:shadow-[0_0_40px_rgba(249,115,22,0.6)] transition-all hover:scale-105">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {t('hero.ctaShop')}
                </Button>
              </Link>
              <Link to="/about" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto border-white/40 bg-white/5 hover:bg-white/15 text-white hover:text-white backdrop-blur-sm font-normal rounded-full px-8 py-6 text-lg">
                  {t('hero.ctaAbout')}
                </Button>
              </Link>
            </m.div>
          </m.div>
        </div>

        {/* Scroll Indicator */}
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60 hidden lg:flex"
        >
          <span className="text-xs uppercase tracking-widest font-light">{t('hero.scroll')}</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/50 to-transparent"></div>
        </m.div>
      </section>

      {/* Our Story / Origin Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-card overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)] font-lato">
        <div className="max-w-7xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-6">
              <Trans
                i18nKey="home:origin.heading"
                components={{ accent: <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal" /> }}
              />
            </h2>
            <p className="text-foreground/60 max-w-2xl mx-auto text-lg font-light">
              {t('origin.body')}
            </p>
          </m.div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <m.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <Link to="/mango">
                <Card className="overflow-hidden h-full rounded-3xl border-none shadow-2xl bg-background relative">
                  <div className="relative h-[500px] overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1697350495566-a094004aedd8"
                      alt={t('origin.mango.imgAlt')}
                      width="1200"
                      height="900"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover bg-center transform group-hover:scale-105 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 text-center">
                      <span className="text-orange-400 font-medium tracking-wider text-sm uppercase mb-2 block">{t('origin.mango.eyebrow')}</span>
                      <h3 className="text-3xl font-normal text-foreground mb-4">{t('origin.mango.title')}</h3>
                      <p className="text-foreground/80 leading-relaxed text-lg mb-6 font-light">{t('origin.mango.body')}</p>
                      <div className="flex items-center justify-center text-foreground font-medium group-hover:text-orange-400 transition-colors">
                        {t('origin.mango.cta')} <ArrowRight className="ml-2 w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </m.div>

            <m.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <Link to="/passion-fruit">
                <Card className="overflow-hidden h-full rounded-3xl border-none shadow-2xl bg-background relative">
                  <div className="relative h-[500px] overflow-hidden">
                    <img
                      src={mediaUrl('ai-generated-8983326-k1zSk.jpg')}
                      alt={t('origin.passion.imgAlt')}
                      width="1200"
                      height="900"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover bg-center transform group-hover:scale-105 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent opacity-90"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 text-center">
                      <span className="text-orange-400 font-medium tracking-wider text-sm uppercase mb-2 block">{t('origin.passion.eyebrow')}</span>
                      <h3 className="text-3xl font-normal text-foreground mb-4">{t('origin.passion.title')}</h3>
                      <p className="text-foreground/80 leading-relaxed text-lg mb-6 font-light">{t('origin.passion.body')}</p>
                      <div className="flex items-center justify-center text-foreground font-medium group-hover:text-orange-400 transition-colors">
                        {t('origin.passion.cta')} <ArrowRight className="ml-2 w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </m.div>
          </div>
        </div>
      </section>

      {/* Wine Clarity Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-background font-lato text-center">
        <div className="max-w-3xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-6">
              {t('wineFirst.heading')}
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto text-lg font-light">
              {t('wineFirst.body')}
            </p>
          </m.div>
        </div>
      </section>

      {/* Full-bleed cinematic band — sits between "Wine First. Always." and
          "The Kibay Difference". Mobile gets a 4:3 crop so the photo feels
          immersive; desktop drops to a 21:9 letterbox so it reads as a
          wide brand band. */}
      <section className="relative w-full overflow-hidden bg-background">
        <picture>
          <source
            media="(min-width: 1024px)"
            srcSet="https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_2400/v1779051339/bc5a0b64ce661332da23e928299b7c41_ey4vsd.webp"
          />
          <img
            src="https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1779051339/bc5a0b64ce661332da23e928299b7c41_ey4vsd.webp"
            alt={t('hero.imgAlt')}
            width="1600"
            height="900"
            loading="lazy"
            decoding="async"
            className="block w-full h-auto aspect-[4/3] sm:aspect-[16/9] lg:aspect-[21/9] object-cover"
          />
        </picture>
      </section>

      {/* Features Section (The Kibay Difference) */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-background font-lato">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-center mb-6 text-foreground">
              {t('difference.heading')}
            </h2>
            <p className="text-foreground/60 max-w-2xl mx-auto text-lg font-light">
              {t('difference.subheading')}
            </p>
          </m.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 border-foreground/5 bg-card/50 h-full backdrop-blur-sm group hover:-translate-y-2">
                <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:bg-orange-500 transition-colors duration-300">
                  <Leaf className="w-8 h-8 text-orange-500 group-hover:text-foreground transition-colors" strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('difference.features.organic.title')}</h3>
                <p className="text-foreground/70 leading-relaxed font-light">
                  {t('difference.features.organic.body')}
                </p>
              </Card>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 border-foreground/5 bg-card/50 h-full backdrop-blur-sm group hover:-translate-y-2">
                <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:bg-orange-500 transition-colors duration-300">
                  <MapPin className="w-8 h-8 text-orange-500 group-hover:text-foreground transition-colors" strokeWidth={2} aria-hidden="true" />
                </div>
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('difference.features.caribbean.title')}</h3>
                <p className="text-foreground/70 leading-relaxed font-light">
                  {t('difference.features.caribbean.body')}
                </p>
              </Card>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 border-foreground/5 bg-card/50 h-full backdrop-blur-sm group hover:-translate-y-2">
                <div className="w-16 h-16 bg-background rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:bg-orange-500 transition-colors duration-300">
                  <Zap className="w-8 h-8 text-orange-500 group-hover:text-foreground transition-colors" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('difference.features.format.title')}</h3>
                <p className="text-foreground/70 leading-relaxed font-light">{t('difference.features.format.body')}</p>
              </Card>
            </m.div>
          </div>
        </div>
      </section>

      {/* Designed for Modern Wine Moments Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-card font-lato text-center">
        <div className="max-w-4xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-6">
              {t('moments.heading')}
            </h2>
            <p className="text-foreground/70 max-w-3xl mx-auto text-lg font-light leading-relaxed">
              {t('moments.body')}
            </p>
          </m.div>
        </div>
      </section>

      {/* How to Enjoy — 5 ways, full-width hero strips */}
      <section className="relative z-10 bg-background font-lato">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 text-center">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-4">
              {t('enjoy.heading')}
            </h2>
            <div className="w-20 h-1 bg-[#D4A574] mx-auto mb-6"></div>
            <p className="text-foreground/70 text-lg font-light max-w-2xl mx-auto">
              {t('enjoy.subheading')}
            </p>
          </m.div>
        </div>

        <div className="space-y-0">
          {(t('enjoy.ways', { returnObjects: true }) || []).map((way, idx) => (
            <m.article
              key={way.slug}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true, amount: 0.2 }}
              className="relative w-full overflow-hidden bg-background"
            >
              {/* Mobile (<lg): full-bleed cropped hero with text overlay.
                  Desktop (lg+): split layout — image at its natural ratio
                  on one side, text on the other. No crop, no ratio change. */}
              <div className="lg:hidden relative w-full h-[70vh] sm:h-[60vh] min-h-[480px]">
                <img
                  src={way.image}
                  alt={way.imageAlt}
                  loading={idx < 2 ? 'eager' : 'lazy'}
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${idx % 2 === 0 ? 'from-black/75 via-black/40 to-transparent' : 'from-transparent via-black/40 to-black/75'}`}></div>
                <div className={`relative h-full max-w-7xl mx-auto px-6 sm:px-10 flex flex-col justify-center ${idx % 2 === 0 ? 'items-start text-left' : 'items-start'}`}>
                  <div className="max-w-xl">
                    <span className="inline-block text-xs sm:text-sm uppercase tracking-[0.3em] text-[#D4A574] font-medium mb-4">
                      {way.kicker}
                    </span>
                    <h3 className="text-3xl sm:text-4xl font-light text-white leading-tight mb-5 drop-shadow-lg">
                      {way.title}
                    </h3>
                    <p className="text-base sm:text-lg text-white/90 font-light leading-relaxed mb-8 drop-shadow">
                      {way.lead}
                    </p>
                    <Link to={`/enjoy/${way.slug}`}>
                      <span className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4A574] text-foreground font-medium rounded-full hover:bg-[#c29462] transition-all shadow-lg hover:shadow-xl hover:scale-105">
                        {way.cta}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Desktop: grid 2-col with natural-ratio image + text panel */}
              <div className={`hidden lg:grid lg:grid-cols-2 lg:items-stretch ${idx % 2 === 0 ? '' : 'lg:[direction:rtl]'}`}>
                <div className="relative bg-background flex items-center justify-center lg:[direction:ltr]">
                  <img
                    src={way.image}
                    alt={way.imageAlt}
                    loading={idx < 2 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="w-full h-auto block"
                  />
                </div>
                <div className="flex flex-col justify-center px-10 xl:px-16 py-12 lg:[direction:ltr]">
                  <div className="max-w-xl">
                    <span className="inline-block text-xs uppercase tracking-[0.3em] text-[#D4A574] font-medium mb-4">
                      {way.kicker}
                    </span>
                    <h3 className="text-4xl xl:text-5xl font-light text-foreground leading-tight mb-5">
                      {way.title}
                    </h3>
                    <p className="text-lg text-foreground/70 font-light leading-relaxed mb-8">
                      {way.lead}
                    </p>
                    <Link to={`/enjoy/${way.slug}`}>
                      <span className="inline-flex items-center gap-2 px-6 py-3 bg-[#D4A574] text-foreground font-medium rounded-full hover:bg-[#c29462] transition-all shadow-lg hover:shadow-xl hover:scale-105">
                        {way.cta}
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </m.article>
          ))}
        </div>
      </section>

      {/* Inspired by the Tropics Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-card font-lato text-center">
        <div className="absolute inset-0 overflow-hidden">
           <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[80px]"></div>
        </div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-orange-500/10 mb-6">
              <Sun className="w-6 h-6 text-orange-500" aria-hidden="true" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-6">
              {t('tropics.heading')}
            </h2>
            <p className="text-foreground/70 max-w-2xl mx-auto text-lg font-light leading-relaxed">
              {t('tropics.body')}
            </p>
          </m.div>
        </div>
      </section>

      {/* Our Products Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-background font-lato">
        <div className="max-w-7xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-foreground mb-6">
              <Trans
                i18nKey="home:products.heading"
                components={{ accent: <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal" /> }}
              />
            </h2>
            <p className="text-foreground/60 max-w-2xl mx-auto text-lg font-light">
              {t('products.subheading')}
            </p>
          </m.div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Kibay Sparkling Card */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="flex flex-col h-full bg-card border-foreground/5 overflow-hidden shadow-2xl rounded-2xl group hover:-translate-y-2 transition-all duration-300">
                <div className="relative h-[400px] overflow-hidden bg-background">
                  <img
                    src={sparklingImage}
                    alt="Kibay Sparkling Wine"
                    width="800"
                    height="600"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                </div>
                <div className="p-8 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-normal text-foreground mb-2">{t('products.sparkling.title')}</h3>
                    <p className="text-foreground/60 font-light leading-relaxed mb-6">
                      {t('products.sparkling.body')}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Link to="/product/kibay-sparkling" className="flex-1">
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-normal rounded-xl py-6">
                        {t('products.buyNow')}
                      </Button>
                    </Link>
                    <Link to="/kibay-sparkling" className="flex-1">
                      <Button variant="outline" className="w-full border-foreground/20 hover:bg-foreground/10 text-foreground font-normal rounded-xl py-6">
                        {t('products.learnMore')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </m.div>

            {/* Kibay Wine Card */}
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="flex flex-col h-full bg-card border-foreground/5 overflow-hidden shadow-2xl rounded-2xl group hover:-translate-y-2 transition-all duration-300">
                <div className="relative h-[400px] overflow-hidden bg-background">
                   <img
                    src={wineImage}
                    alt="Kibay Original Wine"
                    width="800"
                    height="600"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
                </div>
                <div className="p-8 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-normal text-foreground mb-2">{t('products.wine.title')}</h3>
                    <p className="text-foreground/60 font-light leading-relaxed mb-6">
                      {t('products.wine.body')}
                    </p>
                  </div>
                  <div className="flex gap-4">
                     <Link to="/product/kibay-wine" className="flex-1">
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-normal rounded-xl py-6">
                        {t('products.buyNow')}
                      </Button>
                    </Link>
                    <Link to="/kibay-wine" className="flex-1">
                      <Button variant="outline" className="w-full border-foreground/20 hover:bg-foreground/10 text-foreground font-normal rounded-xl py-6">
                        {t('products.learnMore')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </m.div>
          </div>
        </div>
      </section>

      </main>
      <Footer />
    </>
  );
};

export default HomePage;