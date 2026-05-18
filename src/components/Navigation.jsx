
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Menu, X, User, ChevronDown, LogOut, LayoutDashboard, Settings, Activity, Key, BookOpen, Package, Receipt, Users, Ticket, BarChart3, Mail, Truck, Send, AtSign, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import ShoppingCartIcon from '@/components/ShoppingCartIcon';
import ShoppingCart from '@/components/ShoppingCart';
import SearchBar from '@/components/SearchBar';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import ThemeToggle from '@/components/ThemeToggle';
import { mediaUrl } from '@/config/mediaCdn';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  
  const [expandedMobileMenus, setExpandedMobileMenus] = useState({
    ourProducts: true,
    about: false,
    admin: false
  });

  const location = useLocation();
  const { user, signOut } = useAuth();
  const { t } = useTranslation(['nav', 'common']);

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

  // ESC closes the mobile menu
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  const toggleMobileMenu = (label) => {
    setExpandedMobileMenus(prev => ({
      ...prev,
      [label]: !prev[label]
    }));
  };

  const navLinks = [
    { path: '/', key: 'home', label: t('nav:home') },
    { path: '/shop', key: 'shop', label: t('nav:shop') },
    { path: '/vine-and-barrel', key: 'vineAndBarrel', label: t('nav:vineAndBarrel') },
    {
      key: 'ourProducts',
      label: t('nav:ourProducts'),
      children: [
        { path: '/kibay-sparkling', label: t('nav:kibaySparkling') },
        { path: '/kibay-wine', label: t('nav:kibayWine') }
      ]
    },
    {
      key: 'about',
      label: t('nav:about'),
      children: [
        { path: '/about', label: t('nav:ourStory') },
        { path: '/whitepaper', label: t('nav:whitepaper') }
      ]
    },
    { path: '/blog', key: 'blog', label: t('nav:blog') },
    { path: '/contact', key: 'contact', label: t('nav:contact') }
  ];

  const handleCartClick = () => setIsCartOpen(true);
  const handleSignOut = async () => { await signOut(); setIsOpen(false); };
  
  const isTransparent = isHomePage && !scrolled;
  const navBackgroundClass = isTransparent ? 'bg-transparent' : 'bg-card/95 backdrop-blur-md shadow-lg border-b border-border';
  // When transparent, force white text — the home-page hero is a dark
  // cinematic photo regardless of theme, so dark text in light mode would
  // wash out against it. When scrolled, defer to the theme's foreground
  // token so the nav flips white→dark on light mode.
  const textColorClass = isTransparent ? 'text-white' : 'text-foreground';
  const iconColorClass = isTransparent ? 'text-white' : 'text-foreground';

  return (
    <>
      <nav className={cn('fixed top-0 left-0 right-0 z-40 transition-all duration-300 py-4', navBackgroundClass)}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group z-50">
              <img
                src="/logo.png"
                alt="Kibay logo"
                width="216"
                height="162"
                className="h-[54px] w-auto object-contain"
              />
              <span aria-label="KIBAY" className={cn("brand-wordmark text-2xl transition-colors", textColorClass)}>KiBΛY</span>
            </Link>

            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map(link => (
                <div key={link.key} className="relative group">
                  {link.children ? (
                    <button className={cn('flex items-center gap-1 text-xs uppercase tracking-widest transition-all duration-300 relative group font-light hover:text-[#D4A574]', textColorClass, link.children.some(child => location.pathname === child.path) && 'font-normal text-[#D4A574]')}>
                      {link.label}
                      <ChevronDown className="w-3 h-3 transition-transform group-hover:rotate-180" aria-hidden="true" />
                    </button>
                  ) : (
                    <Link to={link.path} className={cn('text-xs uppercase tracking-widest transition-all duration-300 relative group whitespace-nowrap', textColorClass, 'hover:text-[#D4A574]', location.pathname === link.path ? 'font-normal' : 'font-light')}>
                      {link.label}
                      <span className={cn('absolute -bottom-1 left-0 h-0.5 bg-[#D4A574] transition-all duration-300', location.pathname === link.path ? 'w-full' : 'w-0 group-hover:w-full')} />
                    </Link>
                  )}
                  {link.children && (
                    <div className="absolute top-full left-0 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 w-48">
                      <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden p-2 flex flex-col gap-1">
                        {link.children.map(child => (
                          <Link key={child.path} to={child.path} className={cn("block px-4 py-2 text-xs font-light text-foreground hover:text-[#D4A574] hover:bg-foreground/5 rounded-md transition-colors text-left", location.pathname === child.path && "text-[#D4A574] font-normal bg-foreground/5")}>
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
              <SearchBar />
              <div className="transition-colors cursor-pointer text-[#D4A574] hover:text-[#c29462] p-1">
                 <ShoppingCartIcon onClick={handleCartClick} className="w-5 h-5" />
              </div>
              <LanguageSwitcher size="sm" className={isTransparent ? 'border-white/40 bg-white/10 [&_button]:text-white' : ''} />
              <ThemeToggle size="sm" className={isTransparent ? 'border-white/40 bg-white/10 text-white hover:bg-white/20' : ''} />
              
              {user ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <div className="relative" onMouseEnter={() => setAdminMenuOpen(true)} onMouseLeave={() => setAdminMenuOpen(false)}>
                      <Button variant="ghost" className={cn("text-mango-400 hover:text-mango-300 hover:bg-foreground/10 transition-colors font-light flex gap-2 uppercase text-xs tracking-widest", textColorClass)}>
                        <LayoutDashboard className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" /> Admin <ChevronDown className="w-3 h-3" aria-hidden="true" />
                      </Button>
                      {/* Admin dropdown labels stay in English (admin pages are English-only). */}
                      <AnimatePresence>
                        {adminMenuOpen && (
                          <m.div 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                            className="absolute right-0 top-full pt-2 w-56 z-50"
                          >
                            <div className="bg-card border border-border rounded-lg shadow-xl overflow-hidden p-2 flex flex-col gap-1">
                              <Link to="/admin/products" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Package className="w-3 h-3" aria-hidden="true" /> Products</Link>
                              <Link to="/admin/orders" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Receipt className="w-3 h-3" aria-hidden="true" /> Orders</Link>
                              <Link to="/admin/customers" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Users className="w-3 h-3" aria-hidden="true" /> Customers</Link>
                              <Link to="/admin/coupons" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Ticket className="w-3 h-3" aria-hidden="true" /> Coupons</Link>
                              <Link to="/admin/analytics" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><BarChart3 className="w-3 h-3" aria-hidden="true" /> Analytics</Link>
                              <Link to="/admin/newsletter" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Mail className="w-3 h-3" aria-hidden="true" /> Newsletter</Link>
                              <Link to="/admin/shipping" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Truck className="w-3 h-3" aria-hidden="true" /> Shipping</Link>
                              <div className="border-t border-border my-1"></div>
                              <div className="px-4 py-1 text-[10px] uppercase tracking-widest text-foreground/40 font-medium">Email Marketing</div>
                              <Link to="/admin/email" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><BarChart3 className="w-3 h-3" aria-hidden="true" /> Email Dashboard</Link>
                              <Link to="/admin/email/contacts" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><AtSign className="w-3 h-3" aria-hidden="true" /> Email Contacts</Link>
                              <Link to="/admin/email/campaigns" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Mail className="w-3 h-3" aria-hidden="true" /> Campaigns</Link>
                              <Link to="/admin/email/templates" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><FileText className="w-3 h-3" aria-hidden="true" /> Email Templates</Link>
                              <Link to="/admin/email/campaigns/new" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Send className="w-3 h-3" aria-hidden="true" /> New Campaign</Link>
                              <div className="border-t border-border my-1"></div>
                              <Link to="/dashboard/blog" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><LayoutDashboard className="w-3 h-3" aria-hidden="true" /> Blog Dashboard</Link>
                              <Link to="/admin/social-media" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Activity className="w-3 h-3" aria-hidden="true" /> Social Dashboard</Link>
                              <Link to="/admin/api-keys" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Key className="w-3 h-3" aria-hidden="true" /> API Keys</Link>
                              <Link to="/admin/webhook-docs" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><BookOpen className="w-3 h-3" aria-hidden="true" /> Webhook Docs</Link>
                              <div className="border-t border-border my-1"></div>
                              <Link to="/admin/social-media/settings" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Settings className="w-3 h-3" aria-hidden="true" /> Social Settings</Link>
                              <Link to="/admin/social-media/logs" className="flex items-center gap-2 px-4 py-2 text-xs font-light text-foreground hover:text-mango-400 hover:bg-foreground/5 rounded-md transition-colors"><Activity className="w-3 h-3" aria-hidden="true" /> System Logs</Link>
                            </div>
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <Link to="/account" aria-label={t('nav:myAccount')}>
                    <Button variant="ghost" size="icon" aria-label={t('nav:myAccount')} className={cn("hover:text-[#D4A574] hover:bg-foreground/10 transition-colors font-light", textColorClass)}>
                      <User className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label={t('common:actions.signOut')} className={cn("hover:text-red-400 hover:bg-foreground/10 transition-colors font-light", textColorClass)} title={t('common:actions.signOut')}>
                    <LogOut className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
                  </Button>
                </div>
              ) : (
                <Link to="/login"><Button variant="ghost" className={cn("hover:text-[#D4A574] hover:bg-foreground/10 font-light text-xs uppercase tracking-widest", textColorClass)}>{t('common:actions.signIn')}</Button></Link>
              )}
            </div>

            <div className="flex items-center gap-3 lg:hidden">
              <LanguageSwitcher
                variant="toggle"
                size="sm"
                className={isTransparent ? 'border-white/40 bg-white/10 text-white hover:bg-white/20' : ''}
              />
              <ThemeToggle
                size="sm"
                className={isTransparent ? 'border-white/40 bg-white/10 text-white hover:bg-white/20' : ''}
              />
              <div className="transition-colors cursor-pointer text-[#D4A574] hover:text-[#c29462]"><ShoppingCartIcon onClick={handleCartClick} className="w-6 h-6" /></div>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-controls="mobile-menu"
                aria-label={isOpen ? t('common:actions.close', { defaultValue: 'Close menu' }) : t('common:actions.menu', { defaultValue: 'Open menu' })}
                className={cn("p-2 rounded-full hover:bg-foreground/10 transition-colors z-50", iconColorClass)}
              >
                {isOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <ShoppingCart isCartOpen={isCartOpen} setIsCartOpen={setIsCartOpen} />

      <AnimatePresence>
        {isOpen && (
          <m.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-menu-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-card lg:hidden pt-24 px-6 overflow-y-auto"
          >
            <h2 id="mobile-menu-title" className="sr-only">{t('nav:menu', { defaultValue: 'Menu' })}</h2>
            <div className="flex flex-col gap-6 pb-8">
              <div className="pb-2">
                <SearchBar mobile />
              </div>
              {navLinks.map((link, index) => (
                <m.div key={link.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                  {link.children ? (
                    <div className="flex flex-col gap-4">
                      <button
                        type="button"
                        onClick={() => toggleMobileMenu(link.key)}
                        aria-expanded={!!expandedMobileMenus[link.key]}
                        className="flex items-center justify-between text-2xl font-light text-foreground hover:text-[#D4A574] transition-colors w-full text-left"
                      >
                        {link.label} <ChevronDown className={cn("w-6 h-6 transition-transform", expandedMobileMenus[link.key] && "rotate-180")} aria-hidden="true" />
                      </button>
                      <AnimatePresence>
                        {expandedMobileMenus[link.key] && (
                          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-4 pl-4 border-l-2 border-foreground/10">
                            {link.children.map(child => (
                              <Link key={child.path} to={child.path} onClick={() => setIsOpen(false)} className={cn("text-lg font-light text-foreground/80 hover:text-[#D4A574] transition-colors", location.pathname === child.path && "text-[#D4A574]")}>{child.label}</Link>
                            ))}
                          </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link to={link.path} onClick={() => setIsOpen(false)} className={cn('block text-2xl font-light hover:text-[#D4A574] transition-colors', location.pathname === link.path ? 'text-[#D4A574]' : 'text-foreground')}>{link.label}</Link>
                  )}
                </m.div>
              ))}
              
              <div className="h-px w-full bg-foreground/10 my-4" />
              
              {user ? (
                <div className="flex flex-col gap-4">
                  {isAdmin && (
                    <div className="flex flex-col gap-4">
                      <button
                        type="button"
                        onClick={() => toggleMobileMenu('admin')}
                        aria-expanded={!!expandedMobileMenus['admin']}
                        className="flex items-center justify-between text-lg font-light text-mango-400 hover:text-mango-300 w-full text-left"
                      >
                        <span className="flex items-center gap-2"><LayoutDashboard className="w-5 h-5" aria-hidden="true" /> Admin Panel</span> <ChevronDown className={cn("w-5 h-5 transition-transform", expandedMobileMenus['admin'] && "rotate-180")} aria-hidden="true" />
                      </button>
                      <AnimatePresence>
                        {expandedMobileMenus['admin'] && (
                           <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-col gap-4 pl-8 border-l-2 border-mango-400/20">
                              <Link to="/admin/products" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Products</Link>
                              <Link to="/admin/orders" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Orders</Link>
                              <Link to="/admin/customers" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Customers</Link>
                              <Link to="/admin/coupons" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Coupons</Link>
                              <Link to="/admin/analytics" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Analytics</Link>
                              <Link to="/admin/newsletter" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Newsletter</Link>
                              <Link to="/admin/shipping" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Shipping</Link>
                              <div className="text-xs uppercase tracking-widest text-foreground/40 pt-2">Email Marketing</div>
                              <Link to="/admin/email" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Email Dashboard</Link>
                              <Link to="/admin/email/contacts" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Email Contacts</Link>
                              <Link to="/admin/email/campaigns" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Campaigns</Link>
                              <Link to="/admin/email/templates" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Email Templates</Link>
                              <Link to="/admin/email/campaigns/new" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">New Campaign</Link>
                              <Link to="/dashboard/blog" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Blog Dashboard</Link>
                              <Link to="/admin/social-media" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Social Dashboard</Link>
                              <Link to="/admin/api-keys" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">API Keys</Link>
                              <Link to="/admin/webhook-docs" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Webhook Docs</Link>
                              <Link to="/admin/social-media/settings" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">Social Settings</Link>
                              <Link to="/admin/social-media/logs" onClick={() => setIsOpen(false)} className="text-base text-foreground/80 hover:text-mango-400">System Logs</Link>
                           </m.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                  <Link to="/account" onClick={() => setIsOpen(false)} className="text-lg font-light text-foreground/80 flex items-center gap-2 hover:text-[#D4A574]"><User className="w-5 h-5" aria-hidden="true" /> {t('nav:myAccount')}</Link>
                  <button type="button" onClick={handleSignOut} className="text-lg font-light text-red-400 flex items-center gap-2 hover:text-red-300 text-left"><LogOut className="w-5 h-5" aria-hidden="true" /> {t('common:actions.signOut')}</button>
                </div>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)} className="inline-block text-center py-3 px-6 rounded-full bg-[#D4A574] text-foreground font-normal text-lg shadow-lg shadow-[#D4A574]/20">{t('common:actions.signIn')}</Link>
              )}

              <div className="h-px w-full bg-foreground/10 my-4" />
              <div className="flex items-center justify-center gap-3 pb-4">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
};
export default Navigation;
