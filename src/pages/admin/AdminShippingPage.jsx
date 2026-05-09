import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/customSupabaseClient';

const SYMBOL = { DOP: 'RD$', USD: '$' };

const toMajor = (cents) =>
	(Number(cents) || 0) / 100;
const toCents = (major) => Math.round((Number(major) || 0) * 100);

const AdminShippingPage = () => {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [draft, setDraft] = useState({}); // currency -> { free_over, standard, express } in major

	const load = async () => {
		setLoading(true);
		const { data, error } = await supabase
			.from('shipping_rates')
			.select('*')
			.order('currency');
		if (error) {
			toast.error(error.message);
			setLoading(false);
			return;
		}
		const byCurrency = data || [];
		setRows(byCurrency);
		const next = {};
		for (const r of byCurrency) {
			next[r.currency] = {
				free_over: String(toMajor(r.free_over_cents)),
				standard: String(toMajor(r.standard_cents)),
				express: String(toMajor(r.express_cents)),
			};
		}
		setDraft(next);
		setLoading(false);
	};

	useEffect(() => {
		load();
	}, []);

	const onChange = (currency, field, value) => {
		setDraft((d) => ({ ...d, [currency]: { ...d[currency], [field]: value } }));
	};

	const saveAll = async () => {
		setSaving(true);
		try {
			const updates = rows.map((r) => {
				const d = draft[r.currency] || {};
				return supabase
					.from('shipping_rates')
					.update({
						free_over_cents: toCents(d.free_over),
						standard_cents: toCents(d.standard),
						express_cents: toCents(d.express),
						updated_at: new Date().toISOString(),
					})
					.eq('currency', r.currency);
			});
			const results = await Promise.all(updates);
			const firstErr = results.find((r) => r.error);
			if (firstErr) throw firstErr.error;
			toast.success('Shipping rates updated');
			await load();
		} catch (err) {
			toast.error(err.message || 'Failed to save shipping rates');
		} finally {
			setSaving(false);
		}
	};

	return (
		<>
			<Helmet>
				<title>Shipping rates — Admin</title>
			</Helmet>
			<Navigation />
			<main id="main" role="main" className="min-h-screen bg-background pt-32 pb-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-4xl mx-auto">
					<div className="mb-8">
						<Link
							to="/dashboard/blog"
							className="inline-flex items-center gap-1 text-sm text-foreground/60 hover:text-foreground mb-4"
						>
							<ArrowLeft className="w-4 h-4" /> Back to dashboard
						</Link>
						<h1 className="text-3xl sm:text-4xl font-light text-foreground">Shipping rates</h1>
						<p className="text-foreground/60 mt-2 font-light">
							Per-currency tiers used at checkout. Amounts are in major units (e.g.
							RD$200 not 20000 cents). Saving updates the live{' '}
							<code className="text-xs">shipping_rates</code> table — checkout
							refetches on every page load.
						</p>
					</div>

					{loading ? (
						<div className="flex items-center gap-2 text-foreground/60">
							<Loader2 className="w-4 h-4 animate-spin" /> Loading…
						</div>
					) : rows.length === 0 ? (
						<p className="text-foreground/60">No shipping rate rows found.</p>
					) : (
						<div className="space-y-6">
							{rows.map((r) => {
								const d = draft[r.currency] || {};
								const sym = SYMBOL[r.currency] || '$';
								return (
									<div
										key={r.currency}
										className="bg-card border border-foreground/10 rounded-lg p-6"
									>
										<div className="flex items-center justify-between mb-4">
											<h2 className="text-xl font-semibold text-foreground">
												{r.currency} ({sym})
											</h2>
											<span className="text-xs text-foreground/40">
												updated {new Date(r.updated_at).toLocaleString()}
											</span>
										</div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
											<div>
												<label className="text-xs text-foreground/50 block mb-1">
													Free over ({sym})
												</label>
												<Input
													className="bg-background border-foreground/10 text-foreground"
													type="number"
													step="0.01"
													min="0"
													value={d.free_over ?? ''}
													onChange={(e) => onChange(r.currency, 'free_over', e.target.value)}
												/>
												<p className="text-xs text-foreground/40 mt-1">
													Subtotal at or above this threshold ships free.
												</p>
											</div>
											<div>
												<label className="text-xs text-foreground/50 block mb-1">
													Standard ({sym})
												</label>
												<Input
													className="bg-background border-foreground/10 text-foreground"
													type="number"
													step="0.01"
													min="0"
													value={d.standard ?? ''}
													onChange={(e) => onChange(r.currency, 'standard', e.target.value)}
												/>
											</div>
											<div>
												<label className="text-xs text-foreground/50 block mb-1">
													Express ({sym})
												</label>
												<Input
													className="bg-background border-foreground/10 text-foreground"
													type="number"
													step="0.01"
													min="0"
													value={d.express ?? ''}
													onChange={(e) => onChange(r.currency, 'express', e.target.value)}
												/>
											</div>
										</div>
									</div>
								);
							})}

							<div className="flex justify-end">
								<Button
									className="bg-mango-500 hover:bg-mango-600 text-white"
									disabled={saving}
									onClick={saveAll}
								>
									{saving ? (
										<>
											<Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…
										</>
									) : (
										'Save shipping rates'
									)}
								</Button>
							</div>
						</div>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
};

export default AdminShippingPage;
