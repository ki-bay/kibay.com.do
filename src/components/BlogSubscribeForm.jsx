import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/customSupabaseClient';

const BlogSubscribeForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, success, error
  const { toast } = useToast();

  const handleSubscribe = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    setLoading(true);
    setStatus('idle');

    try {
      // Check if already exists first to handle duplicates gracefully
      const { data: existing } = await supabase
        .from('blog_subscribers')
        .select('*')
        .eq('email', email)
        .single();

      if (existing) {
        if (!existing.subscribed) {
          // Re-subscribe
          await supabase
            .from('blog_subscribers')
            .update({ subscribed: true })
            .eq('email', email);
          
          setStatus('success');
          toast({
            title: "Welcome back!",
            description: "You've been successfully re-subscribed to our updates.",
          });
        } else {
          // Already subscribed
          setStatus('success'); // Treat as success for UX
          toast({
            title: "Already Subscribed",
            description: "You're already on the list! Watch your inbox for updates.",
          });
        }
      } else {
        // New subscriber
        const { error } = await supabase
          .from('blog_subscribers')
          .insert([{ email, subscribed: true }]);

        if (error) throw error;
        
        setStatus('success');
        toast({
          title: "Subscribed!",
          description: "You've successfully joined the Kibay community updates.",
        });
      }
      
      setEmail('');
    } catch (error) {
      console.error('Subscription error:', error);
      setStatus('error');
      toast({
        variant: "destructive",
        title: "Subscription Failed",
        description: "Something went wrong. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-white/10 p-8 md:p-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-mango-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 text-mango-400 font-medium mb-2">
            <Mail className="w-5 h-5" />
            <span>Stay in the loop</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
            Subscribe to our newsletter
          </h3>
          <p className="text-white/60 text-lg">
            Get the latest stories, cocktail recipes, and exclusive offers delivered straight to your inbox. No spam, just flavor.
          </p>
        </div>

        <div className="w-full md:w-auto min-w-[300px] flex-shrink-0">
          {status === 'success' ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-400 mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-white font-bold text-lg">You're Subscribed!</h4>
              <p className="text-white/60 text-sm mt-1">Thanks for joining us.</p>
              <Button 
                variant="ghost" 
                className="mt-4 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                onClick={() => setStatus('idle')}
              >
                Subscribe another email
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col gap-3">
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 transition-all shadow-inner"
                  disabled={loading}
                />
              </div>
              <Button 
                type="submit" 
                className="bg-mango-500 hover:bg-mango-600 text-white py-6 text-lg font-medium rounded-xl shadow-lg shadow-mango-500/20 w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Subscribing...
                  </>
                ) : (
                  "Subscribe to Updates"
                )}
              </Button>
              <p className="text-xs text-white/30 text-center mt-2">
                We respect your privacy. Unsubscribe at any time.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogSubscribeForm;