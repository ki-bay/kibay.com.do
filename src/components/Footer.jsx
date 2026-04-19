import React from 'react';
import { Link } from 'react-router-dom';
import { mediaUrl } from '@/config/mediaCdn';
import { Instagram, Facebook, Mail, MapPin, Phone } from 'lucide-react';
import NewsletterSignup from './NewsletterSignup';

// Custom TikTok icon since it might not be available in all Lucide versions
const TikTokIcon = ({ size = 24, className = "" }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-stone-950 pt-16 pb-8 border-t border-stone-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter Section */}
        <div className="mb-16 pb-16 border-b border-white/10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
             <div>
                <h3 className="text-2xl sm:text-3xl font-bold mb-4 text-white font-lato">
                  Join the Kibay Lifestyle
                </h3>
                <p className="text-white/70 font-light max-w-md font-lato">
                  We're building a community of sparkling wine lovers. Be part of the journey.
                </p>
             </div>
             <div>
                <NewsletterSignup 
                  subtext="Stay in the Kibay circle – news, pairings, and early-bird offers."
                  fields={{ firstName: false, email: true }}
                  buttonText="Sign up"
                  source="Footer Signup"
                  variant="footer"
                />
             </div>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand & Company Info */}
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2 group w-fit">
              <img 
                src={mediaUrl('528dc5649d4cfca8e6282f7759bb1460.png')} 
                alt="Ki-bay logo" 
                className="w-8 h-8 group-hover:text-white transition-colors"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-[#D4A574] to-[#f3dcb8] bg-clip-text text-transparent font-lato">
                Kibay
              </span>
            </Link>
            <p className="text-white/60 text-sm leading-relaxed font-normal font-lato">
              Premium organic sparkling wine from the Dominican Republic. Crafted with passion, sustainability, and the finest local fruits.
            </p>
            <div className="flex items-start gap-2 text-white/60 text-sm font-normal font-lato">
              <MapPin size={16} className="text-[#D4A574] mt-1 shrink-0" />
              <span>Bahia de Ocoa, Km 6 1/2 Hatillo, Azua 71003</span>
            </div>
          </div>

          {/* Explore / Shop */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg tracking-wide font-lato">Explore</h4>
            <nav className="space-y-4">
              <Link to="/" className="block text-white/70 hover:text-[#D4A574] transition-colors text-sm font-normal font-lato">Home</Link>
              <Link to="/shop" className="block text-white/70 hover:text-[#D4A574] transition-colors text-sm font-normal font-lato">Shop Collection</Link>
              <Link to="/blog" className="block text-white/70 hover:text-[#D4A574] transition-colors text-sm font-normal font-lato">Blog</Link>
              <Link to="/why-cans" className="block text-white/70 hover:text-[#D4A574] transition-colors text-sm font-normal font-lato">Why Cans</Link>
              <Link to="/about" className="block text-white/70 hover:text-[#D4A574] transition-colors text-sm font-normal font-lato">Our Story</Link>
            </nav>
          </div>

          {/* Legal & Policies */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg tracking-wide font-lato">Legal</h4>
            <nav className="space-y-4">
              <Link to="/terms" className="block text-white/70 hover:text-[#D4A574] transition-colors text-sm font-normal font-lato">Terms & Conditions</Link>
              <Link to="/privacy" className="block text-white/70 hover:text-[#D4A574] transition-colors text-sm font-normal font-lato">Privacy Policy</Link>
              <Link to="/shipping-returns" className="block text-white/70 hover:text-[#D4A574] transition-colors text-sm font-normal font-lato">Shipping & Returns</Link>
            </nav>
          </div>

          {/* Customer Service & Connect */}
          <div>
            <h4 className="text-white font-bold mb-6 text-lg tracking-wide font-lato">Contact</h4>
            <div className="space-y-6">
              <a href="mailto:info@kibay.com.do" className="flex items-center gap-3 text-white/70 hover:text-[#D4A574] transition-colors group">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#D4A574]/20 transition-colors">
                  <Mail size={14} />
                </div>
                <span className="text-sm font-normal font-lato">info@kibay.com.do</span>
              </a>

              <a href="tel:+18498766563" className="flex items-center gap-3 text-white/70 hover:text-[#D4A574] transition-colors group">
                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-[#D4A574]/20 transition-colors">
                  <Phone size={14} />
                </div>
                <span className="text-sm font-normal font-lato">+1 (849) 876-6563</span>
              </a>

              <div className="pt-2">
                <h5 className="text-white/90 text-sm font-bold mb-4 font-lato">Follow Us</h5>
                <div className="flex gap-4">
                  <a href="https://www.instagram.com/kibaywine/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#D4A574] hover:text-white text-white/70 flex items-center justify-center transition-all duration-300" aria-label="Instagram">
                    <Instagram className="w-4 h-4" />
                  </a>
                  <a href="https://www.facebook.com/profile.php?id=61587482222662" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#D4A574] hover:text-white text-white/70 flex items-center justify-center transition-all duration-300" aria-label="Facebook">
                    <Facebook className="w-4 h-4" />
                  </a>
                  <a href="https://www.tiktok.com/@kibaywine" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 hover:bg-[#D4A574] hover:text-white text-white/70 flex items-center justify-center transition-all duration-300" aria-label="TikTok">
                    <TikTokIcon className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/40 text-xs text-center md:text-left font-light font-lato">
              © {currentYear} Kibay Sparkling. All rights reserved. Please drink responsibly.
            </p>
            <div className="flex gap-6 text-xs font-light font-lato">
              <span className="text-white/40">Dominican Republic</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;