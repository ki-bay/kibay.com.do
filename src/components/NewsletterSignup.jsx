import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { subscribeToNewsletter } from '@/services/NewsletterService';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const NewsletterSignup = ({
  headline,
  subtext,
  fields = { firstName: true, email: true },
  buttonText = "Sign Up",
  source = "General Signup",
  successMessage = "Welcome to the Kibay list!",
  variant = "default", // default (light bg), hero (dark bg), footer (compact)
  tags = []
}) => {
  const [formData, setFormData] = useState({ firstName: '', email: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await subscribeToNewsletter({
        firstName: formData.firstName,
        email: formData.email,
        source,
        tags
      });

      if (result.success) {
        setIsSuccess(true);
        toast({
          title: "Success!",
          description: successMessage,
          className: "bg-[#D4A574] text-white border-none",
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "text-center p-8 rounded-2xl border",
          variant === 'hero' ? "bg-white/10 backdrop-blur-md border-white/20 text-white" : "bg-stone-50 border-stone-100 text-stone-900"
        )}
      >
        <CheckCircle2 className={cn("w-12 h-12 mx-auto mb-4", variant === 'hero' ? "text-[#D4A574]" : "text-[#D4A574]")} />
        <h3 className="text-2xl font-normal mb-2">You're on the list!</h3>
        <p className={variant === 'hero' ? "text-white/80 font-normal" : "text-stone-600 font-normal"}>{successMessage}</p>
      </motion.div>
    );
  }

  const isHero = variant === 'hero';
  const isFooter = variant === 'footer';

  return (
    <div className={cn(
      "w-full max-w-xl mx-auto",
      isFooter ? "max-w-md" : ""
    )}>
      {headline && (
        <h2 className={cn(
          "font-normal mb-3",
          isHero ? "text-3xl md:text-4xl text-white leading-tight" : "text-2xl md:text-3xl text-stone-900",
          isFooter && "text-lg text-white mb-2"
        )}>
          {headline}
        </h2>
      )}
      
      {subtext && (
        <p className={cn(
          "mb-6 font-light",
          isHero ? "text-lg text-white/90" : "text-stone-600",
          isFooter && "text-sm text-white/70 mb-4"
        )}>
          {subtext}
        </p>
      )}

      <form onSubmit={handleSubmit} className={cn(
        "flex gap-3",
        isFooter ? "flex-col sm:flex-row" : "flex-col"
      )}>
        <div className={cn("flex flex-col gap-3", !isFooter && "sm:flex-row")}>
          {fields.firstName && (
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              required
              className={cn(
                "flex-1 px-4 py-3 rounded-lg border outline-none transition-all duration-300 font-light",
                isHero 
                  ? "bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-[#D4A574]" 
                  : "bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-[#D4A574] focus:ring-1 focus:ring-[#D4A574]",
                isFooter && "bg-white/5 border-white/10 text-white placeholder:text-white/40"
              )}
            />
          )}
          
          {fields.email && (
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleChange}
              required
              className={cn(
                "flex-1 px-4 py-3 rounded-lg border outline-none transition-all duration-300 font-light",
                isHero 
                  ? "bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20 focus:border-[#D4A574]" 
                  : "bg-white border-stone-200 text-stone-900 placeholder:text-stone-400 focus:border-[#D4A574] focus:ring-1 focus:ring-[#D4A574]",
                isFooter && "bg-white/5 border-white/10 text-white placeholder:text-white/40"
              )}
            />
          )}
        </div>

        <Button 
          type="submit" 
          disabled={isLoading}
          className={cn(
            "w-full sm:w-auto font-normal transition-all duration-300",
            isHero 
              ? "bg-[#D4A574] hover:bg-[#c29462] text-white py-6 text-lg shadow-lg hover:shadow-[#D4A574]/30" 
              : "bg-[#D4A574] hover:bg-[#c29462] text-white py-6",
            isFooter && "py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40"
          )}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <span className="flex items-center justify-center gap-2">
              {buttonText} {isHero && <ArrowRight className="w-5 h-5" />}
            </span>
          )}
        </Button>
      </form>

      <p className={cn(
        "mt-4 text-xs font-light",
        isHero ? "text-white/50" : "text-stone-400",
        isFooter && "text-white/30"
      )}>
        By signing up, you agree to our <Link to="/privacy" className="underline hover:text-[#D4A574]">Privacy Policy</Link>. 
        You can unsubscribe at any time.
      </p>
    </div>
  );
};

export default NewsletterSignup;