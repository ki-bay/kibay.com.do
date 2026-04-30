import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Save, Trash2, Plus, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const STATUSES = ['draft', 'published', 'archived'];

const slugify = (s) =>
	(s || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 80);

const blankVariant = () => ({
	id: null,
	title_es: 'Predeterminado',
	title_en: 'Default',
	sku: '',
	price_usd_cents: 0,
	sale_price_usd_cents: null,
	price_dop_cents: 0,
	sale_price_dop_cents: null,
	inventory_quantity: 0,
	manage_inventory: true,
	weight_grams: null,
	sort_order: 0,
});

const blankImage = () => ({ id: null, url: '', alt_text: '', sort_order: 0 });
const blankAdditionalInfo = () => ({ id: null, title_es: '', title_en: '', description_es: '', description_en: '', sort_order: 0 });

const Field = ({ label, hint, children }) => (
	<label className="block">
		<span className="block text-xs uppercase tracking-wider text-foreground/60 mb-1.5">{label}</span>
		{children}
		{hint && <span className="block text-xs text-foreground/40 mt-1">{hint}</span>}
	</label>
);

const Textarea = (props) => (
	<textarea
		{...props}
		className={`w-full rounded-md bg-background border border-foreground/10 text-foreground px-3 py-2 text-sm focus:outline-none focus:border-mango-500/60 ${props.className || ''}`}
	/>
);

