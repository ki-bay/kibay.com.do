import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { m } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const PrivacyPolicyPage = () => {
  const { t } = useTranslation('privacy');
  const sections = t('sections', { returnObjects: true }) || [];

  return (
    <>
      <Helmet>
        <title>{t('seo.title')}</title>
        <meta name="description" content={t('seo.description')} />
      </Helmet>

      <Navigation />

      <main id="main" role="main" className="min-h-screen bg-stone-50 pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <Link to="/" className="inline-flex items-center gap-2 text-stone-500 hover:text-[#D4A574] transition-colors mb-6 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              {t('backToHome')}
            </Link>

            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-8 h-8 text-[#D4A574]" />
                <h6 className="text-[#D4A574] font-medium tracking-wider uppercase text-sm">{t('eyebrow')}</h6>
              </div>
              <h1 className="text-4xl md:text-5xl font-light text-stone-900 mb-6">{t('title')}</h1>
              <p className="text-lg text-stone-500 leading-relaxed max-w-2xl font-light">
                {t('intro')}
              </p>
              <p className="text-sm text-stone-400 mt-4 font-light">{t('lastUpdated')}</p>
            </m.div>
          </div>

          {/* Content Sections */}
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-12 space-y-12"
          >
            {sections.map((section, index) => (
              <div key={index} className="scroll-mt-32" id={`section-${index}`}>
                <h2 className="text-2xl font-normal text-stone-900 mb-4">{section.title}</h2>
                <div className="prose prose-stone prose-lg max-w-none text-stone-600 font-light leading-relaxed">
                  <p>{section.content}</p>
                </div>
                {index < sections.length - 1 && (
                  <div className="h-px bg-stone-100 mt-12 w-full" />
                )}
              </div>
            ))}
          </m.div>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default PrivacyPolicyPage;
