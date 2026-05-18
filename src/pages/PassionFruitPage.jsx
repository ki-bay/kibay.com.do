import React from 'react';
import { Helmet } from 'react-helmet';
import { m } from 'framer-motion';
import { Heart, Sun, Globe, ShoppingBag, Info, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Card from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PassionFruitPage = () => {
  const { t } = useTranslation('passionFruit');
  return (
    <>
      <Helmet>
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
      </Helmet>

      <Navigation />

      <main id="main" role="main">
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20 font-lato">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1637019449619-37ea52b9a699?w=1200&q=80&auto=format&fit=crop"
            alt={t('hero.imgAlt')}
            width="1920"
            height="1080"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background"></div>
        </div>

        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light mb-6 text-foreground">
            {t('hero.title')} <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal">{t('hero.titleAccent')}</span>
          </h1>
          <p className="text-xl sm:text-2xl text-foreground/90 max-w-3xl mx-auto font-light leading-relaxed">
            {t('hero.tagline')}
          </p>
        </m.div>
      </section>

      {/* Content Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background font-lato">
        <div className="max-w-7xl mx-auto space-y-24">

          {/* Intro Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
             <m.div
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6 }}
               viewport={{ once: true }}
             >
                <div className="flex items-center gap-3 mb-6">
                  <Info className="w-10 h-10 text-orange-500" />
                  <h2 className="text-3xl font-light text-foreground">{t('characteristics.heading')}</h2>
                </div>
                <p className="text-lg text-foreground/80 leading-relaxed font-light">
                  {t('characteristics.body')}
                </p>
             </m.div>
             <m.div
               initial={{ opacity: 0, x: 30 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6 }}
               viewport={{ once: true }}
             >
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="w-10 h-10 text-orange-500" />
                  <h2 className="text-3xl font-light text-foreground">{t('origins.heading')}</h2>
                </div>
                <p className="text-lg text-foreground/80 leading-relaxed font-light">
                  {t('origins.body')}
                </p>
             </m.div>
          </div>

          {/* Benefits Cards */}
          <div>
            <m.div
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="text-center mb-12"
            >
               <h2 className="text-3xl sm:text-4xl font-light text-foreground">{t('benefits.heading')}</h2>
            </m.div>

            <div className="grid md:grid-cols-2 gap-8">
              <m.div
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1 }}
                 viewport={{ once: true }}
              >
                <Card className="p-8 bg-card/50 border-orange-500/20 h-full hover:bg-card transition-colors">
                  <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-6">
                    <Heart className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-normal text-foreground mb-4">{t('benefits.health.title')}</h3>
                  <p className="text-foreground/70 font-light leading-relaxed">
                    {t('benefits.health.body')}
                  </p>
                </Card>
              </m.div>

              <m.div
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 viewport={{ once: true }}
              >
                <Card className="p-8 bg-card/50 border-orange-500/20 h-full hover:bg-card transition-colors">
                  <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-normal text-foreground mb-4">{t('benefits.vitamins.title')}</h3>
                  <p className="text-foreground/70 font-light leading-relaxed">
                    {t('benefits.vitamins.body')}
                  </p>
                </Card>
              </m.div>
            </div>
          </div>

          {/* CTA */}
          <m.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-3xl p-12 border border-orange-500/20"
          >
            <h2 className="text-3xl font-light text-foreground mb-6">{t('cta.heading')}</h2>
            <p className="text-lg text-foreground/80 max-w-2xl mx-auto mb-8 font-light">
              {t('cta.body')}
            </p>
            <Link to="/shop">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-foreground font-normal rounded-full px-10 py-6 text-lg shadow-lg hover:shadow-orange-500/30 transition-all">
                <ShoppingBag className="mr-2 h-5 w-5" />
                {t('cta.button')}
              </Button>
            </Link>
          </m.div>

        </div>
      </section>
      </main>

      <Footer />
    </>
  );
};

export default PassionFruitPage;
