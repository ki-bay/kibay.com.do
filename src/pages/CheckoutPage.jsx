import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useCart } from '@/hooks/useCart';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/customSupabaseClient';

const stripePublishableKey =
	import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
	import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
	'';

const stripePromise = stripePublishableKey
	? loadStripe(stripePublishableKey)
	: Promise.resolve(null);

const CheckoutForm = ({ totalAmount, cartItems, shippingInfo, onSuccess, onFail }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }
    
    if (!user) {
      setError("You must be logged in to complete the purchase.");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // 1. Submit Elements
      const { error: submitError } = await elements.submit();
      if (submitError) throw submitError;

      // 2. Confirm Payment
      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          // Note: We handle redirection manually after DB save unless it forces redirect
          return_url: window.location.origin + '/checkout?step=processing',
        },
        redirect: "if_required"
      });

      if (confirmError) throw confirmError;

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // 3. Create Order in Supabase
        await createOrderInSupabase(paymentIntent);
      }
    } catch (err) {
      console.error("Payment/Order Error:", err);
      setError(err.message || "An unexpected error occurred during checkout.");
      setProcessing(false);
      onFail(err);
    }
  };

  const createOrderInSupabase = async (paymentIntent) => {
    try {
      // Calculate totals again for security/accuracy
      const calculatedTotal = totalAmount * 100; // Convert to cents
      const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Insert Order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          status: 'Processing', // Paid, but not yet shipped
          total_amount: calculatedTotal,
          items_count: cartItems.length,
          shipping_address: shippingInfo,
          payment_method: 'Stripe Credit Card', // Simplified for demo
          created_at: new Date().toISOString(),
          estimated_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // +5 days est
        })
        .select()
        .single();

      if (orderError) throw new Error(`Order Creation Failed: ${orderError.message}`);

      // Insert Order Items
      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: item.product.title,
        quantity: item.quantity,
        price_per_item: item.variant.price_in_cents,
        total_price: item.variant.price_in_cents * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw new Error(`Order Items Creation Failed: ${itemsError.message}`);

      onSuccess(orderData.id);

    } catch (dbError) {
      console.error("Database Save Error:", dbError);
      // Even if DB save fails, payment succeeded. 
      // In a real app, we'd log this critical error to an external service 
      // and maybe show a "Contact Support" message with the Payment ID.
      setError(`Payment successful, but order details failed to save. Please contact support with Payment ID: ${paymentIntent.id}`);
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-900 p-4 rounded-lg border border-white/10">
        <PaymentElement 
          options={{
            layout: "tabs",
            theme: 'night',
            variables: {
              colorPrimary: '#ff8518',
              colorBackground: '#1e293b',
              colorText: '#ffffff',
              colorDanger: '#ef4444',
            }
          }} 
        />
      </div>
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-light">{error}</p>
        </div>
      )}

      <Button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-mango-500 hover:bg-mango-600 text-white py-6 text-lg font-normal"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing Order...
          </>
        ) : (
          `Pay RD$${totalAmount.toFixed(2)}`
        )}
      </Button>
    </form>
  );
};

const hasStripePublishableKey = !!(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
);

