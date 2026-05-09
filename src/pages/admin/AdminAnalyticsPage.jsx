import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import {
	Loader2,
	RefreshCw,
	TrendingUp,
	TrendingDown,
	Minus,
	DollarSign,
	ShoppingBag,
	CheckCircle2,
	BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import {
	ResponsiveContainer,
	AreaChart,
	Area,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	BarChart,
	Bar,
	PieChart,
	Pie,
	Cell,
	Legend,
} from 'recharts';

// Statuses that count as revenue-generating ("paid+").
const PAID_PLUS = ['paid', 'processing', 'shipped', 'delivered'];

// Same status colors used on the orders page (paid/delivered green,
// awaiting/processing amber, shipped blue, canceled/failed/refunded/disputed red).
const STATUS_COLORS = {
	paid: '#10b981', // emerald-500
	delivered: '#059669', // emerald-600
	awaiting_payment: '#f59e0b', // amber-500
	processing: '#d97706', // amber-600
	shipped: '#0ea5e9', // sky-500
	canceled: '#ef4444', // red-500
	failed: '#dc2626', // red-600
	refunded: '#b91c1c', // red-700
	disputed: '#991b1b', // red-800
};

const PERIOD_OPTIONS = [
	{ key: '7d', label: '7d', days: 7 },
	{ key: '30d', label: '30d', days: 30 },
	{ key: '90d', label: '90d', days: 90 },
	{ key: 'all', label: 'All time', days: null },
];

// ---------- helpers ----------

const formatDOP = (cents) => {
	const n = Number(cents) || 0;
	return `RD$${(n / 100).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
};

const formatUSD = (cents) => {
	const n = Number(cents) || 0;
	return `$${(n / 100).toLocaleString('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	})}`;
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

const formatDateTime = (iso) => {
	if (!iso) return '—';
	try {
		return new Date(iso).toLocaleString();
	} catch {
		return '—';
	}
};

const startOfDay = (d) => {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
};

// Compute current and previous period [start, end] timestamps.
// "All time" returns null bounds for current period and no prev period.
const computePeriodBounds = (periodKey) => {
	const opt = PERIOD_OPTIONS.find((p) => p.key === periodKey) || PERIOD_OPTIONS[1];
	if (opt.days == null) {
		return {
			currentStart: null,
			currentEnd: null,
			prevStart: null,
			prevEnd: null,
			days: null,
		};
	}
	const now = new Date();
	const currentEnd = now;
	const currentStart = new Date(now.getTime() - opt.days * 24 * 60 * 60 * 1000);
	const prevEnd = currentStart;
	const prevStart = new Date(currentStart.getTime() - opt.days * 24 * 60 * 60 * 1000);
	return { currentStart, currentEnd, prevStart, prevEnd, days: opt.days };
};

const pctChange = (current, previous) => {
	if (previous == null || previous === 0) {
		if (current === 0) return { value: 0, dir: 'neutral' };
		return { value: null, dir: 'up' }; // can't compute %, but it's growth
	}
	const diff = ((current - previous) / previous) * 100;
	return {
		value: diff,
		dir: diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'neutral',
	};
};

const ChangePill = ({ change, prevLabel }) => {
	const Icon =
		change.dir === 'up' ? TrendingUp : change.dir === 'down' ? TrendingDown : Minus;
	const cls =
		change.dir === 'up'
			? 'text-emerald-400'
			: change.dir === 'down'
			? 'text-red-400'
			: 'text-foreground/50';
	const text =
		change.value == null
			? 'new'
			: `${change.value >= 0 ? '+' : ''}${change.value.toFixed(1)}%`;
	return (
		<span className={`inline-flex items-center gap-1 text-xs ${cls}`}>
			<Icon className="w-3.5 h-3.5" />
			{text}
			<span className="text-foreground/40">vs {prevLabel}</span>
		</span>
	);
};

// Decide bucket granularity based on period.
const bucketGranularity = (periodKey) => {
	if (periodKey === '7d' || periodKey === '30d') return 'day';
	if (periodKey === '90d') return 'week';
	return 'month'; // all time
};

const bucketKey = (date, granularity) => {
	const d = new Date(date);
	if (granularity === 'day') {
		return d.toISOString().slice(0, 10); // YYYY-MM-DD
	}
	if (granularity === 'week') {
		// ISO-ish week start (Monday). Good enough for charting.
		const tmp = startOfDay(d);
		const day = (tmp.getDay() + 6) % 7; // 0 = Mon
		tmp.setDate(tmp.getDate() - day);
		return tmp.toISOString().slice(0, 10);
	}
	// month
	const m = String(d.getMonth() + 1).padStart(2, '0');
	return `${d.getFullYear()}-${m}`;
};

const bucketLabel = (key, granularity) => {
	if (granularity === 'month') {
		const [y, m] = key.split('-');
		return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
		});
	}
	const d = new Date(key);
	if (granularity === 'week') {
		return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
	return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// Pretty-print status label.
const formatStatusLabel = (s) =>
	(s || '').replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

// ---------- component ----------

const AdminAnalyticsPage = () => {
	const [period, setPeriod] = useState('30d');
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState(null);

	// Raw data
	const [currentOrders, setCurrentOrders] = useState([]); // current period (any status)
	const [prevOrders, setPrevOrders] = useState([]); // previous period (any status)
	const [orderItems, setOrderItems] = useState([]); // line items for paid+ current orders
	const [topCustomers, setTopCustomers] = useState([]); // already aggregated
	const [recentPaid, setRecentPaid] = useState([]);

	const bounds = useMemo(() => computePeriodBounds(period), [period]);

	const load = useCallback(async () => {
		setError(null);
		setRefreshing(true);
		try {
			// 1. Current period orders (any status).
			let currentQuery = supabase
				.from('orders')
				.select(
					'id, order_number, status, total_amount, currency, user_id, created_at, paid_at, shipping_address',
				);
			if (bounds.currentStart) {
				currentQuery = currentQuery.gte('created_at', bounds.currentStart.toISOString());
			}
			const { data: cur, error: curErr } = await currentQuery;
			if (curErr) throw curErr;
			setCurrentOrders(cur || []);

			// 2. Previous period orders (for compare). Skip for "all time".
			if (bounds.prevStart && bounds.prevEnd) {
				const { data: prev, error: prevErr } = await supabase
					.from('orders')
					.select('id, status, total_amount, currency, created_at')
					.gte('created_at', bounds.prevStart.toISOString())
					.lt('created_at', bounds.prevEnd.toISOString());
				if (prevErr) throw prevErr;
				setPrevOrders(prev || []);
			} else {
				setPrevOrders([]);
			}

			// 3. Line items for paid+ orders in the current period — for top products.
			const paidPlusIds = (cur || [])
				.filter((o) => PAID_PLUS.includes(o.status))
				.map((o) => o.id);
			if (paidPlusIds.length) {
				// Supabase has a default URL length cap; chunk in 200s to be safe.
				const chunks = [];
				for (let i = 0; i < paidPlusIds.length; i += 200) {
					chunks.push(paidPlusIds.slice(i, i + 200));
				}
				const allItems = [];
				for (const c of chunks) {
					const { data: items, error: itemsErr } = await supabase
						.from('order_items')
						.select('order_id, product_name, total_price, quantity')
						.in('order_id', c);
					if (itemsErr) throw itemsErr;
					if (items) allItems.push(...items);
				}
				setOrderItems(allItems);
			} else {
				setOrderItems([]);
			}

			// 4. Top customers + recent paid — derived in memo from currentOrders + a users lookup.
			//    Fetch full_name/email for the user_ids of paid+ orders in the period.
			const paidPlus = (cur || []).filter((o) => PAID_PLUS.includes(o.status));
			const userIds = Array.from(
				new Set(paidPlus.map((o) => o.user_id).filter(Boolean)),
			);
			let userLookup = {};
			if (userIds.length) {
				const { data: us, error: uErr } = await supabase
					.from('users')
					.select('id, email, full_name')
					.in('id', userIds);
				if (uErr) {
					// Don't fail the whole page if users join is denied; just skip names.
					console.warn('users lookup failed', uErr);
				} else if (us) {
					for (const u of us) userLookup[u.id] = u;
				}
			}

			// Aggregate by user_id (or fallback to shipping email).
			const byCustomer = new Map();
			for (const o of paidPlus) {
				const addr = o.shipping_address || {};
				const fallbackEmail = addr.email || '';
				const key = o.user_id || `email:${fallbackEmail.toLowerCase()}` || 'unknown';
				if (!byCustomer.has(key)) {
					const u = o.user_id ? userLookup[o.user_id] : null;
					const name =
						u?.full_name ||
						`${addr.firstName || ''} ${addr.lastName || ''}`.trim() ||
						'—';
					const email = u?.email || fallbackEmail || '—';
					byCustomer.set(key, {
						key,
						name,
						email,
						orderCount: 0,
						totalCents: 0,
						currency: o.currency || 'DOP',
					});
				}
				const row = byCustomer.get(key);
				row.orderCount += 1;
				row.totalCents += Number(o.total_amount) || 0;
			}
			const topCustomersArr = Array.from(byCustomer.values())
				.sort((a, b) => b.totalCents - a.totalCents)
				.slice(0, 5);
			setTopCustomers(topCustomersArr);

			// 5. Recent paid orders (last 5 by paid_at) — within period.
			const recent = paidPlus
				.filter((o) => o.paid_at)
				.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
				.slice(0, 5)
				.map((o) => {
					const addr = o.shipping_address || {};
					const u = o.user_id ? userLookup[o.user_id] : null;
					const name =
						u?.full_name ||
						`${addr.firstName || ''} ${addr.lastName || ''}`.trim() ||
						'—';
					const email = u?.email || addr.email || '';
					return { ...o, customerName: name, customerEmail: email };
				});
			setRecentPaid(recent);
		} catch (e) {
			console.error(e);
			setError(e.message || 'Failed to load analytics');
			toast.error(e.message || 'Failed to load analytics');
		} finally {
			setLoading(false);
			setRefreshing(false);
		}
	}, [bounds]);

	useEffect(() => {
		setLoading(true);
		load();
	}, [load]);

	// ---------- derived KPIs / chart data ----------

	const kpis = useMemo(() => {
		const splitByCurrency = (orders, statuses) => {
			let dop = 0;
			let usd = 0;
			let count = 0;
			for (const o of orders) {
				if (statuses && !statuses.includes(o.status)) continue;
				const amt = Number(o.total_amount) || 0;
				if (o.currency === 'USD') usd += amt;
				else dop += amt; // default to DOP
				count += 1;
			}
			return { dop, usd, count };
		};

		const curRev = splitByCurrency(currentOrders, PAID_PLUS);
		const prevRev = splitByCurrency(prevOrders, PAID_PLUS);
		const curOrders = currentOrders.length;
		const prevOrdersCount = prevOrders.length;
		const curPaid = curRev.count;
		const prevPaid = prevRev.count;
		const curAOV = curPaid > 0 ? curRev.dop / curPaid : 0;
		const prevAOV = prevPaid > 0 ? prevRev.dop / prevPaid : 0;
		const conversion = curOrders > 0 ? (curPaid / curOrders) * 100 : 0;
		const prevConversion = prevOrdersCount > 0 ? (prevPaid / prevOrdersCount) * 100 : 0;

		return {
			revenue: {
				dop: curRev.dop,
				usd: curRev.usd,
				change: pctChange(curRev.dop, prevRev.dop),
			},
			orders: {
				count: curOrders,
				change: pctChange(curOrders, prevOrdersCount),
			},
			paid: {
				count: curPaid,
				conversion,
				change: pctChange(curPaid, prevPaid),
				conversionChange: pctChange(conversion, prevConversion),
			},
			aov: {
				value: curAOV,
				usd: curRev.usd > 0 && curPaid > 0 ? curRev.usd / curPaid : 0,
				change: pctChange(curAOV, prevAOV),
			},
		};
	}, [currentOrders, prevOrders]);

	const revenueSeries = useMemo(() => {
		const granularity = bucketGranularity(period);
		const map = new Map();
		for (const o of currentOrders) {
			if (!PAID_PLUS.includes(o.status)) continue;
			// Use DOP only on this chart — USD orders are folded into the same axis,
			// since FX conversion isn't done here. (See compromise note in done report.)
			if (o.currency === 'USD') continue;
			const key = bucketKey(o.created_at, granularity);
			map.set(key, (map.get(key) || 0) + (Number(o.total_amount) || 0));
		}
		const sorted = Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
		return sorted.map(([k, cents]) => ({
			bucket: k,
			label: bucketLabel(k, granularity),
			revenue: cents / 100,
		}));
	}, [currentOrders, period]);

	const topProducts = useMemo(() => {
		const map = new Map();
		for (const it of orderItems) {
			const name = it.product_name || 'Unknown product';
			map.set(name, (map.get(name) || 0) + (Number(it.total_price) || 0));
		}
		return Array.from(map.entries())
			.map(([name, cents]) => ({ name, revenue: cents / 100, raw: cents }))
			.sort((a, b) => b.raw - a.raw)
			.slice(0, 5);
	}, [orderItems]);

	const statusBreakdown = useMemo(() => {
		const map = new Map();
		for (const o of currentOrders) {
			const s = o.status || 'unknown';
			map.set(s, (map.get(s) || 0) + 1);
		}
		return Array.from(map.entries())
			.map(([status, count]) => ({
				status,
				label: formatStatusLabel(status),
				count,
				color: STATUS_COLORS[status] || '#71717a',
			}))
			.sort((a, b) => b.count - a.count);
	}, [currentOrders]);

	const periodOpt = PERIOD_OPTIONS.find((p) => p.key === period);
	const prevLabel =
		period === 'all' ? 'previous' : `prev ${periodOpt ? periodOpt.label : ''}`;

	// ---------- render helpers ----------

	const KpiCard = ({ icon: Icon, label, value, subtitle, change, footnote }) => (
		<div className="bg-card border border-foreground/10 rounded-xl p-5 flex flex-col gap-2">
			<div className="flex items-center justify-between">
				<p className="text-foreground/60 text-sm">{label}</p>
				{Icon ? <Icon className="w-4 h-4 text-foreground/40" /> : null}
			</div>
			<p className="text-3xl font-semibold text-foreground leading-tight">{value}</p>
			{subtitle ? (
				<p className="text-xs text-foreground/50">{subtitle}</p>
			) : null}
			{change ? <ChangePill change={change} prevLabel={prevLabel} /> : null}
			{footnote ? <p className="text-[11px] text-foreground/40 mt-1">{footnote}</p> : null}
		</div>
	);

	return (
		<>
			<Helmet>
				<title>Analytics — Admin</title>
			</Helmet>
			<Navigation />
			<main id="main" role="main" className="min-h-screen bg-background pt-28 pb-20 px-4">
				<div className="max-w-7xl mx-auto">
					{/* Header */}
					<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
						<div>
							<h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
								<BarChart3 className="w-7 h-7 text-mango-400" />
								Analytics
							</h1>
							<p className="text-foreground/60 mt-1">
								Sales overview and shop performance.
							</p>
						</div>
						<div className="flex items-center gap-2">
							<div className="inline-flex rounded-lg border border-foreground/10 bg-card p-1">
								{PERIOD_OPTIONS.map((p) => (
									<button
										key={p.key}
										type="button"
										onClick={() => setPeriod(p.key)}
										className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
											period === p.key
												? 'bg-mango-500 text-stone-900 font-medium'
												: 'text-foreground/70 hover:text-foreground'
										}`}
									>
										{p.label}
									</button>
								))}
							</div>
							<Button
								variant="outline"
								size="sm"
								onClick={load}
								disabled={refreshing}
								className="border-foreground/20 text-foreground gap-2"
							>
								{refreshing ? (
									<Loader2 className="w-4 h-4 animate-spin" />
								) : (
									<RefreshCw className="w-4 h-4" />
								)}
								Refresh
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
					) : (
						<>
							{/* KPI cards */}
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
								<KpiCard
									icon={DollarSign}
									label="Total revenue"
									value={formatDOP(kpis.revenue.dop)}
									subtitle={
										kpis.revenue.usd > 0
											? `+ ${formatUSD(kpis.revenue.usd)} USD`
											: 'DOP, paid+ statuses'
									}
									change={kpis.revenue.change}
									footnote={
										kpis.revenue.usd > 0
											? 'USD shown separately, no FX conversion.'
											: null
									}
								/>
								<KpiCard
									icon={ShoppingBag}
									label="Orders"
									value={kpis.orders.count.toLocaleString()}
									subtitle="All statuses in period"
									change={kpis.orders.change}
								/>
								<KpiCard
									icon={CheckCircle2}
									label="Paid orders"
									value={kpis.paid.count.toLocaleString()}
									subtitle={`Conversion: ${kpis.paid.conversion.toFixed(1)}%`}
									change={kpis.paid.change}
								/>
								<KpiCard
									icon={TrendingUp}
									label="Average order value"
									value={formatDOP(kpis.aov.value)}
									subtitle={
										kpis.aov.usd > 0
											? `${formatUSD(kpis.aov.usd)} USD avg`
											: 'DOP only'
									}
									change={kpis.aov.change}
								/>
							</div>

							{/* Revenue chart */}
							<section className="bg-card border border-foreground/10 rounded-xl p-5 mb-8">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
									<div>
										<h2 className="text-lg font-semibold text-foreground">
											Revenue over time
										</h2>
										<p className="text-xs text-foreground/50">
											DOP only ·{' '}
											{bucketGranularity(period) === 'day'
												? 'daily'
												: bucketGranularity(period) === 'week'
												? 'weekly'
												: 'monthly'}{' '}
											buckets
										</p>
									</div>
								</div>
								{revenueSeries.length === 0 ? (
									<p className="text-foreground/40 text-center py-12 text-sm">
										No paid revenue in this period.
									</p>
								) : (
									<div className="w-full h-72">
										<ResponsiveContainer width="100%" height="100%">
											<AreaChart
												data={revenueSeries}
												margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
											>
												<defs>
													<linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
														<stop offset="5%" stopColor="#f59e0b" stopOpacity={0.6} />
														<stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
													</linearGradient>
												</defs>
												<CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
												<XAxis
													dataKey="label"
													stroke="rgba(255,255,255,0.4)"
													tick={{ fontSize: 12 }}
												/>
												<YAxis
													stroke="rgba(255,255,255,0.4)"
													tick={{ fontSize: 12 }}
													tickFormatter={(v) =>
														v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v
													}
												/>
												<Tooltip
													formatter={(v) => [
														`RD$${Number(v).toLocaleString('en-US', {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}`,
														'Revenue',
													]}
													contentStyle={{
														background: '#1c1917',
														border: '1px solid rgba(255,255,255,0.1)',
														borderRadius: 8,
														color: '#fafaf9',
													}}
												/>
												<Area
													type="monotone"
													dataKey="revenue"
													stroke="#f59e0b"
													strokeWidth={2}
													fill="url(#revGrad)"
												/>
											</AreaChart>
										</ResponsiveContainer>
									</div>
								)}
							</section>

							{/* Two-column grid: top products + status breakdown */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
								{/* Top products */}
								<section className="bg-card border border-foreground/10 rounded-xl p-5">
									<h2 className="text-lg font-semibold text-foreground mb-1">
										Top 5 products
									</h2>
									<p className="text-xs text-foreground/50 mb-4">
										Revenue from paid+ orders (DOP)
									</p>
									{topProducts.length === 0 ? (
										<p className="text-foreground/40 text-center py-8 text-sm">
											No product sales in this period.
										</p>
									) : (
										<div className="w-full h-72">
											<ResponsiveContainer width="100%" height="100%">
												<BarChart
													data={topProducts}
													layout="vertical"
													margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
												>
													<CartesianGrid
														strokeDasharray="3 3"
														stroke="rgba(255,255,255,0.06)"
														horizontal={false}
													/>
													<XAxis
														type="number"
														stroke="rgba(255,255,255,0.4)"
														tick={{ fontSize: 12 }}
														tickFormatter={(v) =>
															v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v
														}
													/>
													<YAxis
														type="category"
														dataKey="name"
														stroke="rgba(255,255,255,0.6)"
														tick={{ fontSize: 12 }}
														width={140}
													/>
													<Tooltip
														formatter={(v) => [
															`RD$${Number(v).toLocaleString('en-US', {
																minimumFractionDigits: 2,
																maximumFractionDigits: 2,
															})}`,
															'Revenue',
														]}
														contentStyle={{
															background: '#1c1917',
															border: '1px solid rgba(255,255,255,0.1)',
															borderRadius: 8,
															color: '#fafaf9',
														}}
														cursor={{ fill: 'rgba(245, 158, 11, 0.08)' }}
													/>
													<Bar
														dataKey="revenue"
														fill="#f59e0b"
														radius={[0, 4, 4, 0]}
													/>
												</BarChart>
											</ResponsiveContainer>
										</div>
									)}
								</section>

								{/* Status breakdown */}
								<section className="bg-card border border-foreground/10 rounded-xl p-5">
									<h2 className="text-lg font-semibold text-foreground mb-1">
										Order status breakdown
									</h2>
									<p className="text-xs text-foreground/50 mb-4">
										All orders in period, by status
									</p>
									{statusBreakdown.length === 0 ? (
										<p className="text-foreground/40 text-center py-8 text-sm">
											No orders in this period.
										</p>
									) : (
										<div className="w-full h-72">
											<ResponsiveContainer width="100%" height="100%">
												<PieChart>
													<Pie
														data={statusBreakdown}
														dataKey="count"
														nameKey="label"
														innerRadius={50}
														outerRadius={90}
														paddingAngle={2}
													>
														{statusBreakdown.map((entry) => (
															<Cell key={entry.status} fill={entry.color} />
														))}
													</Pie>
													<Tooltip
														formatter={(v, n) => [v, n]}
														contentStyle={{
															background: '#1c1917',
															border: '1px solid rgba(255,255,255,0.1)',
															borderRadius: 8,
															color: '#fafaf9',
														}}
													/>
													<Legend
														formatter={(value) => (
															<span style={{ color: 'rgba(250,250,249,0.8)' }}>
																{value}
															</span>
														)}
													/>
												</PieChart>
											</ResponsiveContainer>
										</div>
									)}
								</section>
							</div>

							{/* Two-column grid: top customers + recent paid */}
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
								{/* Top customers */}
								<section className="bg-card border border-foreground/10 rounded-xl p-5">
									<h2 className="text-lg font-semibold text-foreground mb-1">
										Top 5 customers
									</h2>
									<p className="text-xs text-foreground/50 mb-4">
										By total spent on paid+ orders
									</p>
									{topCustomers.length === 0 ? (
										<p className="text-foreground/40 text-center py-8 text-sm">
											No paying customers in this period.
										</p>
									) : (
										<div className="overflow-x-auto -mx-2">
											<table className="w-full text-sm">
												<thead>
													<tr className="text-left text-xs uppercase text-foreground/50 border-b border-foreground/10">
														<th className="px-2 py-2">Customer</th>
														<th className="px-2 py-2 text-right">Orders</th>
														<th className="px-2 py-2 text-right">Total spent</th>
													</tr>
												</thead>
												<tbody>
													{topCustomers.map((c) => (
														<tr
															key={c.key}
															className="border-b border-foreground/5 last:border-b-0"
														>
															<td className="px-2 py-2">
																<div className="text-foreground">{c.name}</div>
																<div className="text-xs text-foreground/50">
																	{c.email}
																</div>
															</td>
															<td className="px-2 py-2 text-right text-foreground/80">
																{c.orderCount}
															</td>
															<td className="px-2 py-2 text-right font-semibold text-mango-400">
																{c.currency === 'USD'
																	? formatUSD(c.totalCents)
																	: formatDOP(c.totalCents)}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</section>

								{/* Recent paid orders */}
								<section className="bg-card border border-foreground/10 rounded-xl p-5">
									<div className="flex items-center justify-between mb-1">
										<h2 className="text-lg font-semibold text-foreground">
											Recent paid orders
										</h2>
										<Link
											to="/admin/orders"
											className="text-xs text-mango-400 hover:underline"
										>
											View all
										</Link>
									</div>
									<p className="text-xs text-foreground/50 mb-4">
										Latest 5 paid+ orders in period
									</p>
									{recentPaid.length === 0 ? (
										<p className="text-foreground/40 text-center py-8 text-sm">
											No paid orders in this period.
										</p>
									) : (
										<div className="overflow-x-auto -mx-2">
											<table className="w-full text-sm">
												<thead>
													<tr className="text-left text-xs uppercase text-foreground/50 border-b border-foreground/10">
														<th className="px-2 py-2">Order</th>
														<th className="px-2 py-2">Customer</th>
														<th className="px-2 py-2 text-right">Total</th>
														<th className="px-2 py-2 text-right">Paid</th>
													</tr>
												</thead>
												<tbody>
													{recentPaid.map((o) => (
														<tr
															key={o.id}
															className="border-b border-foreground/5 last:border-b-0 hover:bg-foreground/5 transition-colors"
														>
															<td className="px-2 py-2">
																<Link
																	to="/admin/orders"
																	className="text-mango-400 hover:underline font-medium"
																>
																	{o.order_number || o.id.slice(0, 8)}
																</Link>
															</td>
															<td className="px-2 py-2">
																<div className="text-foreground">
																	{o.customerName}
																</div>
																<div className="text-xs text-foreground/50">
																	{o.customerEmail || '—'}
																</div>
															</td>
															<td className="px-2 py-2 text-right font-semibold text-foreground">
																{o.currency === 'USD'
																	? formatUSD(o.total_amount)
																	: formatDOP(o.total_amount)}
															</td>
															<td
																className="px-2 py-2 text-right text-foreground/70 text-xs"
																title={formatDateTime(o.paid_at)}
															>
																{formatDate(o.paid_at)}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</section>
							</div>
						</>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
};

export default AdminAnalyticsPage;
