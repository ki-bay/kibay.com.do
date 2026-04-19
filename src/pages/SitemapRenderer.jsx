import React, { useEffect, useState } from 'react';
import { generateSitemapXml } from '@/utils/sitemapUtils';
import { Loader2 } from 'lucide-react';

const SitemapRenderer = () => {
  const [xmlContent, setXmlContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSitemap = async () => {
      try {
        const content = await generateSitemapXml();
        setXmlContent(content);
      } catch (error) {
        console.error("Failed to generate sitemap", error);
        setXmlContent('Error generating sitemap.');
      } finally {
        setLoading(false);
      }
    };
    fetchSitemap();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    );
  }

  // Render raw XML content in a pre tag to preserve formatting
  // This simulates a "raw file" response within the constraints of a client-side router
  return (
    <pre style={{ 
      margin: 0, 
      padding: '1rem', 
      fontFamily: 'monospace', 
      fontSize: '12px', 
      whiteSpace: 'pre-wrap', 
      wordBreak: 'break-all',
      backgroundColor: '#f8f9fa',
      color: '#212529',
      minHeight: '100vh'
    }}>
      {xmlContent}
    </pre>
  );
};

export default SitemapRenderer;