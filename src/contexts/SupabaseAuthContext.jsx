import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // OTP flow states
  const [authError, setAuthError] = useState(null);

  // Initialize and listen for auth changes
  useEffect(() => {
    console.log('AuthContext: Initializing...');
    
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('AuthContext: Error getting session', error);
          throw error;
        }
        
        console.log('AuthContext: Session retrieved', session ? 'Active Session' : 'No Session');
        setSession(session);
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('AuthContext: Unexpected error getting session', err);
      } finally {
        setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`AuthContext: Auth State Changed: ${event}`, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (event === 'SIGNED_IN') {
           setAuthError(null);
        //    toast({
        //      title: "Welcome back!",
        //      description: "You have successfully signed in.",
        //    });
        }
        if (event === 'SIGNED_OUT') {
           setUser(null);
           setSession(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [toast]);

  // Send OTP Function (6-digit code)
  const sendOtp = useCallback(async (email) => {
    console.log('AuthContext: sendOtp called for:', email);
    setLoading(true);
    setAuthError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email: email
      });

      if (error) {
        console.error('AuthContext: sendOtp API Error:', error);
        setAuthError(error.message);
        toast({
          variant: "destructive",
          title: "Error sending code",
          description: error.message,
        });
        setLoading(false);
        return { success: false, error };
      }
      
      console.log('AuthContext: sendOtp API Success');
      toast({
        title: "Code Sent",
        description: `We've sent a verification code to ${email}`,
      });
      setLoading(false);
      return { success: true, data };
    } catch (err) {
      console.error('AuthContext: sendOtp Unexpected Error:', err);
      setAuthError("Unexpected error occurred");
      setLoading(false);
      return { success: false, error: err };
    }
  }, [toast]);

  // Verify OTP Function
  const verifyOtp = useCallback(async (email, token) => {
    console.log('AuthContext: verifyOtp called for:', email);
    setLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        console.error('AuthContext: verifyOtp API Error:', error);
        setAuthError(error.message);
        
        let description = error.message;
        if (error.message.includes("Token has expired")) {
            description = "This code has expired. Please request a new one.";
        } else if (error.message.includes("invalid")) {
            description = "Invalid code. Please double-check the digits.";
        }

        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: description,
        });
        setLoading(false);
        return { success: false, error };
      }

      console.log('AuthContext: verifyOtp API Success - User Logged In');
      setLoading(false);
      return { success: true, data };
    } catch (err) {
      console.error('AuthContext: verifyOtp Unexpected Error:', err);
      setAuthError("Unexpected error verifying code");
      setLoading(false);
      return { success: false, error: err };
    }
  }, [toast]);

  // Sign In With Password
  const signInWithPassword = useCallback(async (email, password) => {
    setLoading(true);
    setAuthError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setAuthError(error.message);
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: error.message,
        });
        setLoading(false);
        return { success: false, error };
      }

      toast({
        title: "Welcome back!",
        description: "Successfully logged in to Blog Admin.",
      });
      setLoading(false);
      return { success: true, data };
    } catch (err) {
      console.error("AuthContext: signInWithPassword error", err);
      setAuthError(err.message);
      setLoading(false);
      return { success: false, error: err };
    }
  }, [toast]);

  const signOut = useCallback(async () => {
    console.log('AuthContext: signOut called');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast({
        title: "Signed Out",
        description: "See you next time!",
      });
    } catch (err) {
      console.error('AuthContext: signOut error', err);
      toast({
        variant: "destructive",
        title: "Sign Out Error",
        description: err.message,
      });
    }
  }, [toast]);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    authError,
    sendOtp,
    verifyOtp,
    signInWithPassword,
    signOut,
  }), [user, session, loading, authError, sendOtp, verifyOtp, signInWithPassword, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};