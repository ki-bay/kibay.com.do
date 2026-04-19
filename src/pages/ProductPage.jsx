import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Wine, Thermometer, Award, Leaf } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Card from '@/components/ui/card';
const ProductPage = () => {
  return <>
      <Helmet>
        <title>Our Wine - Kibay Espumante | Organic Sparkling Wine</title>
        <meta name="description" content="Discover Kibay Espumante: premium organic sparkling wine made with mango and passion fruit. Learn about our fermentation process, tasting notes, and Dominican heritage." />
      </Helmet>
      
      <Navigation />
      
      {/* Product Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <img src="https://horizons-cdn.hostinger.com/786d721b-c0c7-4506-bee4-4ef9f4967a92/kibay-ph1tq.jpg" alt="Premium Kibay Espumante sparkling wine can design" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/50 to-slate-900"></div>
        </div>
        
        <motion.div initial={{
        opacity: 0,
        y: 30
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 1
      }} className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 text-white">
            Kibay <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">Espumante</span>
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 mb-4">
            Organic Sparkling Wine
          </p>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            A celebration of Caribbean flavors, crafted with organic mango and passion fruit
          </p>
        </motion.div>
      </section>
      
      {/* Product Description */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }} viewport={{
          once: true
        }} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white">
              The Art of Fermentation
            </h2>
            <p className="text-lg text-white/80 leading-relaxed mb-6">
              Kibay Espumante is born from a meticulous organic fermentation process that transforms premium Dominican mango and passion fruit into a sophisticated sparkling wine. Our winemakers at Ocoa Bay have perfected a technique that honors traditional methods while embracing modern innovation.
            </p>
            <p className="text-lg text-white/80 leading-relaxed">
              Each batch begins with hand-selected organic fruits at peak ripeness. Through natural fermentation, we unlock complex flavor profiles that showcase the vibrant essence of the Caribbean. The result is a refreshingly elegant sparkling wine that captures the spirit of tropical paradise in every sip.
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Tasting Notes */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }} viewport={{
          once: true
        }} className="text-3xl sm:text-4xl font-bold text-center mb-12 text-white">
            Tasting Notes
          </motion.h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.1
          }} viewport={{
            once: true
          }}>
              <Card className="p-8 text-center hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <Wine className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-3 text-white">Aroma</h3>
                <p className="text-white/70">
                  Bright tropical fruit notes with hints of ripe mango, passion fruit zest, and subtle floral undertones
                </p>
              </Card>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.2
          }} viewport={{
            once: true
          }}>
              <Card className="p-8 text-center hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <svg className="w-12 h-12 text-orange-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                <h3 className="text-xl font-bold mb-3 text-white">Palate</h3>
                <p className="text-white/70">
                  Crisp and effervescent with layers of tropical mango sweetness balanced by vibrant passion fruit acidity
                </p>
              </Card>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.3
          }} viewport={{
            once: true
          }}>
              <Card className="p-8 text-center hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <svg className="w-12 h-12 text-orange-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <h3 className="text-xl font-bold mb-3 text-white">Finish</h3>
                <p className="text-white/70">
                  Clean and refreshing with lingering tropical fruit notes and a delicate effervescence
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Serving Suggestions */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-800">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }} viewport={{
          once: true
        }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-white">
              Serving Suggestions
            </h2>
            
            <Card className="p-8 mb-8">
              <div className="flex items-start gap-4 mb-6">
                <Thermometer className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Perfect Temperature</h3>
                  <p className="text-white/70">
                    Serve chilled at 6-8°C (43-46°F) for optimal taste and refreshment. For best results, refrigerate for at least 2 hours before serving.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <svg className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <div>
                  <h3 className="text-xl font-bold mb-2 text-white">Pairing Ideas</h3>
                  <p className="text-white/70 mb-3">
                    Kibay Espumante pairs beautifully with:
                  </p>
                  <ul className="list-disc list-inside text-white/70 space-y-2">
                    <li>Fresh seafood, ceviche, and sushi</li>
                    <li>Light salads with citrus dressings</li>
                    <li>Grilled white fish or shrimp</li>
                    <li>Soft cheeses and fruit platters</li>
                    <li>Spicy Caribbean and Asian cuisine</li>
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
      
      {/* Organic Certification & Origin */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }} viewport={{
          once: true
        }} className="text-3xl sm:text-4xl font-bold text-center mb-12 text-white">
            Our Commitment to Excellence
          </motion.h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div initial={{
            opacity: 0,
            x: -20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} transition={{
            duration: 0.6
          }} viewport={{
            once: true
          }}>
              <Card className="p-8 h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <Award className="w-12 h-12 text-orange-500 mb-4" />
                <h3 className="text-2xl font-bold mb-4 text-white">Certified Organic</h3>
                <p className="text-white/70 mb-4">
                  Kibay Espumante is proudly certified organic, ensuring every ingredient meets the highest standards of purity and sustainability. We work exclusively with certified organic mango and passion fruit growers who share our commitment to environmental stewardship.
                </p>
                <p className="text-white/70">
                  Our organic certification guarantees no synthetic pesticides, herbicides, or artificial additives—just pure, natural flavors from the Caribbean.
                </p>
              </Card>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0,
            x: 20
          }} whileInView={{
            opacity: 1,
            x: 0
          }} transition={{
            duration: 0.6
          }} viewport={{
            once: true
          }}>
              <Card className="p-8 h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <Leaf className="w-12 h-12 text-orange-500 mb-4" />
                <h3 className="text-2xl font-bold mb-4 text-white">Dominican Heritage</h3>
                <p className="text-white/70 mb-4">
                  Crafted at Ocoa Bay Winery in the heart of the Dominican Republic, Kibay Espumante celebrates the rich agricultural heritage of our island paradise. Our winery is located in a region blessed with ideal growing conditions for tropical fruits.
                </p>
                <p className="text-white/70">
                  Each bottle tells the story of Dominican craftsmanship, local ingredients, and the vibrant culture that makes our island unique. We're proud to share this taste of the Caribbean with the world.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Fermentation Process */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }} viewport={{
          once: true
        }}>
            <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12 text-white">
              The Fermentation Process
            </h2>
            
            <Card className="p-8">
              <div className="space-y-6">
                <div>
                  <span className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                    Step 1
                  </span>
                  <h3 className="text-xl font-bold mb-2 text-white">Fruit Selection</h3>
                  <p className="text-white/70">
                    We begin with hand-selected organic mangoes and passion fruits at their peak ripeness, sourced from certified Dominican farms. Quality starts with the finest ingredients.
                  </p>
                </div>
                
                <div>
                  <span className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                    Step 2
                  </span>
                  <h3 className="text-xl font-bold mb-2 text-white">Natural Fermentation</h3>
                  <p className="text-white/70">
                    The fruit is carefully processed and introduced to selected yeast cultures. Through controlled fermentation, natural sugars transform into alcohol while preserving the vibrant tropical flavors.
                  </p>
                </div>
                
                <div>
                  <span className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                    Step 3
                  </span>
                  <h3 className="text-xl font-bold mb-2 text-white">Carbonation & Aging</h3>
                  <p className="text-white/70">
                    Secondary fermentation creates the signature effervescence. The wine is then aged to develop complexity before being canned at peak freshness.
                  </p>
                </div>
                
                <div>
                  <span className="inline-block bg-gradient-to-r from-orange-500 to-orange-600 text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                    Step 4
                  </span>
                  <h3 className="text-xl font-bold mb-2 text-white">Premium Canning</h3>
                  <p className="text-white/70">
                    Sealed in 250ml aluminum cans to preserve freshness, protect from light and oxygen, and provide perfect portion control. Innovation meets tradition.
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>
      
      {/* Can Benefits */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-6xl mx-auto">
          <motion.h2 initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6
        }} viewport={{
          once: true
        }} className="text-3xl sm:text-4xl font-bold text-center mb-4 text-white">
            Why 250ml Aluminum Cans?
          </motion.h2>
          <motion.p initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.6,
          delay: 0.1
        }} viewport={{
          once: true
        }} className="text-lg text-white/70 text-center mb-12 max-w-3xl mx-auto">
            Premium quality deserves premium packaging. Our aluminum cans offer unmatched freshness and convenience.
          </motion.p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.1
          }} viewport={{
            once: true
          }}>
              <Card className="p-6 text-center hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">Light Protection</h3>
                <p className="text-sm text-white/70">Complete UV protection preserves flavor and quality</p>
              </Card>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.2
          }} viewport={{
            once: true
          }}>
              <Card className="p-6 text-center hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">Peak Freshness</h3>
                <p className="text-sm text-white/70">Airtight seal locks in effervescence and aroma</p>
              </Card>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.3
          }} viewport={{
            once: true
          }}>
              <Card className="p-6 text-center hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">Sustainable</h3>
                <p className="text-sm text-white/70">Infinitely recyclable with minimal environmental impact</p>
              </Card>
            </motion.div>
            
            <motion.div initial={{
            opacity: 0,
            y: 20
          }} whileInView={{
            opacity: 1,
            y: 0
          }} transition={{
            duration: 0.6,
            delay: 0.4
          }} viewport={{
            once: true
          }}>
              <Card className="p-6 text-center hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300 h-full">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold mb-2 text-white">Perfect Portion</h3>
                <p className="text-sm text-white/70">250ml is ideal for enjoying without waste</p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      
      <Footer />
    </>;
};
export default ProductPage;