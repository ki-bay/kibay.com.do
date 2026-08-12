import React from 'react';
import { Helmet } from 'react-helmet';
import { m } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Leaf, MapPin, Wine, Sun, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/card';
import { mediaUrl } from '@/config/mediaCdn';

// Helper icon
const WindIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
    <path d="M12.6 19.4A2 0 1 0 14 16H2" />
  </svg>
);

const KibayEspumanteProductPage = () => {
  const { t } = useTranslation('productSparklingMain');

  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  const isItems = t('what.isItems', { returnObjects: true }) || [];
  const notItems = t('what.notItems', { returnObjects: true }) || [];
  const enjoyItems = t('enjoy.items', { returnObjects: true }) || [];
  const enjoyIcons = [Wine, Sun, Droplets, Leaf];
  const specs = t('specs.items', { returnObjects: true }) || [];

  return (
    <>
      <Helmet>
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
      </Helmet>

      <Navigation />

      <main id="main" role="main">
      {/* Hero Section - Redesigned for Mobile-First Responsiveness */}
      <section className="relative min-h-screen lg:min-h-[85vh] flex items-center bg-background pt-24 pb-12 lg:pt-32 lg:pb-20 overflow-hidden">
        {/* Background Elements */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${mediaUrl('09a4757f8d6894f3f809efc283dcd8d9.jpg')})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background lg:bg-gradient-to-r lg:from-background lg:via-background/90 lg:to-transparent"></div>

        {/* Decorative Glow */}
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* Text Content - Order 2 on Mobile (below image), Order 1 on Desktop */}
            <m.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="order-2 lg:order-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-8"
            >
              <m.span variants={fadeIn} className="inline-block text-orange-500 font-medium tracking-widest uppercase text-xs sm:text-sm">
                {t('hero.eyebrow')}
              </m.span>

              <m.h1 variants={fadeIn} className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-light text-foreground leading-tight">
                {t('hero.h1Lead')} <br className="hidden sm:block" />
                <span className="text-orange-500 font-normal">{t('hero.h1Accent')}</span>
              </m.h1>

              <m.div variants={fadeIn} className="space-y-4 max-w-lg lg:max-w-xl">
                <h2 className="text-lg sm:text-xl lg:text-2xl text-foreground/90 font-light">
                  {t('hero.subtitle')}
                </h2>
                <p className="text-base sm:text-lg text-foreground/70 font-light leading-relaxed">
                  {t('hero.body')}
                </p>
              </m.div>

              <m.div variants={fadeIn} className="pt-4 w-full sm:w-auto">
                <Link to="/shop" className="block w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-foreground px-8 py-6 text-lg rounded-full font-normal shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                    {t('hero.cta')}
                  </Button>
                </Link>
              </m.div>
            </m.div>

            {/* Image Content - Order 1 on Mobile (top), Order 2 on Desktop */}
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-1 lg:order-2 relative flex justify-center"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-orange-500/20 rounded-full blur-3xl -z-10"></div>
              <img
                src="https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011940/kibay_sparkling_ehvpws.webp"
                alt={t('hero.imgAlt')}
                className="w-auto h-[300px] sm:h-[400px] lg:h-[600px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700 ease-in-out"
              />
            </m.div>
          </div>
        </div>
      </section>

      {/* Section 1: What Kibay Sparkling Is */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <m.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-6">{t('what.heading')}</h2>
            <div className="w-20 h-1 bg-orange-500 mx-auto rounded-full mb-8"></div>
            <p className="text-xl text-foreground/80 font-light leading-relaxed">
              {t('what.body')}
            </p>
          </m.div>

          <div className="grid md:grid-cols-2 gap-8">
            <m.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card/50 p-8 rounded-2xl border border-foreground/5"
            >
              <h3 className="text-xl font-normal text-foreground mb-4 flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2" /> {t('what.isTitle')}
              </h3>
              <ul className="space-y-3 text-foreground/70 font-light">
                {isItems.map((item, i) => (
                  <li key={i} className="flex items-start"><span className="mr-2">•</span> {item}</li>
                ))}
              </ul>
            </m.div>

            <m.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card/30 p-8 rounded-2xl border border-foreground/5 opacity-75"
            >
              <h3 className="text-xl font-normal text-foreground/90 mb-4 flex items-center">
                <span className="text-orange-500 mr-2 text-xl">×</span> {t('what.notTitle')}
              </h3>
              <ul className="space-y-3 text-foreground/60 font-light">
                {notItems.map((item, i) => (
                  <li key={i} className="flex items-start"><span className="mr-2">•</span> {item}</li>
                ))}
              </ul>
            </m.div>
          </div>
        </div>
      </section>

      {/* Section 2: Origin & Winery Credibility */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <m.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-2 mb-6 text-orange-500 font-medium tracking-wider uppercase text-sm">
                <MapPin className="w-4 h-4" />
                <span>{t('origin.eyebrow')}</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-light text-foreground mb-6">{t('origin.heading')}</h2>
              <p className="text-lg text-foreground/80 font-light mb-6 leading-relaxed">
                {t('origin.body1')}
              </p>
              <p className="text-lg text-foreground/80 font-light mb-8 leading-relaxed">
                {t('origin.body2')}
              </p>
              <div className="bg-background p-6 border-l-4 border-orange-500">
                <p className="text-xl text-foreground font-light italic">
                  {t('origin.quote')}
                </p>
              </div>
            </m.div>
            <m.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative h-[300px] lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl"
            >
              <img
                src="https://res.cloudinary.com/dwewurxla/image/upload/f_auto,q_auto,w_1200/v1780011402/Kibay_Espumante_Lata_ocoabay_w2hagj.webp"
                alt={t('origin.imgAlt')}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              <div className="absolute bottom-8 left-8">
                <p className="text-foreground font-normal text-xl">{t('origin.imgTitle')}</p>
                <p className="text-foreground/70 text-sm font-light">{t('origin.imgSubtitle')}</p>
              </div>
            </m.div>
          </div>
        </div>
      </section>

      {/* Section 3: Flavor & Tasting Notes */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-light text-foreground mb-6">{t('flavor.heading')}</h2>
            <p className="text-foreground/60 font-light max-w-2xl mx-auto">
              {t('flavor.intro')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-8 border border-foreground/5 rounded-2xl bg-card/20 hover:bg-card/40 transition-colors"
            >
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <WindIcon className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-foreground mb-3">{t('flavor.aromaTitle')}</h3>
              <p className="text-foreground/70 font-light leading-relaxed">
                {t('flavor.aromaBody')}
              </p>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-8 border border-foreground/5 rounded-2xl bg-card/20 hover:bg-card/40 transition-colors"
            >
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Droplets className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-foreground mb-3">{t('flavor.palateTitle')}</h3>
              <p className="text-foreground/70 font-light leading-relaxed">
                {t('flavor.palateBody')}
              </p>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-8 border border-foreground/5 rounded-2xl bg-card/20 hover:bg-card/40 transition-colors"
            >
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wine className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-foreground mb-3">{t('flavor.finishTitle')}</h3>
              <p className="text-foreground/70 font-light leading-relaxed">
                {t('flavor.finishBody')}
              </p>
            </m.div>
          </div>
        </div>
      </section>

      {/* Section 4: Sustainable & Natural Philosophy */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <m.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1"
          >
            <div className="inline-block p-3 rounded-xl bg-green-900/30 text-green-400 mb-6">
              <Leaf className="w-8 h-8" />
            </div>
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-6">{t('philosophy.heading')}</h2>
            <div className="space-y-4 text-lg text-foreground/80 font-light leading-relaxed">
              <p>
                {t('philosophy.body1')}
              </p>
              <p>
                {t('philosophy.body2')}
              </p>
            </div>
          </m.div>
          <m.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 relative"
          >
            <div className="aspect-square bg-slate-700/50 rounded-2xl overflow-hidden relative shadow-2xl">
               <img
                 src={mediaUrl('ae00c5d9dc7e1830c9bb0456d1e83e2d.jpg')}
                 alt={t('philosophy.imgAlt')}
                 className="w-full h-full object-cover opacity-90"
               />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="block text-5xl font-normal text-black mb-2 drop-shadow-lg">{t('philosophy.badgePercent')}</span>
                    <span className="text-black/90 font-light uppercase tracking-widest drop-shadow-md">{t('philosophy.badgeLabel')}</span>
                  </div>
               </div>
            </div>
          </m.div>
        </div>
      </section>

      {/* Section 5: How to Enjoy */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-4">{t('enjoy.heading')}</h2>
            <p className="text-foreground/60 font-light">{t('enjoy.intro')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {enjoyItems.map((item, idx) => {
              const Icon = enjoyIcons[idx] || Wine;
              return (
                <m.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="bg-card/40 p-6 rounded-xl border border-foreground/5 text-center hover:border-orange-500/30 transition-colors"
                >
                  <Icon className="w-8 h-8 text-orange-500 mx-auto mb-4" />
                  <h3 className="text-lg font-normal text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-foreground/70 font-light">{item.desc}</p>
                </m.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 6: Product Details */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background border-t border-foreground/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-normal text-foreground mb-8 text-center">{t('specs.heading')}</h2>
          <div className="grid gap-6">
            {specs.map((detail, idx) => (
              <m.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="flex justify-between items-center py-4 border-b border-foreground/10 last:border-0"
              >
                <span className="text-foreground/60 font-light uppercase tracking-wide text-sm">{detail.label}</span>
                <span className="text-foreground font-medium text-right">{detail.value}</span>
              </m.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-background text-center">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-light text-foreground mb-6">{t('closing.heading')}</h2>
          <p className="text-xl text-foreground/70 font-light mb-10 leading-relaxed">
            {t('closing.body')}
          </p>
          <Link to="/shop">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-200 font-normal px-10 py-6 rounded-full text-lg">
              {t('closing.cta')}
            </Button>
          </Link>
        </m.div>
      </section>
      </main>

      <Footer />
    </>
  );
};

export default KibayEspumanteProductPage;
