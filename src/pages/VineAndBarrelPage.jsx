import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Wine, Utensils, Calendar, Clock, MapPin, X, Loader2, Send, Grape, Users, ExternalLink } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import SEOHead from '@/components/SEOHead';

const VineAndBarrelPage = () => {
  const { t } = useTranslation('vineAndBarrel');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Animation Variants
  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8 }
  };

  const staggerContainer = {
    initial: { opacity: 0 },
    whileInView: { opacity: 1 },
    viewport: { once: true },
    transition: { staggerChildren: 0.2 }
  };

  const BookingModal = () => {
    const { toast } = useToast();
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      phone: '',
      date: '',
      guests: '2',
      requests: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);

      try {
        // In a real app, this would submit to a booking table
        // For now, we simulate a successful submission
        await new Promise(resolve => setTimeout(resolve, 1500));

        setIsSuccess(true);
        toast({
          title: t('modal.toastSuccessTitle'),
          description: t('modal.toastSuccessBody'),
          className: "bg-emerald-900 text-foreground border-none",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: t('modal.toastErrorTitle'),
          description: t('modal.toastErrorBody'),
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <m.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-stone-50">
            <h3 className="text-xl font-serif text-stone-900">{t('modal.heading')}</h3>
            <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-stone-600 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 md:p-8">
            {isSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send size={32} />
                </div>
                <h4 className="text-2xl font-serif text-stone-900 mb-2">{t('modal.successTitle')}</h4>
                <p className="text-stone-600 mb-6">{t('modal.successBody')}</p>
                <Button onClick={() => setIsModalOpen(false)} className="bg-card hover:bg-card text-foreground w-full py-6">
                  {t('modal.close')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-600">{t('modal.name')}</label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                   <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-600">{t('modal.phone')}</label>
                    <input
                      required
                      type="tel"
                      className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-600">{t('modal.email')}</label>
                  <input
                    required
                    type="email"
                    className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-600">{t('modal.date')}</label>
                    <input
                      required
                      type="date"
                      className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-600">{t('modal.guests')}</label>
                    <select
                      className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all"
                      value={formData.guests}
                      onChange={e => setFormData({...formData, guests: e.target.value})}
                    >
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <option key={n} value={n}>{n} {t('modal.guestSuffix')}</option>
                      ))}
                      <option value="9+">{t('modal.guestsPlus')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-600">{t('modal.requests')}</label>
                  <textarea
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all resize-none"
                    placeholder={t('modal.requestsPlaceholder')}
                    value={formData.requests}
                    onChange={e => setFormData({...formData, requests: e.target.value})}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#D4A574] hover:bg-[#c29462] text-foreground py-6 text-lg mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('modal.processing')}
                    </>
                  ) : t('modal.submit')}
                </Button>
              </form>
            )}
          </div>
        </m.div>
      </div>
    );
  };

  const tastingWines = t('tasting.wines', { returnObjects: true });
  const pairingItems = t('pairings.items', { returnObjects: true });

  return (
    <>
      <SEOHead
        title={t('seo.title')}
        description={t('seo.description')}
        keywords={t('seo.keywords')}
      />

      <Navigation />
      <BookingModal />

      <main id="main" role="main" className="bg-stone-50 min-h-screen">

        {/* Hero Section */}
        <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0 bg-stone-900 flex items-center justify-center">
            <img
              src="/media/vino-produccion-ocoabay-vinedo.webp"
              alt={t('hero.imgAlt')}
              width="1920"
              height="1080"
              className="max-w-full max-h-full w-auto h-auto object-contain"
              fetchPriority="high"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>

          <m.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative z-10 text-center px-4 max-w-4xl mx-auto"
          >
            <h2 className="text-[#D4A574] font-medium tracking-[0.2em] uppercase text-sm md:text-base mb-6">{t('hero.eyebrow')}</h2>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-foreground mb-8 leading-tight">
              {t('hero.title')}
            </h1>
            <p className="text-xl md:text-2xl text-foreground/90 font-light italic mb-10 max-w-2xl mx-auto font-serif">
              {t('hero.tagline')}
            </p>
            <Button
              onClick={() => document.getElementById('experiences').scrollIntoView({ behavior: 'smooth' })}
              className="bg-foreground/10 hover:bg-foreground/20 backdrop-blur-md border border-foreground/30 text-foreground rounded-full px-10 py-7 text-lg transition-all hover:scale-105"
            >
              {t('hero.cta')}
            </Button>
          </m.div>

          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-foreground/50"
          >
            <span className="text-xs uppercase tracking-widest mb-2">{t('hero.scroll')}</span>
            <div className="w-px h-16 bg-gradient-to-b from-white/50 to-transparent" />
          </m.div>
        </section>

        {/* Ocoa Bay — about the place */}
        <section id="about-ocoa-bay" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <m.div {...fadeInUp} className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-[#D4A574] rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
              <img
                src="/media/kibay-vino-dominicano.webp"
                alt={t('about.imgAlt')}
                width="1600"
                height="1067"
                className="relative z-10 w-full h-auto rounded-2xl shadow-2xl transform transition-transform duration-700 hover:scale-[1.02]"
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A574]/10 text-[#D4A574] rounded-full text-sm font-medium tracking-wide uppercase">
                <MapPin size={14} /> {t('about.location')}
              </div>

              <h2 className="text-5xl md:text-6xl font-serif text-stone-900 leading-none">
                {t('about.heading')}
                <span className="block text-3xl md:text-4xl text-stone-600 mt-2 font-light italic">{t('about.headingAccent')}</span>
              </h2>

              <p className="text-lg text-stone-600 leading-relaxed font-light">
                {t('about.p1')}
              </p>

              <p className="text-lg text-stone-600 leading-relaxed font-light">
                {t('about.p2')}
              </p>

              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-stone-200">
                <div className="text-center">
                  <span className="block text-2xl font-serif text-stone-900">{t('about.stats.duration')}</span>
                  <span className="text-xs uppercase text-stone-500 tracking-wider">{t('about.stats.durationLabel')}</span>
                </div>
                <div className="text-center border-l border-stone-200">
                  <span className="block text-2xl font-serif text-stone-900">{t('about.stats.days')}</span>
                  <span className="text-xs uppercase text-stone-500 tracking-wider">{t('about.stats.daysLabel')}</span>
                </div>
                <div className="text-center border-l border-stone-200">
                  <span className="block text-2xl font-serif text-stone-900">{t('about.stats.distance')}</span>
                  <span className="text-xs uppercase text-stone-500 tracking-wider">{t('about.stats.distanceLabel')}</span>
                </div>
              </div>
            </div>
          </m.div>
        </section>

        {/* Experiences — purchasable */}
        <section id="experiences" className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <m.div {...fadeInUp} className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A574]/10 text-[#D4A574] rounded-full text-sm font-medium tracking-wide uppercase mb-6">
                <Grape size={14} /> {t('experiences.eyebrow')}
              </div>
              <h2 className="text-4xl md:text-5xl font-serif text-stone-900 mb-6">{t('experiences.heading')}</h2>
              <p className="text-stone-500 max-w-2xl mx-auto text-lg font-light">
                {t('experiences.subheading')}
              </p>
            </m.div>

            <m.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid md:grid-cols-3 gap-8"
            >
              {/* Wine Tour */}
              <m.div
                variants={fadeInUp}
                className="bg-stone-50 rounded-2xl shadow-lg border border-stone-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col overflow-hidden"
              >
                <img
                  src="/media/ocoabay-degustacion-vino-dominicano.webp"
                  alt={t('experiences.tour.imgAlt')}
                  width="1600"
                  height="1067"
                  className="w-full h-auto"
                  loading="lazy"
                  decoding="async"
                />
                <div className="p-10 flex flex-col flex-1">
                <div className="w-12 h-12 bg-[#D4A574]/10 rounded-full flex items-center justify-center mb-6">
                  <Wine className="text-[#D4A574]" />
                </div>
                <h3 className="text-2xl font-serif text-stone-900 mb-1">{t('experiences.tour.title')}</h3>
                <p className="text-stone-600 italic mb-4 font-serif">{t('experiences.tour.schedule')}</p>
                <p className="text-stone-600 leading-relaxed font-light mb-6 flex-1">
                  {t('experiences.tour.body')}
                </p>
                <div className="text-3xl font-serif text-stone-900 mb-6">
                  {t('experiences.tour.price')} <span className="text-sm text-stone-600 font-light">{t('experiences.perPerson')}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <Link to="/product/ocoa-bay-wine-tour" className="w-full">
                    <Button className="w-full bg-[#D4A574] hover:bg-[#c29462] text-foreground py-6">
                      {t('experiences.buyOnKibay')} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer" className="text-sm text-stone-500 hover:text-[#D4A574] inline-flex items-center justify-center gap-1">
                    {t('experiences.bookAtOcoa')} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                </div>
              </m.div>

              {/* Complete Experience */}
              <m.div
                variants={fadeInUp}
                className="bg-stone-900 rounded-2xl shadow-lg border border-stone-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col text-foreground relative overflow-hidden"
              >
                <img
                  src="/media/vinedo-republica-dominicana-aerial.webp"
                  alt={t('experiences.complete.imgAlt')}
                  width="1600"
                  height="1067"
                  className="w-full h-auto"
                  loading="lazy"
                  decoding="async"
                />
                <div className="p-10 flex flex-col flex-1">
                <div className="absolute top-4 right-4 px-3 py-1 bg-[#D4A574] text-stone-900 rounded-full text-xs font-medium uppercase tracking-wider">
                  {t('experiences.complete.badge')}
                </div>
                <div className="w-12 h-12 bg-[#D4A574]/20 rounded-full flex items-center justify-center mb-6">
                  <Grape className="text-[#D4A574]" />
                </div>
                <h3 className="text-2xl font-serif text-foreground mb-1">{t('experiences.complete.title')}</h3>
                <p className="text-foreground/50 italic mb-4 font-serif">{t('experiences.complete.schedule')}</p>
                <p className="text-foreground/70 leading-relaxed font-light mb-6 flex-1">
                  {t('experiences.complete.body')}
                </p>
                <div className="text-3xl font-serif text-foreground mb-6">
                  {t('experiences.complete.price')} <span className="text-sm text-foreground/40 font-light">{t('experiences.perPerson')}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <Link to="/product/ocoa-bay-complete-experience" className="w-full">
                    <Button className="w-full bg-[#D4A574] hover:bg-[#c29462] text-stone-900 py-6">
                      {t('experiences.buyOnKibay')} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                  <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer" className="text-sm text-foreground/60 hover:text-[#D4A574] inline-flex items-center justify-center gap-1">
                    {t('experiences.bookAtOcoa')} <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                </div>
              </m.div>

              {/* Casa Club à la carte */}
              <m.div
                variants={fadeInUp}
                className="bg-stone-50 rounded-2xl shadow-lg border border-stone-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col overflow-hidden"
              >
                <img
                  src="/media/kibay-vino-ocoa-bay.webp"
                  alt={t('experiences.casaClub.imgAlt')}
                  width="1600"
                  height="1067"
                  className="w-full h-auto"
                  loading="lazy"
                  decoding="async"
                />
                <div className="p-10 flex flex-col flex-1">
                <div className="w-12 h-12 bg-[#D4A574]/10 rounded-full flex items-center justify-center mb-6">
                  <Utensils className="text-[#D4A574]" />
                </div>
                <h3 className="text-2xl font-serif text-stone-900 mb-1">{t('experiences.casaClub.title')}</h3>
                <p className="text-stone-600 italic mb-4 font-serif">{t('experiences.casaClub.schedule')}</p>
                <p className="text-stone-600 leading-relaxed font-light mb-6 flex-1">
                  {t('experiences.casaClub.body')}
                </p>
                <div className="text-3xl font-serif text-stone-900 mb-6">
                  {t('experiences.casaClub.price')} <span className="text-sm text-stone-600 font-light">{t('experiences.casaClub.priceSuffix')}</span>
                </div>
                <div className="flex flex-col gap-3">
                  <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button className="w-full bg-stone-900 hover:bg-stone-800 text-foreground py-6">
                      {t('experiences.reserveAtOcoa')} <ExternalLink className="ml-2 w-4 h-4" />
                    </Button>
                  </a>
                  <p className="text-xs text-stone-600 text-center">{t('experiences.casaClub.note')}</p>
                </div>
                </div>
              </m.div>
            </m.div>

            <m.div {...fadeInUp} className="mt-12 text-center text-sm text-stone-500 max-w-3xl mx-auto">
              <p>
                {t('experiences.footnote1')}
              </p>
              <p className="mt-3">
                <Users className="inline w-4 h-4 mr-1" />
                {t('experiences.footnote2Prefix')}<a href="mailto:info@kibay.com.do" className="text-[#D4A574] hover:underline">info@kibay.com.do</a>{t('experiences.footnote2Or')}<a href="tel:+18498766563" className="text-[#D4A574] hover:underline">+1 (849) 876-6563</a>.
              </p>
            </m.div>
          </div>
        </section>

        {/* Tasting Notes */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <m.div {...fadeInUp} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif text-stone-900 mb-6">{t('tasting.heading')}</h2>
              <p className="text-stone-500 max-w-2xl mx-auto text-lg font-light">{t('tasting.subheading')}</p>
            </m.div>

            <m.div
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid md:grid-cols-3 gap-8"
            >
              {(Array.isArray(tastingWines) ? tastingWines : []).map((wine, i) => (
                <m.div
                  key={i}
                  variants={fadeInUp}
                  className="bg-stone-50 p-10 rounded-2xl shadow-lg border border-stone-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group"
                >
                  <div className="w-12 h-12 bg-[#D4A574]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#D4A574] transition-colors duration-300">
                    <Wine className="text-[#D4A574] group-hover:text-foreground transition-colors" />
                  </div>
                  <h3 className="text-2xl font-serif text-stone-900 mb-1">{wine.name}</h3>
                  <p className="text-stone-600 italic mb-6 font-serif">{wine.year}</p>

                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs uppercase text-stone-600 tracking-wider mb-1">{t('tasting.labelAroma')}</span>
                      <p className="text-stone-700 font-medium">{wine.aroma}</p>
                    </div>
                    <div>
                      <span className="block text-xs uppercase text-stone-600 tracking-wider mb-1">{t('tasting.labelFlavor')}</span>
                      <p className="text-stone-700 font-medium">{wine.flavor}</p>
                    </div>
                    <div>
                      <span className="block text-xs uppercase text-stone-600 tracking-wider mb-1">{t('tasting.labelFinish')}</span>
                      <p className="text-stone-700 font-medium">{wine.finish}</p>
                    </div>
                  </div>
                </m.div>
              ))}
            </m.div>
          </div>
        </section>

        {/* Food Pairings */}
        <section className="py-24 bg-card text-foreground overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <m.div {...fadeInUp} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif mb-6">{t('pairings.heading')}</h2>
              <p className="text-stone-400 max-w-2xl mx-auto text-lg font-light">{t('pairings.subheading')}</p>
            </m.div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <m.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl"
              >
                <img
                  src="https://images.unsplash.com/photo-1519092796169-bb9cc75a4b68"
                  alt={t('pairings.featureImgAlt')}
                  width="1600"
                  height="1067"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-[500px] object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8">
                  <h3 className="text-3xl font-serif mb-2">{t('pairings.featureWine')}</h3>
                  <p className="text-stone-300 font-light">{t('pairings.featureServe')}</p>
                </div>
              </m.div>

              <m.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="grid gap-6"
              >
                {(Array.isArray(pairingItems) ? pairingItems : []).map((item, idx) => (
                  <div key={idx} className="bg-foreground/5 p-6 rounded-xl border border-foreground/10 hover:bg-foreground/10 transition-colors flex gap-6 items-start">
                    <div className="text-4xl bg-foreground/10 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-serif mb-2 text-[#D4A574]">{item.dish}</h4>
                      <p className="text-stone-400 font-light leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </m.div>
            </div>
          </div>
        </section>

        {/* Call to Action - Booking */}
        <section className="py-32 relative bg-[url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-fixed bg-center">
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm" />

          <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 max-w-3xl mx-auto text-center px-4"
          >
            <MapPin className="w-12 h-12 text-[#D4A574] mx-auto mb-6" />
            <h2 className="text-5xl md:text-6xl font-serif text-foreground mb-8">{t('booking.heading')}</h2>
            <p className="text-xl text-stone-300 mb-10 font-light leading-relaxed">
              {t('booking.body')}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12 text-stone-400 text-sm tracking-wider uppercase">
              <span className="flex items-center gap-2"><Clock size={16} /> {t('booking.infoDays')}</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-2"><Utensils size={16} /> {t('booking.infoDining')}</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-2"><MapPin size={16} /> {t('booking.infoLocation')}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={() => document.getElementById('experiences').scrollIntoView({ behavior: 'smooth' })}
                className="bg-[#D4A574] hover:bg-[#c29462] text-foreground px-12 py-8 text-xl rounded-full shadow-[0_0_30px_rgba(212,165,116,0.3)] hover:shadow-[0_0_50px_rgba(212,165,116,0.5)] transition-all hover:scale-105"
              >
                {t('booking.ctaPrimary')}
              </Button>
              <a href="https://ocoabay.com/reservacion/" target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  className="border-[#D4A574]/40 text-foreground hover:bg-[#D4A574]/10 px-12 py-8 text-xl rounded-full"
                >
                  {t('booking.ctaSecondary')} <ExternalLink className="ml-2 w-5 h-5" />
                </Button>
              </a>
            </div>
          </m.div>
        </section>

      </main>

      <Footer />
    </>
  );
};

export default VineAndBarrelPage;
