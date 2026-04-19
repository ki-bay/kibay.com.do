import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Truck } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

const ShippingReturnsPolicyPage = () => {
  const sections = [
    {
      title: "1. Shipping of Alcoholic Products",
      content: "We currently ship to select locations within the Dominican Republic. All orders containing alcohol must be received by an adult of legal drinking age (18+). Valid government-issued photo ID is required upon delivery. Carriers will not leave packages unattended."
    },
    {
      title: "2. Shipping Costs",
      content: "Shipping costs are calculated at checkout based on the weight of your order and the delivery destination. We may offer free shipping promotions on orders exceeding a certain value. Expedited shipping options may be available for an additional fee."
    },
    {
      title: "3. Order Processing",
      content: "Orders are typically processed within 1-2 business days. Orders placed on weekends or holidays will be processed on the following business day. You will receive a confirmation email with tracking information once your order has shipped."
    },
    {
      title: "4. Returns Policy for Alcohol",
      content: "Due to legal regulations and the perishable nature of our products, we generally do not accept returns of alcoholic beverages. All sales are considered final. However, we are committed to customer satisfaction and will address issues with damaged or incorrect orders."
    },
    {
      title: "5. Damaged or Incorrect Orders",
      content: "If your order arrives damaged, spoiled, or incorrect, please contact us immediately at info@kibay.com.do. Please retain the original packaging and contents. We may request photos of the damage to process a replacement or refund."
    },
    {
      title: "6. Cancellations",
      content: "Orders may be cancelled only if they have not yet been processed for shipping. Once an order has been packed and a shipping label created, it cannot be cancelled. Please contact us immediately if you wish to request a cancellation."
    },
    {
      title: "7. Lost or Stolen Packages",
      content: "We are not responsible for packages that are lost or stolen after they have been successfully delivered to the address provided. Please ensure someone is available to receive the package, especially given the signature requirement for alcohol."
    },
    {
      title: "8. Responsible Delivery",
      content: "Our delivery partners reserve the right to refuse delivery if the recipient appears to be intoxicated or cannot provide valid proof of age. In such cases, the package may be returned to us, and a restocking fee plus return shipping costs may apply."
    },
    {
      title: "9. Contact Information",
      content: "For any shipping or return related inquiries, please reach out to our support team at info@kibay.com.do. We are here to ensure you have an excellent experience with Kibay Espumante."
    }
  ];

  return (
    <>
      <Helmet>
        <title>Shipping & Returns - Kibay Espumante</title>
        <meta name="description" content="Information about Kibay Espumante's shipping policies, delivery areas, and return procedures for our premium wines." />
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
                <Truck className="w-8 h-8 text-[#D4A574]" />
                <h6 className="text-[#D4A574] font-medium tracking-wider uppercase text-sm">Policy</h6>
              </div>
              <h1 className="text-4xl md:text-5xl font-light text-stone-900 mb-6">Shipping & Returns</h1>
              <p className="text-lg text-stone-500 leading-relaxed max-w-2xl font-light">
                We strive to ensure your Kibay experience is perfect from our winery to your glass. Here is what you need to know about our delivery and return processes.
              </p>
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

export default ShippingReturnsPolicyPage;