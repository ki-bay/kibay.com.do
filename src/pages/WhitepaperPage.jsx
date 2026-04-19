import React from 'react';
import { motion } from 'framer-motion';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';

const WhitepaperPage = () => {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.6 }
  };

  return (
    <>
      <SEOHead 
        title="Kibay Whitepaper | Caribbean Wine Innovation"
        description="Explore Kibay's vision and innovation in Caribbean wine production and Espumante craftsmanship."
      />

      <Navigation />

      <main className="min-h-screen bg-stone-50 pt-32 pb-20">
        <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <header className="mb-16 text-center">
            <motion.div {...fadeInUp}>
              <p className="text-[#D4A574] font-medium tracking-widest uppercase mb-4 text-sm">Official White Paper</p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-stone-900 mb-6 leading-tight">
                Kibay Sparkling:<br />
                <span className="font-light italic">Redefining the Tropical Wine Experience</span>
              </h1>
              <p className="text-xl text-stone-500 font-light max-w-2xl mx-auto leading-relaxed">
                An in-depth look at the philosophy, craft, and innovation behind the Dominican Republic's premier organic sparkling wine.
              </p>
            </motion.div>
          </header>

          <hr className="border-stone-200 mb-16" />

          {/* Content Sections */}
          <div className="space-y-16 text-stone-700 leading-relaxed font-light text-lg">
            
            {/* Introduction */}
            <motion.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-stone-900 mb-6">Introduction</h2>
              <p className="mb-4">
                The global wine industry is undergoing a significant transformation. Consumers are increasingly seeking authenticity, convenience, and sustainability, moving away from rigid traditions toward products that fit a dynamic, modern lifestyle. Kibay Sparkling sits at the intersection of this evolution.
              </p>
              <p>
                Born from the rich terroir of the Dominican Republic, Kibay is not merely a beverage; it is a statement. It represents a fusion of serious winemaking heritage with the vibrant, unpretentious spirit of the Caribbean. This white paper outlines the pillars that define Kibay: organic integrity, artisanal fermentation, and a commitment to a format that democratizes quality wine.
              </p>
            </motion.section>

            {/* Wine First */}
            <motion.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-stone-900 mb-6">Wine First: The Foundation of Quality</h2>
              <p className="mb-4">
                In a market saturated with hard seltzers, wine coolers, and malt-based beverages, Kibay distinguishes itself through a fundamental principle: <strong className="font-medium text-stone-900">It is wine first.</strong>
              </p>
              <p>
                Unlike ready-to-drink cocktails that rely on neutral spirits and artificial flavorings, Kibay starts with fruit fermentation. We treat our tropical ingredients—mango and passion fruit—with the same reverence a traditional winemaker treats grapes. The result is a beverage with complex structure, natural tannins, and a genuine palate profile that synthetic flavoring cannot replicate.
              </p>
            </motion.section>

            {/* Fermentation as Craft */}
            <motion.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-stone-900 mb-6">Fermentation as Craft</h2>
              <p className="mb-4">
                The heart of Kibay lies in its fermentation process. At our facility in Ocoa Bay, we utilize controlled fermentation techniques to convert the natural sugars of sun-ripened fruit into alcohol.
              </p>
              <p>
                This biological process does more than create alcohol; it develops layers of flavor. Fermentation unlocks the aromatic compounds hidden within the fruit, creating a bouquet that is both intense and refined. We do not force-carbonate water and add syrup. Instead, we nurture a living product, allowing the natural characteristics of the fruit to evolve into a crisp, refreshing sparkling wine.
              </p>
            </motion.section>

            {/* Organic Ingredients */}
            <motion.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-stone-900 mb-6">Organic Ingredients: Purity in Every Sip</h2>
              <p className="mb-4">
                Purity is non-negotiable. We source our fruits exclusively from certified organic farms in the Dominican Republic. This commitment serves two purposes: environmental stewardship and flavor integrity.
              </p>
              <p>
                By avoiding synthetic pesticides and fertilizers, we ensure that the soil remains healthy and the local ecosystem thrives. For the consumer, this translates to a clean finish without the chemical residue that can mar the tasting experience. Every can of Kibay is a testament to the power of natural, unadulterated ingredients.
              </p>
            </motion.section>

            {/* Origin Matters */}
            <motion.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-stone-900 mb-6">Origin Matters: The Dominican Terroir</h2>
              <p className="mb-4">
                Terroir—the complete natural environment in which a particular wine is produced—is usually associated with grape growing regions like Bordeaux or Napa. Kibay challenges this notion by introducing the concept of <strong className="font-medium text-stone-900">Tropical Terroir</strong>.
              </p>
              <p>
                The microclimates of the Dominican Republic, characterized by intense sunlight, cooling sea breezes, and mineral-rich soils, impart a specific character to our fruits. A mango grown in Ocoa Bay is distinct from one grown elsewhere. By processing these fruits locally, mere miles from where they were harvested, we capture the essence of the location in every batch.
              </p>
            </motion.section>

            {/* Contemporary Format */}
            <motion.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-stone-900 mb-6">The Contemporary Format: Convenience Meets Quality</h2>
              <p className="mb-4">
                The glass bottle has reigned supreme in wine for centuries, but it has limitations. It is heavy, fragile, and often requires a corkscrew, dictating where and how wine can be enjoyed.
              </p>
              <p>
                Kibay embraces the aluminum can not as a compromise, but as an upgrade. Cans are impervious to light and oxygen—the two enemies of wine freshness. They chill faster, are lighter to transport (reducing carbon footprint), and are infinitely recyclable. Most importantly, they liberate wine from the dinner table, allowing it to be enjoyed on beaches, boats, and mountains where glass is prohibited or impractical.
              </p>
            </motion.section>

            {/* Redefining Sparkling Wine */}
            <motion.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-stone-900 mb-6">Redefining Sparkling Wine</h2>
              <p className="mb-4">
                Sparkling wine has long been shackled by the perception that it is reserved for toasts and special occasions. Kibay shatters this barrier.
              </p>
              <p>
                By lowering the alcohol content slightly compared to heavy wines and offering a single-serving format, we position sparkling wine as an everyday luxury. It is casual enough for a Tuesday evening yet sophisticated enough for a social gathering. We are not just selling a drink; we are advocating for a culture where celebration is spontaneous and frequent.
              </p>
            </motion.section>

            {/* Responsible Brand */}
            <motion.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-stone-900 mb-6">A Responsible Brand</h2>
              <p className="mb-4">
                Responsibility is woven into our operational DNA. Beyond our organic sourcing, our production facility minimizes water waste and utilizes renewable energy sources where possible.
              </p>
              <p>
                Socially, we are committed to the economic development of our region. By creating value-added products within the Dominican Republic, rather than exporting raw fruit, we generate skilled jobs in fermentation, quality control, and logistics. Kibay is a product of its community, for its community.
              </p>
            </motion.section>

            {/* Looking Forward */}
            <motion.section {...fadeInUp}>
              <h2 className="text-3xl font-serif text-stone-900 mb-6">Looking Forward</h2>
              <p className="mb-4">
                As we look to the future, Kibay will continue to innovate. We are exploring new tropical varietals, experimenting with fermentation profiles, and expanding our sustainable footprint.
              </p>
              <p>
                Our vision extends beyond being a successful brand; we aim to establish the Caribbean as a respected region for premium fruit wines. We invite wine lovers, skeptics, and adventurers to join us on this journey.
              </p>
            </motion.section>

            {/* Conclusion */}
            <motion.section {...fadeInUp} className="bg-stone-100 p-8 rounded-2xl border border-stone-200">
              <h2 className="text-3xl font-serif text-stone-900 mb-4">Conclusion</h2>
              <p className="mb-0">
                Kibay Sparkling is the answer to a modern paradox: the desire for high-quality, authentic experiences that fit into a fast-paced life. By respecting the craft of winemaking while embracing the utility of modern packaging, we have created something unique. It is organic, it is Dominican, and it is ready for the world.
              </p>
            </motion.section>

          </div>
        </article>
      </main>

      <Footer />
    </>
  );
};

export default WhitepaperPage;