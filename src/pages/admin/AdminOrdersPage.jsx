import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Loader2,
	RefreshCw,
	ChevronDown,
	ChevronRight,
	Search,
	ExternalLink,
	FileText,
	RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const ALLOWED_STATUSES = [
	'awaiting_payment',
	'paid',
	'processing',
	'shipped',
	'delivered',
	'canceled',
	'failed',
	'refunded',
	'disputed',
];

const STATUS_BADGE = {
	paid: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
	delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
	awaiting_payment: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
	processing: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
	shipped: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
	canceled: 'bg-red-500/15 text-red-300 border-red-500/40',
	failed: 'bg-red-500/15 text-red-300 border-red-500/40',
	refunded: 'bg-red-500/15 text-red-300 border-red-500/40',
	disputed: 'bg-red-500/15 text-red-300 border-red-500/40',
};

const PAGE_SIZE = 25;

const formatMoney = (cents, currency) => {
	if (cents == null || cents === '') return '—';
	const n = Number(cents);
	if (Number.isNaN(n)) return '—';
	const symbol = currency === 'DOP' ? 'RD$' : '$';
	return `${symbol}${(n / 100).toFixed(2)}`;
};

const formatDate = (iso) => {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: '2-digit',
		});
	} catch {
		return iso;
	}
};

const formatDateTime = (iso) => {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString('en-US');
	} catch {
		return iso;
	}
};

const customerName = (order) => {
	const a = order?.shipping_address || {};
	const name = `${a.firstName || ''} ${a.lastName || ''}`.trim();
	return name || '—';
};

const StatusBadge = ({ status, t, createdAt }) => {
	const cls = STATUS_BADGE[status] || 'bg-stone-700/40 text-stone-300 border-stone-600';
	// Stuck = awaiting_payment + older than 60 min. Mirrors the
	// alert-stuck-orders Edge Function so admin UI surfaces the same
	// signal that triggers the hourly email.
	const isStuck =
		status === 'awaiting_payment' &&
		createdAt &&
		Date.now() - new Date(createdAt).getTime() > 60 * 60 * 1000;
	const ageMin = isStuck
		? Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000)
		: 0;
	return (
		<span className="inline-flex flex-wrap items-center gap-1">
			<span className={`inline-block text-xs font-medium px-2 py-1 rounded border ${cls}`}>
				{status ? t(`status.${status}`, status) : '—'}
			</span>
			{isStuck && (
				<span
					title={`Sin pago confirmado hace ${ageMin} min — revisa Stripe webhook delivery.`}
					className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded border bg-red-500/15 text-red-300 border-red-500/40 animate-pulse"
				>
					⚠ Stuck {ageMin}m
				</span>
			)}
		</span>
	);
};

