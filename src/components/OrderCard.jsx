import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDopFromCents } from '@/lib/formatMoney';
import OrderDetailsModal from './OrderDetailsModal';

const OrderCard = ({ order }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Pending':
      case 'awaiting_payment':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'Processing':
      case 'processing':
      case 'paid':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'Shipped':
      case 'shipped':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'Delivered':
      case 'delivered':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'Cancelled':
      case 'cancelled':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-foreground/5 text-foreground/50 border-foreground/10';
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group bg-card/50 hover:bg-card border border-foreground/5 hover:border-mango-500/30 rounded-xl p-5 transition-all duration-300 shadow-sm hover:shadow-glow-orange flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-foreground/5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-6 h-6 text-foreground/30 group-hover:text-mango-400 transition-colors" />
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-foreground font-medium">#{order.order_number}</span>
              <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border font-semibold ${getStatusStyle(order.status)}`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm text-foreground/50 font-light">
              {new Date(order.created_at).toLocaleDateString(undefined, { 
                month: 'short', day: 'numeric', year: 'numeric' 
              })}
              {' • '}
              {order.items_count} item{order.items_count !== 1 && 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-6 pl-16 md:pl-0">
          <p className="text-lg font-bold text-mango-400">
            {formatDopFromCents(order.total_amount)}
          </p>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsModalOpen(true)}
            className="text-foreground/60 hover:text-foreground hover:bg-foreground/10 gap-1 group/btn"
          >
            View Details
            <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </div>
      </motion.div>

      <OrderDetailsModal 
        order={order} 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default OrderCard;