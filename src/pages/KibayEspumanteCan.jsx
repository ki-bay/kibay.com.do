import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProductImageGallery from '@/components/ProductImageGallery';
import ProductDetailsCard from '@/components/ProductDetailsCard';
import ProductCard from '@/components/ProductCard';

const KibayEspumanteCan = () => {
  const productData = {
    id: 'kibay-can',
    name: 'Kibay Sparkling - 250ml Can',
    price: 250,
    description: 'A convenient, single-serve organic sparkling wine. Crisp, refreshing, and bursting with Dominican tropical flavors.',
    details: {
      Category: 'Sparkling Wine',
      Origin: 'Dominican Republic',
      Format: '250ml Aluminum Can',
      Ingredients: 'Organic mango, passion fruit, natural fermentation',
      Style: 'Dry Sparkling Wine',
      'Alcohol %': '11.5%',
      'Shelf life': '2 years'
    }
  };

  const images = [
    'https://images.unsplash.com/photo-1514721011872-7b7c47dea6b1',
    'https://images.unsplash.com/photo-1695032553876-7f277e3f5c45' // Lifestyle
  ];

  return (
    <>
      <Helmet>
        <title>Kibay Sparkling – Organic Mango & Passion Fruit Sparkling Wine</title>
        <meta name="description" content="Organic Dominican sparkling wine fermented with mango & passion fruit. Crafted by Ocoa Bay winery. Refreshing, natural, and unique." />
        <link rel="canonical" href="https://yourwebsite.com/kibay-espumante-can" />
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-stone-50 pt-20">
        
        {/* Main Product Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid lg:grid-cols-2 gap-12 xl:gap-20">
            {/* Gallery */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <ProductImageGallery images={images} altBase="Kibay Sparkling 250ml organic sparkling wine can" />
            </motion.div>

            {/* Product Info & Purchase */}
            <div className="flex flex-col justify-center space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <span className="text-mango-600 font-semibold tracking-wider text-sm uppercase mb-2 block">Organic & Natural</span>
                <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-6 leading-tight">
                  Kibay Sparkling – Organic Sparkling Wine with Mango & Passion Fruit
                </h1>
                <p className="text-xl text-stone-600 font-light leading-relaxed mb-8">
                  A refreshing organic sparkling wine crafted with Dominican mango and passion fruit. Perfect for any occasion.
                </p>
                
                {/* Embedded Purchase Card Logic */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 max-w-md">
                   <ProductCard product={{
                     id: productData.id,
                     name: productData.name,
                     price: productData.price,
                     description: '', // Hidden in minimal card view if empty
                     image: images[0]
                   }} hideImage={true} />
                </div>
              </motion.div>

              <ProductDetailsCard details={productData.details} />
            </div>
          </div>
        </section>

        {/* Editorial Content Sections */}
        <div className="bg-white py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-mango-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto space-y-20 relative z-10">
            
            {/* Crafted in DR */}
            <section className="text-center">
              <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-6">Crafted in the Dominican Republic</h2>
              <div className="w-16 h-1 bg-mango-400 mx-auto mb-8"></div>
              <p className="text-lg text-stone-600 leading-relaxed font-light">
                Born from the sun-drenched soil of the Caribbean. Our wine captures the essence of the tropics, balancing the sweetness of ripened mangoes with the vibrant acidity of passion fruit. Naturally fermented. Carefully crafted.
              </p>
            </section>

            {/* Process & Organic */}
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <section>
                <h2 className="text-2xl font-serif text-stone-900 mb-4">Fermentation & Wine Process</h2>
                <p className="text-stone-600 leading-relaxed">
                  We use traditional fermentation methods to create fine, persistent bubbles. The process respects the integrity of the fruit, ensuring a clean, crisp finish that dances on the palate without being overly sweet.
                </p>
              </section>
              <section>
                <h2 className="text-2xl font-serif text-stone-900 mb-4">Organic Ingredients & Natural Profile</h2>
                <p className="text-stone-600 leading-relaxed">
                  No artificial flavors. No synthetic additives. Just pure, organic fruit grown under the Caribbean sun. Our commitment to organic farming protects the land and delivers a purer taste experience.
                </p>
              </section>
            </div>

            {/* Tasting & Enjoyment */}
            <section className="bg-stone-50 p-8 md:p-12 rounded-2xl border border-stone-100">
              <div className="grid md:grid-cols-2 gap-12">
                <div>
                  <h2 className="text-2xl font-serif text-stone-900 mb-4 flex items-center gap-2">
                    Tasting Notes
                  </h2>
                  <ul className="space-y-3 text-stone-600">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-mango-400 mt-2.5"></span>
                      <span><strong>Nose:</strong> Vibrant tropical bouquet dominated by fresh mango and hints of citrus.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-mango-400 mt-2.5"></span>
                      <span><strong>Palate:</strong> Crisp acidity balanced by natural fruit sweetness. Fine, elegant effervescence.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-mango-400 mt-2.5"></span>
                      <span><strong>Finish:</strong> Clean, refreshing, and moderately long with a lingering tropical aftertaste.</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h2 className="text-2xl font-serif text-stone-900 mb-4">How to Enjoy Kibay</h2>
                  <p className="text-stone-600 mb-4">
                    Best served chilled between 6-8°C.
                  </p>
                  <p className="text-stone-600">
                    Perfect as an aperitif, or paired with light seafood, ceviche, soft cheeses, or fruit-based desserts. Its versatility makes it the ideal companion for beach sunsets or elegant dinners alike.
                  </p>
                </div>
              </div>
            </section>

            {/* Winery Credibility */}
            <section className="text-center pt-8">
              <h2 className="text-3xl font-serif text-stone-900 mb-4">Winery Credibility</h2>
              <p className="text-lg text-stone-500 italic mb-10">From the same winery as Kibay Wine — by Ocoa Bay</p>
              
              <div className="relative rounded-2xl overflow-hidden shadow-xl max-w-3xl mx-auto group">
                <img 
                  src="https://images.unsplash.com/photo-1587895656140-88dc74ed96de" 
                  alt="Ocoa Bay winery Dominican vineyard organic farming"
                  className="w-full h-80 object-cover transform group-hover:scale-105 transition-transform duration-1000"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-500"></div>
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white font-medium">Sustainable Viticulture in the Heart of the Caribbean</p>
                </div>
              </div>
            </section>

          </div>
        </div>

      </div>
      <Footer />
    </>
  );
};

export default KibayEspumanteCan;