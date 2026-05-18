import React from 'react';
import { m } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';

const WhitepaperPage = () => {
  const { t } = useTranslation('whitepaper');
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  return (
    <>
      <SEOHead
        title={t('seo.title')}
        description={t('seo.description')}
      />

      <Navigation />

      <main id="main" role="main" className="min-h-screen bg-background pt-32 pb-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Header */}
          <header className="mb-16 text-center">
            <m.div {...fadeInUp}>
              <p className="text-[#D4A574] font-medium tracking-widest uppercase mb-4 text-sm">{t('header.eyebrow')}</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground mb-6 leading-tight">
                {t('header.h1Line1')}<br />
                <span className="font-light italic">{t('header.h1Line2')}</span>
              </h1>
              <p className="text-xl text-foreground/60 font-light max-w-2xl mx-auto leading-relaxed">
                {t('header.subtitle')}
              </p>
            </m.div>
          </header>

          <hr className="border-stone-200 mb-16" />

          {/* Content Sections */}
          <div className="space-y-16 text-foreground/90 leading-relaxed font-light text-lg">

            {/* Introduction */}
            <m.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-foreground mb-6">{t('intro.heading')}</h2>
              <p className="mb-4">
                {t('intro.p1')}
              </p>
              <p>
                {t('intro.p2')}
              </p>
            </m.section>

            {/* Wine First */}
            <m.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-foreground mb-6">{t('wineFirst.heading')}</h2>
              <p className="mb-4">
                {t('wineFirst.p1Part1')}<strong className="font-medium text-foreground">{t('wineFirst.p1Strong')}</strong>
              </p>
              <p>
                {t('wineFirst.p2')}
              </p>
            </m.section>

            {/* Fermentation as Craft */}
            <m.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-foreground mb-6">{t('fermentation.heading')}</h2>
              <p className="mb-4">
                {t('fermentation.p1')}
              </p>
              <p>
                {t('fermentation.p2')}
              </p>
            </m.section>

            {/* Organic Ingredients */}
            <m.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-foreground mb-6">{t('organic.heading')}</h2>
              <p className="mb-4">
                {t('organic.p1')}
              </p>
              <p>
                {t('organic.p2')}
              </p>
            </m.section>

            {/* Origin Matters */}
            <m.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-foreground mb-6">{t('origin.heading')}</h2>
              <p className="mb-4">
                {t('origin.p1Part1')}<strong className="font-medium text-foreground">{t('origin.p1Strong')}</strong>{t('origin.p1Part2')}
              </p>
              <p>
                {t('origin.p2')}
              </p>
            </m.section>

            {/* Contemporary Format */}
            <m.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-foreground mb-6">{t('format.heading')}</h2>
              <p className="mb-4">
                {t('format.p1')}
              </p>
              <p>
                {t('format.p2')}
              </p>
            </m.section>

            {/* Redefining Sparkling Wine */}
            <m.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-foreground mb-6">{t('redefining.heading')}</h2>
              <p className="mb-4">
                {t('redefining.p1')}
              </p>
              <p>
                {t('redefining.p2')}
              </p>
            </m.section>

            {/* Responsible Brand */}
            <m.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-foreground mb-6">{t('responsible.heading')}</h2>
              <p className="mb-4">
                {t('responsible.p1')}
              </p>
              <p>
                {t('responsible.p2')}
              </p>
            </m.section>

            {/* Looking Forward */}
            <m.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-foreground mb-6">{t('forward.heading')}</h2>
              <p className="mb-4">
                {t('forward.p1')}
              </p>
              <p>
                {t('forward.p2')}
              </p>
            </m.section>

            {/* Conclusion */}
            <m.section {...fadeInUp} className="bg-card border border-foreground/10 p-8 rounded-2xl">
              <h2 className="text-3xl font-serif text-foreground mb-4">{t('conclusion.heading')}</h2>
              <p className="mb-0">
                {t('conclusion.p1')}
              </p>
            </m.section>

          </div>
        </article>
      </main>

      <Footer />
    </>
  );
};

export default WhitepaperPage;
