import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Heart, Sun, Globe, ShoppingBag, Info, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Card from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const PassionFruitPage = () => {
  return (
    <>
      <Helmet>
        <title>Passion Fruit (Chinola) | Kibay Sparkling</title>
        <meta name="description" content="Explore the exotic world of Passion Fruit (Chinola). Learn about its health benefits, nutrients, and why it's the soul of Kibay's sparkling wine." />
      </Helmet>
      
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-20 font-lato">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1637019449619-37ea52b9a699" 
            alt="Vibrant passion fruit (Chinola)"
            className="w-full h-full object-cover brightness-50"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/50 to-slate-900"></div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light mb-6 text-white">
            Exotic <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal">Passion Fruit</span>
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto font-light leading-relaxed">
            Known locally as "Chinola," this tangy treasure is the heartbeat of Caribbean flavor.
          </p>
        </motion.div>
      </section>

      {/* Content Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900 font-lato">
        <div className="max-w-7xl mx-auto space-y-24">
          
          {/* Intro Grid */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
             <motion.div
               initial={{ opacity: 0, x: -30 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6 }}
               viewport={{ once: true }}
             >
                <div className="flex items-center gap-3 mb-6">
                  <Info className="w-10 h-10 text-orange-500" />
                  <h2 className="text-3xl font-light text-white">Characteristics</h2>
                </div>
                <p className="text-lg text-white/80 leading-relaxed font-light">
                  Tart, aromatic, and juicy; typically has a wrinkled purple or yellow rind. The unmistakable scent of passion fruit fills the air as soon as you cut it open, revealing golden, seed-filled pulp that bursts with flavor.
                </p>
             </motion.div>
             <motion.div
               initial={{ opacity: 0, x: 30 }}
               whileInView={{ opacity: 1, x: 0 }}
               transition={{ duration: 0.6 }}
               viewport={{ once: true }}
             >
                <div className="flex items-center gap-3 mb-6">
                  <Globe className="w-10 h-10 text-orange-500" />
                  <h2 className="text-3xl font-light text-white">Origins & History</h2>
                </div>
                <p className="text-lg text-white/80 leading-relaxed font-light">
                  Passion fruit is native to South America and is widely used in tropical cuisines. In the Dominican Republic, "Chinola" is more than a fruit—it's a staple ingredient for juices, desserts, and now, our premium sparkling wine.
                </p>
             </motion.div>
          </div>

          {/* Benefits Cards */}
          <div>
            <motion.div 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="text-center mb-12"
            >
               <h2 className="text-3xl sm:text-4xl font-light text-white">Vibrant Health</h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8">
              <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1 }}
                 viewport={{ once: true }}
              >
                <Card className="p-8 bg-slate-800/50 border-orange-500/20 h-full hover:bg-slate-800 transition-colors">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                    <Heart className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-normal text-white mb-4">Health Benefits</h3>
                  <p className="text-white/70 font-light leading-relaxed">
                    Passion fruit is known for its high antioxidant content, helps improve digestion, and supports heart health. Its seeds are also a great source of fiber.
                  </p>
                </Card>
              </motion.div>

              <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.2 }}
                 viewport={{ once: true }}
              >
                <Card className="p-8 bg-slate-800/50 border-orange-500/20 h-full hover:bg-slate-800 transition-colors">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                    <Zap className="w-6 h-6 text-orange-500" />
                  </div>
                  <h3 className="text-xl font-normal text-white mb-4">Vitamins & Nutrients</h3>
                  <p className="text-white/70 font-light leading-relaxed">
                    Rich in Vitamin C, Vitamin A, and dietary fiber. It provides an immune-boosting punch of nutrition in every serving, making it as healthy as it is delicious.
                  </p>
                </Card>
              </motion.div>
            </div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center bg-gradient-to-r from-orange-500/10 to-orange-600/10 rounded-3xl p-12 border border-orange-500/20"
          >
            <h2 className="text-3xl font-light text-white mb-6">Taste the Passion</h2>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-8 font-light">
              Experience the bold, refreshing zest of Chinola in our sparkling wine.
            </p>
            <Link to="/shop">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white font-normal rounded-full px-10 py-6 text-lg shadow-lg hover:shadow-orange-500/30 transition-all">
                <ShoppingBag className="mr-2 h-5 w-5" />
                Shop Now
              </Button>
            </Link>
          </motion.div>

        </div>
      </section>

      <Footer />
    </>
  );
};

export default PassionFruitPage;