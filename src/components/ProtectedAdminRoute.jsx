import React from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProtectedAdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const ADMIN_EMAIL = "info@kibay.com.do";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="w-10 h-10 text-mango-500 animate-spin" />
      </div>
    );
  }

  // Not logged in -> Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but not admin -> Access Denied
  if (user.email !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-slate-800 p-8 rounded-2xl border border-red-500/20 shadow-2xl max-w-md text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6 border border-red-500/20">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-white/60 mb-8">
            You do not have permission to view this area. This section is restricted to administrators only.
          </p>
          <Link to="/">
            <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedAdminRoute;