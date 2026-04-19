import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, FileText } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const TermsAndConditionsPage = () => {
  const sections = [
    {
      title: "1. Legal Drinking Age Requirement",
      content: "You must be of legal drinking age in your jurisdiction to visit this site and purchase alcohol. By using this website, you affirm that you are at least 18 years old (or the legal drinking age in your country of residence). We reserve the right to ask for valid identification upon delivery."
    },
    {
      title: "2. Online Sales & Availability",
      content: "All products listed on our website are subject to availability. We reserve the right to limit the quantity of products we supply, supply only part of an order, or divide up orders. We also reserve the right to alter the terms or duration of any special offers or sale promotions."
    },
    {
      title: "3. Pricing and Payments",
      content: "All prices are displayed in Dominican Pesos (DOP) or US Dollars (USD) as indicated. Prices are subject to change without notice. Payment must be received in full prior to acceptance of an order. We accept major credit cards and other payment methods as displayed at checkout."
    },
    {
      title: "4. Order Confirmation & Acceptance",
      content: "Receipt of an electronic order confirmation does not signify our acceptance of your order, nor does it constitute confirmation of our offer to sell. We reserve the right at any time after receipt of your order to accept or decline your order for any reason."
    },
    {
      title: "5. Shipping & Delivery of Alcohol",
      content: "Alcohol shipping regulations are complex. We currently ship only to specific regions within the Dominican Republic. An adult signature (18+) with valid ID is required upon delivery. Packages cannot be left at the door without a signature."
    },
    {
      title: "6. Returns, Cancellations & Refunds",
      content: "Due to the nature of our products, we generally do not accept returns on alcohol unless the product is damaged or spoiled. Please refer to our Shipping & Returns Policy for detailed information on how to handle damaged shipments or request cancellations."
    },
    {
      title: "7. Responsible Consumption Disclaimer",
      content: "Kibay Espumante promotes responsible drinking. Alcohol should be consumed in moderation. Excessive consumption of alcohol may be harmful to your health. We do not support underage drinking, excessive drinking, or drinking and driving."
    },
    {
      title: "8. Intellectual Property",
      content: "All content included on this site, such as text, graphics, logos, images, and software, is the property of Kibay Espumante or its content suppliers and is protected by international copyright laws."
    },
    {
      title: "9. Cookies & Data Use",
      content: "We use cookies to enhance your browsing experience and analyze our traffic. By using our website, you consent to our use of cookies in accordance with our Privacy Policy."
    },
    {
      title: "10. Disclaimer",
      content: "The materials on Kibay Espumante's website are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property."
    },
    {
      title: "11. Limitation of Liability",
      content: "In no event shall Kibay Espumante or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on our website."
    },
    {
      title: "12. Governing Law",
      content: "These terms and conditions are governed by and construed in accordance with the laws of the Dominican Republic and you irrevocably submit to the exclusive jurisdiction of the courts in that location."
    },
    {
      title: "13. Contact Information",
      content: "If you have any questions about these Terms and Conditions, please contact us at info@kibay.com.do."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Terms & Conditions - Kibay Espumante</title>
        <meta name="description" content="Terms and conditions for using the Kibay Espumante website and purchasing our premium sparkling wines." />
      </Helmet>
      
      <Navigation />
      
      <div className="min-h-screen bg-stone-50 pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12">
            <Link to="/" className="inline-flex items-center gap-2 text-stone-500 hover:text-[#D4A574] transition-colors mb-6 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back to Home
            </Link>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-8 h-8 text-[#D4A574]" />
                <h6 className="text-[#D4A574] font-medium tracking-wider uppercase text-sm">Legal</h6>
              </div>
              <h1 className="text-4xl md:text-5xl font-light text-stone-900 mb-6">Terms & Conditions</h1>
              <p className="text-lg text-stone-500 leading-relaxed max-w-2xl font-light">
                Please read these terms carefully before using our website or purchasing our products. By accessing or using any part of the site, you agree to be bound by these Terms of Service.
              </p>
              <p className="text-sm text-stone-400 mt-4 font-light">Last Updated: October 2024</p>
            </motion.div>
          </div>

          {/* Content Sections */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 md:p-12 space-y-12"
          >
            {sections.map((section, index) => (
              <div key={index} className="scroll-mt-32" id={`section-${index}`}>
                <h2 className="text-2xl font-normal text-stone-900 mb-4">{section.title}</h2>
                <div className="prose prose-stone prose-lg max-w-none text-stone-600 font-light leading-relaxed">
                  <p>{section.content}</p>
                </div>
                {index < sections.length - 1 && (
                  <div className="h-px bg-stone-100 mt-12 w-full" />
                )}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
      
      <Footer />
    </>
  );
};

export default TermsAndConditionsPage;