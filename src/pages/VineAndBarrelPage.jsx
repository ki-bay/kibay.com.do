import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { ArrowRight, Wine, Utensils, Calendar, Clock, MapPin, X, Loader2, Send } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';
import SEOHead from '@/components/SEOHead';

const VineAndBarrelPage = () => {
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
          title: "Request Received",
          description: "We'll confirm your tasting tour shortly.",
          className: "bg-emerald-900 text-white border-none",
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: "Please try again later.",
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    if (!isModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-stone-50">
            <h3 className="text-xl font-serif text-stone-900">Book a Private Tasting</h3>
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
                <h4 className="text-2xl font-serif text-stone-900 mb-2">Thank You!</h4>
                <p className="text-stone-600 mb-6">Your booking request has been sent. Our concierge will contact you shortly to confirm the details.</p>
                <Button onClick={() => setIsModalOpen(false)} className="bg-stone-900 hover:bg-stone-800 text-white w-full py-6">
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-600">Name</label>
                    <input 
                      required
                      type="text" 
                      className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                   <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-600">Phone</label>
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
                  <label className="text-sm font-medium text-stone-600">Email</label>
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
                    <label className="text-sm font-medium text-stone-600">Preferred Date</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-stone-600">Guests</label>
                    <select 
                      className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all"
                      value={formData.guests}
                      onChange={e => setFormData({...formData, guests: e.target.value})}
                    >
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <option key={n} value={n}>{n} Guests</option>
                      ))}
                      <option value="9+">9+ Guests</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-600">Special Requests</label>
                  <textarea 
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#D4A574]/50 focus:border-[#D4A574] transition-all resize-none"
                    placeholder="Dietary restrictions, special occasion..."
                    value={formData.requests}
                    onChange={e => setFormData({...formData, requests: e.target.value})}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#D4A574] hover:bg-[#c29462] text-white py-6 text-lg mt-4"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : 'Confirm Booking Request'}
                </Button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <>
      <SEOHead 
        title="Vine & Barrel – Signature Wines | Kibay"
        description="Experience the finest signature wines at Vine & Barrel. Discover our curated collection, tasting notes, and book private tasting tours."
      />

      <Navigation />
      <BookingModal />

      <main className="bg-stone-50 min-h-screen">
        
        {/* Hero Section */}
        <section className="relative h-screen min-h-[700px] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1602757205362-336105af9324" 
              alt="Vine & Barrel Vineyard" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="relative z-10 text-center px-4 max-w-4xl mx-auto"
          >
            <h2 className="text-[#D4A574] font-medium tracking-[0.2em] uppercase text-sm md:text-base mb-6">Premium Winery Collection</h2>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white mb-8 leading-tight">
              Vine & Barrel
            </h1>
            <p className="text-xl md:text-2xl text-white/90 font-light italic mb-10 max-w-2xl mx-auto font-serif">
              "Discover Our Signature Wines"
            </p>
            <Button 
              onClick={() => document.getElementById('wine-of-month').scrollIntoView({ behavior: 'smooth' })}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-full px-10 py-7 text-lg transition-all hover:scale-105"
            >
              Explore Collection
            </Button>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center text-white/50"
          >
            <span className="text-xs uppercase tracking-widest mb-2">Scroll</span>
            <div className="w-px h-16 bg-gradient-to-b from-white/50 to-transparent" />
          </motion.div>
        </section>

        {/* Wine of the Month */}
        <section id="wine-of-month" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <motion.div {...fadeInUp} className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-[#D4A574] rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
              <img 
                src="https://images.unsplash.com/photo-1663624806613-1995492051b2" 
                alt="Cabernet Reserve 2018" 
                className="relative z-10 w-full h-[600px] object-cover rounded-2xl shadow-2xl transform transition-transform duration-700 hover:scale-[1.02]"
              />
            </div>
            
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#D4A574]/10 text-[#D4A574] rounded-full text-sm font-medium tracking-wide uppercase">
                <Calendar size={14} /> Wine of the Month
              </div>
              
              <h2 className="text-5xl md:text-6xl font-serif text-stone-900 leading-none">
                Cabernet Reserve <span className="block text-3xl md:text-4xl text-stone-400 mt-2 font-light italic">Vintage 2018</span>
              </h2>
              
              <p className="text-lg text-stone-600 leading-relaxed font-light">
                A masterpiece of robust flavor and elegance. Our 2018 Reserve is aged for 24 months in French oak barrels, resulting in deep notes of black cherry, currant, and a hint of vanilla spice. The finish is long, velvety, and unforgettable. Perfect for aging or enjoying tonight.
              </p>
              
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-stone-200">
                <div className="text-center">
                  <span className="block text-2xl font-serif text-stone-900">14.5%</span>
                  <span className="text-xs uppercase text-stone-500 tracking-wider">Alcohol</span>
                </div>
                <div className="text-center border-l border-stone-200">
                  <span className="block text-2xl font-serif text-stone-900">3.6</span>
                  <span className="text-xs uppercase text-stone-500 tracking-wider">pH Level</span>
                </div>
                <div className="text-center border-l border-stone-200">
                  <span className="block text-2xl font-serif text-stone-900">Dry</span>
                  <span className="text-xs uppercase text-stone-500 tracking-wider">Sweetness</span>
                </div>
              </div>

              <Button className="bg-stone-900 hover:bg-stone-800 text-white px-8 py-6 rounded-lg text-lg w-full sm:w-auto">
                Learn More <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Tasting Notes */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeInUp} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif text-stone-900 mb-6">Tasting Notes</h2>
              <p className="text-stone-500 max-w-2xl mx-auto text-lg font-light">Explore the intricate profiles of our most celebrated vintages.</p>
            </motion.div>

            <motion.div 
              variants={staggerContainer}
              initial="initial"
              whileInView="whileInView"
              className="grid md:grid-cols-3 gap-8"
            >
              {[
                {
                  name: "Pinot Noir",
                  year: "2019",
                  aroma: "Raspberry, Violet, Earth",
                  flavor: "Red Cherry, Mushroom, Clove",
                  finish: "Silky, delicate tannins"
                },
                {
                  name: "Chardonnay",
                  year: "2020",
                  aroma: "Green Apple, Citrus, Toast",
                  flavor: "Pear, Lemon Curd, Butter",
                  finish: "Crisp acidity, creamy texture"
                },
                {
                  name: "Rosé",
                  year: "2021",
                  aroma: "Strawberry, Rose Petal",
                  flavor: "Watermelon, Peach, Mineral",
                  finish: "Dry, refreshing, clean"
                }
              ].map((wine, i) => (
                <motion.div 
                  key={i}
                  variants={fadeInUp}
                  className="bg-stone-50 p-10 rounded-2xl shadow-lg border border-stone-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group"
                >
                  <div className="w-12 h-12 bg-[#D4A574]/10 rounded-full flex items-center justify-center mb-6 group-hover:bg-[#D4A574] transition-colors duration-300">
                    <Wine className="text-[#D4A574] group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-2xl font-serif text-stone-900 mb-1">{wine.name}</h3>
                  <p className="text-stone-400 italic mb-6 font-serif">{wine.year}</p>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="block text-xs uppercase text-stone-400 tracking-wider mb-1">Aroma</span>
                      <p className="text-stone-700 font-medium">{wine.aroma}</p>
                    </div>
                    <div>
                      <span className="block text-xs uppercase text-stone-400 tracking-wider mb-1">Flavor</span>
                      <p className="text-stone-700 font-medium">{wine.flavor}</p>
                    </div>
                    <div>
                      <span className="block text-xs uppercase text-stone-400 tracking-wider mb-1">Finish</span>
                      <p className="text-stone-700 font-medium">{wine.finish}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Food Pairings */}
        <section className="py-24 bg-stone-900 text-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeInUp} className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-serif mb-6">Perfect Pairings</h2>
              <p className="text-stone-400 max-w-2xl mx-auto text-lg font-light">Elevate your dining experience with our expert recommendations.</p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div 
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="relative rounded-2xl overflow-hidden shadow-2xl"
              >
                <img 
                  src="https://images.unsplash.com/photo-1519092796169-bb9cc75a4b68" 
                  alt="Wine and Cheese Pairing" 
                  className="w-full h-[500px] object-cover hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-8">
                  <h3 className="text-3xl font-serif mb-2">Grand Reserve Merlot</h3>
                  <p className="text-stone-300 font-light">Best served at 16-18°C</p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
                className="grid gap-6"
              >
                {[
                  {
                    dish: "Aged Gouda & Cheddar",
                    desc: "The sharp, nutty flavors of aged cheese cut through the tannins.",
                    icon: "🧀"
                  },
                  {
                    dish: "Roasted Lamb Rack",
                    desc: "Herb-crusted lamb complements the earthy notes of the wine.",
                    icon: "🍖"
                  },
                  {
                    dish: "Dark Chocolate Truffles",
                    desc: "Bitter chocolate enhances the fruit-forward profile.",
                    icon: "🍫"
                  }
                ].map((item, idx) => (
                  <div key={idx} className="bg-white/5 p-6 rounded-xl border border-white/10 hover:bg-white/10 transition-colors flex gap-6 items-start">
                    <div className="text-4xl bg-white/10 w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <h4 className="text-xl font-serif mb-2 text-[#D4A574]">{item.dish}</h4>
                      <p className="text-stone-400 font-light leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Call to Action - Booking */}
        <section className="py-32 relative bg-[url('https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?q=80&w=2940&auto=format&fit=crop')] bg-cover bg-fixed bg-center">
          <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-sm" />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="relative z-10 max-w-3xl mx-auto text-center px-4"
          >
            <MapPin className="w-12 h-12 text-[#D4A574] mx-auto mb-6" />
            <h2 className="text-5xl md:text-6xl font-serif text-white mb-8">Visit The Estate</h2>
            <p className="text-xl text-stone-300 mb-10 font-light leading-relaxed">
              Immerse yourself in the art of winemaking. Book a private tour of our vineyards and cellar, followed by an exclusive tasting session guided by our sommelier.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12 text-stone-400 text-sm tracking-wider uppercase">
              <span className="flex items-center gap-2"><Clock size={16} /> Daily 10am - 5pm</span>
              <span className="hidden sm:inline">•</span>
              <span className="flex items-center gap-2"><Utensils size={16} /> Private Dining Available</span>
            </div>

            <Button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#D4A574] hover:bg-[#c29462] text-white px-12 py-8 text-xl rounded-full shadow-[0_0_30px_rgba(212,165,116,0.3)] hover:shadow-[0_0_50px_rgba(212,165,116,0.5)] transition-all hover:scale-105"
            >
              Book a Private Tasting Tour
            </Button>
          </motion.div>
        </section>

      </main>

      <Footer />
    </>
  );
};

export default VineAndBarrelPage;