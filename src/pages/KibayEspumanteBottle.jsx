import React from 'react';
import { m } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProductImageGallery from '@/components/ProductImageGallery';
import ProductDetailsCard from '@/components/ProductDetailsCard';
import ProductCard from '@/components/ProductCard';
import SEOHead from '@/components/SEOHead';

const KibayEspumanteBottle = () => {
  const { t } = useTranslation('productSparklingBottle');

  const productData = {
    id: 'kibay-bottle',
    name: t('product.name'),
    price: 950,
    description: t('product.description'),
    details: {
      Category: t('details.category'),
      Origin: t('details.origin'),
      Format: t('details.format'),
      Ingredients: t('details.ingredients'),
      Style: t('details.style'),
      'Alcohol %': t('details.alcohol'),
      'Shelf life': t('details.shelfLife')
    }
  };

  const detailLabels = {
    Category: t('details.labels.category'),
    Origin: t('details.labels.origin'),
    Format: t('details.labels.format'),
    Ingredients: t('details.labels.ingredients'),
    Style: t('details.labels.style'),
    'Alcohol %': t('details.labels.alcohol'),
    'Shelf life': t('details.labels.shelfLife')
  };

  const images = [
    'https://images.unsplash.com/photo-1703173354700-0b2028e117aa',
    'https://images.unsplash.com/photo-1695032553876-7f277e3f5c45' // Lifestyle
  ];

  return (
    <>
      <SEOHead
        title={t('seo.title')}
        description={t('seo.description')}
      />

      <Navigation />

      <main id="main" role="main" className="min-h-screen bg-stone-50 pt-20">

        {/* Main Product Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-20">
            {/* Gallery */}
            <m.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <ProductImageGallery images={images} altBase={t('gallery.altBase')} />
            </m.div>

            {/* Product Info & Purchase */}
            <div className="flex flex-col justify-center space-y-8">
              <m.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <span className="text-mango-600 font-semibold tracking-wider text-sm uppercase mb-2 block">{t('hero.eyebrow')}</span>
                <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-6 leading-tight">
                  {t('hero.h1')}
                </h1>
                <p className="text-xl text-stone-600 font-light leading-relaxed mb-8">
                  {t('hero.intro')}
                </p>

                {/* Embedded Purchase Card Logic */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 max-w-md">
                   <ProductCard product={{
                     id: productData.id,
                     name: productData.name,
                     price: productData.price,
                     description: '', // Hidden in minimal card view if empty
                     image: images[0]
                   }} hideImage={true} />
                </div>
              </m.div>

              <ProductDetailsCard details={productData.details} labels={detailLabels} />
            </div>
          </div>
        </section>

        {/* Editorial Content Sections */}
        <div className="bg-white py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>

          <div className="max-w-4xl mx-auto space-y-20 relative z-10">

            {/* Crafted in DR */}
            <section className="text-center">
              <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-6">{t('crafted.heading')}</h2>
              <div className="w-16 h-1 bg-amber-400 mx-auto mb-8"></div>
              <p className="text-lg text-stone-600 leading-relaxed font-light">
                {t('crafted.body')}
              </p>
            </section>

            {/* Process & Organic */}
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <section>
                <h2 className="text-2xl font-serif text-stone-900 mb-4">{t('process.heading')}</h2>
                <p className="text-stone-600 leading-relaxed">
                  {t('process.body')}
                </p>
              </section>
              <section>
                <h2 className="text-2xl font-serif text-stone-900 mb-4">{t('organic.heading')}</h2>
                <p className="text-stone-600 leading-relaxed">
                  {t('organic.body')}
                </p>
              </section>
            </div>

            {/* Tasting & Enjoyment */}
            <section className="bg-stone-50 p-8 md:p-12 rounded-2xl border border-stone-100">
              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-2xl font-serif text-stone-900 mb-4 flex items-center gap-2">
                    {t('tasting.heading')}
                  </h2>
                  <ul className="space-y-3 text-stone-600">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5"></span>
                      <span><strong>{t('tasting.noseLabel')}</strong> {t('tasting.nose')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5"></span>
                      <span><strong>{t('tasting.palateLabel')}</strong> {t('tasting.palate')}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5"></span>
                      <span><strong>{t('tasting.finishLabel')}</strong> {t('tasting.finish')}</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h2 className="text-2xl font-serif text-stone-900 mb-4">{t('enjoy.heading')}</h2>
                  <p className="text-stone-600 mb-4">
                    {t('enjoy.body1')}
                  </p>
                  <p className="text-stone-600">
                    {t('enjoy.body2')}
                  </p>
                </div>
              </div>
            </section>

            {/* Winery Credibility */}
            <section className="text-center pt-8">
              <h2 className="text-3xl font-serif text-stone-900 mb-4">{t('winery.heading')}</h2>
              <p className="text-lg text-stone-500 italic mb-10">{t('winery.tagline')}</p>

              <div className="relative rounded-2xl overflow-hidden shadow-xl max-w-3xl mx-auto group">
                <img
                  src="https://images.unsplash.com/photo-1587895656140-88dc74ed96de"
                  alt={t('winery.imgAlt')}
                  width="1600"
                  height="1067"
                  className="w-full h-80 object-cover transform group-hover:scale-105 transition-transform duration-1000"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-500"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-foreground font-medium">{t('winery.caption')}</p>
                </div>
              </div>
            </section>

          </div>
        </div>

      </main>
      <Footer />
    </>
  );
};

export default KibayEspumanteBottle;
