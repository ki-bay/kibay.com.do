import React, { useEffect, useState } from 'react';
import { motion, useScroll } from 'framer-motion';
import { Leaf, Zap, ArrowRight, ShoppingBag, MapPin, GlassWater, Sun, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Card from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getProducts } from '@/api/EcommerceApi';
import SEOHead from '@/components/SEOHead';
import { mediaUrl } from '@/config/mediaCdn';

const HomePage = () => {
  const { scrollY } = useScroll();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getProducts();
        setProducts(data.products || []);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Helper to find specific product images or use safe fallbacks
  const getProductImage = (term, fallbackUrl) => {
    if (!products.length) return fallbackUrl;
    const product = products.find(p => p.title.toLowerCase().includes(term.toLowerCase()));
    // Try to get image from various possible API structures
    return product?.image || product?.images?.[0]?.url || fallbackUrl;
  };

  const sparklingImage = getProductImage('sparkling', mediaUrl('bc5a0b64ce661332da23e928299b7c41.jpg'));
  const wineImage = getProductImage('wine', 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?q=80&w=2940&auto=format&fit=crop');

  // Animation variants
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const stagger = {
    visible: { transition: { staggerChildren: 0.1 } }
  };

  return (
    <>
      <SEOHead 
        title="Kibay – Espumante & Caribbean Wine Shop | Home"
        description="Discover Kibay Espumante and Caribbean wines crafted from organic fruits in the Dominican Republic."
      />

      <Navigation />

      {/* Hero Section */}
      <section className="relative min-h-screen lg:min-h-[90vh] flex items-center bg-slate-900 pt-24 pb-12 lg:pt-32 lg:pb-20 overflow-hidden font-lato">
        {/* Background Atmosphere */}
        <div
          className="absolute inset-0 bg-cover bg-center opacity-5 blur-sm"
          style={{ backgroundImage: `url(${mediaUrl('09a4757f8d6894f3f809efc283dcd8d9.jpg')})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/90 via-slate-900 to-slate-900 lg:bg-gradient-to-r lg:from-slate-900 lg:via-slate-900/95 lg:to-slate-900/50"></div>

        {/* Decorative Glows */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-500/10 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Left Column: Content */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="flex flex-col items-center lg:items-start text-center lg:text-left space-y-6 lg:space-y-8 order-1"
            >
              <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-sm font-medium tracking-wider uppercase mb-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                </span>
                New Arrival
              </motion.div>

              <motion.h1 variants={fadeIn} className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-light text-white leading-[1.1] tracking-tight">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 font-normal">
                  Kibay Sparkling
                </span>
              </motion.h1>

              <motion.div variants={fadeIn} className="space-y-4 max-w-lg">
                <p className="text-lg sm:text-xl text-white/90 font-light">
                  Organic sparkling wine with mango & passion fruit.
                </p>
                <p className="text-base text-white/60 font-light leading-relaxed">
                  Naturally fermented in the Dominican Republic, expressing a fresh and modern vision of Caribbean wine.
                </p>
                <p className="text-sm text-white/50 font-light italic">
                  From the same winery as Kibay wine — by Ocoa Bay.
                </p>
              </motion.div>

              <motion.div variants={fadeIn} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
                <Link to="/shop" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white font-normal rounded-full px-8 py-6 text-lg shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all hover:scale-105">
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Shop Now
                  </Button>
                </Link>
                <Link to="/about" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto border-white/20 hover:bg-white/10 text-white hover:text-orange-400 font-normal rounded-full px-8 py-6 text-lg">
                    Our Story
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Column: Visual */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="relative order-2 lg:order-2 flex justify-center items-center"
            >
              {/* Abstract shapes behind bottle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] bg-gradient-to-tr from-orange-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>

              <img
                src={mediaUrl('bc5a0b64ce661332da23e928299b7c41.jpg')}
                alt="Kibay Sparkling Can"
                className="relative z-10 w-auto h-[350px] sm:h-[450px] lg:h-[650px] object-contain drop-shadow-2xl hover:scale-105 transition-transform duration-700"
              />
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 hidden lg:flex"
        >
          <span className="text-xs uppercase tracking-widest font-light">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-white/30 to-transparent"></div>
        </motion.div>
      </section>

      {/* Our Story / Origin Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-slate-800 overflow-hidden shadow-[0_-20px_50px_rgba(0,0,0,0.5)] font-lato">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-6">
              Our <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal">Origin</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg font-light">
              Kibay Sparkling is crafted in the south of the Dominican Republic using organically sourced mango and passion fruit. Produced by an experienced local winery, it reflects a modern approach to Caribbean winemaking — grounded in fermentation, origin, and quality.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <Link to="/mango">
                <Card className="overflow-hidden h-full rounded-3xl border-none shadow-2xl bg-slate-900 relative">
                  <div className="relative h-[500px] overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1697350495566-a094004aedd8"
                      alt="Fresh organic mangoes"
                      className="w-full h-full object-cover bg-center transform group-hover:scale-105 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-90"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 text-center">
                      <span className="text-orange-400 font-medium tracking-wider text-sm uppercase mb-2 block">Our Ingredients</span>
                      <h3 className="text-3xl font-normal text-white mb-4">MANGO</h3>
                      <p className="text-white/80 leading-relaxed text-lg mb-6 font-light">Through fermentation, mango contributes natural body, softness, and tropical depth to the wine — without artificial sweetness.</p>
                      <div className="flex items-center justify-center text-white font-medium group-hover:text-orange-400 transition-colors">
                        Find Out More About Mango <ArrowRight className="ml-2 w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="group cursor-pointer"
            >
              <Link to="/passion-fruit">
                <Card className="overflow-hidden h-full rounded-3xl border-none shadow-2xl bg-slate-900 relative">
                  <div className="relative h-[500px] overflow-hidden">
                    <img
                      src={mediaUrl('ai-generated-8983326-k1zSk.jpg')}
                      alt="Fine dining experience with premium sparkling wine"
                      className="w-full h-full object-cover bg-center transform group-hover:scale-105 transition-transform duration-1000"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent opacity-90"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 text-center">
                      <span className="text-orange-400 font-medium tracking-wider text-sm uppercase mb-2 block">Our Flavor</span>
                      <h3 className="text-3xl font-normal text-white mb-4">PASSION FRUIT</h3>
                      <p className="text-white/80 leading-relaxed text-lg mb-6 font-light">Fermented passion fruit brings brightness and natural acidity, balancing the wine and enhancing its crisp, refreshing finish.</p>
                      <div className="flex items-center justify-center text-white font-medium group-hover:text-orange-400 transition-colors">
                        Find Out More About Passion Fruit <ArrowRight className="ml-2 w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Wine Clarity Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 font-lato text-center">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-6">
              Wine First. Always.
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto text-lg font-light">
              Kibay Sparkling is a sparkling wine made through fermentation. It is not a flavored soda, cocktail, or artificially sweetened drink.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section (The Kibay Difference) */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 font-lato">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-center mb-6 text-white">
              The Kibay Difference
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg font-light">
              Kibay is for those who appreciate real wine, natural ingredients, and a modern way to enjoy the Caribbean — one sparkling moment at a time. Discover Kibay Sparkling.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 border-white/5 bg-slate-800/50 h-full backdrop-blur-sm group hover:-translate-y-2">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:bg-orange-500 transition-colors duration-300">
                  <Leaf className="w-8 h-8 text-orange-500 group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-normal mb-3 text-white">Organic Fermentation</h3>
                <p className="text-white/70 leading-relaxed font-light">
                  Naturally fermented with organic mango and passion fruit. No artificial sugars. No chemicals.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 border-white/5 bg-slate-800/50 h-full backdrop-blur-sm group hover:-translate-y-2">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:bg-orange-500 transition-colors duration-300">
                  <MapPin className="w-8 h-8 text-orange-500 group-hover:text-white transition-colors" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-normal mb-3 text-white">Caribbean Heritage</h3>
                <p className="text-white/70 leading-relaxed font-light">
                  Proudly produced in the Dominican Republic by the same winery behind Kibay wine.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 text-center hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 border-white/5 bg-slate-800/50 h-full backdrop-blur-sm group hover:-translate-y-2">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner group-hover:bg-orange-500 transition-colors duration-300">
                  <Zap className="w-8 h-8 text-orange-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-normal mb-3 text-white">Premium Format</h3>
                <p className="text-white/70 leading-relaxed font-light">Presented in 250ml aluminum cans to preserve freshness and offer a modern way to enjoy sparkling wine.</p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Designed for Modern Wine Moments Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-slate-800 font-lato text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-6">
              Designed for Modern Wine Moments
            </h2>
            <p className="text-white/70 max-w-3xl mx-auto text-lg font-light leading-relaxed">
              Kibay Sparkling is presented in a sleek 250ml aluminum can — a modern format that preserves freshness, protects quality, and fits today's lifestyle. Perfectly portioned, easy to chill, and effortless to enjoy, it's sparkling wine reimagined for beaches, rooftops, gatherings, and relaxed moments at home.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How to Enjoy Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 font-lato">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
             <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1"
            >
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-6">
                How to Enjoy Kibay Sparkling
              </h2>
              <div className="w-20 h-1 bg-orange-500 mb-8"></div>
              <p className="text-white/70 text-lg font-light leading-relaxed mb-6">
                Serve well chilled. Enjoy Kibay Sparkling on its own or paired with light dishes, seafood, fresh salads, tropical cuisine, or soft cheeses. Its natural acidity and gentle fruit character make it ideal for warm climates and social occasions — from casual afternoons to elegant evenings.
              </p>
              <div className="flex gap-6 mt-8">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <GlassWater className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="text-xs text-white/50 uppercase tracking-widest">Chill</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Zap className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="text-xs text-white/50 uppercase tracking-widest">Pop</span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Leaf className="w-6 h-6 text-orange-400" />
                  </div>
                  <span className="text-xs text-white/50 uppercase tracking-widest">Enjoy</span>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="relative order-1 lg:order-2 h-[400px] lg:h-[500px] rounded-3xl overflow-hidden shadow-2xl"
            >
               <img 
                src="https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?q=80&w=2787&auto=format&fit=crop" 
                alt="Chilled sparkling wine glass in tropical setting" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Inspired by the Tropics Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-slate-800 font-lato text-center">
        <div className="absolute inset-0 overflow-hidden">
           <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-[80px]"></div>
        </div>
        
        <div className="max-w-3xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-orange-500/10 mb-6">
              <Sun className="w-6 h-6 text-orange-500" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-6">
              Inspired by the Tropics
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto text-lg font-light leading-relaxed">
              The visual identity of Kibay reflects its tropical origin — warm orange tones inspired by ripe mango, complemented by subtle passion fruit and sliced mango iconography. Clean layouts and natural textures keep the experience refined, modern, and unmistakably Caribbean.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Our Products Section */}
      <section className="relative z-10 py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 font-lato">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-light text-white mb-6">
              Our <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal">Products</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg font-light">
              Explore the unique flavors of the Dominican Republic. From our signature sparkling wine to our original still wine, Kibay brings the Caribbean terroir to your glass. Interested in distribution? Partner with us to bring Kibay to your market.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Kibay Sparkling Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="flex flex-col h-full bg-slate-800 border-white/5 overflow-hidden shadow-2xl rounded-2xl group hover:-translate-y-2 transition-all duration-300">
                <div className="relative h-[400px] overflow-hidden bg-slate-900">
                  <img
                    src={sparklingImage}
                    alt="Kibay Sparkling Wine"
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                </div>
                <div className="p-8 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-normal text-white mb-2">Kibay Sparkling</h3>
                    <p className="text-white/60 font-light leading-relaxed mb-6">
                      Organic sparkling wine with mango & passion fruit, naturally fermented. Fresh, modern, and unmistakably Caribbean.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <Link to="/product/kibay-sparkling" className="flex-1">
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-normal rounded-xl py-6">
                        Buy Now
                      </Button>
                    </Link>
                    <Link to="/kibay-sparkling" className="flex-1">
                      <Button variant="outline" className="w-full border-white/20 hover:bg-white/10 text-white font-normal rounded-xl py-6">
                        Learn More
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Kibay Wine Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="flex flex-col h-full bg-slate-800 border-white/5 overflow-hidden shadow-2xl rounded-2xl group hover:-translate-y-2 transition-all duration-300">
                <div className="relative h-[400px] overflow-hidden bg-slate-900">
                   <img
                    src={wineImage}
                    alt="Kibay Original Wine"
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                </div>
                <div className="p-8 flex-grow flex flex-col justify-between">
                  <div>
                    <h3 className="text-2xl font-normal text-white mb-2">Kibay Wine</h3>
                    <p className="text-white/60 font-light leading-relaxed mb-6">
                      The original expression of Kibay. A still wine that captures the essence of our tropical terroir with balance and character.
                    </p>
                  </div>
                  <div className="flex gap-4">
                     <Link to="/product/kibay-wine" className="flex-1">
                      <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-normal rounded-xl py-6">
                        Buy Now
                      </Button>
                    </Link>
                    <Link to="/kibay-wine" className="flex-1">
                      <Button variant="outline" className="w-full border-white/20 hover:bg-white/10 text-white font-normal rounded-xl py-6">
                        Learn More
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
};

export default HomePage;