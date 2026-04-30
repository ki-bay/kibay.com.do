import React, { useEffect, useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/customSupabaseClient';

const ADMIN_EMAIL = 'info@kibay.com.do';

const ProtectedAdminRoute = ({ children }) => {
	const { user, loading } = useAuth();
	const [roleChecked, setRoleChecked] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		if (!user) {
			setRoleChecked(true);
			setIsAdmin(false);
			return;
		}
		let cancelled = false;
		(async () => {
			try {
				const { data, error } = await supabase.from('users').select('role').eq('id', user.id).single();
				if (cancelled) return;
				if (error) {
					setIsAdmin(user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
				} else {
					setIsAdmin(
						data?.role === 'admin' || user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
					);
				}
			} catch {
				if (!cancelled) {
					setIsAdmin(user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
				}
			} finally {
				if (!cancelled) setRoleChecked(true);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [user]);

	if (loading || !roleChecked) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<Loader2 className="w-10 h-10 text-mango-500 animate-spin" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	if (!isAdmin) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background p-4">
				<div className="bg-card p-8 rounded-2xl border border-red-500/20 shadow-2xl max-w-md text-center">
					<div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6 border border-red-500/20">
						<ShieldAlert className="w-8 h-8 text-red-500" />
					</div>
					<h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
					<p className="text-foreground/60 mb-8">
						This area is restricted to administrators (<code className="text-foreground/80">users.role =
						admin</code> or store owner email).
					</p>
					<Link to="/">
						<Button className="w-full bg-slate-700 hover:bg-slate-600 text-foreground">Return to Home</Button>
					</Link>
				</div>
			</div>
		);
	}

	return children;
};

export default ProtectedAdminRoute;
