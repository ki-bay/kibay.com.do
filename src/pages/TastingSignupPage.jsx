import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { m } from 'framer-motion';
import { CheckCircle, Loader2, Wine } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import SEOHead from '@/components/SEOHead';

// Bilingual copy for this campaign-specific landing page. Kept local rather
// than wired into the global i18n JSON tree since this mirrors one email's
// pitch verbatim — not core site navigation. The "Read in English" link in
// the Fine Dining email points here with ?lang=en; everyone else gets Spanish.
const COPY = {
  es: {
    eyebrow: 'Propuesta a la sumillería',
    title: 'Nuestras etiquetas, con historia dominicana',
    lead: 'Kibay Espumante es el primer vino espumoso sostenible de la República Dominicana, elaborado en Bahía de Ocoa con mango y chinola. Su acidez fresca y notas tropicales lo convierten en un maridaje natural con ceviche, mariscos crudos, quesos suaves, postres y cocina caribeña moderna.',
    body: 'El verdadero argumento para una carta seria es poder describir unos vinos locales en un terroir dominicano, en una mesa donde los huéspedes esperan vinos europeos. Nuestras etiquetas (Kibay Vino, Kibay Espumante, French Colombard, Rosé) abren un menú de maridaje propio.',
    quote: 'Producción limitada, asignaciones cuidadas para restaurantes con sumiller, y formato glass-pour disponible.',
    inviteHeading: 'Cata exclusiva Kibay',
    inviteBody: 'Muy pronto organizaremos una cata exclusiva con las cuatro etiquetas — nos encantaría contar con su equipo. Le avisamos en cuanto tengamos fecha y lugar confirmados.',
    formHeading: 'Quiero recibir la invitación',
    name: 'Nombre',
    company: 'Restaurante / empresa',
    email: 'Correo electrónico',
    phone: 'Teléfono (opcional)',
    submit: 'Quiero recibir la invitación',
    submitting: 'Enviando…',
    successTitle: 'Gracias — está en la lista',
    successBody: 'Le avisaremos por correo en cuanto tengamos fecha y lugar confirmados.',
    langLink: 'Read in English',
    langHref: '?lang=en',
  },
  en: {
    eyebrow: 'A proposal for your wine list',
    title: 'Our labels, with a Dominican story',
    lead: 'Kibay Espumante is the Dominican Republic’s first sustainable sparkling wine, made in Bahía de Ocoa with mango and passion fruit. Its fresh acidity and tropical notes make it a natural pairing with ceviche, raw seafood, soft cheeses, desserts, and modern Caribbean cooking.',
    body: 'The real case for a serious wine list is being able to describe local wines from a Dominican terroir, at a table where guests expect European wine. Our labels (Kibay Vino, Kibay Espumante, French Colombard, Rosé) open up a pairing menu of their own.',
    quote: 'Limited production, careful allocations for restaurants with a sommelier, and glass-pour format available.',
    inviteHeading: 'Exclusive Kibay tasting',
    inviteBody: 'We’ll soon be organizing an exclusive tasting of all four labels — we’d love to have your team there. We’ll let you know as soon as the date and location are confirmed.',
    formHeading: 'I’d like to receive the invitation',
    name: 'Name',
    company: 'Restaurant / company',
    email: 'Email',
    phone: 'Phone (optional)',
    submit: 'I’d like to receive the invitation',
    submitting: 'Sending…',
    successTitle: 'Thank you — you’re on the list',
    successBody: 'We’ll email you as soon as the date and location are confirmed.',
    langLink: 'Leer en español',
    langHref: '?lang=es',
  },
};

function TastingSignupPage() {
  const [searchParams] = useSearchParams();
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'es';
  const t = COPY[lang];
  const { toast } = useToast();

  const [formData, setFormData] = useState({ name: '', company: '', email: '', phone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-tasting-signup', {
        body: formData,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setIsSuccess(true);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: lang === 'en' ? 'Something went wrong' : 'Algo salió mal',
        description: err.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead
        title={`${t.formHeading} | Kibay`}
        description={t.lead}
        url={`https://kibay.com.do/tasting-invitation${lang === 'en' ? '?lang=en' : ''}`}
      />
      <Navigation />

      <main id="main" role="main" className="bg-background min-h-screen">
        <section className="relative pt-32 pb-16 lg:pb-24">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <m.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-block text-[#D4A574] font-medium tracking-widest uppercase text-sm mb-4">
                {t.eyebrow}
              </span>
              <h1 className="text-4xl sm:text-5xl font-light font-serif text-foreground leading-[1.1] mb-6">
                {t.title}
              </h1>
              <p className="text-lg text-foreground/70 leading-relaxed mb-4">{t.lead}</p>
              <p className="text-foreground/70 leading-relaxed mb-6">{t.body}</p>
              <div className="border-l-2 border-[#D4A574] pl-5 italic text-foreground/60 mb-10">
                {t.quote}
              </div>

              <a
                href={t.langHref}
                className="inline-block text-sm text-foreground/50 hover:text-[#D4A574] underline mb-10"
              >
                {t.langLink}
              </a>

              <div className="rounded-2xl border border-foreground/10 bg-card p-8 sm:p-10">
                <div className="flex items-center gap-3 mb-3">
                  <Wine className="w-5 h-5 text-[#D4A574]" />
                  <h2 className="text-xl font-serif text-foreground">{t.inviteHeading}</h2>
                </div>
                <p className="text-foreground/70 leading-relaxed mb-8">{t.inviteBody}</p>

                {isSuccess ? (
                  <div className="flex items-start gap-3 rounded-xl bg-background border border-foreground/10 p-6">
                    <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">{t.successTitle}</p>
                      <p className="text-sm text-foreground/60 mt-1">{t.successBody}</p>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="ts-name" className="block text-xs uppercase tracking-wide text-foreground/60 mb-2">
                          {t.name}
                        </label>
                        <input
                          id="ts-name"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full bg-background border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-foreground focus:border-[#D4A574] focus:outline-none focus:ring-1 focus:ring-[#D4A574]"
                        />
                      </div>
                      <div>
                        <label htmlFor="ts-company" className="block text-xs uppercase tracking-wide text-foreground/60 mb-2">
                          {t.company}
                        </label>
                        <input
                          id="ts-company"
                          name="company"
                          required
                          value={formData.company}
                          onChange={handleChange}
                          className="w-full bg-background border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-foreground focus:border-[#D4A574] focus:outline-none focus:ring-1 focus:ring-[#D4A574]"
                        />
                      </div>
                      <div>
                        <label htmlFor="ts-email" className="block text-xs uppercase tracking-wide text-foreground/60 mb-2">
                          {t.email}
                        </label>
                        <input
                          id="ts-email"
                          name="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full bg-background border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-foreground focus:border-[#D4A574] focus:outline-none focus:ring-1 focus:ring-[#D4A574]"
                        />
                      </div>
                      <div>
                        <label htmlFor="ts-phone" className="block text-xs uppercase tracking-wide text-foreground/60 mb-2">
                          {t.phone}
                        </label>
                        <input
                          id="ts-phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full bg-background border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 text-foreground focus:border-[#D4A574] focus:outline-none focus:ring-1 focus:ring-[#D4A574]"
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#D4A574] hover:bg-[#c29462] text-white rounded-full py-6 text-base"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : null}
                      {isSubmitting ? t.submitting : t.submit}
                    </Button>
                  </form>
                )}
              </div>
            </m.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

export default TastingSignupPage;
