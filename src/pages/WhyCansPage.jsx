import React from 'react';
import { Helmet } from 'react-helmet';
import { m } from 'framer-motion';
import { Shield, Leaf, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Card from '@/components/ui/card';
import { mediaUrl } from '@/config/mediaCdn';

const WhyCansPage = () => {
  const { t } = useTranslation('whyCans');
  return (
    <>
      <Helmet>
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
      </Helmet>

      <Navigation />

      <main id="main" role="main">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-card to-background"></div>

        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light mb-6 text-foreground">
            {t('hero.title')} <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal">{t('hero.titleAccent')}</span>{t('hero.titleSuffix')}
          </h1>
          <p className="text-xl sm:text-2xl text-foreground/80 max-w-3xl mx-auto font-light">
            {t('hero.tagline')}
          </p>
        </m.div>
      </section>

      {/* Light and Oxygen Protection */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <m.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-10 h-10 text-orange-500" />
                <h2 className="text-3xl sm:text-4xl font-light text-foreground">
                  {t('preservation.heading')}
                </h2>
              </div>
              <p className="text-lg text-foreground/80 mb-6 leading-relaxed font-light">
                {t('preservation.body')}
              </p>
              <Card className="p-6 bg-card/50 border-orange-500/20 mb-6">
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('preservation.light.title')}</h3>
                <p className="text-foreground/70 mb-4 font-light">
                  {t('preservation.light.body')}
                </p>
              </Card>
              <Card className="p-6 bg-card/50 border-orange-500/20">
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('preservation.seal.title')}</h3>
                <p className="text-foreground/70 font-light">
                  {t('preservation.seal.body')}
                </p>
              </Card>
            </m.div>

            <m.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/unsplash/photo-1604256913753-eef2d1d8ca21.webp"
                  alt={t('preservation.imgAlt')}
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent"></div>
              </div>
            </m.div>
          </div>
        </div>
      </section>

      {/* Freshness and Portion Control */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-card">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <m.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="/unsplash/photo-1637019449619-37ea52b9a699.webp"
                  alt={t('freshness.imgAlt')}
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent"></div>
              </div>
            </m.div>

            <m.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <img
                  src={mediaUrl('8557ed8a8cfde6155f713b177c6452a7.png')}
                  alt={t('freshness.iconAlt')}
                  className="w-10 h-10 object-contain"
                />
                <h2 className="text-3xl sm:text-4xl font-light text-foreground">
                  {t('freshness.heading')}
                </h2>
              </div>
              <p className="text-lg text-foreground/80 mb-6 leading-relaxed font-light">
                {t('freshness.body')}
              </p>
              <Card className="p-6 bg-card/50 border-orange-500/20 mb-6">
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('freshness.singleServe.title')}</h3>
                <p className="text-foreground/70 mb-4 font-light">
                  {t('freshness.singleServe.body')}
                </p>
              </Card>
              <Card className="p-6 bg-card/50 border-orange-500/20">
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('freshness.peak.title')}</h3>
                <p className="text-foreground/70 font-light">
                  {t('freshness.peak.body')}
                </p>
              </Card>
            </m.div>
          </div>
        </div>
      </section>

      {/* Sustainability */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-6xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Leaf className="w-10 h-10 text-orange-500" />
              <h2 className="text-3xl sm:text-4xl font-light text-foreground">
                {t('sustainability.heading')}
              </h2>
            </div>
            <p className="text-lg text-foreground/80 max-w-3xl mx-auto font-light">
              {t('sustainability.subheading')}
            </p>
          </m.div>

          <div className="grid md:grid-cols-3 gap-8">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('sustainability.recyclable.title')}</h3>
                <p className="text-foreground/70 font-light">
                  {t('sustainability.recyclable.body')}
                </p>
              </Card>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('sustainability.carbon.title')}</h3>
                <p className="text-foreground/70 font-light">
                  {t('sustainability.carbon.body')}
                </p>
              </Card>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-foreground" />
                </div>
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('sustainability.fast.title')}</h3>
                <p className="text-foreground/70 font-light">
                  {t('sustainability.fast.body')}
                </p>
              </Card>
            </m.div>
          </div>
        </div>
      </section>

      {/* Convenience Without Compromise */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-card to-background">
        <div className="max-w-4xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-light mb-6 text-foreground">
              {t('convenience.heading')}
            </h2>
            <p className="text-lg text-foreground/80 max-w-3xl mx-auto mb-8 font-light">
              {t('convenience.subheading')}
            </p>
          </m.div>

          <div className="grid sm:grid-cols-2 gap-8">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('convenience.beach.title')}</h3>
                <p className="text-foreground/70 font-light">
                  {t('convenience.beach.body')}
                </p>
              </Card>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('convenience.portable.title')}</h3>
                <p className="text-foreground/70 font-light">
                  {t('convenience.portable.body')}
                </p>
              </Card>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('convenience.chill.title')}</h3>
                <p className="text-foreground/70 font-light">
                  {t('convenience.chill.body')}
                </p>
              </Card>
            </m.div>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <h3 className="text-xl font-normal mb-3 text-foreground">{t('convenience.noTool.title')}</h3>
                <p className="text-foreground/70 font-light">
                  {t('convenience.noTool.body')}
                </p>
              </Card>
            </m.div>
          </div>
        </div>
      </section>

      {/* Winery Credibility */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 md:p-12 bg-gradient-to-br from-card to-background border-orange-500/20">
              <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-light mb-4 text-foreground">
                  {t('credibility.heading')}
                </h2>
                <p className="text-lg text-foreground/80 font-light">
                  {t('credibility.subheading')}
                </p>
              </div>

              <div className="space-y-6 font-light">
                <p className="text-foreground/70 leading-relaxed">
                  {t('credibility.p1')}
                </p>
                <p className="text-foreground/70 leading-relaxed">
                  {t('credibility.p2')}
                </p>
                <p className="text-foreground/70 leading-relaxed">
                  {t('credibility.p3')}
                </p>
              </div>
            </Card>
          </m.div>
        </div>
      </section>
      </main>

      <Footer />
    </>
  );
};

export default WhyCansPage;
