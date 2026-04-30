import React from 'react';
import { cn } from '@/lib/utils';

const Card = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'rounded-xl bg-card/80 backdrop-blur-sm border border-foreground/10 shadow-lg transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;