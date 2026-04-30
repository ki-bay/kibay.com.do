import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, ArrowRight, Loader2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useToast } from '@/components/ui/use-toast';

const VerifyOtpPage = () => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [cooldown, setCooldown] = useState(0); // 60s cooldown for resend
  
  const { verifyOtp, user, sendOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const emailFromState = location.state?.email;
  const [email, setEmail] = useState(emailFromState || '');

  // Handle successful authentication
  useEffect(() => {
    if (user) {
      toast({
        title: "Successfully Authenticated",
        description: "Welcome back!",
      });
      navigate('/account'); 
    }
  }, [user, navigate, toast]);

  // Cooldown timer effect
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Handle Manual Code Verification
  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email) {
      setErrorMsg("Email address is missing. Please go back to login.");
      return;
    }

    if (!token || token.length < 6) {
      setErrorMsg("Please enter the full 6-digit code.");
      return;
    }
    
    setIsLoading(true);

    const { error } = await verifyOtp({ 
      email, 
      token, 
      type: 'email' // Specifically verifying numeric OTP
    });
    
    setIsLoading(false);

    if (error) {
      setErrorMsg(error.message || "Invalid verification code.");
      // We also show a toast for visibility
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message,
      });
    } else {
      setSuccessMsg("Verified successfully! Logging you in...");
    }
  };

  const handleResend = async () => {
    if (!email) {
      setErrorMsg("Please enter your email address to resend the code.");
      return;
    }
    
    if (cooldown > 0) return;

    setIsLoading(true);
    const { error } = await sendOtp(email);
    setIsLoading(false);
    
    if (!error) {
      toast({
        title: "Code Sent",
        description: "A new code has been sent to your email.",
      });
      setErrorMsg('');
      setSuccessMsg("New code sent! Please check your email.");
      setCooldown(60); // Reset cooldown
    } else {
      setErrorMsg(error.message);
    }
  };

  return (
    <>
      <Helmet>
        <title>Enter Code - Kibay Espumante</title>
      </Helmet>
      <Navigation />
      <div className="min-h-screen flex items-center justify-center bg-background pt-20 px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-card p-8 rounded-2xl border border-foreground/10 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Check Your Email</h1>
            {isLoading ? (
              <p className="text-foreground/60">Verifying credentials...</p>
            ) : (
              <div className="text-foreground/60">
                {email ? (
                  <>
                    <p>Enter the 6-digit code sent to:</p>
                    <p className="text-mango-400 font-medium mt-1">{email}</p>
                  </>
                ) : (
                  "Enter your email and code to sign in."
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{errorMsg}</p>
            </div>
          )}

          {successMsg && !errorMsg && (
             <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
             <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
             <p className="text-sm text-green-300">{successMsg}</p>
           </div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            {!emailFromState && (
               <div className="space-y-2">
               <label className="text-sm font-medium text-foreground/80">Email Address</label>
               <input
                 type="email"
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 placeholder="you@example.com"
                 className="w-full bg-background/50 border border-foreground/10 rounded-lg py-2.5 px-4 text-foreground focus:outline-none focus:border-mango-500"
                 disabled={isLoading}
               />
             </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground/80">6-Digit Code</label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-3 h-5 w-5 text-foreground/40" />
                <input
                  type="text"
                  value={token}
                  onChange={(e) => {
                    // Only allow numbers and limit to 6 chars
                    const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                    setToken(val);
                  }}
                  placeholder="000000"
                  className="w-full bg-background/50 border border-foreground/10 rounded-lg py-2.5 pl-10 pr-4 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 transition-colors tracking-[0.5em] text-lg font-mono text-center"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-mango-500 hover:bg-mango-600 text-foreground py-6 text-lg"
              disabled={isLoading || token.length < 6}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Verify Code <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={handleResend}
              className={`text-sm transition-colors flex items-center justify-center w-full gap-2 ${
                cooldown > 0 ? 'text-foreground/30 cursor-not-allowed' : 'text-foreground/50 hover:text-foreground'
              }`}
              disabled={isLoading || cooldown > 0}
            >
              {cooldown > 0 ? (
                <>
                   <Clock className="w-4 h-4" /> Resend code in {cooldown}s
                </>
              ) : (
                "Didn't receive a code? Resend Code"
              )}
            </button>
          </div>
        </motion.div>
      </div>
      <Footer />
    </>
  );
};

export default VerifyOtpPage;