const AdminProductFormPage = () => {
	const navigate = useNavigate();
	const { id } = useParams();
	const isEditing = Boolean(id);
	const { toast } = useToast();

	const [loading, setLoading] = useState(isEditing);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState(null);
	const [allCollections, setAllCollections] = useState([]);

	const [form, setForm] = useState({
		slug: '',
		title_es: '',
		title_en: '',
		subtitle_es: '',
		subtitle_en: '',
		ribbon_text_es: '',
		ribbon_text_en: '',
		description_es: '',
		description_en: '',
		thumbnail_url: '',
		status: 'draft',
		purchasable: true,
		type: 'physical',
		sort_order: 0,
	});
	const [variants, setVariants] = useState([blankVariant()]);
	const [images, setImages] = useState([]);
	const [collectionIds, setCollectionIds] = useState(new Set());
	const [additionalInfo, setAdditionalInfo] = useState([]);
	const [uploading, setUploading] = useState(false);
	const fileInputRef = useRef(null);

	// Load collections always; load product when editing.
	useEffect(() => {
		(async () => {
			const { data: cols } = await supabase
				.from('product_collections')
				.select('id, slug, title_es, title_en')
				.order('sort_order');
			setAllCollections(cols || []);

			if (!isEditing) {
				setLoading(false);
				return;
			}

			try {
				const [{ data: p, error: pe }, { data: v }, { data: img }, { data: ca }, { data: ai }] = await Promise.all([
					supabase.from('products').select('*').eq('id', id).single(),
					supabase.from('product_variants').select('*').eq('product_id', id).order('sort_order'),
					supabase.from('product_images').select('*').eq('product_id', id).order('sort_order'),
					supabase.from('product_collection_assignments').select('collection_id').eq('product_id', id),
					supabase.from('product_additional_info').select('*').eq('product_id', id).order('sort_order'),
				]);
				if (pe) throw pe;
				if (!p) throw new Error('Product not found');
				setForm({
					slug: p.slug,
					title_es: p.title_es || '',
					title_en: p.title_en || '',
					subtitle_es: p.subtitle_es || '',
					subtitle_en: p.subtitle_en || '',
					ribbon_text_es: p.ribbon_text_es || '',
					ribbon_text_en: p.ribbon_text_en || '',
					description_es: p.description_es || '',
					description_en: p.description_en || '',
					thumbnail_url: p.thumbnail_url || '',
					status: p.status,
					purchasable: p.purchasable,
					type: p.type || 'physical',
					sort_order: p.sort_order ?? 0,
				});
				setVariants((v && v.length ? v : [blankVariant()]).map((row) => ({
					id: row.id,
					title_es: row.title_es,
					title_en: row.title_en,
					sku: row.sku || '',
					price_usd_cents: row.price_usd_cents ?? 0,
					sale_price_usd_cents: row.sale_price_usd_cents ?? null,
					price_dop_cents: row.price_dop_cents ?? 0,
					sale_price_dop_cents: row.sale_price_dop_cents ?? null,
					inventory_quantity: row.inventory_quantity ?? 0,
					manage_inventory: row.manage_inventory,
					weight_grams: row.weight_grams,
					sort_order: row.sort_order ?? 0,
				})));
				setImages((img || []).map((row) => ({
					id: row.id, url: row.url, alt_text: row.alt_text || '', sort_order: row.sort_order ?? 0,
				})));
				setCollectionIds(new Set((ca || []).map((r) => r.collection_id)));
				setAdditionalInfo((ai || []).map((row) => ({
					id: row.id,
					title_es: row.title_es || '',
					title_en: row.title_en || '',
					description_es: row.description_es || '',
					description_en: row.description_en || '',
					sort_order: row.sort_order ?? 0,
				})));
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		})();
	}, [id, isEditing]);

	const setField = (k) => (e) => {
		const v = e?.target?.type === 'checkbox' ? e.target.checked : e?.target?.value ?? e;
		setForm((prev) => ({ ...prev, [k]: v }));
	};

	const onTitleEsChange = (e) => {
		const value = e.target.value;
		setForm((prev) => ({
			...prev,
			title_es: value,
			slug: prev.slug || slugify(value),
		}));
	};

	const updateVariant = (idx, patch) => {
		setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
	};

	const addVariant = () => setVariants((prev) => [...prev, { ...blankVariant(), sort_order: prev.length }]);
	const removeVariant = (idx) => setVariants((prev) => prev.filter((_, i) => i !== idx));

	const updateImage = (idx, patch) => setImages((prev) => prev.map((im, i) => (i === idx ? { ...im, ...patch } : im)));
	const addImage = () => setImages((prev) => [...prev, { ...blankImage(), sort_order: prev.length }]);
	const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

	const updateInfo = (idx, patch) => setAdditionalInfo((prev) => prev.map((ai, i) => (i === idx ? { ...ai, ...patch } : ai)));
	const addInfo = () => setAdditionalInfo((prev) => [...prev, { ...blankAdditionalInfo(), sort_order: prev.length }]);
	const removeInfo = (idx) => setAdditionalInfo((prev) => prev.filter((_, i) => i !== idx));

	const handleFileUpload = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (file.size > 10 * 1024 * 1024) {
			toast({ variant: 'destructive', title: 'File too large', description: 'Max 10MB.' });
			return;
		}
		setUploading(true);
		try {
			const ext = file.name.split('.').pop();
			const path = `${form.slug || 'product'}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
			const { error: upErr } = await supabase.storage.from('product_images').upload(path, file, { upsert: false });
			if (upErr) throw upErr;
			const { data } = supabase.storage.from('product_images').getPublicUrl(path);
			const url = data.publicUrl;
			setImages((prev) => [...prev, { id: null, url, alt_text: form.title_es, sort_order: prev.length }]);
			if (!form.thumbnail_url) setForm((prev) => ({ ...prev, thumbnail_url: url }));
			toast({ title: 'Image uploaded' });
		} catch (err) {
			toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
		} finally {
			setUploading(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	const toggleCollection = (collectionId) => {
		setCollectionIds((prev) => {
			const next = new Set(prev);
			if (next.has(collectionId)) next.delete(collectionId); else next.add(collectionId);
			return next;
		});
	};

	const validate = () => {
		if (!form.slug) return 'Slug is required.';
		if (!form.title_es) return 'Title (ES) is required.';
		if (!form.title_en) return 'Title (EN) is required.';
		if (variants.length === 0) return 'At least one variant is required.';
		for (const v of variants) {
			if (v.price_usd_cents == null || v.price_dop_cents == null) return 'Each variant needs both USD and DOP prices.';
		}
		return null;
	};

	const handleSave = useCallback(async () => {
		const errMsg = validate();
		if (errMsg) {
			toast({ variant: 'destructive', title: 'Cannot save', description: errMsg });
			return;
		}
		setSaving(true);
		setError(null);
		try {
			// Upsert product
			const productRow = {
				slug: form.slug,
				title_es: form.title_es,
				title_en: form.title_en,
				subtitle_es: form.subtitle_es || null,
				subtitle_en: form.subtitle_en || null,
				ribbon_text_es: form.ribbon_text_es || null,
				ribbon_text_en: form.ribbon_text_en || null,
				description_es: form.description_es || null,
				description_en: form.description_en || null,
				thumbnail_url: form.thumbnail_url || null,
				status: form.status,
				purchasable: form.purchasable,
				type: form.type || null,
				sort_order: Number(form.sort_order) || 0,
				updated_at: new Date().toISOString(),
			};

			let productId = id;
			if (isEditing) {
				const { error: e } = await supabase.from('products').update(productRow).eq('id', id);
				if (e) throw e;
			} else {
				const { data, error: e } = await supabase.from('products').insert(productRow).select('id').single();
				if (e) throw e;
				productId = data.id;
			}

			// Replace variants — delete-then-insert is simplest given inventory_quantity is the source of truth.
			const { error: dvErr } = await supabase.from('product_variants').delete().eq('product_id', productId);
			if (dvErr) throw dvErr;
			if (variants.length) {
				const rows = variants.map((v, i) => ({
					product_id: productId,
					title_es: v.title_es || 'Predeterminado',
					title_en: v.title_en || 'Default',
					sku: v.sku || null,
					price_usd_cents: Number(v.price_usd_cents) || 0,
					sale_price_usd_cents: v.sale_price_usd_cents == null || v.sale_price_usd_cents === '' ? null : Number(v.sale_price_usd_cents),
					price_dop_cents: Number(v.price_dop_cents) || 0,
					sale_price_dop_cents: v.sale_price_dop_cents == null || v.sale_price_dop_cents === '' ? null : Number(v.sale_price_dop_cents),
					inventory_quantity: Number(v.inventory_quantity) || 0,
					manage_inventory: !!v.manage_inventory,
					weight_grams: v.weight_grams == null || v.weight_grams === '' ? null : Number(v.weight_grams),
					sort_order: Number(v.sort_order) || i,
				}));
				const { error: ivErr } = await supabase.from('product_variants').insert(rows);
				if (ivErr) throw ivErr;
			}

			// Replace images
			const { error: diErr } = await supabase.from('product_images').delete().eq('product_id', productId);
			if (diErr) throw diErr;
			if (images.length) {
				const rows = images
					.filter((im) => im.url)
					.map((im, i) => ({
						product_id: productId,
						url: im.url,
						alt_text: im.alt_text || null,
						sort_order: Number(im.sort_order) || i,
					}));
				if (rows.length) {
					const { error: iiErr } = await supabase.from('product_images').insert(rows);
					if (iiErr) throw iiErr;
				}
			}

			// Replace collection assignments
			const { error: dcaErr } = await supabase.from('product_collection_assignments').delete().eq('product_id', productId);
			if (dcaErr) throw dcaErr;
			if (collectionIds.size) {
				const rows = Array.from(collectionIds).map((cid, i) => ({
					product_id: productId,
					collection_id: cid,
					sort_order: i,
				}));
				const { error: icaErr } = await supabase.from('product_collection_assignments').insert(rows);
				if (icaErr) throw icaErr;
			}

			// Replace additional_info
			const { error: daiErr } = await supabase.from('product_additional_info').delete().eq('product_id', productId);
			if (daiErr) throw daiErr;
			const aiRows = additionalInfo
				.filter((ai) => ai.title_es || ai.title_en || ai.description_es || ai.description_en)
				.map((ai, i) => ({
					product_id: productId,
					title_es: ai.title_es || '',
					title_en: ai.title_en || '',
					description_es: ai.description_es || null,
					description_en: ai.description_en || null,
					sort_order: Number(ai.sort_order) || i,
				}));
			if (aiRows.length) {
				const { error: iaiErr } = await supabase.from('product_additional_info').insert(aiRows);
				if (iaiErr) throw iaiErr;
			}

			toast({ title: 'Saved', description: form.slug });
			navigate(`/admin/products/${productId}/edit`, { replace: true });
		} catch (err) {
			setError(err.message);
			toast({ variant: 'destructive', title: 'Save failed', description: err.message });
		} finally {
			setSaving(false);
		}
	}, [form, variants, images, collectionIds, additionalInfo, id, isEditing, navigate, toast]);

	if (loading) {
		return (
			<>
				<Navigation />
				<div className="min-h-screen flex items-center justify-center bg-background">
					<Loader2 className="w-10 h-10 text-mango-500 animate-spin" />
				</div>
			</>
		);
	}

	return (
		<>
			<Helmet>
				<title>{isEditing ? `Edit ${form.title_es || form.slug}` : 'New Product'} — Admin</title>
			</Helmet>
			<Navigation />
			<main className="min-h-screen bg-background pt-32 pb-20 px-4 sm:px-6 lg:px-8">
				<div className="max-w-5xl mx-auto">
					<div className="flex items-center justify-between mb-8">
						<Link to="/admin/products" className="inline-flex items-center text-foreground/60 hover:text-foreground text-sm">
							<ArrowLeft className="w-4 h-4 mr-2" /> Back to products
						</Link>
						<Button onClick={handleSave} disabled={saving} className="bg-mango-500 hover:bg-mango-600 text-foreground">
							{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
							{isEditing ? 'Save changes' : 'Create product'}
						</Button>
					</div>

					<h1 className="text-3xl font-light text-foreground mb-2">{isEditing ? 'Edit Product' : 'New Product'}</h1>
					<p className="text-foreground/50 text-sm mb-8 font-light">
						All bilingual fields require both ES and EN. Currency conventions: ES UI sees DOP, EN UI sees USD.
					</p>

					{error && (
						<div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 flex items-start gap-2">
							<AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
							<span>{error}</span>
						</div>
					)}

					<div className="space-y-8">
						{/* Basic */}
						<section className="rounded-2xl bg-card/40 border border-foreground/10 p-6 space-y-4">
							<h2 className="text-lg text-foreground font-normal">Basics</h2>
							<div className="grid sm:grid-cols-2 gap-4">
								<Field label="Title (ES) *">
									<Input value={form.title_es} onChange={onTitleEsChange} placeholder="Kibay Espumante Lata" />
								</Field>
								<Field label="Title (EN) *">
									<Input value={form.title_en} onChange={setField('title_en')} placeholder="Kibay Sparkling Can" />
								</Field>
								<Field label="Slug *" hint="URL-friendly identifier. Auto-derived from ES title.">
									<Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: slugify(e.target.value) }))} placeholder="kibay-sparkling" />
								</Field>
								<Field label="Status">
									<select value={form.status} onChange={setField('status')} className="w-full rounded-md bg-background border border-foreground/10 text-foreground px-3 py-2 text-sm">
										{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
									</select>
								</Field>
								<Field label="Subtitle (ES)">
									<Input value={form.subtitle_es} onChange={setField('subtitle_es')} />
								</Field>
								<Field label="Subtitle (EN)">
									<Input value={form.subtitle_en} onChange={setField('subtitle_en')} />
								</Field>
								<Field label="Ribbon (ES)">
									<Input value={form.ribbon_text_es} onChange={setField('ribbon_text_es')} placeholder="Espumante" />
								</Field>
								<Field label="Ribbon (EN)">
									<Input value={form.ribbon_text_en} onChange={setField('ribbon_text_en')} placeholder="Sparkling" />
								</Field>
								<Field label="Sort order" hint="Lower numbers display first.">
									<Input type="number" value={form.sort_order} onChange={setField('sort_order')} />
								</Field>
								<Field label="Purchasable">
									<label className="flex items-center gap-2 text-foreground/80 text-sm">
										<input type="checkbox" checked={form.purchasable} onChange={setField('purchasable')} />
										Customers can add this to cart
									</label>
								</Field>
							</div>
						</section>

						{/* Descriptions */}
						<section className="rounded-2xl bg-card/40 border border-foreground/10 p-6 space-y-4">
							<h2 className="text-lg text-foreground font-normal">Description (HTML)</h2>
							<div className="grid lg:grid-cols-2 gap-4">
								<Field label="Description (ES)">
									<Textarea rows={10} value={form.description_es} onChange={setField('description_es')} />
								</Field>
								<Field label="Description (EN)">
									<Textarea rows={10} value={form.description_en} onChange={setField('description_en')} />
								</Field>
							</div>
						</section>

						{/* Images */}
						<section className="rounded-2xl bg-card/40 border border-foreground/10 p-6 space-y-4">
							<div className="flex items-center justify-between">
								<h2 className="text-lg text-foreground font-normal">Images</h2>
								<div className="flex gap-2">
									<input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
									<Button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} variant="ghost" className="border border-foreground/10 text-foreground">
										{uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImageIcon className="w-4 h-4 mr-2" />}
										Upload
									</Button>
									<Button type="button" onClick={addImage} variant="ghost" className="border border-foreground/10 text-foreground">
										<Plus className="w-4 h-4 mr-2" /> Add URL
									</Button>
								</div>
							</div>
							<Field label="Thumbnail URL" hint="Used in lists and cards. The first uploaded image is set automatically.">
								<Input value={form.thumbnail_url} onChange={setField('thumbnail_url')} placeholder="https://..." />
							</Field>
							{images.length === 0 ? (
								<p className="text-foreground/40 text-sm italic">No images yet.</p>
							) : (
								<div className="space-y-3">
									{images.map((im, i) => (
										<div key={i} className="grid grid-cols-12 gap-3 items-start">
											{im.url ? (
												<img src={im.url} alt={im.alt_text} className="col-span-2 w-full h-20 object-cover rounded-md bg-background" />
											) : (
												<div className="col-span-2 w-full h-20 rounded-md bg-background border border-foreground/5" />
											)}
											<div className="col-span-7">
												<Input value={im.url} onChange={(e) => updateImage(i, { url: e.target.value })} placeholder="Image URL" />
												<Input className="mt-2" value={im.alt_text} onChange={(e) => updateImage(i, { alt_text: e.target.value })} placeholder="Alt text" />
											</div>
											<div className="col-span-2">
												<Input type="number" value={im.sort_order} onChange={(e) => updateImage(i, { sort_order: e.target.value })} />
											</div>
											<div className="col-span-1 text-right">
												<Button type="button" size="sm" variant="ghost" onClick={() => removeImage(i)} className="text-red-400">
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</section>

						{/* Variants */}
						<section className="rounded-2xl bg-card/40 border border-foreground/10 p-6 space-y-4">
							<div className="flex items-center justify-between">
								<h2 className="text-lg text-foreground font-normal">Variants & Inventory</h2>
								<Button type="button" onClick={addVariant} variant="ghost" className="border border-foreground/10 text-foreground">
									<Plus className="w-4 h-4 mr-2" /> Add variant
								</Button>
							</div>
							{variants.map((v, i) => (
								<div key={i} className="rounded-xl bg-background/60 border border-foreground/5 p-4 space-y-3">
									<div className="grid sm:grid-cols-3 gap-3">
										<Field label="Title (ES)"><Input value={v.title_es} onChange={(e) => updateVariant(i, { title_es: e.target.value })} /></Field>
										<Field label="Title (EN)"><Input value={v.title_en} onChange={(e) => updateVariant(i, { title_en: e.target.value })} /></Field>
										<Field label="SKU"><Input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} /></Field>
									</div>
									<div className="grid sm:grid-cols-4 gap-3">
										<Field label="Price USD (cents)" hint="$8.00 = 800">
											<Input type="number" value={v.price_usd_cents} onChange={(e) => updateVariant(i, { price_usd_cents: e.target.value })} />
										</Field>
										<Field label="Sale USD (cents)">
											<Input type="number" value={v.sale_price_usd_cents ?? ''} onChange={(e) => updateVariant(i, { sale_price_usd_cents: e.target.value })} />
										</Field>
										<Field label="Price DOP (cents)" hint="RD$500 = 50000">
											<Input type="number" value={v.price_dop_cents} onChange={(e) => updateVariant(i, { price_dop_cents: e.target.value })} />
										</Field>
										<Field label="Sale DOP (cents)">
											<Input type="number" value={v.sale_price_dop_cents ?? ''} onChange={(e) => updateVariant(i, { sale_price_dop_cents: e.target.value })} />
										</Field>
									</div>
									<div className="grid sm:grid-cols-4 gap-3 items-end">
										<Field label="Inventory">
											<Input type="number" value={v.inventory_quantity} onChange={(e) => updateVariant(i, { inventory_quantity: e.target.value })} />
										</Field>
										<Field label="Track inventory">
											<label className="flex items-center gap-2 text-foreground/80 text-sm h-9">
												<input type="checkbox" checked={v.manage_inventory} onChange={(e) => updateVariant(i, { manage_inventory: e.target.checked })} />
												Auto-decrement on paid
											</label>
										</Field>
										<Field label="Weight (g)">
											<Input type="number" value={v.weight_grams ?? ''} onChange={(e) => updateVariant(i, { weight_grams: e.target.value })} />
										</Field>
										<div className="text-right">
											<Button type="button" size="sm" variant="ghost" onClick={() => removeVariant(i)} className="text-red-400" disabled={variants.length === 1}>
												<Trash2 className="w-4 h-4 mr-2" /> Remove
											</Button>
										</div>
									</div>
								</div>
							))}
						</section>

						{/* Collections */}
						<section className="rounded-2xl bg-card/40 border border-foreground/10 p-6 space-y-4">
							<h2 className="text-lg text-foreground font-normal">Collections</h2>
							{allCollections.length === 0 ? (
								<p className="text-foreground/40 text-sm italic">No collections defined.</p>
							) : (
								<div className="grid sm:grid-cols-2 gap-2">
									{allCollections.map((c) => (
										<label key={c.id} className="flex items-center gap-2 text-foreground/80 text-sm">
											<input type="checkbox" checked={collectionIds.has(c.id)} onChange={() => toggleCollection(c.id)} />
											<span>{c.title_es} <span className="text-foreground/40">/ {c.title_en}</span> <span className="text-foreground/30 font-mono text-xs">({c.slug})</span></span>
										</label>
									))}
								</div>
							)}
						</section>

						{/* Additional info */}
						<section className="rounded-2xl bg-card/40 border border-foreground/10 p-6 space-y-4">
							<div className="flex items-center justify-between">
								<h2 className="text-lg text-foreground font-normal">Additional Info Sections</h2>
								<Button type="button" onClick={addInfo} variant="ghost" className="border border-foreground/10 text-foreground">
									<Plus className="w-4 h-4 mr-2" /> Add section
								</Button>
							</div>
							{additionalInfo.length === 0 ? (
								<p className="text-foreground/40 text-sm italic">FAQ-style sections like "Storage", "Allergens", "Returns".</p>
							) : (
								additionalInfo.map((ai, i) => (
									<div key={i} className="rounded-xl bg-background/60 border border-foreground/5 p-4 space-y-3">
										<div className="grid sm:grid-cols-2 gap-3">
											<Field label="Title (ES)"><Input value={ai.title_es} onChange={(e) => updateInfo(i, { title_es: e.target.value })} /></Field>
											<Field label="Title (EN)"><Input value={ai.title_en} onChange={(e) => updateInfo(i, { title_en: e.target.value })} /></Field>
										</div>
										<div className="grid lg:grid-cols-2 gap-3">
											<Field label="Description (ES) — HTML"><Textarea rows={5} value={ai.description_es} onChange={(e) => updateInfo(i, { description_es: e.target.value })} /></Field>
											<Field label="Description (EN) — HTML"><Textarea rows={5} value={ai.description_en} onChange={(e) => updateInfo(i, { description_en: e.target.value })} /></Field>
										</div>
										<div className="flex justify-end">
											<Button type="button" size="sm" variant="ghost" onClick={() => removeInfo(i)} className="text-red-400">
												<Trash2 className="w-4 h-4 mr-2" /> Remove section
											</Button>
										</div>
									</div>
								))
							)}
						</section>
					</div>

					<div className="mt-10 flex justify-end">
						<Button onClick={handleSave} disabled={saving} className="bg-mango-500 hover:bg-mango-600 text-foreground">
							{saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
							{isEditing ? 'Save changes' : 'Create product'}
						</Button>
					</div>
				</div>
			</main>
			<Footer />
		</>
	);
};

export default AdminProductFormPage;
