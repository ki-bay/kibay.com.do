
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, ChevronDown, LogOut, LayoutDashboard, Settings, Activity, Key, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import ShoppingCartIcon from '@/components/ShoppingCartIcon';
import ShoppingCart from '@/components/ShoppingCart';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  
  const [expandedMobileMenus, setExpandedMobileMenus] = useState({
    'Our Products': true,
    'About': false,
    'Admin': false
  });

  const location = useLocation();
  const { user, signOut } = useAuth();

  const isHomePage = location.pathname === '/';
  const isAdmin = user?.email === 'info@kibay.com.do';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setIsCartOpen(false);
    setAdminMenuOpen(false);
  }, [location]);

  const toggleMobileMenu = (label) => {
    setExpandedMobileMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/shop', label: 'Shop' },
    { path: '/vine-and-barrel', label: 'Vine & Barrel' },
    { 
      label: 'Our Products',
      children: [
        { path: '/kibay-sparkling', label: 'Kibay Sparkling' }, 
        { path: '/kibay-wine', label: 'Kibay Wine' }
      ]
    },
    { 
      label: 'About',
      children: [
        { path: '/about', label: 'Our Story' },
        { path: '/whitepaper', label: 'White Paper' }
      ]
    },
    { path: '/blog', label: 'Blog' },
    { path: '/contact', label: 'Contact' }
  ];

  const handleCartClick = () => setIsCartOpen(true);
  const handleSignOut = async () => { await signOut(); setIsOpen(false); };
  
  const isTransparent = isHomePage && !scrolled;
  const navBackgroundClass = isTransparent ? 'bg-transparent' : 'bg-stone-900/95 backdrop-blur-md shadow-lg border-b border-stone-800'; 
  const textColorClass = 'text-white';
  const iconColorClass = 'text-white';

  return (
    <>
      <nav className={cn('fixed top-0 left-0 right-0 z-40 transition-all duration-300 py-4', navBackgroundClass)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group z-50">
              <img src="https://horizons-cdn.hostinger.com/786d721b-c0c7-4506-bee4-4ef9f4967a92/e711380acfce17f0bc86832982651aea.png" alt="Ki-bay Logo" className="h-[45px] w-auto object-contain" />
              <span className={cn("text-2xl font-light tracking-tight transition-colors", textColorClass)}>Ki-BAY</span>
            </Link>

            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map(link => (
                <div key={link.label} className="relative group">
                  {link.children ? (
                    <button className={cn('flex items-center gap-1 text-xs uppercase tracking-widest transition-all duration-300 relative group font-light hover:text-[#D4A574]', textColorClass, link.children.some(child => location.pathname === child.path) && 'font-normal text-[#D4A574]')}>
                      {link.label}
                      <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" />
                    </button>
                  ) : (
                    <Link to={link.path} className={cn('text-xs uppercase tracking-widest transition-all duration-300 relative group whitespace-nowrap', textColorClass, 'hover:text-[#D4A574]', location.pathname === link.path ? 'font-normal' : 'font-light')}>
                      {link.label}
                      <span className={cn('absolute -bottom-1 left-0 h-0.5 bg-[#D4A574] transition-all duration-300', location.pathname === link.path ? 'w-full' : 'w-0 group-hover:w-full')} />
                    </Link>
                  )}
                  {link.children && (
                    <div className="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 w-48">
                      <div className="bg-stone-900 border border-stone-800 rounded-lg shadow-xl overflow-hidden p-2 flex flex-col gap-1">
                        {link.children.map(child => (
                          <Link key={child.path} to={child.path} className={cn("block px-4 py-2 text-xs font-light text-white hover:text-[#D4A574] hover:bg-white/5 rounded-md transition-colors text-left", location.pathname === child.path && "text-[#D4A574] font-normal bg-white/5")}>
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden lg:flex items-center gap-4">
              <div className={cn("transition-colors cursor-pointer hover:text-[#D4A574] p-1", iconColorClass)}>
                 <ShoppingCartIcon onClick={handleCartClick} className="w-5 h-5" />
              </div>
              
              {user ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <div className="relative" onMouseEnter={() => setAdminMenuOpen(true)} onMouseLeave={() => setAdminMenuOpen(false)}>
                      <Button variant="ghost" className={cn("text-mango-400 hover:text-mango-300 hover:bg-white/10 transition-colors font-light flex gap-2 uppercase text-xs tracking-widest", textColorClass)}>
                        <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} /> Admin <ChevronDown className="w-3 h-3"/>
                      </Button>
                      <AnimatePresence>
                        {adminMenuOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 top-full pt-2 w-56 z-50"
                          >
                            <div className="bg-stone-900 border border-stone-800 rounded-lg shadow-xl overflow-hidden p-2 flex flex-col gap-1">
                              <Link to="/dashboard/blog" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-white hover:text-mango-400 hover:bg-white/5 rounded-md transition-colors"><LayoutDashboard className="w-3 h-3"/> Blog Dashboard</Link>
                              <Link to="/admin/social-media" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-white hover:text-mango-400 hover:bg-white/5 rounded-md transition-colors"><Activity className="w-3 h-3"/> Social Dashboard</Link>
                              <Link to="/admin/api-keys" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-white hover:text-mango-400 hover:bg-white/5 rounded-md transition-colors"><Key className="w-3 h-3"/> API Keys</Link>
                              <Link to="/admin/webhook-docs" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-white hover:text-mango-400 hover:bg-white/5 rounded-md transition-colors"><BookOpen className="w-3 h-3"/> Webhook Docs</Link>
                              <div className="border-t border-stone-800 my-1"></div>
                              <Link to="/admin/social-media/settings" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-white hover:text-mango-400 hover:bg-white/5 rounded-md transition-colors"><Settings className="w-3 h-3"/> Social Settings</Link>
                              <Link to="/admin/social-media/logs" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-white hover:text-mango-400 hover:bg-white/5 rounded-md transition-colors"><Activity className="w-3 h-3"/> System Logs</Link>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <Link to="/account">
                    <Button variant="ghost" size="icon" className={cn("hover:text-[#D4A574] hover:bg-white/10 transition-colors font-light", textColorClass)}>
                      <User className="w-5 h-5" strokeWidth={1.5} />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} className={cn("hover:text-red-400 hover:bg-white/10 transition-colors font-light", textColorClass)} title="Sign Out">
                    <LogOut className="w-5 h-5" strokeWidth={1.5} />
                  </Button>
                </div>
              ) : (
                <Link to="/login"><Button variant="ghost" className={cn("hover:text-[#D4A574] hover:bg-white/10 font-light text-xs uppercase tracking-widest", textColorClass)}>Sign In</Button></Link>
              )}
            </div>

            <div className="flex items-center gap-4 lg:hidden">
              <div className={cn("transition-colors cursor-pointer hover:text-[#D4A574]", iconColorClass)}><ShoppingCartIcon onClick={handleCartClick} className="w-6 h-6" /></div>
              <button onClick={() => setIsOpen(!isOpen)} className={cn("p-2 rounded-full hover:bg-white/10 transition-colors z-50", iconColorClass)}>{isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}</button>
            </div>
          </div>
        </div>
      </nav>

      <ShoppingCart isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 z-30 bg-stone-900 lg:hidden pt-24 px-6 overflow-y-auto">
            <div className="flex flex-col gap-6 pb-8">
              {navLinks.map((link, index) => (
                <motion.div key={link.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  {link.children ? (
                    <div className="flex flex-col gap-4">
                      <button onClick={() => toggleMobileMenu(link.label)} className="flex items-center justify-between text-2xl font-light text-white hover:text-[#D4A574] transition-colors w-full text-left">
                        {link.label} <ChevronDown className={cn("w-6 h-6 transition-transform", expandedMobileMenus[link.label] && "rotate-180")} />
                      </button>
                      <AnimatePresence>
                        {expandedMobileMenus[link.label] && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-4 pl-4 border-l-2 border-white/10">
                            {link.children.map(child => (
                              <Link key={child.path} to={child.path} onClick={() => setIsOpen(false)} className={cn("text-lg font-light text-white/80 hover:text-[#D4A574] transition-colors", location.pathname === child.path && "text-[#D4A574]")}>{child.label}</Link>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link to={link.path} onClick={() => setIsOpen(false)} className={cn('block text-2xl font-light hover:text-[#D4A574] transition-colors', location.pathname === link.path ? 'text-[#D4A574]' : 'text-white')}>{link.label}</Link>
                  )}
                </motion.div>
              ))}
              
              <div className="h-px w-full bg-white/10 my-4" />
              
              {user ? (
                <div className="flex flex-col gap-4">
                  {isAdmin && (
                    <div className="flex flex-col gap-4">
                      <button onClick={() => toggleMobileMenu('Admin')} className="flex items-center justify-between text-lg font-light text-mango-400 hover:text-mango-300 w-full text-left">
                        <span className="flex items-center gap-2"><LayoutDashboard className="w-5 h-5"/> Admin Panel</span> <ChevronDown className={cn("w-5 h-5 transition-transform", expandedMobileMenus['Admin'] && "rotate-180")} />
                      </button>
                      <AnimatePresence>
                        {expandedMobileMenus['Admin'] && (
                           <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-4 pl-8 border-l-2 border-mango-400/20">
                              <Link to="/dashboard/blog" onClick={() => setIsOpen(false)} className="text-base text-white/80 hover:text-mango-400">Blog Dashboard</Link>
                              <Link to="/admin/social-media" onClick={() => setIsOpen(false)} className="text-base text-white/80 hover:text-mango-400">Social Dashboard</Link>
                              <Link to="/admin/api-keys" onClick={() => setIsOpen(false)} className="text-base text-white/80 hover:text-mango-400">API Keys</Link>
                              <Link to="/admin/webhook-docs" onClick={() => setIsOpen(false)} className="text-base text-white/80 hover:text-mango-400">Webhook Docs</Link>
                              <Link to="/admin/social-media/settings" onClick={() => setIsOpen(false)} className="text-base text-white/80 hover:text-mango-400">Social Settings</Link>
                              <Link to="/admin/social-media/logs" onClick={() => setIsOpen(false)} className="text-base text-white/80 hover:text-mango-400">System Logs</Link>
                           </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <Link to="/account" onClick={() => setIsOpen(false)} className="text-lg font-light text-white/80 flex items-center gap-2 hover:text-[#D4A574]"><User className="w-5 h-5" /> My Account</Link>
                  <button onClick={handleSignOut} className="text-lg font-light text-red-400 flex items-center gap-2 hover:text-red-300 text-left"><LogOut className="w-5 h-5" /> Sign Out</button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)} className="inline-block text-center py-3 px-6 rounded-full bg-[#D4A574] text-white font-normal text-lg shadow-lg shadow-[#D4A574]/20">Sign In</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
export default Navigation;
