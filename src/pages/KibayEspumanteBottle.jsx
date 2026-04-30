import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import ProductImageGallery from '@/components/ProductImageGallery';
import ProductDetailsCard from '@/components/ProductDetailsCard';
import ProductCard from '@/components/ProductCard';

const KibayEspumanteBottle = () => {
  const productData = {
    id: 'kibay-bottle',
    name: 'Kibay Sparkling - 750ml Bottle',
    price: 950,
    description: 'An elegant 750ml bottle of our signature organic sparkling wine. Ideal for sharing, celebrations, and special moments.',
    details: {
      Category: 'Sparkling Wine',
      Origin: 'Dominican Republic',
      Format: '750ml Glass Bottle',
      Ingredients: 'Organic mango, passion fruit, natural fermentation',
      Style: 'Dry Sparkling Wine',
      'Alcohol %': '11.5%',
      'Shelf life': '2 years'
    }
  };

  const images = [
    'https://images.unsplash.com/photo-1703173354700-0b2028e117aa',
    'https://images.unsplash.com/photo-1695032553876-7f277e3f5c45' // Lifestyle
  ];

  return (
    <>
      <Helmet>
        <title>Kibay Sparkling – Organic Mango & Passion Fruit Sparkling Wine</title>
        <meta name="description" content="Organic Dominican sparkling wine fermented with mango & passion fruit. Crafted by Ocoa Bay winery. Refreshing, natural, and unique." />
        <link rel="canonical" href="https://yourwebsite.com/kibay-espumante-bottle" />
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
              <ProductImageGallery images={images} altBase="Kibay Sparkling 750ml premium organic sparkling wine bottle" />
            </motion.div>

            {/* Product Info & Purchase */}
            <div className="flex flex-col justify-center space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <span className="text-mango-600 font-semibold tracking-wider text-sm uppercase mb-2 block">Premium Collection</span>
                <h1 className="text-4xl md:text-5xl font-serif text-stone-900 mb-6 leading-tight">
                  Kibay Sparkling – Organic Sparkling Wine with Mango & Passion Fruit
                </h1>
                <p className="text-xl text-stone-600 font-light leading-relaxed mb-8">
                  The full experience. Our 750ml bottle is designed for the table, bringing the elegance of Dominican winemaking to your gatherings.
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
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="max-w-4xl mx-auto space-y-20 relative z-10">
            
            {/* Crafted in DR */}
            <section className="text-center">
              <h2 className="text-3xl md:text-4xl font-serif text-stone-900 mb-6">Crafted in the Dominican Republic</h2>
              <div className="w-16 h-1 bg-amber-400 mx-auto mb-8"></div>
              <p className="text-lg text-stone-600 leading-relaxed font-light">
                An expression of terroir unlike any other. We cultivate our grapes and tropical fruits in the unique microclimate of Ocoa Bay, resulting in a sparkling wine that is both sophisticated and wildly natural.
              </p>
            </section>

            {/* Process & Organic */}
            <div className="grid md:grid-cols-2 gap-12 items-start">
              <section>
                <h2 className="text-2xl font-serif text-stone-900 mb-4">Fermentation & Wine Process</h2>
                <p className="text-stone-600 leading-relaxed">
                  Patience defines our process. The secondary fermentation occurs naturally, integrating the delicate aromas of mango and passion fruit into the structure of the wine itself, not just as a flavoring.
                </p>
              </section>
              <section>
                <h2 className="text-2xl font-serif text-stone-900 mb-4">Organic Ingredients & Natural Profile</h2>
                <p className="text-stone-600 leading-relaxed">
                  We believe that great wine starts in the vineyard. Our organic farming practices ensure that every bottle is free from harmful chemicals, preserving the health of our soil and the purity of your glass.
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
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5"></span>
                      <span><strong>Nose:</strong> Elegant floral notes layered with ripe tropical fruit and a hint of fresh yeast.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5"></span>
                      <span><strong>Palate:</strong> Balanced and round. The passion fruit provides a zesty backbone to the lush mango body.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2.5"></span>
                      <span><strong>Finish:</strong> Sophisticated and dry, inviting another sip.</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h2 className="text-2xl font-serif text-stone-900 mb-4">How to Enjoy Kibay</h2>
                  <p className="text-stone-600 mb-4">
                    Best served chilled between 6-8°C in a flute or white wine glass.
                  </p>
                  <p className="text-stone-600">
                    A stunning centerpiece for celebrations. Excellent with spicy Caribbean dishes, Asian fusion cuisine, or simply as a toast to life's special moments.
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
                  <p className="text-foreground font-medium">Sustainable Viticulture in the Heart of the Caribbean</p>
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

export default KibayEspumanteBottle;