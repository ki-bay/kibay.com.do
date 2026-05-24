import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Eye, EyeOff, Trash2, Star, Filter } from 'lucide-react';
import { toast } from 'sonner';

// Admin moderation for product_reviews. The table allows authenticated users
// to insert their own reviews (auto-approved by default — see migration
// 20260509200000_product_reviews.sql). This page lets the owner unapprove
// spam, restore false-positives, or delete entirely.

const formatRelative = (iso) => {
	if (!iso) return '';
	const diff = Date.now() - new Date(iso).getTime();
	const m = Math.floor(diff / 60_000);
	if (m < 1) return 'just now';
	if (m < 60) return `${m}m ago`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h ago`;
	const d = Math.floor(h / 24);
	return `${d}d ago`;
};

const StarsRow = ({ rating }) => (
	<div className="flex items-center gap-0.5">
		{[1, 2, 3, 4, 5].map((n) => (
			<Star
				key={n}
				className={`w-4 h-4 ${n <= rating ? 'fill-[#D4A574] text-[#D4A574]' : 'text-foreground/20'}`}
				strokeWidth={1.5}
			/>
		))}
	</div>
);

const AdminReviewsPage = () => {
	const [loading, setLoading] = useState(true);
	const [reviews, setReviews] = useState([]);
	const [filter, setFilter] = useState('all'); // 'all' | 'approved' | 'hidden'
	const [acting, setActing] = useState({}); // { [id]: true }
	const [productMap, setProductMap] = useState({});

	const fetchReviews = useCallback(async () => {
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('product_reviews')
				.select('id, product_id, user_id, reviewer_name, rating, title, comment, verified_purchase, approved, created_at')
				.order('created_at', { ascending: false })
				.limit(200);
			if (error) throw error;
			setReviews(data || []);

			const productIds = [...new Set((data || []).map((r) => r.product_id))];
			if (productIds.length) {
				const { data: prods } = await supabase
					.from('products')
					.select('id, slug, title_es, title_en')
					.in('id', productIds);
				const map = {};
				for (const p of prods || []) map[p.id] = p;
				setProductMap(map);
			}
		} catch (err) {
			toast.error(`Could not load reviews: ${err.message}`);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchReviews();
	}, [fetchReviews]);

	const toggleApproved = useCallback(
		async (review) => {
			setActing((p) => ({ ...p, [review.id]: true }));
			try {
				const { error } = await supabase
					.from('product_reviews')
					.update({ approved: !review.approved })
					.eq('id', review.id);
				if (error) throw error;
				toast.success(review.approved ? 'Hidden from PDP' : 'Restored on PDP');
				setReviews((prev) =>
					prev.map((r) => (r.id === review.id ? { ...r, approved: !r.approved } : r)),
				);
			} catch (err) {
				toast.error(err.message);
			} finally {
				setActing((p) => {
					const next = { ...p };
					delete next[review.id];
					return next;
				});
			}
		},
		[],
	);

	const deleteReview = useCallback(
		async (review) => {
			if (!confirm(`Delete this ${review.rating}-star review by ${review.reviewer_name || 'anonymous'}? This cannot be undone.`)) return;
			setActing((p) => ({ ...p, [review.id]: true }));
			try {
				const { error } = await supabase.from('product_reviews').delete().eq('id', review.id);
				if (error) throw error;
				toast.success('Review deleted');
				setReviews((prev) => prev.filter((r) => r.id !== review.id));
			} catch (err) {
				toast.error(err.message);
			} finally {
				setActing((p) => {
					const next = { ...p };
					delete next[review.id];
					return next;
				});
			}
		},
		[],
	);

	const filtered = useMemo(() => {
		if (filter === 'approved') return reviews.filter((r) => r.approved);
		if (filter === 'hidden') return reviews.filter((r) => !r.approved);
		return reviews;
	}, [reviews, filter]);

	const stats = useMemo(() => {
		const approved = reviews.filter((r) => r.approved).length;
		const hidden = reviews.filter((r) => !r.approved).length;
		return { total: reviews.length, approved, hidden };
	}, [reviews]);

	return (
		<>
			<Helmet>
				<title>Reviews — Kibay Admin</title>
				<meta name="robots" content="noindex,follow" />
			</Helmet>
			<Navigation />
			<main className="min-h-screen pt-32 pb-24 px-4 md:px-8">
				<div className="max-w-5xl mx-auto">
					<div className="flex items-center justify-between mb-8 flex-wrap gap-3">
						<div>
							<h1 className="text-3xl font-light text-foreground flex items-center gap-3">
								<Star className="w-7 h-7 text-[#D4A574]" />
								Reviews
							</h1>
							<p className="text-sm text-foreground/55 font-light mt-1">
								{stats.total} total · {stats.approved} visible on PDPs · {stats.hidden} hidden
							</p>
						</div>
						<div className="flex items-center gap-2">
							<div className="inline-flex bg-foreground/5 rounded-full p-1" role="group">
								{['all', 'approved', 'hidden'].map((f) => (
									<button
										key={f}
										type="button"
										onClick={() => setFilter(f)}
										className={`px-3 py-1 rounded-full text-xs font-light transition-colors ${
											filter === f
												? 'bg-[#D4A574] text-stone-950'
												: 'text-foreground/60 hover:text-foreground'
										}`}
									>
										{f}
									</button>
								))}
							</div>
							<Button
								type="button"
								variant="outline"
								onClick={fetchReviews}
								disabled={loading}
								className="border-foreground/20"
							>
								<RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
								Refresh
							</Button>
						</div>
					</div>

					{loading && reviews.length === 0 ? (
						<div className="flex items-center justify-center py-24 text-foreground/50">
							<Loader2 className="w-6 h-6 animate-spin mr-2" />
							Loading…
						</div>
					) : filtered.length === 0 ? (
						<div className="text-center py-24 text-foreground/50 font-light">
							<Star className="w-10 h-10 mx-auto mb-3 opacity-40" />
							<p>
								{filter === 'hidden'
									? 'No hidden reviews — everything is showing on the PDPs.'
									: filter === 'approved'
									  ? 'No approved reviews yet.'
									  : 'No reviews yet. They will appear here once customers leave them.'}
							</p>
						</div>
					) : (
						<div className="space-y-4">
							{filtered.map((r) => {
								const isActing = !!acting[r.id];
								const product = productMap[r.product_id];
								return (
									<div
										key={r.id}
										className={`bg-card border rounded-2xl overflow-hidden ${
											r.approved ? 'border-foreground/15' : 'border-amber-500/40 bg-amber-500/5'
										}`}
									>
										<div className="px-5 py-3 border-b border-foreground/10 flex items-center justify-between flex-wrap gap-3">
											<div className="flex items-center gap-3 flex-wrap">
												<StarsRow rating={r.rating} />
												<span className="text-foreground/80 text-sm font-medium">
													{r.reviewer_name || 'Anonymous'}
												</span>
												{r.verified_purchase && (
													<span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
														Verified
													</span>
												)}
												{!r.approved && (
													<span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
														Hidden
													</span>
												)}
												<span className="text-xs text-foreground/45">{formatRelative(r.created_at)}</span>
											</div>
											{product && (
												<a
													href={`/product/${product.slug}`}
													target="_blank"
													rel="noreferrer"
													className="text-xs text-foreground/60 hover:text-[#D4A574]"
												>
													{product.title_es || product.title_en || product.slug}
												</a>
											)}
										</div>
										<div className="px-5 py-4 space-y-2">
											{r.title && <p className="text-foreground font-medium">{r.title}</p>}
											{r.comment && (
												<p className="text-foreground/75 font-light whitespace-pre-wrap text-sm">{r.comment}</p>
											)}
										</div>
										<div className="px-5 py-3 border-t border-foreground/10 flex items-center justify-end gap-2">
											<Button
												type="button"
												variant="outline"
												onClick={() => toggleApproved(r)}
												disabled={isActing}
												className="border-foreground/20"
											>
												{isActing ? (
													<Loader2 className="w-4 h-4 mr-2 animate-spin" />
												) : r.approved ? (
													<EyeOff className="w-4 h-4 mr-2" />
												) : (
													<Eye className="w-4 h-4 mr-2" />
												)}
												{r.approved ? 'Hide' : 'Restore'}
											</Button>
											<Button
												type="button"
												variant="outline"
												onClick={() => deleteReview(r)}
												disabled={isActing}
												className="border-red-500/40 text-red-400 hover:bg-red-500/10"
											>
												<Trash2 className="w-4 h-4 mr-2" />
												Delete
											</Button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</main>
			<Footer />
		</>
	);
};

export default AdminReviewsPage;
