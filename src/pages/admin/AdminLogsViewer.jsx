
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Download, Search } from 'lucide-react';

const AdminLogsViewer = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const exportCSV = () => {
    if (!logs.length) return;
    const headers = ['Timestamp', 'Function', 'Action', 'Status', 'Error'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toISOString(),
      l.function_name,
      l.action,
      l.status,
      l.error_message || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation_logs_${new Date().getTime()}.csv`;
    a.click();
  };

  const filteredLogs = logs.filter(l => 
    l.function_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <SEOHead title="System Logs | Admin" />
      <Navigation />
      
      <main className="min-h-screen bg-stone-50 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-serif text-stone-900">Automation Logs</h1>
              <p className="text-stone-500 mt-2">Monitor edge function executions and webhook events.</p>
            </div>
            <div className="flex gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
                <Input 
                  placeholder="Filter logs..." 
                  className="pl-9 w-64 bg-white" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={exportCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left font-mono">
                <thead className="text-xs text-stone-500 uppercase bg-stone-100 border-b">
                  <tr>
                    <th className="px-6 py-3">Timestamp</th>
                    <th className="px-6 py-3">Function</th>
                    <th className="px-6 py-3">Action</th>
                    <th className="px-6 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {loading ? (
                    <tr><td colSpan="4" className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin mx-auto text-stone-400"/></td></tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-12 text-stone-500">No logs found</td></tr>
                  ) : filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-6 py-3 text-stone-500 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-3 text-stone-700">{log.function_name}</td>
                      <td className="px-6 py-3 text-stone-700">{log.action}</td>
                      <td className="px-6 py-3">
                        {log.status === 'success' ? 
                          <span className="text-green-600 font-semibold">SUCCESS</span> : 
                          <span className="text-red-600 font-semibold" title={log.error_message}>ERROR</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </>
  );
};

export default AdminLogsViewer;
