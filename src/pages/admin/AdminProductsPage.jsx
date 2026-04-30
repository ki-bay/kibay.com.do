import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Plus, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STATUS_STYLES = {
	draft: 'bg-stone-700/40 text-stone-300 border-stone-600',
	published: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
	archived: 'bg-red-500/15 text-red-300 border-red-500/40',
};

const formatPrice = (cents, symbol) => {
	if (cents == null) return '—';
	return `${symbol}${(cents / 100).toFixed(2)}`;
};

const AdminProductsPage = () => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [deletingId, setDeletingId] = useState(null);
	const { toast } = useToast();

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const { data, error: e } = await supabase
				.from('products')
				.select(`
					id, slug, title_es, title_en, status, purchasable, sort_order, thumbnail_url, updated_at,
					product_variants ( id, price_usd_cents, price_dop_cents, inventory_quantity, manage_inventory )
				`)
				.order('sort_order', { ascending: true });
			if (e) throw e;
			setProducts(data || []);
		} catch (err) {
			setError(err.message || 'Failed to load products');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => { load(); }, [load]);

	const handleDelete = async (product) => {
		if (!window.confirm(`Delete "${product.title_es || product.slug}"? This cannot be undone.`)) return;
		setDeletingId(product.id);
		try {
			const { error: e } = await supabase.from('products').delete().eq('id', product.id);
			if (e) throw e;
			toast({ title: 'Product deleted', description: product.slug });
			setProducts((prev) => prev.filter((p) => p.id !== product.id));
		} catch (err) {
			toast({ variant: 'destructive', title: 'Delete failed', description: err.message });
		} finally {
			setDeletingId(null);
		}
	};

	const summarize = (variants = []) => {
		const sorted = variants.slice().sort((a, b) => (a.price_dop_cents ?? 0) - (b.price_dop_cents ?? 0));
		const lowest = sorted[0];
		const totalStock = variants
			.filter((v) => v.manage_inventory)
			.reduce((sum, v) => sum + (Number(v.inventory_quantity) || 0), 0);
		const tracksInventory = variants.some((v) => v.manage_inventory);
		return { lowest, totalStock, tracksInventory, count: variants.length };
	};

	return (
		<>
			<Helmet>
				<title>Products — Admin</title>
			</Helmet>
			<Navigation />
			<main className="min-h-screen bg-background pt-32 pb-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
						<div>
							<h1 className="text-3xl sm:text-4xl font-light text-foreground">Products</h1>
							<p className="text-foreground/60 mt-2 font-light">
								Manage the native catalog. Bilingual ES/EN copy, USD + DOP prices, real inventory.
							</p>
						</div>
						<div className="flex gap-3">
							<Button onClick={load} variant="ghost" className="border border-foreground/10 text-foreground">
								<RefreshCw className="w-4 h-4 mr-2" /> Refresh
							</Button>
							<Link to="/admin/products/new">
								<Button className="bg-mango-500 hover:bg-mango-600 text-foreground">
									<Plus className="w-4 h-4 mr-2" /> New Product
								</Button>
							</Link>
						</div>
					</div>

					{error && (
						<div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 flex items-start gap-2">
							<AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
							<span>{error}</span>
						</div>
					)}

					{loading ? (
						<div className="flex items-center justify-center py-20">
							<Loader2 className="w-8 h-8 text-mango-500 animate-spin" />
						</div>
					) : products.length === 0 ? (
						<div className="text-center py-20 border border-dashed border-foreground/10 rounded-2xl">
							<p className="text-foreground/60">No products yet.</p>
							<Link to="/admin/products/new">
								<Button className="mt-4 bg-mango-500 hover:bg-mango-600 text-foreground">
									<Plus className="w-4 h-4 mr-2" /> Create the first product
								</Button>
							</Link>
						</div>
					) : (
						<div className="overflow-hidden rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm">
							<table className="w-full text-sm text-left">
								<thead className="bg-card text-foreground/60 uppercase text-xs tracking-wider">
									<tr>
										<th className="px-4 py-3"> </th>
										<th className="px-4 py-3">Title (ES)</th>
										<th className="px-4 py-3">Slug</th>
										<th className="px-4 py-3">Status</th>
										<th className="px-4 py-3">Variants</th>
										<th className="px-4 py-3">Stock</th>
										<th className="px-4 py-3">Price (USD / DOP)</th>
										<th className="px-4 py-3 text-right">Actions</th>
									</tr>
								</thead>
								<tbody>
									{products.map((p) => {
										const s = summarize(p.product_variants);
										return (
											<tr key={p.id} className="border-t border-foreground/5 hover:bg-foreground/5 transition-colors">
												<td className="px-4 py-3">
													{p.thumbnail_url ? (
														<img src={p.thumbnail_url} alt="" className="w-12 h-12 rounded-md object-cover bg-background" />
													) : (
														<div className="w-12 h-12 rounded-md bg-background border border-foreground/5" />
													)}
												</td>
												<td className="px-4 py-3 text-foreground">
													<div className="font-normal">{p.title_es || <span className="text-foreground/40 italic">— missing —</span>}</div>
													<div className="text-foreground/40 text-xs">{p.title_en}</div>
												</td>
												<td className="px-4 py-3 text-foreground/70 font-mono text-xs">{p.slug}</td>
												<td className="px-4 py-3">
													<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${STATUS_STYLES[p.status] || STATUS_STYLES.draft}`}>
														{p.status}
													</span>
													{!p.purchasable && (
														<span className="ml-2 text-xs text-foreground/40">not purchasable</span>
													)}
												</td>
												<td className="px-4 py-3 text-foreground/80">{s.count}</td>
												<td className="px-4 py-3 text-foreground/80">
													{s.tracksInventory ? s.totalStock : <span className="text-foreground/40 italic">untracked</span>}
												</td>
												<td className="px-4 py-3 text-foreground/80">
													{formatPrice(s.lowest?.price_usd_cents, '$')} / {formatPrice(s.lowest?.price_dop_cents, 'RD$')}
												</td>
												<td className="px-4 py-3">
													<div className="flex justify-end gap-2">
														<Link to={`/admin/products/${p.id}/edit`}>
															<Button size="sm" variant="ghost" className="text-foreground/80 hover:text-foreground">
																<Edit className="w-4 h-4" />
															</Button>
														</Link>
														<Button
															size="sm"
															variant="ghost"
															className="text-red-400/80 hover:text-red-300"
															onClick={() => handleDelete(p)}
															disabled={deletingId === p.id}
														>
															{deletingId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
														</Button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
};

export default AdminProductsPage;
