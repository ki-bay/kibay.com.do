import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Award, Leaf, Users } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Card from '@/components/ui/card';
import SEOHead from '@/components/SEOHead';

const AboutPage = () => {
  return (
    <>
      <SEOHead 
        title="About Kibay | Caribbean Wine Craftsmanship"
        description="Learn about Kibay's mission to bring modern Caribbean wines and Espumante crafted from organic fruits to the world."
      />
      
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden pt-20">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1602757205362-336105af9324" 
            alt="Lush vineyard showcasing organic agricultural heritage"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/60 to-slate-900"></div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-light mb-6 text-white">
            Our <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal">Story</span>
          </h1>
          <p className="text-xl sm:text-2xl text-white/90 max-w-3xl mx-auto font-light">
            Where Caribbean heritage meets modern innovation
          </p>
        </motion.div>
      </section>
      
      {/* Brand Story */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl font-light mb-6 text-white">
              The Kibay Vision
            </h2>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="space-y-6 text-lg text-white/80 leading-relaxed font-light"
          >
            <p>
              Kibay Sparkling was born from a simple yet powerful idea: to create a sparkling wine that captures the vibrant spirit of the Caribbean while meeting the demands of modern life. We saw an opportunity to honor our Dominican heritage through organic ingredients and innovative winemaking.
            </p>
            <p>
              The name "Kibay" reflects our commitment to authenticity and place. Every sip tells the story of sun-drenched tropical fruits, skilled craftsmanship, and a deep respect for sustainable agriculture.
            </p>
            <p>
              We believe that premium wine shouldn't be confined to formal occasions or traditional settings. Kibay is designed for now—for beach sunsets, rooftop gatherings, and spontaneous celebrations. It's wine without pretension, quality without compromise.
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Ocoa Bay Winery */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Award className="w-10 h-10 text-orange-500" />
                <h2 className="text-3xl sm:text-4xl font-light text-white">
                  Ocoa Bay Winery
                </h2>
              </div>
              <p className="text-lg text-white/80 mb-6 leading-relaxed font-light">
                Nestled in the heart of the Dominican Republic, Ocoa Bay Winery has been a pioneer in Caribbean winemaking for over two decades. Our location provides the perfect terroir for cultivating exceptional tropical fruits.
              </p>
              <Card className="p-6 bg-slate-900/50 border-orange-500/20 mb-6">
                <h3 className="text-xl font-normal mb-3 text-white">Heritage & Innovation</h3>
                <p className="text-white/70 font-light">
                  We combine traditional fermentation techniques passed down through generations with cutting-edge technology. This unique blend allows us to create wines that honor the past while embracing the future.
                </p>
              </Card>
              <Card className="p-6 bg-slate-900/50 border-orange-500/20">
                <h3 className="text-xl font-normal mb-3 text-white">Winemaking Excellence</h3>
                <p className="text-white/70 font-light">
                  Our master winemakers bring decades of experience and an unwavering commitment to quality. Every batch of Kibay Sparkling undergoes rigorous quality control to ensure consistency and excellence.
                </p>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img 
                  src="https://images.unsplash.com/photo-1621437218583-7028065980f8" 
                  alt="Beautiful Caribbean sunset over tropical landscape"
                  className="w-full h-[600px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Organic Production Values */}
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
                Organic Commitment
              </h2>
            </div>
            <p className="text-lg text-white/80 max-w-3xl mx-auto font-light">
              Organic isn't just a certification for us—it's a philosophy that guides every decision we make.
            </p>
          </motion.div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-normal mb-3 text-white text-center">Certified Organic</h3>
                <p className="text-white/70 text-center font-light">
                  Every ingredient meets strict organic certification standards, ensuring purity from fruit to finished product.
                </p>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-normal mb-3 text-white text-center">Local Partnerships</h3>
                <p className="text-white/70 text-center font-light">
                  We work exclusively with certified organic Dominican farms, supporting local agriculture and minimizing our carbon footprint.
                </p>
              </Card>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <Card className="p-8 h-full hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-normal mb-3 text-white text-center">Sustainable Practices</h3>
                <p className="text-white/70 text-center font-light">
                  From water conservation to renewable energy, we minimize environmental impact at every stage of production.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Caribbean Heritage */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-800 to-slate-900">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-light text-center mb-8 text-white">
              Proudly <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent font-normal">Dominican</span>
            </h2>
            
            <Card className="p-8 md:p-12 bg-gradient-to-br from-slate-800 to-slate-900 border-orange-500/20">
              <p className="text-lg text-white/80 mb-6 leading-relaxed font-light">
                The Dominican Republic is blessed with abundant sunshine, rich soil, and a culture that celebrates life's pleasures. These elements are woven into every aspect of Kibay Sparkling.
              </p>
              <p className="text-lg text-white/80 mb-6 leading-relaxed font-light">
                Our mangoes and passion fruits are grown in the same tropical paradise that produces world-renowned coffee, cacao, and sugarcane. This land has a unique ability to impart intense, vibrant flavors that simply cannot be replicated elsewhere.
              </p>
              <p className="text-lg text-white/80 leading-relaxed font-light">
                By sourcing locally and producing entirely within the Dominican Republic, we celebrate our heritage while supporting our community. Every bottle of Kibay is a testament to Dominican agricultural excellence and craftsmanship.
              </p>
            </Card>
          </motion.div>
        </div>
      </section>
      
      {/* Vision for Modern Wine */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl sm:text-4xl font-light mb-8 text-white">
              Wine for the Modern World
            </h2>
            
            <div className="space-y-6 text-lg text-white/80 leading-relaxed text-left font-light">
              <p>
                We envision a future where premium wine is accessible, sustainable, and perfectly suited to how people actually live. No more intimidating wine lists, fragile bottles, or wasteful half-empty glasses.
              </p>
              <p>
                Kibay Sparkling represents this vision in action. It's wine that travels with you, chills quickly, stays fresh, and never compromises on quality. It's wine that fits into beach bags and backpacks as easily as it does on restaurant tables.
              </p>
              <p>
                Most importantly, it's wine that brings joy without pretension. Whether you're a sommelier or someone enjoying their first sparkling wine, Kibay welcomes you with open arms and vibrant tropical flavors.
              </p>
              <p className="text-xl font-medium text-orange-400 text-center mt-8">
                This is wine designed for now. This is Kibay.
              </p>
            </div>
          </motion.div>
        </div>
      </section>
      
      <Footer />
    </>
  );
};

export default AboutPage;