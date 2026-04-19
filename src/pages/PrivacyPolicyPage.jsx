import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Shield } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const PrivacyPolicyPage = () => {
  const sections = [
    {
      title: "1. Information We Collect",
      content: "We collect information you provide directly to us, such as when you create an account, make a purchase, sign up for our newsletter, or contact us. This may include your name, email address, shipping address, phone number, payment information, and date of birth (for age verification)."
    },
    {
      title: "2. Legal Drinking Age Verification",
      content: "We collect date of birth information solely to verify that you are of legal drinking age in your jurisdiction. We do not knowingly collect personal information from individuals under the legal drinking age."
    },
    {
      title: "3. How We Use Your Information",
      content: "We use the information we collect to process your orders, communicate with you about your account or transactions, send you marketing communications (if you have opted in), monitor and analyze trends and usage, and detect, investigate, and prevent fraudulent transactions and other illegal activities."
    },
    {
      title: "4. Cookies and Tracking Technologies",
      content: "We use cookies and similar tracking technologies to track the activity on our service and hold certain information. Cookies are files with small amount of data which may include an anonymous unique identifier. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent."
    },
    {
      title: "5. Sharing of Information",
      content: "We may share your information with third-party vendors, consultants, and other service providers who need access to such information to carry out work on our behalf (e.g., payment processors, shipping partners). We do not sell or rent your personal information to third parties."
    },
    {
      title: "6. Data Security",
      content: "We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction. However, no internet transmission is completely secure, and we cannot guarantee the security of your data transmitted to our site."
    },
    {
      title: "7. Data Retention",
      content: "We store the information we collect about you for as long as is necessary for the purpose(s) for which we originally collected it. We may retain certain information for legitimate business purposes or as required by law."
    },
    {
      title: "8. Your Rights",
      content: "Depending on your location, you may have rights regarding your personal information, including the right to access, correct, delete, or restrict use of your personal data. You may also have the right to object to the processing of your data."
    },
    {
      title: "9. Third-Party Links",
      content: "Our website may contain links to third-party websites. If you follow a link to any of these websites, please note that they have their own privacy policies and that we do not accept any responsibility or liability for these policies."
    },
    {
      title: "10. Changes to This Privacy Policy",
      content: "We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last Updated' date."
    },
    {
      title: "11. Contact Information",
      content: "If you have any questions about this Privacy Policy, please contact us at info@kibay.com.do."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Privacy Policy - Kibay Espumante</title>
        <meta name="description" content="Learn how Kibay Espumante collects, uses, and protects your personal information." />
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
                <Shield className="w-8 h-8 text-[#D4A574]" />
                <h6 className="text-[#D4A574] font-medium tracking-wider uppercase text-sm">Legal</h6>
              </div>
              <h1 className="text-4xl md:text-5xl font-light text-stone-900 mb-6">Privacy Policy</h1>
              <p className="text-lg text-stone-500 leading-relaxed max-w-2xl font-light">
                We value your trust and are committed to protecting your personal information. This policy outlines our practices regarding data collection and usage.
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

export default PrivacyPolicyPage;