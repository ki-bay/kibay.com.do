import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const UnsubscribePage = () => {
  const { email } = useParams();
  const [status, setStatus] = useState('confirming'); // confirming, processing, success, error
  const [loading, setLoading] = useState(false);
  
  const decodedEmail = decodeURIComponent(email || '');

  const handleUnsubscribe = async () => {
    setLoading(true);
    setStatus('processing');
    
    try {
      const { error } = await supabase
        .from('blog_subscribers')
        .update({ subscribed: false })
        .eq('email', decodedEmail);
      
      if (error) throw error;
      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navigation />
      
      <main className="flex-grow flex items-center justify-center p-4 pt-24">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800 border border-white/10 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center"
        >
          {status === 'confirming' && (
            <>
              <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8 text-yellow-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Unsubscribe?</h1>
              <p className="text-white/60 mb-8">
                Are you sure you want to stop receiving updates at <span className="text-white font-medium">{decodedEmail}</span>?
              </p>
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleUnsubscribe}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-6"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    "Yes, Unsubscribe Me"
                  )}
                </Button>
                <Link to="/">
                  <Button variant="ghost" className="w-full text-white/60 hover:text-white">
                    Cancel & Return Home
                  </Button>
                </Link>
              </div>
            </>
          )}

          {status === 'processing' && (
            <div className="py-12">
               <Loader2 className="w-12 h-12 text-mango-500 animate-spin mx-auto mb-4" />
               <p className="text-white/60">Updating your preferences...</p>
            </div>
          )}

          {status === 'success' && (
            <>
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Unsubscribed</h1>
              <p className="text-white/60 mb-8">
                You have been successfully removed from our mailing list. We're sorry to see you go!
              </p>
              <Link to="/">
                <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white py-6">
                  Return to Home
                </Button>
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
              <p className="text-white/60 mb-8">
                We encountered an error processing your request. Please try again later.
              </p>
              <Button 
                onClick={() => setStatus('confirming')}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-6"
              >
                Try Again
              </Button>
            </>
          )}
        </motion.div>
      </main>
      
      <Footer />
    </div>
  );
};

export default UnsubscribePage;