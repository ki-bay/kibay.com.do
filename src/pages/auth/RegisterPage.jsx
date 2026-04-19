import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useToast } from '@/components/ui/use-toast';
import OtpModal from '@/components/OtpModal';
import { supabase } from '@/lib/customSupabaseClient';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { sendOtp, verifyOtp, loading, authError, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/account');
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.fullName) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill in all fields.",
      });
      return;
    }

    // Call sendOtp with ONLY email as requested
    const result = await sendOtp(formData.email);
    if (result.success) {
      setIsModalOpen(true);
    }
  };
  
  const handleVerifyCode = async (code) => {
    const result = await verifyOtp(formData.email, code);
    
    if (result.success) {
      // Post-login profile update
      // Since sendOtp now accepts ONLY email, we must update the profile AFTER verification
      try {
        await supabase.auth.updateUser({
            data: { full_name: formData.fullName }
        });
      } catch (err) {
        console.error("Error updating user profile name", err);
      }
      
      setIsModalOpen(false);
      navigate('/account');
    }
  };
  
  const handleResendCode = async () => {
      await sendOtp(formData.email);
  };

  return (
    <>
      <Helmet>
        <title>Create Account - Kibay Espumante</title>
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
            <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
            <p className="text-white/60">
                Join the Kibay community
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4 relative z-10">
              <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Full Name</label>
              <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-white/40" />
                  <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 transition-colors"
                  disabled={loading && !isModalOpen}
                  />
              </div>
              </div>

              <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Email Address</label>
              <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-white/40" />
                  <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 transition-colors"
                  disabled={loading && !isModalOpen}
                  />
              </div>
              </div>

              {authError && !isModalOpen && (
                  <div className="text-red-400 text-sm p-2 bg-red-500/10 rounded border border-red-500/20 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {authError}
                  </div>
              )}

              <Button 
              type="submit" 
              className="w-full bg-mango-500 hover:bg-mango-600 text-white py-6 text-lg font-medium mt-4"
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

          <div className="mt-6 text-center text-white/60 text-sm">
            <div>
              Already have an account?{' '}
              <Link to="/login" className="text-mango-400 hover:text-mango-300 font-medium">
                Log in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
      
      <OtpModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        email={formData.email}
        onVerify={handleVerifyCode}
        onResend={handleResendCode}
        isLoading={loading}
        error={authError}
      />
      
      <Footer />
    </>
  );
};

export default RegisterPage;