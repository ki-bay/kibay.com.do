import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
	Loader2,
	RefreshCw,
	AlertTriangle,
	Search,
	Mail,
	ChevronLeft,
	ChevronRight,
	ArrowLeft,
	Download,
	UserX,
	Trash2,
	Inbox,
} from 'lucide-react';

const PAGE_SIZE = 25;
const UNSUBSCRIBED_MARKER = 'unsubscribed';

const TABLE_COLUMNS = 'id, email, first_name, source, tags, created_at, updated_at';

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

// "active" = tags does NOT contain the unsubscribed marker (or tags is null/empty).
// "unsubscribed" = tags string contains the literal "unsubscribed".
const isUnsubscribed = (row) => {
	if (!row?.tags) return false;
	return String(row.tags).toLowerCase().includes(UNSUBSCRIBED_MARKER);
};

const csvEscape = (val) => {
	if (val === null || val === undefined) return '';
	const s = String(val);
	if (/[",\n\r]/.test(s)) {
		return `"${s.replace(/"/g, '""')}"`;
	}
	return s;
};

const AdminNewsletterPage = () => {
	const [rows, setRows] = useState([]);
	const [totalCount, setTotalCount] = useState(0);
	const [page, setPage] = useState(0);
	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'unsubscribed'
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [exporting, setExporting] = useState(false);
	const [actingId, setActingId] = useState(null);

	const [kpis, setKpis] = useState({
		total: 0,
		active: 0,
		unsubscribed: 0,
		last30d: 0,
	});
	const [kpisLoading, setKpisLoading] = useState(true);

	const debounceRef = useRef(null);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setDebouncedSearch(search.trim());
			setPage(0);
		}, 300);
		return () => debounceRef.current && clearTimeout(debounceRef.current);
	}, [search]);

	// Reset page when filter changes
	useEffect(() => {
		setPage(0);
	}, [statusFilter]);

	const loadKpis = useCallback(async () => {
		setKpisLoading(true);
		try {
			const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

			const [totalRes, unsubRes, last30Res] = await Promise.all([
				supabase
					.from('newsletter_subscribers')
					.select('id', { count: 'exact', head: true }),
				supabase
					.from('newsletter_subscribers')
					.select('id', { count: 'exact', head: true })
					.ilike('tags', `%${UNSUBSCRIBED_MARKER}%`),
				supabase
					.from('newsletter_subscribers')
					.select('id', { count: 'exact', head: true })
					.gte('created_at', thirtyDaysAgo),
			]);

			if (totalRes.error) throw totalRes.error;
			if (unsubRes.error) throw unsubRes.error;
			if (last30Res.error) throw last30Res.error;

			const total = totalRes.count || 0;
			const unsubscribed = unsubRes.count || 0;
			setKpis({
				total,
				unsubscribed,
				active: Math.max(0, total - unsubscribed),
				last30d: last30Res.count || 0,
			});
		} catch (err) {
			console.error('Failed to load newsletter KPIs', err);
		} finally {
			setKpisLoading(false);
		}
	}, []);

	const applyFilters = useCallback(
		(query) => {
			let q = query;
			if (debouncedSearch) {
				const safe = debouncedSearch.replace(/[%,]/g, ' ');
				q = q.ilike('email', `%${safe}%`);
			}
			if (statusFilter === 'active') {
				// active = tags is null OR does not contain 'unsubscribed'
				q = q.or(`tags.is.null,tags.not.ilike.%${UNSUBSCRIBED_MARKER}%`);
			} else if (statusFilter === 'unsubscribed') {
				q = q.ilike('tags', `%${UNSUBSCRIBED_MARKER}%`);
			}
			return q;
		},
		[debouncedSearch, statusFilter],
	);

	const loadPage = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const from = page * PAGE_SIZE;
			const to = from + PAGE_SIZE - 1;

			let query = supabase
				.from('newsletter_subscribers')
				.select(TABLE_COLUMNS, { count: 'exact' })
				.order('created_at', { ascending: false })
				.range(from, to);

			query = applyFilters(query);

			const { data, error: e, count } = await query;
			if (e) throw e;

			setRows(data || []);
			setTotalCount(count || 0);
		} catch (err) {
			setError(err.message || 'Failed to load subscribers');
			setRows([]);
			setTotalCount(0);
		} finally {
			setLoading(false);
		}
	}, [page, applyFilters]);

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

	const handleRefresh = () => {
		loadKpis();
		loadPage();
	};

	const handleUnsubscribe = async (row) => {
		if (isUnsubscribed(row)) {
			toast.info('Already unsubscribed.');
			return;
		}
		if (!confirm(`Mark ${row.email} as unsubscribed?`)) return;
		setActingId(row.id);
		try {
			// Preserve any existing tag info by appending; otherwise just set the marker.
			let nextTags = UNSUBSCRIBED_MARKER;
			if (row.tags) {
				const existing = String(row.tags);
				if (!existing.toLowerCase().includes(UNSUBSCRIBED_MARKER)) {
					nextTags = `${existing};${UNSUBSCRIBED_MARKER}`;
				} else {
					nextTags = existing;
				}
			}
			const { error: e } = await supabase
				.from('newsletter_subscribers')
				.update({ tags: nextTags, updated_at: new Date().toISOString() })
				.eq('id', row.id);
			if (e) throw e;
			toast.success('Subscriber unsubscribed.');
			await Promise.all([loadKpis(), loadPage()]);
		} catch (err) {
			toast.error(err.message || 'Failed to unsubscribe.');
		} finally {
			setActingId(null);
		}
	};

	const handleDelete = async (row) => {
		if (!confirm(`Permanently delete ${row.email}? This cannot be undone.`)) return;
		setActingId(row.id);
		try {
			const { error: e } = await supabase
				.from('newsletter_subscribers')
				.delete()
				.eq('id', row.id);
			if (e) throw e;
			toast.success('Subscriber deleted.');
			await Promise.all([loadKpis(), loadPage()]);
		} catch (err) {
			toast.error(err.message || 'Failed to delete subscriber.');
		} finally {
			setActingId(null);
		}
	};

	const handleExportCsv = async () => {
		setExporting(true);
		try {
			// Pull the FULL filtered list (no pagination), in chunks to be safe.
			const chunkSize = 1000;
			let offset = 0;
			let all = [];
			// First call also gets count.
			while (true) {
				let query = supabase
					.from('newsletter_subscribers')
					.select(TABLE_COLUMNS)
					.order('created_at', { ascending: false })
					.range(offset, offset + chunkSize - 1);
				query = applyFilters(query);
				const { data, error: e } = await query;
				if (e) throw e;
				const batch = data || [];
				all = all.concat(batch);
				if (batch.length < chunkSize) break;
				offset += chunkSize;
				// Safety: stop after 50k rows.
				if (all.length >= 50000) break;
			}

			if (all.length === 0) {
				toast.info('No subscribers in current filter to export.');
				return;
			}

			const headers = ['Email', 'First name', 'Source', 'Tags', 'Status', 'Subscribed at', 'Updated at'];
			const lines = [headers.map(csvEscape).join(',')];
			for (const r of all) {
				lines.push(
					[
						r.email || '',
						r.first_name || '',
						r.source || '',
						r.tags || '',
						isUnsubscribed(r) ? 'unsubscribed' : 'active',
						r.created_at || '',
						r.updated_at || '',
					]
						.map(csvEscape)
						.join(','),
				);
			}
			const csv = lines.join('\n');
			const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			const today = new Date().toISOString().slice(0, 10);
			a.href = url;
			a.download = `newsletter-subscribers-${today}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success(`Exported ${all.length} subscriber${all.length === 1 ? '' : 's'}.`);
		} catch (err) {
			toast.error(err.message || 'Export failed.');
		} finally {
			setExporting(false);
		}
	};

	return (
		<>
			<Helmet>
				<title>Newsletter — Admin</title>
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
								<ArrowLeft className="w-3 h-3" /> Admin dashboard
							</Link>
							<h1 className="text-3xl sm:text-4xl font-light text-foreground flex items-center gap-3">
								<Mail className="w-8 h-8 text-mango-500" /> Newsletter
							</h1>
							<p className="text-foreground/60 mt-2 font-light">
								Subscribers in <code className="text-xs">public.newsletter_subscribers</code> — search, export, or remove.
							</p>
						</div>
						<div className="flex gap-3">
							<Button
								onClick={handleRefresh}
								variant="ghost"
								className="border border-foreground/10 text-foreground"
							>
								<RefreshCw className="w-4 h-4 mr-2" /> Refresh
							</Button>
							<Button
								onClick={handleExportCsv}
								disabled={exporting}
								className="bg-mango-500 hover:bg-mango-600 text-stone-900"
							>
								{exporting ? (
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
								) : (
									<Download className="w-4 h-4 mr-2" />
								)}
								Download CSV
							</Button>
						</div>
					</div>

					{/* KPIs */}
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
						<div className="rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm p-5">
							<div className="text-xs uppercase tracking-widest text-foreground/50">Total</div>
							<div className="mt-2 text-3xl font-light text-foreground">
								{kpisLoading ? <Loader2 className="w-5 h-5 animate-spin text-foreground/40" /> : kpis.total}
							</div>
						</div>
						<div className="rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm p-5">
							<div className="text-xs uppercase tracking-widest text-foreground/50">Active</div>
							<div className="mt-2 text-3xl font-light text-foreground">
								{kpisLoading ? <Loader2 className="w-5 h-5 animate-spin text-foreground/40" /> : kpis.active}
							</div>
						</div>
						<div className="rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm p-5">
							<div className="text-xs uppercase tracking-widest text-foreground/50">Unsubscribed</div>
							<div className="mt-2 text-3xl font-light text-foreground">
								{kpisLoading ? <Loader2 className="w-5 h-5 animate-spin text-foreground/40" /> : kpis.unsubscribed}
							</div>
						</div>
						<div className="rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm p-5">
							<div className="text-xs uppercase tracking-widest text-foreground/50">Last 30 days</div>
							<div className="mt-2 text-3xl font-light text-foreground">
								{kpisLoading ? <Loader2 className="w-5 h-5 animate-spin text-foreground/40" /> : kpis.last30d}
							</div>
						</div>
					</div>

					{/* Search + Filter */}
					<div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
						<div className="relative flex-1 max-w-md">
							<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder="Search by email…"
								className="w-full pl-9 pr-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
							/>
						</div>
						<div className="flex rounded-md border border-foreground/10 bg-card overflow-hidden">
							{[
								{ key: 'all', label: 'All' },
								{ key: 'active', label: 'Active' },
								{ key: 'unsubscribed', label: 'Unsubscribed' },
							].map((opt) => (
								<button
									key={opt.key}
									type="button"
									onClick={() => setStatusFilter(opt.key)}
									className={`px-3 py-2 text-xs uppercase tracking-wider transition-colors ${
										statusFilter === opt.key
											? 'bg-mango-500/15 text-mango-300'
											: 'text-foreground/60 hover:text-foreground'
									}`}
								>
									{opt.label}
								</button>
							))}
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
					) : rows.length === 0 ? (
						<div className="text-center py-20 border border-dashed border-foreground/10 rounded-2xl">
							<Inbox className="w-10 h-10 mx-auto text-foreground/30 mb-3" />
							<p className="text-foreground/60">
								{debouncedSearch
									? `No subscribers match “${debouncedSearch}”.`
									: 'No subscribers yet.'}
							</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm">
								<table className="w-full text-sm text-left">
									<thead className="bg-card text-foreground/60 uppercase text-xs tracking-wider">
										<tr>
											<th className="px-4 py-3">Email</th>
											<th className="px-4 py-3">Subscribed</th>
											<th className="px-4 py-3">Source</th>
											<th className="px-4 py-3">Status</th>
											<th className="px-4 py-3 text-right">Actions</th>
										</tr>
									</thead>
									<tbody>
										{rows.map((r) => {
											const unsub = isUnsubscribed(r);
											const busy = actingId === r.id;
											return (
												<tr
													key={r.id}
													className="border-t border-foreground/5 hover:bg-foreground/5 transition-colors"
												>
													<td className="px-4 py-3 text-foreground/80">
														<a
															href={`mailto:${r.email}`}
															className="inline-flex items-center gap-1 hover:text-mango-400"
														>
															<Mail className="w-3 h-3" aria-hidden="true" />
															{r.email}
														</a>
														{r.first_name && (
															<span className="ml-2 text-foreground/40 text-xs">
																({r.first_name})
															</span>
														)}
													</td>
													<td className="px-4 py-3 text-foreground/70">{formatDate(r.created_at)}</td>
													<td className="px-4 py-3 text-foreground/70">
														{r.source || <span className="text-foreground/40 italic">—</span>}
													</td>
													<td className="px-4 py-3">
														<span
															className={`inline-flex items-center px-2 py-1 rounded-full text-xs border ${
																unsub
																	? 'bg-stone-700/40 text-stone-300 border-stone-600'
																	: 'bg-mango-500/15 text-mango-300 border-mango-500/40'
															}`}
														>
															{unsub ? 'unsubscribed' : 'active'}
														</span>
													</td>
													<td className="px-4 py-3">
														<div className="flex justify-end gap-2">
															<Button
																size="sm"
																variant="ghost"
																disabled={busy || unsub}
																onClick={() => handleUnsubscribe(r)}
																className="text-foreground/80 hover:text-foreground border border-foreground/10"
															>
																{busy ? (
																	<Loader2 className="w-3 h-3 mr-1 animate-spin" />
																) : (
																	<UserX className="w-3 h-3 mr-1" aria-hidden="true" />
																)}
																Unsubscribe
															</Button>
															<Button
																size="sm"
																variant="ghost"
																disabled={busy}
																onClick={() => handleDelete(r)}
																className="text-red-300 hover:text-red-200 border border-red-500/30"
															>
																{busy ? (
																	<Loader2 className="w-3 h-3 mr-1 animate-spin" />
																) : (
																	<Trash2 className="w-3 h-3 mr-1" aria-hidden="true" />
																)}
																Delete
															</Button>
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
									Page {page + 1} of {totalPages} · {totalCount} subscriber{totalCount === 1 ? '' : 's'}
								</div>
								<div className="flex gap-2">
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setPage((p) => Math.max(0, p - 1))}
										disabled={page === 0}
										className="border border-foreground/10 text-foreground"
									>
										<ChevronLeft className="w-4 h-4 mr-1" /> Prev
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
										disabled={page + 1 >= totalPages}
										className="border border-foreground/10 text-foreground"
									>
										Next <ChevronRight className="w-4 h-4 ml-1" />
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

export default AdminNewsletterPage;
