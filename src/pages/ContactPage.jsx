import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, Loader2, ArrowRight, MessageSquare, ShoppingBag, Briefcase, HelpCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';
import SEOHead from '@/components/SEOHead';
import { mediaUrl } from '@/config/mediaCdn';

const ContactPage = () => {
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
      title: 'General Inquiries',
      email: 'info@kibay.com.do',
      icon: HelpCircle,
      description: 'Questions about our brand or products?'
    },
    {
      title: 'Orders & Deliveries',
      email: 'orders@kibay.com.do',
      icon: ShoppingBag,
      description: 'Track or modify your existing order.'
    },
    {
      title: 'Sales & Partnerships',
      email: 'sales@kibay.com.do',
      icon: Briefcase,
      description: 'Wholesale and collaboration opportunities.'
    },
    {
      title: 'Call Us',
      phone: '+1 (849) 876-6563',
      icon: Phone,
      description: 'Mon-Fri from 9am to 6pm AST.',
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
        title: "Message Sent",
        description: "We'll get back to you within 24–48 hours.",
        className: "bg-mango-500 text-white border-none"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        variant: "destructive",
        title: "Failed to send",
        description: "Please email info@kibay.com.do directly."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SEOHead 
        title="Contact Kibay | Get in Touch"
        description="Have questions about Kibay wines? Contact us for inquiries, partnerships, or customer support."
      />
      
      <Navigation />
      
      <main className="min-h-screen bg-slate-900 pt-24 pb-16">
        
        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6">
              Questions about <span className="bg-gradient-to-r from-mango-400 to-mango-600 bg-clip-text text-transparent font-normal">Kibay?</span>
            </h1>
            <p className="text-xl text-white/80 font-light leading-relaxed">
              We'd love to hear from you. Whether you have questions about our products, need help with an order, or just want to say hello.
            </p>
          </motion.div>
        </section>

        {/* Contact Options Grid */}
        <section className="px-4 sm:px-6 lg:px-8 mb-24">
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactOptions.map((option, index) => (
              <motion.a
                key={option.title}
                href={option.isPhone ? `tel:${option.phone.replace(/[^0-9+]/g, '')}` : `mailto:${option.email}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group block p-8 bg-slate-800/50 hover:bg-slate-800 border border-white/5 hover:border-mango-500/30 rounded-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-mango-500/10"
              >
                <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/10 group-hover:border-mango-500/50">
                  <option.icon className="w-6 h-6 text-mango-500" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-normal text-white mb-2">{option.title}</h3>
                <p className="text-mango-400 font-medium mb-3 group-hover:underline decoration-mango-400/50 underline-offset-4">
                  {option.isPhone ? option.phone : option.email}
                </p>
                <p className="text-sm text-white/60 font-light leading-relaxed">
                  {option.description}
                </p>
              </motion.a>
            ))}
          </div>
        </section>

        {/* Contact Form & Map Section */}
        <section className="px-4 sm:px-6 lg:px-8 pb-16">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-start">
            
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-slate-800 rounded-2xl p-8 md:p-10 border border-white/10 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-8">
                <MessageSquare className="w-6 h-6 text-mango-500" />
                <h2 className="text-2xl font-normal text-white">Send us a message</h2>
              </div>

              {isSuccess ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-500" />
                  </div>
                  <h3 className="text-xl font-normal text-white mb-2">Message Sent!</h3>
                  <p className="text-white/70 font-light mb-6">
                    Thank you! Your message has been sent. We'll get back to you within 24–48 hours.
                  </p>
                  <Button 
                    onClick={() => setIsSuccess(false)}
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10 font-normal"
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm text-white/80 font-light">Name <span className="text-mango-500">*</span></label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 font-light transition-all"
                        placeholder="Your name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email" className="text-sm text-white/80 font-light">Email <span className="text-mango-500">*</span></label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 font-light transition-all"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="topic" className="text-sm text-white/80 font-light">Topic <span className="text-mango-500">*</span></label>
                    <div className="relative">
                      <select
                        id="topic"
                        name="topic"
                        required
                        value={formData.topic}
                        onChange={handleInputChange}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 font-light appearance-none cursor-pointer transition-all"
                      >
                        <option value="Order" className="bg-slate-800 text-white">Order Inquiry</option>
                        <option value="Sales / Partnership" className="bg-slate-800 text-white">Sales / Partnership</option>
                        <option value="Event / Tasting" className="bg-slate-800 text-white">Event / Tasting</option>
                        <option value="Other" className="bg-slate-800 text-white">Other</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="text-sm text-white/80 font-light">Message <span className="text-mango-500">*</span></label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={5}
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 font-light transition-all resize-none"
                      placeholder="How can we help you?"
                    ></textarea>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full bg-mango-500 hover:bg-mango-600 text-white font-normal py-6 text-lg rounded-xl shadow-lg shadow-mango-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  <p className="text-xs text-white/40 text-center font-light">
                    We only use your information to respond to your request. See our <a href="/privacy" className="underline hover:text-mango-400">Privacy Policy</a>.
                  </p>
                </form>
              )}
            </motion.div>

            {/* Visit Us / Map Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-8"
            >
              <div className="relative h-[400px] w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                <div className="absolute inset-0 bg-slate-800/20 z-10 pointer-events-none group-hover:bg-transparent transition-colors duration-500"></div>
                <img 
                  src={mediaUrl('0658d94f57d843a069f9c7fa06b062bb.webp')} 
                  alt="Ocoa Bay Vineyard Landscape" 
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                
                <div className="absolute bottom-0 left-0 p-8 z-20 w-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-mango-500 rounded-full flex items-center justify-center shadow-lg shadow-mango-500/30">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-2xl font-normal text-white">Visit us</h2>
                  </div>
                  
                  <p className="text-lg text-white/90 font-light mb-6 leading-relaxed">
                    Find your way to Ocoa Bay, Bahía de Ocoa. <br/>
                    <span className="text-white/60 text-sm">Experience the vineyard where Kibay is born.</span>
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
                      Open directions in Google Maps
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
              
              <div className="bg-slate-800/50 rounded-2xl p-8 border border-white/5">
                <h3 className="text-lg font-normal text-white mb-4">Vineyard Hours</h3>
                <div className="space-y-3 text-white/70 font-light">
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Monday - Friday</span>
                    <span className="text-white">9:00 AM - 5:00 PM</span>
                  </div>
                  <div className="flex justify-between border-b border-white/5 pb-2">
                    <span>Saturday</span>
                    <span className="text-white">10:00 AM - 6:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sunday</span>
                    <span className="text-white">Closed</span>
                  </div>
                </div>
              </div>
            </motion.div>

          </div>
        </section>

      </main>
      
      <Footer />
    </>
  );
};

export default ContactPage;