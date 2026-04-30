import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import { formatDopFromCents } from '@/lib/formatMoney';
import { publicStorageObjectUrl } from '@/lib/supabaseStorage';
import { Input } from '@/components/ui/input';

const AdminOrdersPage = () => {
	const [orders, setOrders] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [savingId, setSavingId] = useState(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data, error: e } = await supabase
				.from('orders')
				.select('*')
				.order('created_at', { ascending: false })
				.limit(200);
			if (e) throw e;
			setOrders(data || []);
		} catch (err) {
			setError(err.message || 'Failed to load orders');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const stats = useMemo(() => {
		const paidLike = new Set(['paid', 'processing', 'Processing', 'shipped', 'Shipped', 'delivered', 'Delivered']);
		let revenue = 0;
		let count = 0;
		for (const o of orders) {
			if (paidLike.has(o.status)) {
				revenue += Number(o.total_amount) || 0;
				count += 1;
			}
		}
		return { revenue, count };
	}, [orders]);

	const updateField = (id, field, value) => {
		setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: value } : o)));
	};

	const saveOrder = async (order) => {
		setSavingId(order.id);
		try {
			const { error: e } = await supabase
				.from('orders')
				.update({
					status: order.status,
					tracking_number: order.tracking_number || null,
					shipping_method: order.shipping_method || null,
					tax_id: order.tax_id || null,
				})
				.eq('id', order.id);
			if (e) throw e;
		} catch (err) {
			setError(err.message);
		} finally {
			setSavingId(null);
		}
	};

	return (
		<>
			<Helmet>
				<title>Orders — Admin</title>
			</Helmet>
			<Navigation />
			<div className="min-h-screen bg-background pt-28 pb-20 px-4">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
						<div>
							<h1 className="text-3xl font-bold text-foreground">Order management</h1>
							<p className="text-foreground/60 mt-1">
								Admin-only view (RLS + role). Update fulfillment fields after payment.
							</p>
						</div>
						<Button variant="outline" onClick={load} className="border-foreground/20 text-foreground gap-2">
							<RefreshCw className="w-4 h-4" />
							Refresh
						</Button>
					</div>

					<div className="grid sm:grid-cols-2 gap-4 mb-8">
						<div className="bg-card border border-foreground/10 rounded-xl p-6">
							<p className="text-foreground/50 text-sm">Paid / in-progress orders (count)</p>
							<p className="text-3xl font-semibold text-mango-400">{stats.count}</p>
						</div>
						<div className="bg-card border border-foreground/10 rounded-xl p-6">
							<p className="text-foreground/50 text-sm">Revenue (same set, DOP)</p>
							<p className="text-3xl font-semibold text-foreground">{formatDopFromCents(stats.revenue)}</p>
						</div>
					</div>

					{error && (
						<div className="mb-6 text-red-400 text-sm border border-red-500/30 rounded-lg p-4 bg-red-500/10">
							{error}
						</div>
					)}

					{loading ? (
						<div className="flex justify-center py-20">
							<Loader2 className="w-10 h-10 text-mango-500 animate-spin" />
						</div>
					) : (
						<div className="space-y-4">
							{orders.map((o) => (
								<div
									key={o.id}
									className="bg-card border border-foreground/10 rounded-xl p-4 md:p-6 grid gap-4 md:grid-cols-12"
								>
									<div className="md:col-span-3">
										<p className="text-foreground font-medium">{o.order_number}</p>
										<p className="text-xs text-foreground/40 mt-1">{new Date(o.created_at).toLocaleString()}</p>
										<p className="text-mango-400 font-semibold mt-2">{formatDopFromCents(o.total_amount)}</p>
										{o.invoice_pdf_path && (
											<a
												className="text-xs text-sky-400 underline mt-2 inline-block"
												href={publicStorageObjectUrl('blog_media', o.invoice_pdf_path)}
												target="_blank"
												rel="noreferrer"
											>
												View invoice PDF
											</a>
										)}
									</div>
									<div className="md:col-span-3 space-y-2">
										<label className="text-xs text-foreground/50">Status</label>
										<Input
											className="bg-background border-foreground/10 text-foreground"
											value={o.status}
											onChange={(e) => updateField(o.id, 'status', e.target.value)}
											placeholder="paid, processing, shipped…"
										/>
									</div>
									<div className="md:col-span-3 space-y-2">
										<label className="text-xs text-foreground/50">Tracking number</label>
										<Input
											className="bg-background border-foreground/10 text-foreground"
											value={o.tracking_number || ''}
											onChange={(e) => updateField(o.id, 'tracking_number', e.target.value)}
											placeholder="Carrier tracking"
										/>
									</div>
									<div className="md:col-span-3 space-y-2">
										<label className="text-xs text-foreground/50">Shipping method (label)</label>
										<Input
											className="bg-background border-foreground/10 text-foreground"
											value={o.shipping_method || ''}
											onChange={(e) => updateField(o.id, 'shipping_method', e.target.value)}
											placeholder="standard / express / …"
										/>
									</div>
									<div className="md:col-span-12 flex justify-end">
										<Button
											size="sm"
											className="bg-mango-500 hover:bg-mango-600"
											disabled={savingId === o.id}
											onClick={() => saveOrder(o)}
										>
											{savingId === o.id ? (
												<Loader2 className="w-4 h-4 animate-spin" />
											) : (
												'Save'
											)}
										</Button>
									</div>
								</div>
							))}
							{orders.length === 0 && (
								<p className="text-foreground/40 text-center py-12">No orders yet.</p>
							)}
						</div>
					)}
				</div>
			</div>
			<Footer />
		</>
	);
};

export default AdminOrdersPage;
