import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Shield, Leaf, Clock } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Card from '@/components/ui/card';
import { mediaUrl } from '@/config/mediaCdn';

const WhyCansPage = () => {
  return (
    <>
      <Helmet>
        <title>Why Aluminum Cans? - Kibay Espumante | Premium Wine Packaging</title>
        <meta name="description" content="Discover why Kibay Espumante uses aluminum cans for our organic sparkling wine. Learn about freshness preservation, sustainability, and premium quality benefits." />
      </Helmet>
      
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light mb-6 text-white">
            Why <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal">Aluminum Cans</span>?
          </h1>
          <p className="text-xl sm:text-2xl text-white/80 max-w-3xl mx-auto font-light">
            Premium quality meets modern convenience. Discover why aluminum cans are the future of fine wine.
          </p>
        </motion.div>
      </section>
      
      {/* Light and Oxygen Protection */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <div className="flex items-center gap-3 mb-6">
                <Shield className="w-10 h-10 text-orange-500" />
                <h2 className="text-3xl sm:text-4xl font-light text-white">
                  Premium Preservation
                </h2>
              </div>
              <p className="text-lg text-white/80 mb-6 leading-relaxed font-light">
                Light and oxygen are wine's greatest enemies. Even minimal exposure can degrade delicate flavors, aromas, and color. Aluminum cans provide an impenetrable barrier that glass simply cannot match.
              </p>
              <Card className="p-6 bg-slate-800/50 border-orange-500/20 mb-6">
                <h3 className="text-xl font-normal mb-3 text-white">Complete Light Protection</h3>
                <p className="text-white/70 mb-4 font-light">
                  Unlike glass bottles that allow UV rays to penetrate and damage wine compounds, aluminum cans offer 100% light protection. Your Kibay Espumante tastes exactly as intended—fresh, vibrant, and perfectly preserved.
                </p>
              </Card>
              <Card className="p-6 bg-slate-800/50 border-orange-500/20">
                <h3 className="text-xl font-normal mb-3 text-white">Airtight Seal</h3>
                <p className="text-white/70 font-light">
                  Our advanced canning technology creates an absolute oxygen barrier. This means zero oxidation, maintaining the crisp effervescence and bright tropical flavors from the moment of canning to your first sip.
                </p>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1604256913753-eef2d1d8ca21" 
                  alt="Fresh tropical mango showcasing premium organic ingredients"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Freshness and Portion Control */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1637019449619-37ea52b9a699" 
                  alt="Vibrant passion fruit highlighting exotic tropical flavors"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <img 
                  src={mediaUrl('8557ed8a8cfde6155f713b177c6452a7.png')} 
                  alt="Freshness and Portions" 
                  className="w-10 h-10 object-contain" 
                />
                <h2 className="text-3xl sm:text-4xl font-light text-white">
                  Freshness & Perfect Portions
                </h2>
              </div>
              <p className="text-lg text-white/80 mb-6 leading-relaxed font-light">
                The 250ml format is designed for modern wine enjoyment—perfect for one person or shared between two. No more opened bottles losing their sparkle in the refrigerator.
              </p>
              <Card className="p-6 bg-slate-800/50 border-orange-500/20 mb-6">
                <h3 className="text-xl font-normal mb-3 text-white">Single-Serve Excellence</h3>
                <p className="text-white/70 mb-4 font-light">
                  Each can delivers the perfect amount of sparkling wine. Whether you're enjoying a solo moment of relaxation or sharing with a companion, there's no waste and no compromise on quality.
                </p>
              </Card>
              <Card className="p-6 bg-slate-800/50 border-orange-500/20">
                <h3 className="text-xl font-normal mb-3 text-white">Always Peak Freshness</h3>
                <p className="text-white/70 font-light">
                  Unlike bottles that deteriorate once opened, every can of Kibay Espumante is enjoyed at its absolute peak. The first sip tastes identical to the last—perfectly carbonated, perfectly fresh.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Sustainability */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center gap-3 mb-6">
              <Leaf className="w-10 h-10 text-orange-500" />
              <h2 className="text-3xl sm:text-4xl font-light text-white">
                Sustainability Matters
              </h2>
            </div>
            <p className="text-lg text-white/80 max-w-3xl mx-auto font-light">
              Premium quality shouldn't come at the planet's expense. Our aluminum cans represent a commitment to environmental responsibility.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-xl font-normal mb-3 text-white">Infinitely Recyclable</h3>
                <p className="text-white/70 font-light">
                  Aluminum can be recycled endlessly without quality loss. Over 75% of all aluminum ever produced is still in use today.
                </p>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <h3 className="text-xl font-normal mb-3 text-white">Reduced Carbon Footprint</h3>
                <p className="text-white/70 font-light">
                  Lighter than glass, cans require less fuel for transportation. This significantly reduces our carbon emissions per bottle.
                </p>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-normal mb-3 text-white">Fast Recycling</h3>
                <p className="text-white/70 font-light">
                  Aluminum cans can be recycled and back on shelves as new cans in just 60 days—far faster than glass.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Convenience Without Compromise */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-light mb-6 text-white">
              Convenience Without Compromising Quality
            </h2>
            <p className="text-lg text-white/80 max-w-3xl mx-auto mb-8 font-light">
              Premium wine should fit your lifestyle, not complicate it. Kibay Espumante in aluminum cans brings sophistication to any occasion.
            </p>
          </motion.div>
          
          <div className="grid sm:grid-cols-2 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <h3 className="text-xl font-normal mb-3 text-white">Beach & Pool Ready</h3>
                <p className="text-white/70 font-light">
                  No glass means no worries. Enjoy premium sparkling wine poolside, at the beach, or on the boat without safety concerns.
                </p>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <h3 className="text-xl font-normal mb-3 text-white">Lightweight & Portable</h3>
                <p className="text-white/70 font-light">
                  Perfect for picnics, concerts, hiking, and travel. Take premium wine anywhere without the weight and fragility of glass.
                </p>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <h3 className="text-xl font-normal mb-3 text-white">Quick Chill</h3>
                <p className="text-white/70 font-light">
                  Aluminum conducts temperature 50x faster than glass. Chill your Kibay in minutes, not hours. Perfect for spontaneous celebrations.
                </p>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
            >
              <Card className="p-6 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <h3 className="text-xl font-normal mb-3 text-white">No Corkscrew Needed</h3>
                <p className="text-white/70 font-light">
                  Easy open, easy enjoy. Modern convenience meets traditional quality. No tools, no fuss—just great wine.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Winery Credibility */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 md:p-12 bg-gradient-to-br from-slate-800 to-slate-900 border-orange-500/20">
              <div className="text-center mb-8">
                <h2 className="text-3xl sm:text-4xl font-light mb-4 text-white">
                  Backed by Ocoa Bay Excellence
                </h2>
                <p className="text-lg text-white/80 font-light">
                  The choice of aluminum cans isn't just practical—it's a reflection of our commitment to innovation while honoring tradition.
                </p>
              </div>
              
              <div className="space-y-6 font-light">
                <p className="text-white/70 leading-relaxed">
                  At Ocoa Bay Winery, we've spent years perfecting our organic fermentation process. When it came time to package Kibay Espumante, we researched extensively to find the packaging that would best preserve our wine's quality.
                </p>
                <p className="text-white/70 leading-relaxed">
                  The answer was clear: aluminum cans offer superior protection, sustainability, and convenience without sacrificing the premium quality our customers expect. This isn't a compromise—it's an upgrade.
                </p>
                <p className="text-white/70 leading-relaxed">
                  We're proud to be at the forefront of the canned wine movement, proving that premium quality and modern convenience can coexist beautifully.
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
      
      <Footer />
    </>
  );
};

export default WhyCansPage;