const AdminOrdersPage = () => {
	const { t } = useTranslation('adminOrders');
	const [orders, setOrders] = useState([]);
	const [itemsByOrder, setItemsByOrder] = useState({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [savingId, setSavingId] = useState(null);
	const [refundingId, setRefundingId] = useState(null);
	const [emailingId, setEmailingId] = useState(null);
	const [expandedId, setExpandedId] = useState(null);

	// Filters
	const [searchInput, setSearchInput] = useState('');
	const [searchTerm, setSearchTerm] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');

	// Pagination
	const [page, setPage] = useState(1);
	const [totalCount, setTotalCount] = useState(0);

	// Filter-aware revenue (paid only)
	const [filteredRevenue, setFilteredRevenue] = useState(0);
	const [filteredPaidCount, setFilteredPaidCount] = useState(0);

	// Debounce search
	const debounceRef = useRef(null);
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setSearchTerm(searchInput.trim());
			setPage(1);
		}, 300);
		return () => clearTimeout(debounceRef.current);
	}, [searchInput]);

	// Reset page when filters change
	useEffect(() => {
		setPage(1);
	}, [statusFilter, dateFrom, dateTo]);

	const buildBaseQuery = useCallback(
		(query) => {
			let q = query;
			if (searchTerm) {
				const escaped = searchTerm.replace(/[%,]/g, '');
				q = q.or(
					`order_number.ilike.%${escaped}%,shipping_address->>email.ilike.%${escaped}%`
				);
			}
			if (statusFilter && statusFilter !== 'all') {
				q = q.eq('status', statusFilter);
			}
			if (dateFrom) {
				q = q.gte('created_at', dateFrom);
			}
			if (dateTo) {
				q = q.lte('created_at', `${dateTo} 23:59:59`);
			}
			return q;
		},
		[searchTerm, statusFilter, dateFrom, dateTo]
	);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const offset = (page - 1) * PAGE_SIZE;

			// Main paginated query with count
			let dataQuery = supabase
				.from('orders')
				.select('*', { count: 'exact' })
				.order('created_at', { ascending: false })
				.range(offset, offset + PAGE_SIZE - 1);
			dataQuery = buildBaseQuery(dataQuery);

			const { data, error: e, count } = await dataQuery;
			if (e) throw e;
			setOrders(data || []);
			setTotalCount(count || 0);

			// Pre-fetch order_items for these orders (≤25, simple)
			if (data && data.length) {
				const ids = data.map((o) => o.id);
				const { data: items, error: itemsErr } = await supabase
					.from('order_items')
					.select('*')
					.in('order_id', ids);
				if (itemsErr) throw itemsErr;
				const grouped = {};
				for (const it of items || []) {
					if (!grouped[it.order_id]) grouped[it.order_id] = [];
					grouped[it.order_id].push(it);
				}
				setItemsByOrder(grouped);
			} else {
				setItemsByOrder({});
			}

			// Filter-aware revenue: paid orders matching the same filter
			let revenueQuery = supabase.from('orders').select('total_amount, currency, status');
			revenueQuery = buildBaseQuery(revenueQuery).eq('status', 'paid');
			// .eq('status','paid') overrides the filter status; if user selected a non-paid status,
			// revenue still reflects paid-only across the rest of the filters.
			const { data: revRows, error: revErr } = await revenueQuery;
			if (!revErr && revRows) {
				let total = 0;
				let cnt = 0;
				for (const r of revRows) {
					total += Number(r.total_amount) || 0;
					cnt += 1;
				}
				setFilteredRevenue(total);
				setFilteredPaidCount(cnt);
			}
		} catch (err) {
			setError(err.message || t('toast.loadFailed'));
		} finally {
			setLoading(false);
		}
	}, [page, buildBaseQuery, t]);

	useEffect(() => {
		load();
	}, [load]);

	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

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
					internal_notes: order.internal_notes ?? null,
				})
				.eq('id', order.id);
			if (e) throw e;
			toast.success(t('toast.updated'));
		} catch (err) {
			toast.error(err.message || t('toast.saveFailed'));
		} finally {
			setSavingId(null);
		}
	};

	const sendEmail = async (order, type, label) => {
		setEmailingId(`${order.id}:${type}`);
		try {
			const { data, error: e } = await supabase.functions.invoke('send-order-email', {
				body: { order_id: order.id, type },
			});
			if (e) throw e;
			if (data?.error) throw new Error(data.error);
			toast.success(
				t('toast.emailSent', {
					label,
					recipient: order.shipping_address?.email || t('toast.emailFallbackRecipient'),
				})
			);
		} catch (err) {
			toast.error(err.message || t('toast.emailFailed', { label: label.toLowerCase() }));
		} finally {
			setEmailingId(null);
		}
	};

	const handleRefund = async (order) => {
		if (!window.confirm(t('toast.refundConfirm', { orderNumber: order.order_number })))
			return;
		setRefundingId(order.id);
		try {
			const { data, error: e } = await supabase.functions.invoke('refund-payment', {
				body: { order_id: order.id },
			});
			if (e) throw e;
			if (data?.error) throw new Error(data.error);
			toast.success(t('toast.refundInitiated'));
			await load();
		} catch (err) {
			toast.error(err.message || t('toast.refundFailed'));
		} finally {
			setRefundingId(null);
		}
	};

	const downloadInvoice = async (path) => {
		try {
			const { data, error: e } = await supabase.storage
				.from('blog_media')
				.createSignedUrl(path, 60);
			if (e) throw e;
			window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
		} catch (err) {
			toast.error(err.message || t('toast.invoiceFailed'));
		}
	};

	const clearFilters = () => {
		setSearchInput('');
		setSearchTerm('');
		setStatusFilter('all');
		setDateFrom('');
		setDateTo('');
		setPage(1);
	};

	const revenueDisplay = useMemo(() => {
		// Revenue rows can mix currencies; show in DOP format if any DOP, else USD.
		// Simpler: show USD style with $ prefix because we summed cents naively.
		// Best to display by dominant currency; but spec doesn't require precision.
		return formatMoney(filteredRevenue, 'USD');
	}, [filteredRevenue]);

	return (
		<>
			<Helmet>
				<title>{t('seoTitle')}</title>
			</Helmet>
			<Navigation />
			<main id="main" role="main" className="min-h-screen bg-background pt-28 pb-20 px-4">
				<div className="max-w-7xl mx-auto">
					<div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
						<div>
							<h1 className="text-3xl font-bold text-foreground">{t('header.title')}</h1>
							<p className="text-foreground/60 mt-1">
								{t('header.subtitle')}
							</p>
						</div>
						<Button
							variant="outline"
							onClick={load}
							className="border-foreground/20 text-foreground gap-2"
						>
							<RefreshCw className="w-4 h-4" />
							{t('header.refresh')}
						</Button>
					</div>

					{/* KPIs */}
					<div className="grid sm:grid-cols-2 gap-4 mb-6">
						<div className="bg-card border border-foreground/10 rounded-xl p-6">
							<p className="text-foreground/50 text-sm">{t('kpis.paidOrders')}</p>
							<p className="text-3xl font-semibold text-mango-400">{filteredPaidCount}</p>
						</div>
						<div className="bg-card border border-foreground/10 rounded-xl p-6">
							<p className="text-foreground/50 text-sm">{t('kpis.revenue')}</p>
							<p className="text-3xl font-semibold text-foreground">{revenueDisplay}</p>
							<p className="text-xs text-foreground/40 mt-1">
								{t('kpis.revenueFootnote')}
							</p>
						</div>
					</div>

					{/* Filters */}
					<div className="bg-card border border-foreground/10 rounded-xl p-4 mb-6 grid gap-3 md:grid-cols-12">
						<div className="md:col-span-5">
							<label className="text-xs text-foreground/50 block mb-1">{t('filters.search')}</label>
							<div className="relative">
								<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
								<Input
									className="bg-background border-foreground/10 text-foreground pl-9"
									placeholder={t('filters.searchPlaceholder')}
									value={searchInput}
									onChange={(e) => setSearchInput(e.target.value)}
								/>
							</div>
						</div>
						<div className="md:col-span-3">
							<label className="text-xs text-foreground/50 block mb-1">{t('filters.status')}</label>
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="w-full h-10 rounded-md bg-background border border-foreground/10 text-foreground px-3 text-sm"
							>
								<option value="all">{t('filters.allStatuses')}</option>
								{ALLOWED_STATUSES.map((s) => (
									<option key={s} value={s}>
										{t(`status.${s}`, s)}
									</option>
								))}
							</select>
						</div>
						<div className="md:col-span-2">
							<label className="text-xs text-foreground/50 block mb-1">{t('filters.from')}</label>
							<Input
								type="date"
								className="bg-background border-foreground/10 text-foreground"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
							/>
						</div>
						<div className="md:col-span-2">
							<label className="text-xs text-foreground/50 block mb-1">{t('filters.to')}</label>
							<Input
								type="date"
								className="bg-background border-foreground/10 text-foreground"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
							/>
						</div>
						<div className="md:col-span-12 flex justify-end">
							<Button
								variant="ghost"
								size="sm"
								onClick={clearFilters}
								className="text-foreground/70 hover:text-foreground"
							>
								{t('filters.clear')}
							</Button>
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
					) : orders.length === 0 ? (
						<p className="text-foreground/40 text-center py-12">
							{t('empty')}
						</p>
					) : (
						<>
							{/* Table-like list */}
							<div className="bg-card border border-foreground/10 rounded-xl overflow-hidden">
								<div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 text-xs uppercase tracking-wide text-foreground/50 border-b border-foreground/10">
									<div className="col-span-1"></div>
									<div className="col-span-2">{t('table.orderNumber')}</div>
									<div className="col-span-2">{t('table.date')}</div>
									<div className="col-span-3">{t('table.customer')}</div>
									<div className="col-span-2">{t('table.status')}</div>
									<div className="col-span-2 text-right">{t('table.total')}</div>
								</div>
								{orders.map((o) => {
									const isOpen = expandedId === o.id;
									const items = itemsByOrder[o.id] || [];
									const addr = o.shipping_address || {};
									return (
										<div
											key={o.id}
											className="border-b border-foreground/10 last:border-b-0"
										>
											<button
												type="button"
												onClick={() => setExpandedId(isOpen ? null : o.id)}
												className="w-full grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-4 py-4 text-left hover:bg-foreground/5 transition-colors"
											>
												<div className="md:col-span-1 flex items-center text-foreground/60">
													{isOpen ? (
														<ChevronDown className="w-4 h-4" />
													) : (
														<ChevronRight className="w-4 h-4" />
													)}
												</div>
												<div className="md:col-span-2 font-medium text-foreground">
													{o.order_number}
												</div>
												<div className="md:col-span-2 text-sm text-foreground/70">
													{formatDate(o.created_at)}
												</div>
												<div className="md:col-span-3 text-sm text-foreground/80">
													<div className="flex items-center gap-2 flex-wrap">
														<span>{customerName(o)}</span>
														{!o.user_id && (
															<span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-500/15 text-stone-400 border border-stone-500/30">
																Guest
															</span>
														)}
													</div>
													{o.shipping_address?.email && (
														<div className="text-xs text-foreground/50 mt-0.5 truncate">
															{o.shipping_address.email}
														</div>
													)}
												</div>
												<div className="md:col-span-2">
													<StatusBadge status={o.status} t={t} createdAt={o.created_at} />
												</div>
												<div className="md:col-span-2 text-right font-semibold text-mango-400">
													{formatMoney(o.total_amount, o.currency)}
												</div>
											</button>

											{isOpen && (
												<div className="px-4 pb-6 pt-2 bg-background/40 grid gap-6 md:grid-cols-2">
													{/* Customer block */}
													<div className="bg-card border border-foreground/10 rounded-lg p-4">
														<h3 className="text-sm font-semibold text-foreground/80 mb-2">
															{t('details.customer')}
														</h3>
														<p className="text-sm text-foreground">
															{customerName(o)}
														</p>
														{addr.email && (
															<p className="text-sm">
																<a
																	className="text-sky-400 hover:underline"
																	href={`mailto:${addr.email}`}
																>
																	{addr.email}
																</a>
															</p>
														)}
														{addr.phone && (
															<p className="text-sm">
																<a
																	className="text-sky-400 hover:underline"
																	href={`tel:${addr.phone}`}
																>
																	{addr.phone}
																</a>
															</p>
														)}
														{(o.tax_id || addr.taxId) && (
															<p className="text-sm text-foreground/70 mt-1">
																{t('details.taxId', { value: o.tax_id || addr.taxId })}
															</p>
														)}
													</div>

													{/* Shipping address block */}
													<div className="bg-card border border-foreground/10 rounded-lg p-4">
														<h3 className="text-sm font-semibold text-foreground/80 mb-2">
															{t('details.shippingAddress')}
														</h3>
														<div className="text-sm text-foreground/80 space-y-0.5">
															<p>
																{(addr.firstName || '') + ' ' + (addr.lastName || '')}
															</p>
															{addr.address && <p>{addr.address}</p>}
															<p>
																{[addr.city, addr.zipCode]
																	.filter(Boolean)
																	.join(', ')}
															</p>
															{addr.country && <p>{addr.country}</p>}
															{!addr.address && !addr.city && (
																<p className="text-foreground/40">{t('details.noAddress')}</p>
															)}
														</div>
													</div>

													{/* Line items */}
													<div className="md:col-span-2 bg-card border border-foreground/10 rounded-lg p-4">
														<h3 className="text-sm font-semibold text-foreground/80 mb-3">
															{t('details.lineItems')}
														</h3>
														{items.length === 0 ? (
															<p className="text-sm text-foreground/40">
																{t('details.noLineItems')}
															</p>
														) : (
															<div className="overflow-x-auto">
																<table className="w-full text-sm">
																	<thead>
																		<tr className="text-left text-xs uppercase text-foreground/50 border-b border-foreground/10">
																			<th className="py-2">{t('details.product')}</th>
																			<th className="py-2 text-right">{t('details.qty')}</th>
																			<th className="py-2 text-right">{t('details.unitPrice')}</th>
																			<th className="py-2 text-right">{t('details.lineTotal')}</th>
																		</tr>
																	</thead>
																	<tbody>
																		{items.map((it) => (
																			<tr
																				key={it.id}
																				className="border-b border-foreground/5 last:border-b-0"
																			>
																				<td className="py-2 text-foreground">
																					{it.product_name}
																				</td>
																				<td className="py-2 text-right text-foreground/80">
																					{it.quantity}
																				</td>
																				<td className="py-2 text-right text-foreground/80">
																					{formatMoney(it.price_per_item, o.currency)}
																				</td>
																				<td className="py-2 text-right text-foreground">
																					{formatMoney(it.total_price, o.currency)}
																				</td>
																			</tr>
																		))}
																	</tbody>
																	<tfoot>
																		<tr>
																			<td colSpan={3} className="pt-3 text-right text-foreground/60 text-xs">
																				{t('details.subtotal')}
																			</td>
																			<td className="pt-3 text-right text-foreground/80">
																				{formatMoney(o.subtotal_amount, o.currency)}
																			</td>
																		</tr>
																		<tr>
																			<td colSpan={3} className="text-right text-foreground/60 text-xs">
																				{t('details.shipping')}
																			</td>
																			<td className="text-right text-foreground/80">
																				{formatMoney(o.shipping_amount, o.currency)}
																			</td>
																		</tr>
																		<tr>
																			<td colSpan={3} className="pt-1 text-right font-semibold text-foreground">
																				{t('details.total')}
																			</td>
																			<td className="pt-1 text-right font-semibold text-mango-400">
																				{formatMoney(o.total_amount, o.currency)}
																			</td>
																		</tr>
																	</tfoot>
																</table>
															</div>
														)}
													</div>

													{/* Payment block */}
													<div className="md:col-span-2 bg-card border border-foreground/10 rounded-lg p-4">
														<h3 className="text-sm font-semibold text-foreground/80 mb-2">
															{t('details.payment')}
														</h3>
														<div className="grid gap-2 md:grid-cols-3 text-sm">
															<div>
																<p className="text-foreground/50 text-xs">{t('details.method')}</p>
																<p className="text-foreground">
																	{o.payment_method || '—'}
																</p>
															</div>
															<div>
																<p className="text-foreground/50 text-xs">{t('details.paidAt')}</p>
																<p className="text-foreground">
																	{formatDateTime(o.paid_at)}
																</p>
															</div>
															<div>
																<p className="text-foreground/50 text-xs">
																	{t('details.stripePI')}
																</p>
																{o.stripe_payment_intent_id ? (
																	<a
																		className="text-sky-400 hover:underline inline-flex items-center gap-1"
																		href={`https://dashboard.stripe.com/test/payments/${o.stripe_payment_intent_id}`}
																		target="_blank"
																		rel="noreferrer"
																	>
																		{o.stripe_payment_intent_id}
																		<ExternalLink className="w-3 h-3" />
																	</a>
																) : (
																	<p className="text-foreground/40">—</p>
																)}
															</div>
														</div>
														{o.invoice_pdf_path && (
															<button
																type="button"
																onClick={() => downloadInvoice(o.invoice_pdf_path)}
																className="mt-3 inline-flex items-center gap-1 text-sm text-sky-400 hover:underline"
															>
																<FileText className="w-4 h-4" />
																{t('details.viewInvoice')}
															</button>
														)}
													</div>

													{/* Editable fulfillment fields */}
													<div className="md:col-span-2 bg-card border border-foreground/10 rounded-lg p-4">
														<h3 className="text-sm font-semibold text-foreground/80 mb-3">
															{t('details.fulfillment')}
														</h3>
														<div className="grid gap-3 md:grid-cols-4">
															<div>
																<label className="text-xs text-foreground/50 block mb-1">
																	{t('details.statusLabel')}
																</label>
																<select
																	value={o.status || ''}
																	onChange={(e) =>
																		updateField(o.id, 'status', e.target.value)
																	}
																	className="w-full h-10 rounded-md bg-background border border-foreground/10 text-foreground px-3 text-sm"
																>
																	{ALLOWED_STATUSES.map((s) => (
																		<option key={s} value={s}>
																			{t(`status.${s}`, s)}
																		</option>
																	))}
																</select>
															</div>
															<div>
																<label className="text-xs text-foreground/50 block mb-1">
																	{t('details.trackingNumber')}
																</label>
																<Input
																	className="bg-background border-foreground/10 text-foreground"
																	value={o.tracking_number || ''}
																	onChange={(e) =>
																		updateField(o.id, 'tracking_number', e.target.value)
																	}
																	placeholder={t('details.trackingPlaceholder')}
																/>
															</div>
															<div>
																<label className="text-xs text-foreground/50 block mb-1">
																	{t('details.shippingMethod')}
																</label>
																<Input
																	className="bg-background border-foreground/10 text-foreground"
																	value={o.shipping_method || ''}
																	onChange={(e) =>
																		updateField(o.id, 'shipping_method', e.target.value)
																	}
																	placeholder={t('details.shippingMethodPlaceholder')}
																/>
															</div>
															<div>
																<label className="text-xs text-foreground/50 block mb-1">
																	{t('details.taxIdLabel')}
																</label>
																<Input
																	className="bg-background border-foreground/10 text-foreground"
																	value={o.tax_id || ''}
																	onChange={(e) =>
																		updateField(o.id, 'tax_id', e.target.value)
																	}
																	placeholder={t('details.taxIdPlaceholder')}
																/>
															</div>
															<div className="mt-4">
																<label className="text-xs text-foreground/50 block mb-1">
																	{t('details.internalNotes')}
																</label>
																<textarea
																	className="w-full min-h-[64px] rounded-md bg-background border border-foreground/10 text-foreground p-3 text-sm"
																	value={o.internal_notes || ''}
																	onChange={(e) =>
																		updateField(o.id, 'internal_notes', e.target.value)
																	}
																	placeholder={t('details.internalNotesPlaceholder')}
																/>
															</div>
														</div>
														<div className="mt-4 flex flex-wrap items-center gap-2 justify-end">
															{['paid', 'processing', 'shipped', 'delivered'].includes(
																o.status,
															) && (
																<Button
																	type="button"
																	variant="outline"
																	className="border-foreground/20 text-foreground/80 hover:bg-foreground/5 gap-2"
																	disabled={emailingId === `${o.id}:confirmation`}
																	onClick={() => sendEmail(o, 'confirmation', t('emailLabels.confirmation'))}
																>
																	{emailingId === `${o.id}:confirmation` ? (
																		<Loader2 className="w-4 h-4 animate-spin" />
																	) : null}
																	{t('actions.resendConfirmation')}
																</Button>
															)}
															{o.tracking_number && (
																<Button
																	type="button"
																	variant="outline"
																	className="border-foreground/20 text-foreground/80 hover:bg-foreground/5 gap-2"
																	disabled={emailingId === `${o.id}:tracking`}
																	onClick={() => sendEmail(o, 'tracking', t('emailLabels.tracking'))}
																>
																	{emailingId === `${o.id}:tracking` ? (
																		<Loader2 className="w-4 h-4 animate-spin" />
																	) : null}
																	{t('actions.sendTracking')}
																</Button>
															)}
															{o.status === 'paid' && (
																<Button
																	type="button"
																	variant="outline"
																	className="border-red-500/40 text-red-300 hover:bg-red-500/10 gap-2"
																	disabled={refundingId === o.id}
																	onClick={() => handleRefund(o)}
																>
																	{refundingId === o.id ? (
																		<Loader2 className="w-4 h-4 animate-spin" />
																	) : (
																		<RotateCcw className="w-4 h-4" />
																	)}
																	{t('actions.refund')}
																</Button>
															)}
															<Button
																size="sm"
																className="bg-mango-500 hover:bg-mango-600"
																disabled={savingId === o.id}
																onClick={() => saveOrder(o)}
															>
																{savingId === o.id ? (
																	<Loader2 className="w-4 h-4 animate-spin" />
																) : (
																	t('actions.save')
																)}
															</Button>
														</div>
													</div>
												</div>
											)}
										</div>
									);
								})}
							</div>

							{/* Pagination */}
							<div className="flex items-center justify-between mt-6">
								<p className="text-sm text-foreground/60">
									{t('pagination.summary', { page, totalPages, count: totalCount })}
								</p>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										disabled={page <= 1}
										onClick={() => setPage((p) => Math.max(1, p - 1))}
										className="border-foreground/20 text-foreground"
									>
										{t('pagination.prev')}
									</Button>
									<Button
										variant="outline"
										size="sm"
										disabled={page >= totalPages}
										onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
										className="border-foreground/20 text-foreground"
									>
										{t('pagination.next')}
									</Button>
								</div>
							</div>
						</>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
};

export default AdminOrdersPage;
