import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, LogOut, Save, Loader2, Mail, Clock, Settings, Package, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { useToast } from '@/components/ui/use-toast';
import OrderHistoryPanel from '@/components/OrderHistoryPanel';
import { cn } from '@/lib/utils';

const UserProfilePage = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    avatar_url: '',
    email: ''
  });
  const [preferences, setPreferences] = useState({
    newsletter_signup: false
  });
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setIsAdminUser(false);
      // Fetch user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;

      // Fetch preferences
      const { data: prefData, error: prefError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (userData) {
        setProfile({
          full_name: userData.full_name || '',
          avatar_url: userData.avatar_url || '',
          email: userData.email || user.email
        });
        const email = String(userData.email || user?.email || '').toLowerCase();
        setIsAdminUser(userData.role === 'admin' || email === 'info@kibay.com.do');
      }

      if (prefData) {
        setPreferences({
          newsletter_signup: prefData.newsletter_signup || false
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        variant: "destructive",
        title: "Error loading profile",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      // Update user table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // Update/Insert preferences
      const { data: existingPref } = await supabase
        .from('user_preferences')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingPref) {
        await supabase
          .from('user_preferences')
          .update({
            newsletter_signup: preferences.newsletter_signup,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            newsletter_signup: preferences.newsletter_signup
          });
      }

      toast({
        title: "Profile updated",
        description: "Your changes have been saved successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-mango-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Account - Kibay Espumante</title>
      </Helmet>
      <Navigation />
      <div className="min-h-screen bg-background pt-28 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl border border-foreground/10 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-mango-600 to-mango-500 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-foreground/20 rounded-full flex items-center justify-center text-3xl font-bold text-foreground shadow-lg">
                  {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : <User />}
                </div>
                <div>
                  <h1 className="text-2xl font-light text-foreground">{profile.full_name || 'User'}</h1>
                  <p className="text-foreground/80 flex items-center gap-2 font-light text-sm">
                    <Mail className="w-4 h-4" /> {profile.email}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => signOut()}
                variant="outline" 
                className="border-foreground/20 text-foreground hover:bg-foreground/10 hover:text-foreground font-normal"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>

            {/* Content */}
            <div className="p-0 md:p-8 flex flex-col md:flex-row min-h-[500px]">
              
              {/* Sidebar Tabs */}
              <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-foreground/10 p-4 md:pr-6 space-y-2">
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg transition-all font-light flex items-center gap-3",
                    activeTab === 'profile' 
                      ? "bg-mango-500/10 text-mango-400 font-medium" 
                      : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                  )}
                >
                  <Settings className="w-4 h-4" />
                  Profile Settings
                </button>
                <button 
                  onClick={() => setActiveTab('orders')}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg transition-all font-light flex items-center gap-3",
                    activeTab === 'orders' 
                      ? "bg-mango-500/10 text-mango-400 font-medium" 
                      : "text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                  )}
                >
                  <Clock className="w-4 h-4" />
                  Order History
                </button>
                {isAdminUser && (
                  <>
                    <div className="pt-2 mt-2 border-t border-foreground/10 text-[10px] uppercase tracking-wider text-foreground/40 px-2">
                      Admin
                    </div>
                    <Link
                      to="/admin/orders"
                      className="w-full text-left px-4 py-3 rounded-lg transition-all font-light flex items-center gap-3 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                    >
                      <Package className="w-4 h-4" />
                      Shop orders
                    </Link>
                    <Link
                      to="/dashboard/blog"
                      className="w-full text-left px-4 py-3 rounded-lg transition-all font-light flex items-center gap-3 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Blog dashboard
                    </Link>
                  </>
                )}
              </div>

              {/* Main Panel Content */}
              <div className="flex-1 p-6 md:pl-8">
                {activeTab === 'profile' ? (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-8 max-w-xl"
                  >
                    <div className="space-y-6">
                      <h2 className="text-xl font-normal text-foreground">Personal Information</h2>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-light text-foreground/80">Full Name</label>
                          <input
                            type="text"
                            value={profile.full_name}
                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                            className="w-full bg-background/50 border border-foreground/10 rounded-lg py-2.5 px-4 text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-mango-500 focus:ring-1 focus:ring-mango-500 font-light"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-light text-foreground/80">Email</label>
                          <input
                            type="text"
                            value={profile.email}
                            disabled
                            className="w-full bg-background/30 border border-foreground/5 rounded-lg py-2.5 px-4 text-foreground/50 cursor-not-allowed font-light"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-foreground/10 pt-8 space-y-6">
                      <h2 className="text-xl font-normal text-foreground">Preferences</h2>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={preferences.newsletter_signup}
                            onChange={(e) => setPreferences({ ...preferences, newsletter_signup: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-foreground after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-mango-500"></div>
                        </div>
                        <span className="text-foreground/80 group-hover:text-foreground transition-colors font-light">
                          Subscribe to newsletter for updates and offers
                        </span>
                      </label>
                    </div>

                    <div className="pt-4">
                      <Button 
                        onClick={handleUpdateProfile}
                        disabled={isSaving}
                        className="bg-mango-500 hover:bg-mango-600 text-foreground font-normal w-full sm:w-auto"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <OrderHistoryPanel />
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default UserProfilePage;