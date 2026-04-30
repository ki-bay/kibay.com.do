import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Droplets, Leaf, MapPin, Wine, Sun, Check } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import Card from '@/components/ui/card';
import { mediaUrl } from '@/config/mediaCdn';

// Helper icon
const WindIcon = (props) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2" />
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2" />
    <path d="M12.6 19.4A2 0 1 0 14 16H2" />
  </svg>
);

const KibayEspumanteProductPage = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <>
      <Helmet>
        <title>Kibay Sparkling | Organic Sparkling Wine from Dominican Republic</title>
        <meta name="description" content="Kibay Sparkling: A premium organic sparkling wine crafted with mango and passion fruit. Fermented, not flavored. Real wine, refreshingly alive." />
      </Helmet>
      
      <Navigation />
      
      {/* Hero Section - Redesigned for Mobile-First Responsiveness */}
      <section className="relative min-h-screen lg:min-h-[85vh] flex items-center bg-background pt-24 pb-12 lg:pt-32 lg:pb-20 overflow-hidden">
        {/* Background Elements */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${mediaUrl('09a4757f8d6894f3f809efc283dcd8d9.jpg')})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background lg:bg-gradient-to-r lg:from-background lg:via-background/90 lg:to-transparent"></div>
        
        {/* Decorative Glow */}
        <div className="absolute top-1/4 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            
            {/* Text Content - Order 2 on Mobile (below image), Order 1 on Desktop */}
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="order-2 lg:order-1 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-8"
            >
              <motion.span variants={fadeIn} className="inline-block text-orange-500 font-medium tracking-widest uppercase text-xs sm:text-sm">
                The New Caribbean Standard
              </motion.span>
              
              <motion.h1 variants={fadeIn} className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-light text-foreground leading-tight">
                Kibay <br className="hidden sm:block" />
                <span className="text-orange-500 font-normal">Sparkling</span>
              </motion.h1>
              
              <motion.div variants={fadeIn} className="space-y-4 max-w-lg lg:max-w-xl">
                <h2 className="text-lg sm:text-xl lg:text-2xl text-foreground/90 font-light">
                  Organic Sparkling Wine with Mango & Passion Fruit
                </h2>
                <p className="text-base sm:text-lg text-foreground/70 font-light leading-relaxed">
                  Fermented, not flavored. Real wine, refreshingly alive. A sophisticated expression of Dominican terroir crafted for modern enjoyment.
                </p>
              </motion.div>
              
              <motion.div variants={fadeIn} className="pt-4 w-full sm:w-auto">
                <Link to="/shop" className="block w-full sm:w-auto">
                  <Button className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-foreground px-8 py-6 text-lg rounded-full font-normal shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.5)]">
                    Discover the Wine
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
            
            {/* Image Content - Order 1 on Mobile (top), Order 2 on Desktop */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="order-1 lg:order-2 relative flex justify-center"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 sm:w-64 sm:h-64 lg:w-96 lg:h-96 bg-orange-500/20 rounded-full blur-3xl -z-10"></div>
              <img 
                src={mediaUrl('16146fe95251b7071c35445b71cd0274.jpg')} 
                alt="Kibay Sparkling Can" 
                className="w-auto h-[300px] sm:h-[400px] lg:h-[600px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700 ease-in-out"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 1: What Kibay Sparkling Is */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeIn}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-6">A Real Sparkling Wine</h2>
            <div className="w-20 h-1 bg-orange-500 mx-auto rounded-full mb-8"></div>
            <p className="text-xl text-foreground/80 font-light leading-relaxed">
              Kibay Sparkling is true wine, achieved through natural fermentation. We don't simply mix fruit juice with alcohol. We ferment premium, organic mango and passion fruit from Ocoa Bay to create a complex, structured sparkling wine that retains the authentic soul of its ingredients.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card/50 p-8 rounded-2xl border border-foreground/5"
            >
              <h3 className="text-xl font-normal text-foreground mb-4 flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-2" /> What It Is
              </h3>
              <ul className="space-y-3 text-foreground/70 font-light">
                <li className="flex items-start"><span className="mr-2">•</span> Naturally fermented sparkling wine</li>
                <li className="flex items-start"><span className="mr-2">•</span> Crafted from 100% organic fruit</li>
                <li className="flex items-start"><span className="mr-2">•</span> A product of skilled winemaking</li>
                <li className="flex items-start"><span className="mr-2">•</span> Complex, dry, and refreshing</li>
              </ul>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="bg-card/30 p-8 rounded-2xl border border-foreground/5 opacity-75"
            >
              <h3 className="text-xl font-normal text-foreground/90 mb-4 flex items-center">
                <span className="text-orange-500 mr-2 text-xl">×</span> What It's Not
              </h3>
              <ul className="space-y-3 text-foreground/60 font-light">
                <li className="flex items-start"><span className="mr-2">•</span> Not a wine cooler or spritzer</li>
                <li className="flex items-start"><span className="mr-2">•</span> Not a sugar-laden cocktail</li>
                <li className="flex items-start"><span className="mr-2">•</span> Not artificially flavored</li>
                <li className="flex items-start"><span className="mr-2">•</span> Not a soda with alcohol</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 2: Origin & Winery Credibility */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex items-center gap-2 mb-6 text-orange-500 font-medium tracking-wider uppercase text-sm">
                <MapPin className="w-4 h-4" />
                <span>Ocoa Bay, Dominican Republic</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-light text-foreground mb-6">From the Dominican Republic</h2>
              <p className="text-lg text-foreground/80 font-light mb-6 leading-relaxed">
                Born in the unique microclimate of Ocoa Bay, where the mountains meet the Caribbean Sea. This dry, sunny region produces mangoes and chinola (passion fruit) with concentrated flavors and exceptional aromatics essential for high-quality winemaking.
              </p>
              <p className="text-lg text-foreground/80 font-light mb-8 leading-relaxed">
                Our production happens entirely on the island, supporting local agriculture and minimizing our carbon footprint.
              </p>
              <div className="bg-background p-6 border-l-4 border-orange-500">
                <p className="text-xl text-foreground font-light italic">
                  "From the same winery as Kibay wine — by Ocoa Bay"
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative h-[300px] lg:h-[500px] rounded-2xl overflow-hidden shadow-2xl"
            >
              <img 
                src="https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&q=80" 
                alt="Vineyard landscape" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent"></div>
              <div className="absolute bottom-8 left-8">
                <p className="text-foreground font-normal text-xl">Ocoa Bay Winery</p>
                <p className="text-foreground/70 text-sm font-light">The first vineyard in the Caribbean</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 3: Flavor & Tasting Notes */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-light text-foreground mb-6">Taste the Terroir</h2>
            <p className="text-foreground/60 font-light max-w-2xl mx-auto">
              A sophisticated profile that balances the natural sweetness of tropical fruit with the crisp acidity of a well-crafted sparkling wine.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center p-8 border border-foreground/5 rounded-2xl bg-card/20 hover:bg-card/40 transition-colors"
            >
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <WindIcon className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-foreground mb-3">Aroma</h3>
              <p className="text-foreground/70 font-light leading-relaxed">
                Elegant and expressive, opening with distinct notes of ripe mango and hints of tropical florals, underpinned by a fresh citrus zest.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-center p-8 border border-foreground/5 rounded-2xl bg-card/20 hover:bg-card/40 transition-colors"
            >
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Droplets className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-foreground mb-3">Palate</h3>
              <p className="text-foreground/70 font-light leading-relaxed">
                Refreshing and balanced. The passion fruit brings a lively acidity that dances on the tongue, perfectly countered by a round, fruity body that is never cloying.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-center p-8 border border-foreground/5 rounded-2xl bg-card/20 hover:bg-card/40 transition-colors"
            >
              <div className="w-12 h-12 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Wine className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-normal text-foreground mb-3">Finish</h3>
              <p className="text-foreground/70 font-light leading-relaxed">
                Clean, crisp, and persistent. Leaves a pleasant tropical memory that invites another sip without coating the palate in sugar.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 4: Organic & Natural Philosophy */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1"
          >
            <div className="inline-block p-3 rounded-xl bg-green-900/30 text-green-400 mb-6">
              <Leaf className="w-8 h-8" />
            </div>
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-6">Crafted with Intention</h2>
            <div className="space-y-4 text-lg text-foreground/80 font-light leading-relaxed">
              <p>
                We believe that the best flavors come from nature, not a lab. That's why Kibay Sparkling is made without artificial sugars, chemical flavorings, or synthetic additives.
              </p>
              <p>
                Our philosophy is simple: respect the ingredients. By using organic fermentation methods, we preserve the integrity of the fruit and the land it comes from. It's a cleaner, more authentic way to enjoy sparkling wine.
              </p>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="flex-1 relative"
          >
            <div className="aspect-square bg-slate-700/50 rounded-2xl overflow-hidden relative shadow-2xl">
               <img 
                 src={mediaUrl('ae00c5d9dc7e1830c9bb0456d1e83e2d.jpg')} 
                 alt="Fresh mango and passion fruit close-up product photography showing key ingredients in Kibay Sparkling" 
                 className="w-full h-full object-cover opacity-90"
               />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="block text-5xl font-normal text-black mb-2 drop-shadow-lg">100%</span>
                    <span className="text-black/90 font-light uppercase tracking-widest drop-shadow-md">Natural</span>
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Section 5: How to Enjoy */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-light text-foreground mb-4">Ready for Any Moment</h2>
            <p className="text-foreground/60 font-light">Versatile enough for a glass, casual enough for the can.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "Chilled in Glass", desc: "Pour into a flute to appreciate the fine bubbles and golden color.", icon: Wine },
              { title: "Straight from the Can", desc: "Enjoy the premium experience anywhere, no glassware required.", icon: Sun },
              { title: "Beachside", desc: "The perfect sunset companion. Refreshing, tropical, and unbreakable.", icon: Droplets },
              { title: "Dinner Pairing", desc: "Acidity cuts through rich foods; pairs beautifully with seafood or spice.", icon: Leaf },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="bg-card/40 p-6 rounded-xl border border-foreground/5 text-center hover:border-orange-500/30 transition-colors"
              >
                <item.icon className="w-8 h-8 text-orange-500 mx-auto mb-4" />
                <h3 className="text-lg font-normal text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-foreground/70 font-light">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: Product Details */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background border-t border-foreground/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-normal text-foreground mb-8 text-center">Product Specifications</h2>
          <div className="grid gap-6">
            {[
              { label: "Category", value: "Organic Sparkling Wine" },
              { label: "Origin", value: "Ocoa Bay, Dominican Republic" },
              { label: "Format", value: "250 ml Aluminum Can (Recyclable)" },
              { label: "Ingredients", value: "Fermented Mango & Passion Fruit" },
              { label: "Alcohol", value: "6% ABV" },
              { label: "Shelf Life", value: "Best consumed within 18 months" },
            ].map((detail, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="flex justify-between items-center py-4 border-b border-foreground/10 last:border-0"
              >
                <span className="text-foreground/60 font-light uppercase tracking-wide text-sm">{detail.label}</span>
                <span className="text-foreground font-medium text-right">{detail.value}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing Section */}
      <section className="py-32 px-4 sm:px-6 lg:px-8 bg-background text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-light text-foreground mb-6">Wine Without Ceremony</h2>
          <p className="text-xl text-foreground/70 font-light mb-10 leading-relaxed">
            We've stripped away the pretension to reveal what matters: exceptional craftsmanship, authentic origin, and the pure joy of the Caribbean. This is modern wine culture.
          </p>
          <Link to="/shop">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-200 font-normal px-10 py-6 rounded-full text-lg">
              Shop Kibay Sparkling
            </Button>
          </Link>
        </motion.div>
      </section>

      <Footer />
    </>
  );
};

export default KibayEspumanteProductPage;