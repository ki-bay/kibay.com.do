import React from 'react';
import { motion } from 'framer-motion';
import { Wine, Globe, Package, Leaf, Percent, Calendar, Tag } from 'lucide-react';

const ProductDetailsCard = ({ details }) => {
  const icons = {
    Category: Tag,
    Origin: Globe,
    Format: Package,
    Ingredients: Leaf,
    Style: Wine,
    'Alcohol %': Percent,
    'Shelf life': Calendar,
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-8">
      <h2 className="text-2xl font-normal text-stone-900 mb-8 pb-4 border-b border-stone-100">
        Product Details
      </h2>
      <div className="grid gap-6">
        {Object.entries(details).map(([key, value], index) => {
          const Icon = icons[key] || Tag;
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-3 text-stone-500">
                <Icon className="w-5 h-5 text-mango-500/70" strokeWidth={1.5} />
                <span className="font-normal text-sm uppercase tracking-wide">{key}</span>
              </div>
              <span className="text-stone-800 font-light text-right group-hover:text-mango-600 transition-colors">
                {value}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductDetailsCard;