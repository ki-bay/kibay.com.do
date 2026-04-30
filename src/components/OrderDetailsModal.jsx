import React, { useEffect, useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDopFromCents } from '@/lib/formatMoney';
import { Package, Truck, CreditCard, Calendar, Mail, Loader2, MapPin, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrderHistory } from '@/hooks/useOrderHistory';
import InvoiceDownload from '@/components/InvoiceDownload';
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/lib/customSupabaseClient';
import { publicStorageObjectUrl } from '@/lib/supabaseStorage';

const OrderDetailsModal = ({ order: initialOrder, isOpen, onClose }) => {
  const { getOrderItems } = useOrderHistory();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState(initialOrder);

  // Fetch items when modal opens
  useEffect(() => {
    if (isOpen && initialOrder) {
      setLoading(true);
      setCurrentOrder(initialOrder); // Reset to prop first
      
      getOrderItems(initialOrder.id)
        .then(data => setItems(data || []))
        .catch(console.error)
        .finally(() => setLoading(false));

      // Realtime subscription for this specific order
      const channel = supabase
        .channel(`order-${initialOrder.id}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `id=eq.${initialOrder.id}`
        }, (payload) => {
          setCurrentOrder(payload.new);
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isOpen, initialOrder]);

  if (!currentOrder) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
      case 'awaiting_payment':
        return 'text-yellow-400';
      case 'Processing':
      case 'processing':
      case 'paid':
        return 'text-blue-400';
      case 'Shipped':
      case 'shipped':
        return 'text-purple-400';
      case 'Delivered':
      case 'delivered':
        return 'text-green-400';
      case 'Cancelled':
      case 'cancelled':
        return 'text-red-400';
      default:
        return 'text-foreground/60';
    }
  };

  const address = currentOrder.shipping_address || {};

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-background border border-foreground/10 text-foreground max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-foreground/10 bg-background/50">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <DialogTitle className="text-xl font-light text-foreground flex items-center gap-2">
                Order #{currentOrder.order_number}
              </DialogTitle>
              <p className={`text-sm font-medium mt-1 ${getStatusColor(currentOrder.status)}`}>
                {currentOrder.status}
              </p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-foreground/40">Date Placed</p>
              <p className="text-sm font-light">
                {new Date(currentOrder.created_at).toLocaleDateString(undefined, { 
                  year: 'numeric', month: 'long', day: 'numeric' 
                })}
              </p>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-8">
            {/* Items List */}
            <div>
              <h3 className="text-sm font-medium text-foreground/60 uppercase tracking-wider mb-4">Order Items</h3>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-mango-500" />
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-3 border-b border-foreground/5 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-foreground/5 rounded-md flex items-center justify-center">
                          <Package className="w-6 h-6 text-foreground/20" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.product_name}</p>
                          <p className="text-sm text-foreground/40">Qty: {item.quantity} × {formatDopFromCents(item.price_per_item)}</p>
                        </div>
                      </div>
                      <p className="font-medium text-mango-400">{formatDopFromCents(item.total_price)}</p>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 mt-2 border-t border-foreground/10">
                    <span className="font-bold text-foreground">Total</span>
                    <span className="font-bold text-xl text-mango-400">{formatDopFromCents(currentOrder.total_amount)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Order Details Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-foreground/5 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-mango-400 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium text-sm">Shipping Address</span>
                </div>
                <div className="text-sm text-foreground/70 leading-relaxed font-light">
                  <p className="text-foreground font-normal">{address.firstName} {address.lastName}</p>
                  <p>{address.address}</p>
                  {address.apartment && <p>{address.apartment}</p>}
                  <p>{address.city}, {address.state} {address.zipCode}</p>
                  <p>{address.country}</p>
                  <p className="mt-2 text-foreground/50">{address.phone}</p>
                  <p className="text-foreground/50">{address.email}</p>
                </div>
              </div>

              <div className="bg-foreground/5 p-4 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-mango-400 mb-2">
                  <Truck className="w-4 h-4" />
                  <span className="font-medium text-sm">Delivery Info</span>
                </div>
                <div className="space-y-2 text-sm">
                  {currentOrder.shipping_method && (
                    <p className="text-foreground/70">
                      Method: <span className="text-foreground">{currentOrder.shipping_method}</span>
                    </p>
                  )}
                  {currentOrder.tracking_number ? (
                    <>
                      <p className="text-foreground/70 mt-2">
                        Tracking:{' '}
                        <span className="text-foreground font-mono">{currentOrder.tracking_number}</span>
                      </p>
                      {currentOrder.tracking_url && (
                        <a
                          href={currentOrder.tracking_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-mango-400 hover:text-mango-300 underline text-xs inline-block mt-1"
                        >
                          Track Shipment
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-foreground/40 italic">Tracking info will be available once shipped.</p>
                  )}
                  {currentOrder.invoice_pdf_path && (
                    <a
                      href={publicStorageObjectUrl('blog_media', currentOrder.invoice_pdf_path)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 mt-3 text-mango-400 hover:text-mango-300 text-sm font-medium"
                    >
                      <FileText className="w-4 h-4" />
                      Download invoice (PDF)
                    </a>
                  )}
                  {currentOrder.estimated_delivery_date && (
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-foreground/5">
                      <Calendar className="w-3 h-3 text-foreground/40" />
                      <span className="text-foreground/70">
                        Est. Delivery: {new Date(currentOrder.estimated_delivery_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                   <div className="flex items-center gap-2 mt-2 pt-2 border-t border-foreground/5">
                      <CreditCard className="w-3 h-3 text-foreground/40" />
                      <span className="text-foreground/70">
                        {currentOrder.payment_method || 'Payment Card'}
                      </span>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="p-6 border-t border-foreground/10 bg-background/50 flex flex-col sm:flex-row gap-3 justify-end">
           <a href="mailto:support@kibay.com.do" className="w-full sm:w-auto">
             <Button variant="ghost" className="w-full sm:w-auto text-foreground/60 hover:text-foreground hover:bg-foreground/10">
               <Mail className="w-4 h-4 mr-2" />
               Contact Support
             </Button>
           </a>
           {/* Only show Invoice download if items are loaded */}
           {!loading && (
             <InvoiceDownload 
               order={currentOrder} 
               orderItems={items} 
               className="w-full sm:w-auto text-mango-500 border-mango-500/50 hover:bg-mango-500/10"
             />
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;