import React, { useState } from 'react';
import { m } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Loader2, ArrowRight, MessageSquare, ShoppingBag, Briefcase, HelpCircle } from 'lucide-react';
import { useTranslation, Trans } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import SEOHead from '@/components/SEOHead';
import { mediaUrl } from '@/config/mediaCdn';

const ContactPage = () => {
  const { t } = useTranslation('contact');
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    topic: 'Order',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const contactOptions = [
    {
      title: t('options.general.title'),
      email: 'info@kibay.com.do',
      icon: HelpCircle,
      description: t('options.general.description')
    },
    {
      title: t('options.orders.title'),
      email: 'orders@kibay.com.do',
      icon: ShoppingBag,
      description: t('options.orders.description')
    },
    {
      title: t('options.sales.title'),
      email: 'sales@kibay.com.do',
      icon: Briefcase,
      description: t('options.sales.description')
    },
    {
      title: t('options.phone.title'),
      phone: '+1 (849) 876-6563',
      icon: Phone,
      description: t('options.phone.description'),
      isPhone: true
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-contact-email', {
        body: formData
      });

      if (error) throw error;

      setIsSuccess(true);
      setFormData({ name: '', email: '', topic: 'Order', message: '' });
      toast({
        title: t('toast.sentTitle'),
        description: t('toast.sentDescription'),
        className: "bg-mango-500 text-foreground border-none"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: t('toast.failedTitle'),
        description: t('toast.failedDescription')
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title={t('seo.title')}
        description={t('seo.description')}
      />
      
      <Navigation />
      
      <main id="main" role="main" className="min-h-screen bg-background pt-24 pb-16">
        
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-16 text-center">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-foreground mb-6">
              {t('hero.h1Part1')} <span className="bg-gradient-to-r from-mango-400 to-mango-600 bg-clip-text text-transparent font-normal">{t('hero.h1Brand')}</span>
            </h1>
            <p className="text-xl text-foreground/80 font-light leading-relaxed">
              {t('hero.subtitle')}
            </p>
          </m.div>
        </section>

        {/* Contact Options Grid */}
        <section className="px-4 sm:px-6 lg:px-8 mb-24">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactOptions.map((option, index) => (
              <m.a
                key={option.title}
                href={option.isPhone ? `tel:${option.phone.replace(/[^0-9+]/g, '')}` : `mailto:${option.email}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group block p-8 bg-card/50 hover:bg-card border border-foreground/5 hover:border-mango-500/30 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-mango-500/10"
              >
                <div className="w-12 h-12 bg-background rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-foreground/10 group-hover:border-mango-500/50">
                  <option.icon className="w-6 h-6 text-mango-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-normal text-foreground mb-2">{option.title}</h3>
                <p className="text-mango-400 font-medium mb-3 group-hover:underline decoration-mango-400/50 underline-offset-4">
                  {option.isPhone ? option.phone : option.email}
                </p>
                <p className="text-sm text-foreground/60 font-light leading-relaxed">
                  {option.description}
                </p>
              </m.a>
            ))}
          </div>
        </section>

        {/* Contact Form & Map Section */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
            
            {/* Contact Form */}
            <m.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-8 md:p-10 border border-foreground/10 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="w-6 h-6 text-mango-500" />
                <h2 className="text-2xl font-normal text-foreground">{t('form.heading')}</h2>
              </div>

              {isSuccess ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-normal text-foreground mb-2">{t('success.title')}</h3>
                  <p className="text-foreground/70 font-light mb-6">
                    {t('success.body')}
                  </p>
                  <Button
                    onClick={() => setIsSuccess(false)}
                    variant="outline"
                    className="border-foreground/20 text-foreground hover:bg-foreground/10 font-normal"
                  >
                    {t('success.again')}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm text-foreground/80 font-light">{t('form.nameLabel')} <span className="text-mango-500">*</span></label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full bg-background/50 border border-foreground/10 rounded-lg px-4 py-3 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 font-light transition-all"
                        placeholder={t('form.namePlaceholder')}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm text-foreground/80 font-light">{t('form.emailLabel')} <span className="text-mango-500">*</span></label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full bg-background/50 border border-foreground/10 rounded-lg px-4 py-3 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 font-light transition-all"
                        placeholder={t('form.emailPlaceholder')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="topic" className="text-sm text-foreground/80 font-light">{t('form.topicLabel')} <span className="text-mango-500">*</span></label>
                    <div className="relative">
                      <select
                        id="topic"
                        name="topic"
                        required
                        value={formData.topic}
                        onChange={handleInputChange}
                        className="w-full bg-background/50 border border-foreground/10 rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 font-light appearance-none cursor-pointer transition-all"
                      >
                        <option value="Order" className="bg-card text-foreground">{t('form.topics.order')}</option>
                        <option value="Sales / Partnership" className="bg-card text-foreground">{t('form.topics.partnership')}</option>
                        <option value="Event / Tasting" className="bg-card text-foreground">{t('form.topics.event')}</option>
                        <option value="Other" className="bg-card text-foreground">{t('form.topics.other')}</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm text-foreground/80 font-light">{t('form.messageLabel')} <span className="text-mango-500">*</span></label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full bg-background/50 border border-foreground/10 rounded-lg px-4 py-3 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 font-light transition-all resize-none"
                      placeholder={t('form.messagePlaceholder')}
                    ></textarea>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-mango-500 hover:bg-mango-600 text-foreground font-normal py-6 text-lg rounded-xl shadow-lg shadow-mango-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {t('form.sending')}
                      </>
                    ) : (
                      <>
                        {t('form.submit')}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-foreground/40 text-center font-light">
                    <Trans
                      i18nKey="form.privacy"
                      t={t}
                      components={{ privacy: <a href="/privacy" className="underline hover:text-mango-400" /> }}
                    />
                  </p>
                </form>
              )}
            </m.div>

            {/* Visit Us / Map Section */}
            <m.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-8"
            >
              <div className="relative h-[400px] w-full rounded-2xl overflow-hidden shadow-2xl border border-foreground/10 group">
                <div className="absolute inset-0 bg-card/20 z-10 pointer-events-none group-hover:bg-transparent transition-colors duration-500"></div>
                <img
                  src={mediaUrl('0658d94f57d843a069f9c7fa06b062bb.webp')}
                  alt={t('visit.imgAlt')}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-mango-500 rounded-full flex items-center justify-center shadow-lg shadow-mango-500/30">
                      <MapPin className="w-5 h-5 text-foreground" />
                    </div>
                    <h2 className="text-2xl font-normal text-foreground">{t('visit.heading')}</h2>
                  </div>

                  <p className="text-lg text-foreground/90 font-light mb-6 leading-relaxed">
                    {t('visit.addressLine1')} <br/>
                    <span className="text-foreground/60 text-sm">{t('visit.addressLine2')}</span>
                  </p>

                  <Button
                    asChild
                    className="w-full sm:w-auto bg-white text-slate-900 hover:bg-mango-50 hover:text-mango-600 font-normal shadow-lg transition-all"
                  >
                    <a
                      href="https://google.com/maps/dir//OcoaBay+Bahia+de+Ocoa,+Km+6+1%2F2+Hatillo+Azua+71003/@18.3592763,-70.5683895,12z/data=!4m5!4m4!1m0!1m2!1m1!1s0x8ebaaf384184036d:0xe505ffa3f926eef1"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t('visit.directions')}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
              
              <div className="bg-card/50 rounded-2xl p-8 border border-foreground/5">
                <h3 className="text-lg font-normal text-foreground mb-4">{t('hours.heading')}</h3>
                <div className="space-y-3 text-foreground/70 font-light">
                  <div className="flex justify-between border-b border-foreground/5 pb-2">
                    <span>{t('hours.weekdays')}</span>
                    <span className="text-foreground">{t('hours.weekdaysTime')}</span>
                  </div>
                  <div className="flex justify-between border-b border-foreground/5 pb-2">
                    <span>{t('hours.saturday')}</span>
                    <span className="text-foreground">{t('hours.saturdayTime')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('hours.sunday')}</span>
                    <span className="text-foreground">{t('hours.closed')}</span>
                  </div>
                </div>
              </div>
            </m.div>

          </div>
        </section>

      </main>
      
      <Footer />
    </>
  );
};

export default ContactPage;