const CheckoutPage = () => {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [initError, setInitError] = useState(null);
  
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    address: '',
    city: '',
    zipCode: '',
    phone: '',
    country: 'Dominican Republic'
  });

  const totalAmount = getCartTotal();

  // Redirect if empty cart
  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/shop');
    }
  }, [cartItems, navigate]);

  // Create Payment Intent
  useEffect(() => {
    if (totalAmount <= 0) return;
    if (!hasStripePublishableKey) {
      setInitError('Missing VITE_STRIPE_PUBLISHABLE_KEY (Stripe publishable key) in environment.');
      return;
    }

    const createPaymentIntent = async () => {
      setLoading(true);
      setInitError(null);
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', {
          body: { 
            amount: totalAmount, 
            currency: 'dop',
            metadata: {
              items: JSON.stringify(cartItems.map(i => ({ id: i.variant.id, qty: i.quantity })))
            }
          }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (!data?.clientSecret) throw new Error('No client secret returned');

        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error('Error creating payment intent:', err);
        setInitError(err.message || 'Payment initialization failed');
      } finally {
        setLoading(false);
      }
    };

    if (!clientSecret) {
      createPaymentIntent();
    }
  }, [totalAmount, clientSecret, cartItems]);

  const handleSuccess = (orderId) => {
    clearCart();
    // Save last order ID for sync verification
    localStorage.setItem('last_order_id', orderId);
    navigate(`/checkout-success?order_id=${orderId}`);
  };

  const handleFail = (error) => {
    // Error logged in subcomponent
    console.error("Checkout failed:", error);
  };

  return (
    <>
      <Helmet>
        <title>Checkout - Kibay Espumante</title>
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-slate-900 pt-28 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-light text-white mb-8">Checkout</h1>
          
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Column: Shipping & Payment */}
            <div className="space-y-8">
              {/* Shipping Info */}
              <div className="bg-slate-800 p-6 rounded-xl border border-white/10">
                <h2 className="text-xl font-normal text-white mb-6">Shipping Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-light text-white/80">First Name</label>
                      <input
                        type="text"
                        value={shippingInfo.firstName}
                        onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-light text-white/80">Last Name</label>
                      <input
                        type="text"
                        value={shippingInfo.lastName}
                        onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-light text-white/80">Email</label>
                    <input
                      type="email"
                      value={shippingInfo.email}
                      onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-light text-white/80">Address</label>
                    <input
                      type="text"
                      value={shippingInfo.address}
                      onChange={(e) => setShippingInfo({...shippingInfo, address: e.target.value})}
                      className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
                      placeholder="123 Main St"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-light text-white/80">City</label>
                      <input
                        type="text"
                        value={shippingInfo.city}
                        onChange={(e) => setShippingInfo({...shippingInfo, city: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
                        placeholder="Santo Domingo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-light text-white/80">Phone</label>
                      <input
                        type="tel"
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg p-3 text-white focus:border-mango-500 focus:outline-none font-light"
                        placeholder="+1 (809) 555-0123"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Payment Section */}
              <div className="bg-slate-800 p-6 rounded-xl border border-white/10">
                <h2 className="text-xl font-normal text-white mb-6">Payment Details</h2>
                {!hasStripePublishableKey ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 p-4 rounded-lg text-sm font-light">
                    Configure <code className="text-amber-100">VITE_STRIPE_PUBLISHABLE_KEY</code> in{' '}
                    <code className="text-amber-100">.env.local</code> and Vercel env, then redeploy.
                  </div>
                ) : initError ? (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-normal">Payment Initialization Failed</p>
                      <p className="text-sm font-light">{initError}</p>
                      <Button 
                        variant="link" 
                        className="text-red-400 p-0 h-auto mt-1 underline font-light"
                        onClick={() => window.location.reload()}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                ) : clientSecret ? (
                  <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                    <CheckoutForm 
                      totalAmount={totalAmount} 
                      cartItems={cartItems}
                      shippingInfo={shippingInfo}
                      onSuccess={handleSuccess}
                      onFail={handleFail}
                    />
                  </Elements>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="w-8 h-8 text-mango-500 animate-spin" />
                    <p className="text-white/60 text-sm font-light">Initializing secure payment...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Order Summary */}
            <div>
              <div className="bg-slate-800 p-6 rounded-xl border border-white/10 sticky top-28">
                <h2 className="text-xl font-normal text-white mb-6">Order Summary</h2>
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => {
                    const price = (item.variant.sale_price_in_cents || item.variant.price_in_cents) / 100;
                    return (
                      <div key={item.variant.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-900 rounded overflow-hidden">
                            <img src={item.product.image} alt={item.product.title} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{item.product.title}</p>
                            <p className="text-white/60 text-xs font-light">{item.variant.title}</p>
                            <p className="text-white/40 text-xs font-light">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="text-white font-medium">RD${(price * item.quantity).toFixed(2)}</p>
                      </div>
                    );
                  })}
                </div>
                
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <div className="flex justify-between text-white/60 font-light">
                    <span>Subtotal</span>
                    <span>RD${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white/60 font-light">
                    <span>Shipping</span>
                    <span>Free</span>
                  </div>
                  <div className="flex justify-between text-white font-normal text-xl pt-2 mt-2 border-t border-white/10">
                    <span>Total</span>
                    <span className="text-mango-400">RD${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </>
  );
};

export default CheckoutPage;