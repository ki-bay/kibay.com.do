import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useToast } from '@/components/ui/use-toast';
import OtpModal from '@/components/OtpModal';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { sendOtp, verifyOtp, loading, authError, user } = useAuth();
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/account');
    }
  }, [user, navigate]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast({
        variant: "destructive",
        title: "Invalid Email",
        description: "Please enter a valid email address.",
      });
      return;
    }

    // Call sendOtp with ONLY email as requested
    const result = await sendOtp(email);
    if (result.success) {
      setIsModalOpen(true);
    }
  };

  const handleVerifyCode = async (code) => {
    const result = await verifyOtp(email, code);
    
    if (result.success) {
      setIsModalOpen(false);
      navigate('/account');
    }
    // Error handling is managed by context toast, but modal stays open
  };
  
  const handleResendCode = async () => {
      await sendOtp(email);
  };

  return (
    <>
      <Helmet>
        <title>Login - Kibay Espumante</title>
      </Helmet>
      <Navigation />
      
      <div className="min-h-screen flex items-center justify-center bg-slate-900 pt-20 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-800 p-8 rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden"
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-mango-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          
          <div className="text-center mb-8 relative z-10">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-mango-500/10 mb-4 border border-mango-500/20">
              <ShieldCheck className="w-7 h-7 text-mango-500" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-white/60">
              Enter your email to receive a secure login code. <br/>
              No password required.
            </p>
          </div>

          <form onSubmit={handleSendCode} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80 ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-white/40 group-focus-within:text-mango-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 transition-all shadow-inner"
                  disabled={loading && !isModalOpen}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-mango-500 hover:bg-mango-600 text-white py-6 text-lg font-medium rounded-xl shadow-lg shadow-mango-500/20"
              disabled={loading && !isModalOpen}
            >
              {loading && !isModalOpen ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Sending Code...
                </>
              ) : (
                <>
                  Send Login Code <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          {authError && !isModalOpen && (
             <motion.div 
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm"
             >
               <AlertCircle className="w-4 h-4 flex-shrink-0" />
               <p>{authError}</p>
             </motion.div>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-white/60 text-sm">
            <p className="mb-2">New to Kibay?</p>
            <Link 
              to="/register" 
              className="text-mango-400 hover:text-mango-300 font-medium inline-flex items-center gap-1 hover:underline"
            >
              Create an account
            </Link>
          </div>
        </motion.div>
      </div>

      <OtpModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        email={email}
        onVerify={handleVerifyCode}
        onResend={handleResendCode}
        isLoading={loading}
        error={authError}
      />

      <Footer />
    </>
  );
};

export default LoginPage;