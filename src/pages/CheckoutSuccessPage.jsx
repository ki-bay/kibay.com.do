import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

const CheckoutSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      setLoading(false);
      setError("No order ID found.");
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();
        
      if (error) throw error;
      if (!data) throw new Error("Order not found.");
      
      setOrder(data);
    } catch (err) {
      console.error("Fetch order error:", err);
      setError("We couldn't verify your order details immediately. Please check your order history.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Order Confirmed - Kibay Espumante</title>
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-stone-100 text-center relative overflow-hidden"
        >
          {/* Decorative background element */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4A574]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
          
          {loading ? (
             <div className="flex flex-col items-center justify-center py-12">
               <Loader2 className="w-10 h-10 text-[#D4A574] animate-spin mb-4" />
               <p className="text-stone-500 font-light">Verifying order status...</p>
             </div>
          ) : error ? (
            <div className="py-8">
               <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
               <h1 className="text-2xl font-light text-stone-900 mb-2">Order Status Pending</h1>
               <p className="text-stone-500 mb-6 font-light">{error}</p>
               <Link to="/account">
                 <Button variant="outline" className="border-[#D4A574] text-[#D4A574]">
                   Check Order History
                 </Button>
               </Link>
            </div>
          ) : (
            <>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-[#D4A574]/10 rounded-full flex items-center justify-center mx-auto mb-8 relative z-10"
              >
                <CheckCircle className="w-10 h-10 text-[#D4A574]" strokeWidth={1.5} />
              </motion.div>

              <h1 className="text-3xl md:text-4xl font-light text-stone-900 mb-4 relative z-10">
                Order Confirmed
              </h1>
              
              <p className="text-stone-500 mb-8 leading-relaxed relative z-10 font-light">
                Thank you for choosing Kibay. Your order <span className="font-medium text-stone-900">#{order?.order_number}</span> has been successfully placed. 
                A confirmation email has been sent to {order?.shipping_address?.email}.
              </p>

              <div className="bg-stone-50 rounded-xl p-6 mb-8 border border-stone-100 relative z-10">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[#D4A574]" />
                  <p className="text-stone-400 text-xs uppercase tracking-widest font-normal">Order Status</p>
                </div>
                <p className="text-stone-800 font-medium text-lg">
                  {order?.status}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                   Est. Delivery: {new Date(order?.estimated_delivery_date).toLocaleDateString()}
                </p>
              </div>
            </>
          )}
          
          <div className="relative z-10">
            <Link to="/shop">
              <Button className="w-full bg-[#D4A574] hover:bg-[#c29462] text-white rounded-full py-6 text-lg transition-all duration-300 shadow-lg shadow-[#D4A574]/20 font-normal">
                Continue Shopping
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
      
      <Footer />
    </>
  );
};

export default CheckoutSuccessPage;