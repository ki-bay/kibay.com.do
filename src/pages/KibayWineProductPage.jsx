import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, MapPin, Wine, Sun, Anchor, Heart } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';

const KibayWineProductPage = () => {
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
        <title>KiBay Wine | Tropical Wine Crafted at Ocoa Bay</title>
        <meta name="description" content="KiBay Wine: An authentic expression of Caribbean terroir. Tropical wine crafted at Ocoa Bay with innovative winemaking techniques." />
      </Helmet>
      
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-[85vh] flex items-center bg-background pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-20"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-8"
            >
              <motion.span variants={fadeIn} className="inline-block text-[#D4A574] font-medium tracking-widest uppercase text-sm">
                Authentic Caribbean Wine
              </motion.span>
              <motion.h1 variants={fadeIn} className="text-5xl sm:text-6xl md:text-7xl font-light text-foreground leading-tight">
                KiBay <br/><span className="text-[#D4A574]">Wine</span>
              </motion.h1>
              <motion.div variants={fadeIn} className="space-y-4">
                <h2 className="text-2xl text-foreground/90 font-light">Tropical Wine Crafted at Ocoa Bay</h2>
                <p className="text-lg text-foreground/70 max-w-xl font-light leading-relaxed">
                  An expression of Caribbean terroir and innovative winemaking. Smooth, aromatic, and deeply rooted in the land of the Dominican Republic.
                </p>
              </motion.div>
              <motion.div variants={fadeIn} className="pt-4">
                <Link to="/shop">
                  <Button className="bg-[#D4A574] hover:bg-[#b0865a] text-foreground px-8 py-6 text-lg rounded-full font-normal shadow-[0_0_20px_rgba(212,165,116,0.3)] transition-all hover:scale-105">
                    Explore the Collection
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="hidden lg:block relative"
            >
               {/* Placeholder for KiBay Wine Bottle */}
               <div className="relative z-10 mx-auto w-64 h-[500px] bg-[#D4A574]/20 rounded-full blur-3xl absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
               <img 
                 src="https://images.unsplash.com/photo-1585553616435-2dc0a54e271d?auto=format&fit=crop&q=80" 
                 alt="KiBay Wine Bottle" 
                 className="relative z-20 w-auto h-[550px] mx-auto object-contain drop-shadow-2xl rounded-lg opacity-90"
               />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Section 1: Origin & Identity */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto text-center mb-16">
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             whileInView={{ opacity: 1, y: 0 }}
             viewport={{ once: true }}
             transition={{ duration: 0.6 }}
           >
              <h2 className="text-3xl md:text-5xl font-light text-foreground mb-6">Rooted in Place</h2>
              <div className="w-20 h-1 bg-[#D4A574] mx-auto rounded-full mb-8"></div>
              <p className="text-xl text-foreground/80 font-light leading-relaxed max-w-2xl mx-auto">
                KiBay Wine is not just made in the Caribbean; it is of the Caribbean. It captures the essence of Ocoa Bay—the salinity of the sea air, the minerality of the soil, and the intensity of the tropical sun.
              </p>
           </motion.div>
        </div>
        
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
           <div className="relative h-[400px] rounded-2xl overflow-hidden shadow-xl">
             <img src="https://images.unsplash.com/photo-1534234828563-0259b16e87f1?auto=format&fit=crop&q=80" alt="Ocoa Bay Vineyard" className="w-full h-full object-cover" />
           </div>
           <div className="space-y-6">
              <h3 className="text-2xl font-normal text-foreground">A Unique Terroir</h3>
              <p className="text-foreground/70 font-light leading-relaxed">
                The Ocoa Bay region offers a unique microclimate for viticulture. The combination of dry weather, cool maritime breezes, and limestone-rich soils creates conditions that allow our fruits to develop complex flavor profiles unlike anywhere else in the world.
              </p>
              <p className="text-foreground/70 font-light leading-relaxed">
                Our winemakers harness these natural gifts, employing sustainable farming practices that honor the land and ensure the longevity of our ecosystem.
              </p>
           </div>
        </div>
      </section>

      {/* Section 2: Flavor Profile & Aroma */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background">
         <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16">
               <motion.div 
                 initial={{ opacity: 0, x: -30 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6 }}
                 className="space-y-8"
               >
                  <h2 className="text-3xl md:text-4xl font-light text-foreground">A Taste of the Caribbean</h2>
                  <div className="space-y-6">
                     <div className="flex gap-4">
                        <div className="p-3 bg-background rounded-lg h-fit border border-foreground/10">
                           <Sun className="w-6 h-6 text-[#D4A574]" />
                        </div>
                        <div>
                           <h3 className="text-xl font-normal text-foreground mb-2">Aromatic Expression</h3>
                           <p className="text-foreground/70 font-light">
                              The nose is greeted with an intense bouquet of tropical fruits—ripe mango, passion fruit, and subtle citrus blossom notes. It is fragrant without being perfumed, inviting the drinker in.
                           </p>
                        </div>
                     </div>
                     <div className="flex gap-4">
                        <div className="p-3 bg-background rounded-lg h-fit border border-foreground/10">
                           <Wine className="w-6 h-6 text-[#D4A574]" />
                        </div>
                        <div>
                           <h3 className="text-xl font-normal text-foreground mb-2">Body & Structure</h3>
                           <p className="text-foreground/70 font-light">
                              Light, smooth, and refreshing. KiBay Wine features a delicate structure that highlights fruit purity over heavy tannins or oak. It finishes clean, with a lingering hint of minerality.
                           </p>
                        </div>
                     </div>
                  </div>
               </motion.div>
               
               <motion.div 
                 initial={{ opacity: 0, x: 30 }}
                 whileInView={{ opacity: 1, x: 0 }}
                 viewport={{ once: true }}
                 transition={{ duration: 0.6 }}
                 className="bg-background p-8 rounded-2xl border border-foreground/5 flex flex-col justify-center"
               >
                  <h3 className="text-2xl font-normal text-foreground mb-6 text-center">The Essence of KiBay</h3>
                  <p className="text-xl text-foreground/80 font-light italic text-center mb-8">
                     "The Spirit of Ocoa Bay"
                  </p>
                  <p className="text-foreground/70 font-light leading-relaxed text-center">
                     KiBay Wine captures the relaxed yet vibrant energy of the Dominican lifestyle. It is a wine that feels at home at a formal dinner as it does at a beachside gathering. It represents the harmony between land, sea, and fruit.
                  </p>
               </motion.div>
            </div>
         </div>
      </section>

      {/* Section 3: How to Enjoy */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-4xl mx-auto text-center mb-12">
           <h2 className="text-3xl md:text-4xl font-light text-foreground mb-6">Moments Worth Savoring</h2>
           <p className="text-foreground/60 font-light">Designed to complement the Caribbean climate and cuisine.</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
           {[
              { title: "Serve Chilled", text: "Best enjoyed between 8-10°C to accentuate its refreshing acidity.", icon: Wine },
              { title: "Perfect Pairing", text: "Complements fresh seafood, ceviche, mild cheeses, and light salads.", icon: Anchor },
              { title: "Sunset Ritual", text: "The ideal companion for the golden hour, reflecting the warmth of the sun.", icon: Sun }
           ].map((item, i) => (
              <motion.div 
                 key={i}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: i * 0.1 }}
                 className="bg-card/20 p-8 rounded-xl border border-foreground/5 text-center hover:bg-card/40 transition-colors"
              >
                 <item.icon className="w-10 h-10 text-[#D4A574] mx-auto mb-4" />
                 <h3 className="text-xl font-normal text-foreground mb-3">{item.title}</h3>
                 <p className="text-foreground/70 font-light">{item.text}</p>
              </motion.div>
           ))}
        </div>
      </section>
      
      {/* Section 4: Relationship to Kibay Sparkling */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-background to-background">
         <div className="max-w-5xl mx-auto bg-card/30 rounded-3xl p-8 md:p-12 border border-foreground/5">
            <div className="text-center">
               <Heart className="w-12 h-12 text-[#D4A574] mx-auto mb-6" />
               <h2 className="text-3xl font-light text-foreground mb-6">Two Expressions, One Origin</h2>
               <p className="text-lg text-foreground/80 font-light leading-relaxed mb-8 max-w-3xl mx-auto">
                  Just like our Sparkling, KiBay Wine is born from the same dedication to organic quality and local sourcing. While the Sparkling celebrates effervescence and celebration, KiBay Wine offers a tranquil, contemplative experience of our terroir. Together, they represent the full spectrum of Ocoa Bay's potential.
               </p>
               <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link to="/kibay-sparkling">
                     <Button variant="outline" className="border-[#D4A574] text-[#D4A574] hover:bg-[#D4A574] hover:text-foreground font-normal">
                        Discover Sparkling
                     </Button>
                  </Link>
                  <Link to="/shop">
                     <Button className="bg-[#D4A574] text-foreground hover:bg-[#b0865a] font-normal">
                        Shop All Wines
                     </Button>
                  </Link>
               </div>
            </div>
         </div>
      </section>

      {/* Section 5: Product Specifications */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-background border-t border-foreground/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-normal text-foreground mb-8 text-center">Product Specifications</h2>
          <div className="grid gap-6">
            {[
              { label: "Category", value: "Organic Wine" },
              { label: "Origin", value: "Ocoa Bay, Dominican Republic" },
              { label: "Format", value: "750 ml glass bottle (Recyclable)" },
              { label: "Ingredients", value: "Fermented Mango & Passion Fruit" },
              { label: "Alcohol", value: "8% ABV" },
              { label: "Shelf Life", value: "Best consumed within 36 months" },
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
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-background text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-light text-foreground mb-6">Heritage & Innovation</h2>
          <p className="text-xl text-foreground/70 font-light mb-10 leading-relaxed">
             KiBay Wine stands at the intersection of Dominican agricultural heritage and modern viniculture. It is our invitation to the world to taste the Caribbean in a new, sophisticated way.
          </p>
        </motion.div>
      </section>

      <Footer />
    </>
  );
};

export default KibayWineProductPage;