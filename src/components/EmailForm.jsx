import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const EmailForm = ({ variant = 'default' }) => {
  const [formData, setFormData] = useState({ name: '', email: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({ title: 'Name Required', description: 'Please enter your name.', variant: 'destructive' });
      return;
    }

    if (!formData.email.trim()) {
      toast({ title: 'Email Required', description: 'Please enter your email.', variant: 'destructive' });
      return;
    }

    if (!validateEmail(formData.email)) {
      toast({ title: 'Invalid Email', description: 'Please enter a valid email.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      // If user is logged in, we can also update their preference
      if (user) {
        await supabase
          .from('user_preferences')
          .upsert({ user_id: user.id, newsletter_signup: true });
      }

      // Simulate API call for newsletter service
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: 'Welcome to the Kibay Family! 🎉',
        description: "You've successfully subscribed.",
      });

      setFormData({ name: '', email: '' });
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onSubmit={handleSubmit}
      className={cn(
        'w-full',
        variant === 'inline' ? 'flex flex-col sm:flex-row gap-3' : 'space-y-4'
      )}
    >
      <div className={cn('flex-1', variant === 'inline' ? 'flex gap-3' : 'space-y-3')}>
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          value={formData.name}
          onChange={handleChange}
          disabled={isSubmitting}
          className={cn(
            'w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10',
            'text-white placeholder:text-white/50 font-light',
            'focus:outline-none focus:ring-2 focus:ring-mango-500/50 focus:border-mango-500',
            'transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
            variant === 'inline' ? 'flex-1' : ''
          )}
        />
        <input
          type="email"
          name="email"
          placeholder="your@email.com"
          value={formData.email}
          onChange={handleChange}
          disabled={isSubmitting}
          className={cn(
            'w-full px-4 py-3 rounded-lg bg-slate-800/50 border border-white/10',
            'text-white placeholder:text-white/50 font-light',
            'focus:outline-none focus:ring-2 focus:ring-mango-500/50 focus:border-mango-500',
            'transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed',
            variant === 'inline' ? 'flex-1' : ''
          )}
        />
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className={cn(
          'bg-gradient-to-r from-mango-500 to-mango-600',
          'hover:from-mango-600 hover:to-mango-700',
          'text-white font-medium px-8 py-3 rounded-lg',
          'transition-all duration-300 transform hover:scale-105',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
          variant === 'inline' ? 'sm:w-auto' : 'w-full'
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Subscribing...
          </>
        ) : (
          <>
            <Send className="w-5 h-5 mr-2" />
            Subscribe
          </>
        )}
      </Button>
    </motion.form>
  );
};

export default EmailForm;