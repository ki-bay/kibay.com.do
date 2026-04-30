import React from 'react';
import { motion } from 'framer-motion';

const canImages = [
  {
    id: 1,
    src: "https://images.unsplash.com/photo-1703173354700-0b2028e117aa",
    alt: "Kibay Mango Sparkling Wine Can",
    rotation: -3,
    yOffset: 0
  },
  {
    id: 2,
    src: "https://images.unsplash.com/photo-1546568133-a7dc44ae2955",
    alt: "Kibay Passion Fruit Sparkling Wine Can",
    rotation: 4,
    yOffset: 40
  },
  {
    id: 3,
    src: "https://images.unsplash.com/photo-1703581672849-951cbd41e3ac",
    alt: "Kibay Tropical Blend Sparkling Wine Can",
    rotation: -2,
    yOffset: 10
  },
  {
    id: 4,
    src: "https://images.unsplash.com/photo-1703173354700-0b2028e117aa",
    alt: "Kibay Mango Reserve Can",
    rotation: 5,
    yOffset: 50
  },
  {
    id: 5,
    src: "https://images.unsplash.com/photo-1703581672849-951cbd41e3ac",
    alt: "Kibay Sunset Edition Can",
    rotation: -4,
    yOffset: 20
  },
  {
    id: 6,
    src: "https://images.unsplash.com/photo-1546568133-a7dc44ae2955",
    alt: "Kibay Classic Can",
    rotation: 2,
    yOffset: 60
  }
];

const CanCollage = () => {
  return (
    <div className="w-full relative z-10 p-4 sm:p-0">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 lg:gap-8 mx-auto max-w-2xl lg:max-w-none">
        {canImages.map((can, index) => (
          <motion.div
            key={can.id + index} // unique key if we duplicate
            initial={{ opacity: 0, y: 100, rotate: 0 }}
            animate={{ 
              opacity: 1, 
              y: can.yOffset, // Apply staggered vertical offset for visual interest
              rotate: can.rotation 
            }}
            whileHover={{ 
              scale: 1.05, 
              y: can.yOffset - 20,
              zIndex: 20,
              transition: { duration: 0.3 }
            }}
            transition={{ 
              duration: 0.8, 
              delay: index * 0.15, // Staggered entrance
              type: "spring",
              stiffness: 50
            }}
            className="relative group cursor-pointer"
          >
            {/* Glow effect behind the can */}
            <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
            
            <div className="relative aspect-[9/16] rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-orange-500/20 transition-shadow duration-300 bg-card border border-foreground/5">
              <img 
                src={can.src} 
                alt={can.alt}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CanCollage;