import React, { useState, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FlyToCartAnimation from '@/components/FlyToCartAnimation';

const placeholderImage = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY0Ii8+CiAgPHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iI2E4YTJhMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4K";

const ProductImageGallery = forwardRef(({ images = [], title, ribbonText }, ref) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const safeImages = images && images.length > 0 ? images : [{ url: placeholderImage }];
  const currentImage = safeImages[activeImageIndex];

  return (
    <div className="w-full flex flex-col items-center">
      {/* 
        Sizing constraints:
        - Mobile: w-full max-w-sm (unchanged mostly)
        - Desktop: max-w-md (reduced from max-w-lg) to keep it compact
      */}
      <div className="w-full max-w-sm md:max-w-md lg:max-w-md transition-all duration-300">
        <FlyToCartAnimation 
          ref={ref} 
          className="relative aspect-[4/5] bg-white rounded-2xl overflow-hidden shadow-sm group w-full mb-6 mx-auto"
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentImage.url}
              src={currentImage.url || placeholderImage}
              alt={title}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full object-cover object-center"
            />
          </AnimatePresence>

          {ribbonText && (
            <div className="absolute top-6 left-6 bg-[#D4A574] text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg uppercase z-10">
              {ribbonText}
            </div>
          )}
        </FlyToCartAnimation>

        {safeImages.length > 1 && (
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide justify-center w-full">
            {safeImages.map((image, index) => (
              <button
                key={index}
                onClick={() => setActiveImageIndex(index)}
                className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                  index === activeImageIndex 
                    ? 'border-[#D4A574] ring-2 ring-[#D4A574]/20' 
                    : 'border-transparent hover:border-stone-200'
                }`}
              >
                <img
                  src={image.url || placeholderImage}
                  alt={`${title} thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

ProductImageGallery.displayName = "ProductImageGallery";

export default ProductImageGallery;