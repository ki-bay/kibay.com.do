import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';
import SEOHead from '@/components/SEOHead';

const DiagnosticPage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const runDiagnostic = async () => {
      setLoading(true);
      try {
        // 1. Connection & Auth Verification
        const { data: authData, error: authError } = await supabase.auth.getSession();
        
        // 2. Run Database RPC for schema inspection
        const { data: dbData, error: dbError } = await supabase.rpc('get_db_diagnostic');

        if (dbError && dbError.code !== 'PGRST202') {
          // PGRST202 means function not found, might happen if migration hasn't finished
          throw dbError;
        }

        const fullReport = {
          generatedAt: new Date().toISOString(),
          connection: {
            status: authError ? 'Failed' : 'Healthy',
            details: authError ? authError.message : 'Successfully connected to Supabase and verified auth session.',
          },
          database: dbData || { status: 'Warning', message: 'RPC function get_db_diagnostic not available or returned no data.' }
        };

        setReport(fullReport);
      } catch (err) {
        console.error('Diagnostic error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    runDiagnostic();
  }, []);

  return (
    <>
      <SEOHead title="System Diagnostic Report | Kibay" description="Database health check and diagnostic report." />
      <Navigation />
      
      <main className="min-h-screen bg-stone-50 pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <Database className="w-8 h-8 text-[#D4A574]" />
            <h1 className="text-3xl font-serif text-stone-900">Database Diagnostic Report</h1>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-[#D4A574] animate-spin mb-4" />
              <p className="text-stone-500">Running comprehensive health checks...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl shadow-sm border p-8 border-red-200 bg-red-50 flex flex-col items-center text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
              <h2 className="text-xl font-medium text-red-900 mb-2">Diagnostic Failed</h2>
              <p className="text-red-700">{error}</p>
            </div>
          ) : report ? (
            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
                <h2 className="text-xl font-medium text-stone-900 border-b border-stone-100 pb-4 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" /> System Status Overview
                </h2>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-stone-500 block mb-1">Generated At</span>
                    <span className="font-medium text-stone-900">{new Date(report.generatedAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-stone-500 block mb-1">Connection Status</span>
                    <span className={`font-medium ${report.connection.status === 'Healthy' ? 'text-green-600' : 'text-red-600'}`}>
                      {report.connection.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
                <h2 className="text-xl font-medium text-stone-900 border-b border-stone-100 pb-4 mb-4">Schema & Tables Inventory</h2>
                {report.database?.tables ? (
                  <div className="space-y-6">
                    {report.database.tables.map((table, i) => (
                      <div key={i} className="bg-stone-50 rounded-lg p-4 border border-stone-200">
                        <h3 className="font-medium text-stone-900 mb-3 text-lg">{table.table_name}</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                            <thead className="text-xs text-stone-500 uppercase bg-stone-100">
                              <tr>
                                <th className="px-4 py-2 rounded-tl-md">Column Name</th>
                                <th className="px-4 py-2 rounded-tr-md">Data Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {table.columns?.map((col, j) => (
                                <tr key={j} className="border-b border-stone-100 last:border-0">
                                  <td className="px-4 py-2 font-medium text-stone-700">{col.name}</td>
                                  <td className="px-4 py-2 text-stone-500">{col.type}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    {report.database.tables.length === 0 && (
                      <p className="text-stone-500 italic">No tables found in the public schema.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-stone-500 italic">{report.database?.message || 'Schema information unavailable.'}</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">
                <h2 className="text-xl font-medium text-stone-900 border-b border-stone-100 pb-4 mb-4">Raw JSON Export</h2>
                <pre className="bg-card text-stone-300 p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(report, null, 2)}
                </pre>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default DiagnosticPage;