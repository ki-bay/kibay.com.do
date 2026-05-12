import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import {
	Loader2,
	RefreshCw,
	AlertTriangle,
	Search,
	Ticket,
	ArrowLeft,
	Plus,
	Pencil,
	Trash2,
	Check,
	X as XIcon,
} from 'lucide-react';

const CODE_REGEX = /^[A-Za-z0-9_-]{3,32}$/;

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
	if (!iso) return null;
	try {
		return new Date(iso).toLocaleString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch {
		return null;
	}
};

const symbolFor = (currency) => (currency === 'USD' ? '$' : 'RD$');

// Format cents to a major-unit string (no symbol) for input prefilling.
const centsToMajorString = (cents) => {
	if (cents == null || cents === '') return '';
	const v = Number(cents) / 100;
	return Number.isFinite(v) ? v.toFixed(2) : '';
};

// Parse a major-units string ("5", "5.00", "0.50") to integer cents. Returns null on empty / invalid.
const majorStringToCents = (s) => {
	if (s == null) return null;
	const trimmed = String(s).trim();
	if (trimmed === '') return null;
	const num = Number(trimmed);
	if (!Number.isFinite(num) || num < 0) return NaN;
	return Math.round(num * 100);
};

// Convert a Postgres ISO timestamp into the `YYYY-MM-DDTHH:MM` value an
// <input type="datetime-local"> expects (in the user's local timezone).
const isoToLocalInput = (iso) => {
	if (!iso) return '';
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return '';
	const pad = (n) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const localInputToIso = (s) => {
	if (!s) return null;
	const d = new Date(s);
	if (Number.isNaN(d.getTime())) return null;
	return d.toISOString();
};

const renderTypeCell = (c, t) => {
	if (c.discount_type === 'percent') {
		return t('table.typePercent', { value: c.discount_value });
	}
	const sym = symbolFor(c.currency);
	const v = (Number(c.discount_value) || 0) / 100;
	return t('table.typeFixed', { symbol: sym, value: v.toFixed(2) });
};

const renderMinOrder = (c) => {
	if (c.min_order_amount == null) return '—';
	const sym = c.discount_type === 'fixed' ? symbolFor(c.currency) : 'RD$';
	return `${sym}${(Number(c.min_order_amount) / 100).toFixed(2)}`;
};

const renderUses = (c) => {
	const used = c.uses_count ?? 0;
	const cap = c.max_uses == null ? '∞' : c.max_uses;
	return `${used}/${cap}`;
};

const renderWindow = (c, t) => {
	const s = formatDateTime(c.starts_at);
	const e = formatDateTime(c.ends_at);
	if (!s && !e) return t('table.noLimit');
	return `${s || '—'} → ${e || '—'}`;
};

const emptyForm = () => ({
	id: null,
	code: '',
	description: '',
	discount_type: 'percent',
	discount_value: '', // string in input
	currency: 'DOP',
	min_order_amount: '',
	max_uses: '',
	starts_at: '',
	ends_at: '',
	active: true,
});

const couponToForm = (c) => ({
	id: c.id,
	code: c.code || '',
	description: c.description || '',
	discount_type: c.discount_type || 'percent',
	discount_value:
		c.discount_type === 'percent'
			? (c.discount_value != null ? String(c.discount_value) : '')
			: centsToMajorString(c.discount_value),
	currency: c.currency || 'DOP',
	min_order_amount: centsToMajorString(c.min_order_amount),
	max_uses: c.max_uses == null ? '' : String(c.max_uses),
	starts_at: isoToLocalInput(c.starts_at),
	ends_at: isoToLocalInput(c.ends_at),
	active: !!c.active,
});

const AdminCouponsPage = () => {
	const { t } = useTranslation('adminCoupons');
	const [coupons, setCoupons] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const [search, setSearch] = useState('');
	const [debouncedSearch, setDebouncedSearch] = useState('');
	const [activeFilter, setActiveFilter] = useState('all'); // all | active | inactive
	const debounceRef = useRef(null);

	const [dialogOpen, setDialogOpen] = useState(false);
	const [form, setForm] = useState(emptyForm());
	const [formErrors, setFormErrors] = useState({});
	const [saving, setSaving] = useState(false);
	const [togglingId, setTogglingId] = useState(null);
	const [deletingId, setDeletingId] = useState(null);

	useEffect(() => {
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			setDebouncedSearch(search.trim());
		}, 300);
		return () => debounceRef.current && clearTimeout(debounceRef.current);
	}, [search]);

	const loadCoupons = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			let query = supabase
				.from('coupons')
				.select('*')
				.order('created_at', { ascending: false });

			if (debouncedSearch) {
				const safe = debouncedSearch.replace(/[%,]/g, ' ');
				query = query.ilike('code', `%${safe}%`);
			}

			if (activeFilter === 'active') query = query.eq('active', true);
			if (activeFilter === 'inactive') query = query.eq('active', false);

			const { data, error: e } = await query;
			if (e) throw e;
			setCoupons(data || []);
		} catch (err) {
			setError(err.message || t('toast.loadFailed'));
			setCoupons([]);
		} finally {
			setLoading(false);
		}
	}, [debouncedSearch, activeFilter, t]);

	useEffect(() => {
		loadCoupons();
	}, [loadCoupons]);

	const openCreate = () => {
		setForm(emptyForm());
		setFormErrors({});
		setDialogOpen(true);
	};

	const openEdit = (c) => {
		setForm(couponToForm(c));
		setFormErrors({});
		setDialogOpen(true);
	};

	const validateForm = () => {
		const errs = {};
		const code = (form.code || '').trim();
		if (!code) {
			errs.code = t('validation.codeRequired');
		} else if (!CODE_REGEX.test(code)) {
			errs.code = t('validation.codeFormat');
		}

		if (form.discount_type === 'percent') {
			const n = Number(form.discount_value);
			if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 100) {
				errs.discount_value = t('validation.percentRange');
			}
		} else if (form.discount_type === 'fixed') {
			const cents = majorStringToCents(form.discount_value);
			if (cents == null || Number.isNaN(cents) || cents <= 0) {
				errs.discount_value = t('validation.fixedAmount');
			}
			if (!form.currency) errs.currency = t('validation.currencyRequired');
		}

		if (form.min_order_amount !== '' && form.min_order_amount != null) {
			const cents = majorStringToCents(form.min_order_amount);
			if (cents == null || Number.isNaN(cents) || cents < 0) {
				errs.min_order_amount = t('validation.minOrderRange');
			}
		}

		if (form.max_uses !== '' && form.max_uses != null) {
			const n = Number(form.max_uses);
			if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
				errs.max_uses = t('validation.maxUsesPositive');
			}
		}

		if (form.starts_at && form.ends_at) {
			const s = new Date(form.starts_at).getTime();
			const e = new Date(form.ends_at).getTime();
			if (Number.isFinite(s) && Number.isFinite(e) && e <= s) {
				errs.ends_at = t('validation.endAfterStart');
			}
		}

		setFormErrors(errs);
		return Object.keys(errs).length === 0;
	};

	const buildPayload = () => {
		const code = String(form.code || '').trim().toUpperCase();
		const isPercent = form.discount_type === 'percent';
		const discountValue = isPercent
			? parseInt(form.discount_value, 10)
			: majorStringToCents(form.discount_value);
		const minOrder =
			form.min_order_amount === '' || form.min_order_amount == null
				? null
				: majorStringToCents(form.min_order_amount);
		const maxUses =
			form.max_uses === '' || form.max_uses == null ? null : parseInt(form.max_uses, 10);

		return {
			code,
			description: form.description?.trim() || null,
			discount_type: form.discount_type,
			discount_value: discountValue,
			currency: isPercent ? null : form.currency,
			min_order_amount: minOrder,
			max_uses: maxUses,
			starts_at: localInputToIso(form.starts_at),
			ends_at: localInputToIso(form.ends_at),
			active: !!form.active,
		};
	};

	const handleSubmit = async (e) => {
		e?.preventDefault?.();
		if (!validateForm()) return;
		setSaving(true);
		try {
			const payload = buildPayload();
			let resp;
			if (form.id) {
				resp = await supabase.from('coupons').update(payload).eq('id', form.id).select().single();
			} else {
				resp = await supabase.from('coupons').insert(payload).select().single();
			}
			if (resp.error) throw resp.error;
			toast.success(form.id ? t('toast.updated') : t('toast.created'));
			setDialogOpen(false);
			loadCoupons();
		} catch (err) {
			const msg = err?.message || t('toast.saveFailed');
			if (msg.toLowerCase().includes('duplicate') || err?.code === '23505') {
				setFormErrors((prev) => ({ ...prev, code: t('validation.codeDuplicate') }));
			}
			toast.error(msg);
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (c) => {
		// eslint-disable-next-line no-alert
		if (!window.confirm(t('toast.deleteConfirm', { code: c.code }))) return;
		setDeletingId(c.id);
		try {
			const { error: e } = await supabase.from('coupons').delete().eq('id', c.id);
			if (e) throw e;
			toast.success(t('toast.deleted', { code: c.code }));
			setCoupons((prev) => prev.filter((x) => x.id !== c.id));
		} catch (err) {
			toast.error(err.message || t('toast.deleteFailed'));
		} finally {
			setDeletingId(null);
		}
	};

	const handleToggleActive = async (c) => {
		setTogglingId(c.id);
		const next = !c.active;
		// Optimistic update.
		setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: next } : x)));
		try {
			const { error: e } = await supabase.from('coupons').update({ active: next }).eq('id', c.id);
			if (e) throw e;
			toast.success(next ? t('toast.activated', { code: c.code }) : t('toast.deactivated', { code: c.code }));
		} catch (err) {
			// Revert.
			setCoupons((prev) => prev.map((x) => (x.id === c.id ? { ...x, active: !next } : x)));
			toast.error(err.message || t('toast.toggleFailed'));
		} finally {
			setTogglingId(null);
		}
	};

	const totalCount = coupons.length;
	const activeCount = useMemo(() => coupons.filter((c) => c.active).length, [coupons]);

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
								<Ticket className="w-8 h-8 text-mango-500" /> {t('header.title')}
							</h1>
							<p className="text-foreground/60 mt-2 font-light">
								{t('header.subtitlePrefix')} <code className="text-xs">public.coupons</code> {t('header.subtitleSuffix')}
							</p>
						</div>
						<div className="flex gap-3">
							<Button
								onClick={loadCoupons}
								variant="ghost"
								className="border border-foreground/10 text-foreground"
							>
								<RefreshCw className="w-4 h-4 mr-2" /> {t('header.refresh')}
							</Button>
							<Button
								onClick={openCreate}
								className="bg-mango-500 hover:bg-mango-600 text-stone-900"
							>
								<Plus className="w-4 h-4 mr-2" /> {t('header.newCoupon')}
							</Button>
						</div>
					</div>

					{/* Filters */}
					<div className="flex flex-col sm:flex-row gap-3 mb-6">
						<div className="relative flex-1 max-w-md">
							<Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
							<input
								type="text"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								placeholder={t('search.placeholder')}
								className="w-full pl-9 pr-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
							/>
						</div>
						<div className="inline-flex items-center rounded-md border border-foreground/10 bg-card overflow-hidden text-xs">
							{['all', 'active', 'inactive'].map((opt) => (
								<button
									key={opt}
									type="button"
									onClick={() => setActiveFilter(opt)}
									className={`px-4 py-2 transition-colors ${
										activeFilter === opt
											? 'bg-mango-500 text-stone-900 font-medium'
											: 'text-foreground/70 hover:text-foreground hover:bg-foreground/5'
									}`}
								>
									{t(`filters.${opt}`)}
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
					) : coupons.length === 0 ? (
						<div className="text-center py-20 border border-dashed border-foreground/10 rounded-2xl">
							<Ticket className="w-10 h-10 mx-auto text-foreground/30 mb-3" />
							<p className="text-foreground/60">
								{debouncedSearch
									? t('empty.noMatch', { search: debouncedSearch })
									: activeFilter !== 'all'
									? t('empty.noneActive', { filter: t(`filters.${activeFilter}`).toLowerCase() })
									: t('empty.noCoupons')}
							</p>
						</div>
					) : (
						<>
							<div className="overflow-x-auto rounded-2xl border border-foreground/10 bg-card/40 backdrop-blur-sm">
								<table className="w-full text-sm text-left">
									<thead className="bg-card text-foreground/60 uppercase text-xs tracking-wider">
										<tr>
											<th className="px-4 py-3">{t('table.code')}</th>
											<th className="px-4 py-3">{t('table.type')}</th>
											<th className="px-4 py-3">{t('table.minOrder')}</th>
											<th className="px-4 py-3">{t('table.uses')}</th>
											<th className="px-4 py-3">{t('table.window')}</th>
											<th className="px-4 py-3">{t('table.active')}</th>
											<th className="px-4 py-3">{t('table.created')}</th>
											<th className="px-4 py-3 text-right">{t('table.actions')}</th>
										</tr>
									</thead>
									<tbody>
										{coupons.map((c) => (
											<tr
												key={c.id}
												className="border-t border-foreground/5 hover:bg-foreground/5 transition-colors"
											>
												<td className="px-4 py-3">
													<div className="font-mono text-foreground">{c.code}</div>
													{c.description && (
														<div className="text-xs text-foreground/50 mt-0.5 max-w-[16rem] truncate" title={c.description}>
															{c.description}
														</div>
													)}
												</td>
												<td className="px-4 py-3 text-foreground/80">{renderTypeCell(c, t)}</td>
												<td className="px-4 py-3 text-foreground/80">{renderMinOrder(c)}</td>
												<td className="px-4 py-3 text-foreground/80">{renderUses(c)}</td>
												<td className="px-4 py-3 text-foreground/70 text-xs">{renderWindow(c, t)}</td>
												<td className="px-4 py-3">
													<button
														type="button"
														onClick={() => handleToggleActive(c)}
														disabled={togglingId === c.id}
														aria-pressed={!!c.active}
														aria-label={t('table.toggleAria', { code: c.code })}
														className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
															c.active
																? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
																: 'bg-stone-700/40 text-stone-300 border-stone-600 hover:bg-stone-700/60'
														}`}
													>
														{togglingId === c.id ? (
															<Loader2 className="w-3 h-3 animate-spin" />
														) : c.active ? (
															<Check className="w-3 h-3" aria-hidden="true" />
														) : (
															<XIcon className="w-3 h-3" aria-hidden="true" />
														)}
														{c.active ? t('table.activeBadge') : t('table.inactiveBadge')}
													</button>
												</td>
												<td className="px-4 py-3 text-foreground/70">{formatDate(c.created_at)}</td>
												<td className="px-4 py-3">
													<div className="flex justify-end gap-2">
														<Button
															size="sm"
															variant="ghost"
															onClick={() => openEdit(c)}
															className="text-foreground/80 hover:text-foreground border border-foreground/10"
														>
															<Pencil className="w-3 h-3 mr-1" aria-hidden="true" /> {t('table.edit')}
														</Button>
														<Button
															size="sm"
															variant="ghost"
															onClick={() => handleDelete(c)}
															disabled={deletingId === c.id}
															className="text-red-300 hover:text-red-200 hover:bg-red-500/10 border border-red-500/20"
														>
															{deletingId === c.id ? (
																<Loader2 className="w-3 h-3 animate-spin" />
															) : (
																<Trash2 className="w-3 h-3 mr-1" aria-hidden="true" />
															)}
															{t('table.delete')}
														</Button>
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className="text-xs text-foreground/60 mt-4">
								{t('summary', { count: totalCount, active: activeCount })}
							</div>
						</>
					)}
				</div>
			</main>
			<Footer />

			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{form.id ? t('dialog.titleEdit') : t('dialog.titleNew')}</DialogTitle>
						<DialogDescription>
							{form.id
								? t('dialog.descriptionEdit')
								: t('dialog.descriptionNew')}
						</DialogDescription>
					</DialogHeader>

					<form onSubmit={handleSubmit} className="space-y-5">
						{/* Code */}
						<div>
							<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-1">{t('dialog.code')}</label>
							<input
								type="text"
								value={form.code}
								onChange={(e) =>
									setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
								}
								placeholder={t('dialog.codePlaceholder')}
								maxLength={32}
								className="w-full px-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground placeholder:text-foreground/40 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-mango-500/40"
							/>
							{formErrors.code && (
								<p className="text-xs text-red-400 mt-1">{formErrors.code}</p>
							)}
						</div>

						{/* Description */}
						<div>
							<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-1">{t('dialog.description')}</label>
							<input
								type="text"
								value={form.description}
								onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
								placeholder={t('dialog.descriptionPlaceholder')}
								className="w-full px-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
							/>
						</div>

						{/* Discount type */}
						<div>
							<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-2">{t('dialog.discountType')}</label>
							<div className="flex gap-3">
								{[
									{ v: 'percent', label: t('dialog.percent') },
									{ v: 'fixed', label: t('dialog.fixed') },
								].map((opt) => (
									<label
										key={opt.v}
										className={`flex-1 cursor-pointer px-4 py-3 rounded-md border text-sm transition-colors ${
											form.discount_type === opt.v
												? 'border-mango-500 bg-mango-500/10 text-foreground'
												: 'border-foreground/10 text-foreground/70 hover:bg-foreground/5'
										}`}
									>
										<input
											type="radio"
											name="discount_type"
											value={opt.v}
											checked={form.discount_type === opt.v}
											onChange={() =>
												setForm((f) => ({
													...f,
													discount_type: opt.v,
													discount_value: '',
												}))
											}
											className="sr-only"
										/>
										{opt.label}
									</label>
								))}
							</div>
						</div>

						{/* Discount value (depends on type) */}
						{form.discount_type === 'percent' ? (
							<div>
								<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-1">{t('dialog.percentOff')}</label>
								<div className="relative max-w-[10rem]">
									<input
										type="number"
										min="1"
										max="100"
										step="1"
										value={form.discount_value}
										onChange={(e) =>
											setForm((f) => ({ ...f, discount_value: e.target.value }))
										}
										className="w-full pl-3 pr-8 py-2 rounded-md bg-card border border-foreground/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 text-sm">%</span>
								</div>
								{formErrors.discount_value && (
									<p className="text-xs text-red-400 mt-1">{formErrors.discount_value}</p>
								)}
							</div>
						) : (
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
								<div>
									<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-1">{t('dialog.amountOff')}</label>
									<div className="relative">
										<span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 text-sm">
											{symbolFor(form.currency)}
										</span>
										<input
											type="number"
											min="0"
											step="0.01"
											value={form.discount_value}
											onChange={(e) =>
												setForm((f) => ({ ...f, discount_value: e.target.value }))
											}
											placeholder={t('dialog.amountPlaceholder')}
											className="w-full pl-12 pr-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
										/>
									</div>
									{formErrors.discount_value && (
										<p className="text-xs text-red-400 mt-1">{formErrors.discount_value}</p>
									)}
								</div>
								<div>
									<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-1">{t('dialog.currency')}</label>
									<select
										value={form.currency}
										onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
										className="w-full px-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
									>
										<option value="DOP">DOP (RD$)</option>
										<option value="USD">USD ($)</option>
									</select>
									{formErrors.currency && (
										<p className="text-xs text-red-400 mt-1">{formErrors.currency}</p>
									)}
								</div>
							</div>
						)}

						{/* Min order + max uses */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-1">{t('dialog.minOrder')}</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 text-sm">
										{form.discount_type === 'fixed' ? symbolFor(form.currency) : 'RD$'}
									</span>
									<input
										type="number"
										min="0"
										step="0.01"
										value={form.min_order_amount}
										onChange={(e) =>
											setForm((f) => ({ ...f, min_order_amount: e.target.value }))
										}
										placeholder={t('dialog.minOrderPlaceholder')}
										className="w-full pl-12 pr-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
									/>
								</div>
								{formErrors.min_order_amount && (
									<p className="text-xs text-red-400 mt-1">{formErrors.min_order_amount}</p>
								)}
							</div>
							<div>
								<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-1">{t('dialog.maxUses')}</label>
								<input
									type="number"
									min="1"
									step="1"
									value={form.max_uses}
									onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
									placeholder={t('dialog.maxUsesPlaceholder')}
									className="w-full px-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground placeholder:text-foreground/40 text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
								/>
								{formErrors.max_uses && (
									<p className="text-xs text-red-400 mt-1">{formErrors.max_uses}</p>
								)}
							</div>
						</div>

						{/* Window */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-1">{t('dialog.startsAt')}</label>
								<input
									type="datetime-local"
									value={form.starts_at}
									onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
									className="w-full px-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
								/>
							</div>
							<div>
								<label className="block text-xs uppercase tracking-widest text-foreground/60 mb-1">{t('dialog.endsAt')}</label>
								<input
									type="datetime-local"
									value={form.ends_at}
									onChange={(e) => setForm((f) => ({ ...f, ends_at: e.target.value }))}
									className="w-full px-3 py-2 rounded-md bg-card border border-foreground/10 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-mango-500/40"
								/>
								{formErrors.ends_at && (
									<p className="text-xs text-red-400 mt-1">{formErrors.ends_at}</p>
								)}
							</div>
						</div>

						{/* Active */}
						<div>
							<label className="inline-flex items-center gap-2 cursor-pointer">
								<input
									type="checkbox"
									checked={!!form.active}
									onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
									className="h-4 w-4 rounded border-foreground/20 bg-card text-mango-500 focus:ring-mango-500/40"
								/>
								<span className="text-sm text-foreground">{t('dialog.active')}</span>
							</label>
							<p className="text-xs text-foreground/50 mt-1">
								{t('dialog.activeHint')}
							</p>
						</div>

						<DialogFooter>
							<Button
								type="button"
								variant="ghost"
								onClick={() => setDialogOpen(false)}
								disabled={saving}
								className="border border-foreground/10"
							>
								{t('dialog.cancel')}
							</Button>
							<Button
								type="submit"
								disabled={saving}
								className="bg-mango-500 hover:bg-mango-600 text-stone-900"
							>
								{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
								{form.id ? t('dialog.save') : t('dialog.create')}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default AdminCouponsPage;
