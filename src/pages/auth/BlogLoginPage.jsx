import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet';
import { Lock, Mail, Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const BlogLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signInWithPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        variant: "destructive",
        title: "Missing fields",
        description: "Please enter both email and password.",
      });
      return;
    }

    setIsLoading(true);
    const { success, error } = await signInWithPassword(email, password);
    setIsLoading(false);

    if (success) {
      // Check if user is the admin
      if (email === 'info@kibay.com.do') {
        navigate('/dashboard/blog');
      } else {
        // Just regular user login via this portal
        navigate('/account');
      }
    }
  };

  const handleForgotPassword = () => {
    toast({
        title: "Contact Administrator",
        description: "Please contact system administration to reset your blog credentials.",
    })
  }

  return (
    <>
      <Helmet>
        <title>Blog Admin Login - Kibay</title>
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-background flex items-center justify-center py-20 px-4">
        <div className="w-full max-w-md">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-card border border-foreground/10 rounded-2xl p-8 shadow-2xl"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-mango-500/10 mb-4 border border-mango-500/20">
                <Lock className="w-8 h-8 text-mango-500" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Blog Administration</h1>
              <p className="text-foreground/60">Enter your credentials to access the dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/80">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <Input 
                    type="email" 
                    placeholder="admin@kibay.com.do" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-foreground/10 text-foreground placeholder:text-foreground/20 focus:border-mango-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                   <label className="text-sm font-medium text-foreground/80">Password</label>
                   <button 
                     type="button"
                     onClick={handleForgotPassword}
                     className="text-xs text-mango-500 hover:text-mango-400"
                   >
                     Forgot password?
                   </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-background border-foreground/10 text-foreground placeholder:text-foreground/20 focus:border-mango-500"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-mango-500 hover:bg-mango-600 text-foreground h-12 text-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    Access Dashboard <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-foreground/10 text-center">
              <p className="text-sm text-foreground/40">
                Authorized personnel only. <br/>All access attempts are logged.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </>
  );
};

export default BlogLoginPage;