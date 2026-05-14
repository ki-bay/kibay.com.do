import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
	const { t } = useTranslation('adminProducts');
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [deletingId, setDeletingId] = useState(null);
	const [lowStockAlertCount, setLowStockAlertCount] = useState(0);
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

			// Count unresolved low-stock alerts. Best-effort: if the table
			// doesn't exist yet (migration not applied) just skip silently.
			const { count, error: alertErr } = await supabase
				.from('inventory_alerts')
				.select('*', { count: 'exact', head: true })
				.is('resolved_at', null);
			if (!alertErr) setLowStockAlertCount(count || 0);
		} catch (err) {
			setError(err.message || t('toast.loadFailed'));
		} finally {
			setLoading(false);
		}
	}, [t]);

	useEffect(() => { load(); }, [load]);

	const handleDelete = async (product) => {
		if (!window.confirm(t('toast.deleteConfirm', { name: product.title_es || product.slug }))) return;
		setDeletingId(product.id);
		try {
			const { error: e } = await supabase.from('products').delete().eq('id', product.id);
			if (e) throw e;
			toast({ title: t('toast.deleted'), description: product.slug });
			setProducts((prev) => prev.filter((p) => p.id !== product.id));
		} catch (err) {
			toast({ variant: 'destructive', title: t('toast.deleteFailed'), description: err.message });
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
				<title>{t('seoTitle')}</title>
			</Helmet>
			<Navigation />
			<main id="main" role="main" className="min-h-screen bg-background pt-32 pb-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
						<div>
							<h1 className="text-3xl sm:text-4xl font-light text-foreground">{t('header.title')}</h1>
							<p className="text-foreground/60 mt-2 font-light">
								{t('header.subtitle')}
							</p>
							{lowStockAlertCount > 0 && (
								<div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 text-sm">
									<AlertTriangle className="w-4 h-4" aria-hidden="true" />
									<span>
										{lowStockAlertCount === 1
											? '1 low-stock alert · variant inventory ≤ 5'
											: `${lowStockAlertCount} low-stock alerts · variants with inventory ≤ 5`}
									</span>
								</div>
							)}
						</div>
						<div className="flex gap-3">
							<Button onClick={load} variant="ghost" className="border border-foreground/10 text-foreground">
								<RefreshCw className="w-4 h-4 mr-2" /> {t('header.refresh')}
							</Button>
							<Link to="/admin/products/new">
								<Button className="bg-mango-500 hover:bg-mango-600 text-foreground">
									<Plus className="w-4 h-4 mr-2" /> {t('header.newProduct')}
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
							<p className="text-foreground/60">{t('empty.noProducts')}</p>
							<Link to="/admin/products/new">
								<Button className="mt-4 bg-mango-500 hover:bg-mango-600 text-foreground">
									<Plus className="w-4 h-4 mr-2" /> {t('empty.createFirst')}
								</Button>
							</Link>
						</div>
					) : (
						<div className="overflow-hidden rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm">
							<table className="w-full text-sm text-left">
								<thead className="bg-card text-foreground/60 uppercase text-xs tracking-wider">
									<tr>
										<th className="px-4 py-3"> </th>
										<th className="px-4 py-3">{t('table.titleEs')}</th>
										<th className="px-4 py-3">{t('table.slug')}</th>
										<th className="px-4 py-3">{t('table.status')}</th>
										<th className="px-4 py-3">{t('table.variants')}</th>
										<th className="px-4 py-3">{t('table.stock')}</th>
										<th className="px-4 py-3">{t('table.price')}</th>
										<th className="px-4 py-3 text-right">{t('table.actions')}</th>
									</tr>
								</thead>
								<tbody>
									{products.map((p) => {
										const s = summarize(p.product_variants);
										return (
											<tr key={p.id} className="border-t border-foreground/5 hover:bg-foreground/5 transition-colors">
												<td className="px-4 py-3">
													{p.thumbnail_url ? (
														<img src={p.thumbnail_url} alt={t('table.thumbnailAlt')} width="48" height="48" loading="lazy" decoding="async" className="w-12 h-12 rounded-md object-cover bg-background" />
													) : (
														<div className="w-12 h-12 rounded-md bg-background border border-foreground/5" />
													)}
												</td>
												<td className="px-4 py-3 text-foreground">
													<div className="font-normal">{p.title_es || <span className="text-foreground/40 italic">{t('table.missing')}</span>}</div>
													<div className="text-foreground/40 text-xs">{p.title_en}</div>
												</td>
												<td className="px-4 py-3 text-foreground/70 font-mono text-xs">{p.slug}</td>
												<td className="px-4 py-3">
													<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${STATUS_STYLES[p.status] || STATUS_STYLES.draft}`}>
														{t(`status.${p.status}`, p.status)}
													</span>
													{!p.purchasable && (
														<span className="ml-2 text-xs text-foreground/40">{t('purchasable.notPurchasable')}</span>
													)}
												</td>
												<td className="px-4 py-3 text-foreground/80">{s.count}</td>
												<td className="px-4 py-3 text-foreground/80">
													{s.tracksInventory ? (
														<span
															className={
																s.totalStock === 0
																	? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-xs font-medium'
																	: s.totalStock < 10
																	? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-medium'
																	: ''
															}
														>
															{s.totalStock}
															{s.totalStock === 0 && ` · ${t('stock.soldOut')}`}
															{s.totalStock > 0 && s.totalStock < 10 && ` · ${t('stock.low')}`}
														</span>
													) : (
														<span className="text-foreground/40 italic">{t('stock.untracked')}</span>
													)}
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
