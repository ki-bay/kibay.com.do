import React, { forwardRef } from 'react';

const FlyToCartAnimation = forwardRef(({ children, className }, ref) => {
  return (
    <div 
      ref={ref} 
      className={`relative ${className || ''}`}
      style={{ display: 'inline-block', width: '100%', height: '100%' }} // Ensure it wraps properly
    >
      {children}
    </div>
  );
});

FlyToCartAnimation.displayName = 'FlyToCartAnimation';

export default FlyToCartAnimation;