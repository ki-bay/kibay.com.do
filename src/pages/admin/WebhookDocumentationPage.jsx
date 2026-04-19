
import React from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const WebhookDocumentationPage = () => {
  const projectUrl = import.meta.env.VITE_SUPABASE_URL || 'https://[YOUR_PROJECT].supabase.co';

  return (
    <>
      <SEOHead title="Webhook API Docs | Admin" />
      <Navigation />
      
      <main className="min-h-screen bg-stone-50 pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div>
            <h1 className="text-3xl font-serif text-stone-900">Webhook Documentation</h1>
            <p className="text-stone-500 mt-2">Guide for integrating Make.com and external services with our Edge Functions.</p>
          </div>

          <Card className="border-stone-200 shadow-sm">
            <CardHeader className="bg-stone-50 border-b border-stone-100">
              <CardTitle className="text-lg">Authentication</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-stone-600">All webhook endpoints require an API key to be passed in the <code>Authorization</code> header as a Bearer token.</p>
              <div className="bg-stone-900 text-stone-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                Authorization: Bearer sk_live_your_generated_api_key_here
              </div>
              <p className="text-sm text-stone-600">You can generate API keys in the <Link to="/admin/api-keys" className="text-[#D4A574] hover:underline">API Keys Management</Link> section.</p>
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-sm">
            <CardHeader className="bg-stone-50 border-b border-stone-100">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">POST</Badge>
                <CardTitle className="text-lg">Content Automation Webhook</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div>
                <h3 className="font-medium text-stone-900 mb-2">Endpoint URL</h3>
                <code className="bg-stone-100 px-3 py-1.5 rounded-md text-stone-800 text-sm break-all">
                  {projectUrl}/functions/v1/webhook-handler
                </code>
              </div>

              <div>
                <h3 className="font-medium text-stone-900 mb-2">Required Permissions</h3>
                <Badge variant="outline">webhook_access</Badge>
              </div>

              <div>
                <h3 className="font-medium text-stone-900 mb-2">Example Payload (JSON)</h3>
                <pre className="bg-stone-900 text-stone-300 p-4 rounded-lg font-mono text-sm overflow-x-auto">
{`{
  "photo_url": "https://drive.google.com/uc?id=YOUR_FILE_ID",
  "filename": "summer_wine_campaign_2026.jpg"
}`}
                </pre>
              </div>

              <div>
                <h3 className="font-medium text-stone-900 mb-2">Example cURL</h3>
                <pre className="bg-stone-900 text-stone-300 p-4 rounded-lg font-mono text-sm overflow-x-auto whitespace-pre-wrap">
{`curl -X POST '${projectUrl}/functions/v1/webhook-handler' \\
-H 'Authorization: Bearer sk_live_...' \\
-H 'Content-Type: application/json' \\
-d '{
  "photo_url": "https://example.com/image.jpg",
  "filename": "test-post.jpg"
}'`}
                </pre>
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
      <Footer />
    </>
  );
};

export default WebhookDocumentationPage;
