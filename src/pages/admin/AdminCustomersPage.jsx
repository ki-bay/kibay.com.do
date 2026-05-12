import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import {
	Loader2,
	RefreshCw,
	AlertTriangle,
	Search,
	Users as UsersIcon,
	ChevronLeft,
	ChevronRight,
	ArrowLeft,
	Mail,
	Receipt,
} from 'lucide-react';

const PAGE_SIZE = 25;
const PAID_PLUS_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

const ROLE_STYLES = {
	admin: 'bg-mango-500/15 text-mango-300 border-mango-500/40',
	customer: 'bg-stone-700/40 text-stone-300 border-stone-600',
};

const formatDate = (iso) => {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	} catch {
		return '—';
	}
};

const formatMoney = (cents, currency) => {
	if (cents == null) return '—';
	const value = (Number(cents) || 0) / 100;
	const symbol = currency === 'USD' ? '$' : 'RD$';
	return `${symbol}${value.toFixed(2)}`;
};

const AdminCustomersPage = () => {
	const { t } = useTranslation('adminCustomers');
	const [users, setUsers] = useState([]);
	const [aggregates, setAggregates] = useState({}); // { user_id: { count, totalsByCurrency, lastOrderAt } }
	const [totalCount, setTotalCount] = useState(0);
	const [page, setPage] = useState(0);
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [kpis, setKpis] = useState({
		totalCustomers: 0,
		payingCustomers: 0,
		lifetimeRevenueCents: 0,
	});
	const [kpisLoading, setKpisLoading] = useState(true);

	const debounceRef = useRef(null);

	// Debounce search input.
	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setDebouncedSearch(search.trim());
			setPage(0);
		}, 300);
		return () => debounceRef.current && clearTimeout(debounceRef.current);
	}, [search]);

	// Load top KPIs (independent of pagination/search).
	const loadKpis = useCallback(async () => {
		setKpisLoading(true);
		try {
			const [{ count: totalCustomers, error: e1 }, ordersRes] = await Promise.all([
				supabase.from('users').select('id', { count: 'exact', head: true }),
				supabase
					.from('orders')
					.select('user_id, total_amount, status')
					.in('status', PAID_PLUS_STATUSES),
			]);
			if (e1) throw e1;
			if (ordersRes.error) throw ordersRes.error;

			const orders = ordersRes.data || [];
			const payingSet = new Set();
			let revenue = 0;
			for (const o of orders) {
				if (o.user_id) payingSet.add(o.user_id);
				revenue += Number(o.total_amount) || 0;
			}
			setKpis({
				totalCustomers: totalCustomers || 0,
				payingCustomers: payingSet.size,
				lifetimeRevenueCents: revenue,
			});
		} catch (err) {
			// Non-fatal; KPI block will fall back to dashes.
			console.error('Failed to load KPIs', err);
		} finally {
			setKpisLoading(false);
		}
	}, []);

	// Load page of users + aggregates for visible rows.
	const loadPage = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const from = page * PAGE_SIZE;
			const to = from + PAGE_SIZE - 1;

			let query = supabase
				.from('users')
				.select('id, email, full_name, role, created_at', { count: 'exact' })
				.order('created_at', { ascending: false })
				.range(from, to);

			if (debouncedSearch) {
				const safe = debouncedSearch.replace(/[%,]/g, ' ');
				query = query.or(`email.ilike.%${safe}%,full_name.ilike.%${safe}%`);
			}

			const { data, error: e, count } = await query;
			if (e) throw e;

			const rows = data || [];
			setUsers(rows);
			setTotalCount(count || 0);

			// Aggregate orders for these users (client-side).
			const ids = rows.map((u) => u.id).filter(Boolean);
			if (ids.length === 0) {
				setAggregates({});
			} else {
				const { data: orderRows, error: oErr } = await supabase
					.from('orders')
					.select('user_id, total_amount, status, currency, created_at')
					.in('user_id', ids);
				if (oErr) throw oErr;

				const agg = {};
				for (const id of ids) {
					agg[id] = {
						count: 0,
						totalsByCurrency: {},
						lastOrderAt: null,
						mostRecentCurrency: null,
						mostRecentAt: null,
					};
				}
				for (const o of orderRows || []) {
					const a = agg[o.user_id];
					if (!a) continue;
					a.count += 1;
					if (!a.lastOrderAt || new Date(o.created_at) > new Date(a.lastOrderAt)) {
						a.lastOrderAt = o.created_at;
					}
					if (PAID_PLUS_STATUSES.includes(o.status)) {
						const c = o.currency || 'DOP';
						a.totalsByCurrency[c] = (a.totalsByCurrency[c] || 0) + (Number(o.total_amount) || 0);
						if (!a.mostRecentAt || new Date(o.created_at) > new Date(a.mostRecentAt)) {
							a.mostRecentAt = o.created_at;
							a.mostRecentCurrency = c;
						}
					}
				}
				setAggregates(agg);
			}
		} catch (err) {
			setError(err.message || t('toast.loadFailed'));
			setUsers([]);
			setAggregates({});
			setTotalCount(0);
		} finally {
			setLoading(false);
		}
	}, [page, debouncedSearch, t]);

	useEffect(() => {
		loadKpis();
	}, [loadKpis]);

	useEffect(() => {
		loadPage();
	}, [loadPage]);

	const totalPages = useMemo(
		() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)),
		[totalCount],
	);

	const renderTotalSpent = (a) => {
		if (!a || Object.keys(a.totalsByCurrency).length === 0) return '—';
		const currencies = Object.keys(a.totalsByCurrency);
		// If single currency, show that; if mixed, show DOP total per spec.
		if (currencies.length === 1) {
			const c = currencies[0];
			return formatMoney(a.totalsByCurrency[c], c);
		}
		const dop = a.totalsByCurrency.DOP || 0;
		return t('table.mixedCurrencies', { value: formatMoney(dop, 'DOP') });
	};

	const handleRefresh = () => {
		loadKpis();
		loadPage();
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
							<Link
								to="/dashboard/blog"
								className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-foreground/60 hover:text-foreground mb-3"
							>
								<ArrowLeft className="w-3 h-3" /> {t('backToDashboard')}
							</Link>
							<h1 className="text-3xl sm:text-4xl font-light text-foreground flex items-center gap-3">
								<UsersIcon className="w-8 h-8 text-mango-500" /> {t('header.title')}
							</h1>
							<p className="text-foreground/60 mt-2 font-light">
								{t('header.subtitlePrefix')} <code className="text-xs">public.users</code> {t('header.subtitleSuffix')}
							</p>
						</div>
						<div className="flex gap-3">
							<Button
								onClick={handleRefresh}
								variant="ghost"
								className="border border-foreground/10 text-foreground"
							>
								<RefreshCw className="w-4 h-4 mr-2" /> {t('header.refresh')}
							</Button>
						</div>
					</div>

					{/* KPIs */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
						<div className="rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm p-5">
							<div className="text-xs uppercase tracking-widest text-foreground/50">{t('kpis.totalCustomers')}</div>
							<div className="mt-2 text-3xl font-light text-foreground">
								{kpisLoading ? <Loader2 className="w-5 h-5 animate-spin text-foreground/40" /> : kpis.totalCustomers}
							</div>
						</div>
						<div className="rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm p-5">
							<div className="text-xs uppercase tracking-widest text-foreground/50">{t('kpis.payingCustomers')}</div>
							<div className="mt-2 text-3xl font-light text-foreground">
								{kpisLoading ? <Loader2 className="w-5 h-5 animate-spin text-foreground/40" /> : kpis.payingCustomers}
							</div>
						</div>
						<div className="rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm p-5">
							<div className="text-xs uppercase tracking-widest text-foreground/50">{t('kpis.lifetimeRevenue')}</div>
							<div className="mt-2 text-3xl font-light text-foreground">
								{kpisLoading ? (
									<Loader2 className="w-5 h-5 animate-spin text-foreground/40" />
								) : (
									formatMoney(kpis.lifetimeRevenueCents, 'DOP')
								)}
							</div>
						</div>
					</div>

					{/* Search */}
					<div className="mb-6">
						<div className="relative max-w-md">
							<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder={t('search.placeholder')}
								className="w-full pl-9 pr-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
							/>
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
					) : users.length === 0 ? (
						<div className="text-center py-20 border border-dashed border-foreground/10 rounded-2xl">
							<UsersIcon className="w-10 h-10 mx-auto text-foreground/30 mb-3" />
							<p className="text-foreground/60">
								{debouncedSearch
									? t('empty.noMatch', { search: debouncedSearch })
									: t('empty.noCustomers')}
							</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm">
								<table className="w-full text-sm text-left">
									<thead className="bg-card text-foreground/60 uppercase text-xs tracking-wider">
										<tr>
											<th className="px-4 py-3">{t('table.name')}</th>
											<th className="px-4 py-3">{t('table.email')}</th>
											<th className="px-4 py-3">{t('table.signedUp')}</th>
											<th className="px-4 py-3">{t('table.orders')}</th>
											<th className="px-4 py-3">{t('table.totalSpent')}</th>
											<th className="px-4 py-3">{t('table.lastOrder')}</th>
											<th className="px-4 py-3">{t('table.role')}</th>
											<th className="px-4 py-3 text-right">{t('table.actions')}</th>
										</tr>
									</thead>
									<tbody>
										{users.map((u) => {
											const a = aggregates[u.id];
											const displayName = u.full_name || u.email || '—';
											return (
												<tr
													key={u.id}
													className="border-t border-foreground/5 hover:bg-foreground/5 transition-colors"
												>
													<td className="px-4 py-3 text-foreground">{displayName}</td>
													<td className="px-4 py-3 text-foreground/80">
														{u.email ? (
															<a
																href={`mailto:${u.email}`}
																className="inline-flex items-center gap-1 hover:text-mango-400"
															>
																<Mail className="w-3 h-3" aria-hidden="true" />
																{u.email}
															</a>
														) : (
															<span className="text-foreground/40 italic">—</span>
														)}
													</td>
													<td className="px-4 py-3 text-foreground/70">{formatDate(u.created_at)}</td>
													<td className="px-4 py-3 text-foreground/80">{a ? a.count : 0}</td>
													<td className="px-4 py-3 text-foreground/80">{renderTotalSpent(a)}</td>
													<td className="px-4 py-3 text-foreground/70">
														{a && a.lastOrderAt ? formatDate(a.lastOrderAt) : <span className="text-foreground/40 italic">—</span>}
													</td>
													<td className="px-4 py-3">
														<span
															className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${
																ROLE_STYLES[u.role] || ROLE_STYLES.customer
															}`}
														>
															{t(`roles.${u.role || 'customer'}`, u.role || 'customer')}
														</span>
													</td>
													<td className="px-4 py-3">
														<div className="flex justify-end gap-2">
															{u.email && (
																<Link to={`/admin/orders?customer=${encodeURIComponent(u.email)}`}>
																	<Button
																		size="sm"
																		variant="ghost"
																		className="text-foreground/80 hover:text-foreground border border-foreground/10"
																	>
																		<Receipt className="w-3 h-3 mr-1" aria-hidden="true" /> {t('table.viewOrders')}
																	</Button>
																</Link>
															)}
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Pagination */}
							<div className="flex items-center justify-between mt-6">
								<div className="text-xs text-foreground/60">
									{t('pagination.summary', { page: page + 1, totalPages, count: totalCount })}
								</div>
								<div className="flex gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setPage((p) => Math.max(0, p - 1))}
										disabled={page === 0}
										className="border border-foreground/10 text-foreground"
									>
										<ChevronLeft className="w-4 h-4 mr-1" /> {t('pagination.prev')}
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
										disabled={page + 1 >= totalPages}
										className="border border-foreground/10 text-foreground"
									>
										{t('pagination.next')} <ChevronRight className="w-4 h-4 ml-1" />
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

export default AdminCustomersPage;
