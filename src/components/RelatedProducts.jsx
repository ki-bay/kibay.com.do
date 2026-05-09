import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';

const PLACEHOLDER =
	'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNWY0Ii8+PC9zdmc+';

const RelatedProducts = ({ excludeId, limit = 4 }) => {
	const { i18n } = useTranslation();
	const lang = (i18n.resolvedLanguage || 'es').slice(0, 2) === 'en' ? 'en' : 'es';
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;
		(async () => {
			let q = supabase
				.from('products')
				.select('id, slug, title_es, title_en, subtitle_es, subtitle_en, thumbnail_url, sort_order')
				.eq('status', 'published')
				.eq('purchasable', true)
				.order('sort_order', { ascending: true })
				.limit(limit + 1);
			if (excludeId) q = q.neq('id', excludeId);
			const { data } = await q;
			if (!cancelled) {
				setItems((data || []).slice(0, limit));
				setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [excludeId, limit]);

	if (loading) return null;
	if (!items.length) return null;

	const heading = lang === 'en' ? 'You may also like' : 'También te puede gustar';

	return (
		<section className="mb-20" aria-labelledby="related-products-heading">
			<h2 id="related-products-heading" className="text-2xl md:text-3xl font-serif text-stone-900 mb-8 text-center">
				{heading}
			</h2>
			<div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
				{items.map((p) => {
					const title = lang === 'en' ? p.title_en : p.title_es;
					const subtitle = lang === 'en' ? p.subtitle_en : p.subtitle_es;
					return (
						<Link
							key={p.id}
							to={`/product/${p.slug}`}
							className="group bg-white border border-stone-100 rounded-2xl overflow-hidden hover:shadow-xl transition-shadow"
						>
							<div className="aspect-[4/5] bg-stone-50 overflow-hidden">
								<img
									src={p.thumbnail_url || PLACEHOLDER}
									alt={`${title} — Kibay Caribbean wine`}
									width="800"
									height="1000"
									loading="lazy"
									decoding="async"
									className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
								/>
							</div>
							<div className="p-4">
								<h3 className="text-base font-serif text-stone-900 mb-1 line-clamp-1">{title}</h3>
								{subtitle && (
									<p className="text-xs text-stone-600 line-clamp-2 font-light">{subtitle}</p>
								)}
							</div>
						</Link>
					);
				})}
			</div>
		</section>
	);
};

export default RelatedProducts;
