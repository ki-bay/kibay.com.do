import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Star, Loader2, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const TITLE_MAX = 80;
const COMMENT_MAX = 2000;
const PAID_STATUSES = ['paid', 'processing', 'shipped', 'delivered'];

function formatDate(iso, locale) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (_) {
    return '';
  }
}

function StarRow({ value, max = 5, size = 16, className = '', ariaLabel }) {
  // value can be fractional; we render filled stars for whole numbers
  // and a half-fill marker via aria-label for decimals.
  const stars = [];
  for (let i = 1; i <= max; i++) {
    const filled = value >= i - 0.25;
    const half = !filled && value >= i - 0.75;
    stars.push(
      <Star
        key={i}
        size={size}
        className={
          filled
            ? 'fill-[#D4A574] text-[#D4A574]'
            : half
            ? 'fill-[#D4A574]/50 text-[#D4A574]'
            : 'fill-transparent text-stone-300'
        }
        aria-hidden="true"
      />
    );
  }
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={ariaLabel}>
      {stars}
    </span>
  );
}

function StarPicker({ value, onChange, disabled, t }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label={t('ratingAria')}>
      {[1, 2, 3, 4, 5].map((n) => {
        const active = (hover || value) >= n;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={t('starAria', { count: n })}
            disabled={disabled}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(n)}
            className="p-1 rounded-full hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Star
              size={28}
              className={
                active
                  ? 'fill-[#D4A574] text-[#D4A574]'
                  : 'fill-transparent text-stone-300'
              }
            />
          </button>
        );
      })}
    </div>
  );
}

export default function ProductReviews({ productId, onAggregateChange }) {
  const { t, i18n } = useTranslation('productReviews');
  const { user } = useAuth();

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');

  const locale = i18n.language?.startsWith('es') ? 'es-DO' : undefined;

  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReviews(data || []);
    } catch (err) {
      console.error('ProductReviews: fetch error', err);
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Compute aggregate and notify parent so it can feed Schema.org aggregateRating.
  const aggregate = useMemo(() => {
    if (!reviews.length) return { avg: 0, count: 0 };
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return { avg: sum / reviews.length, count: reviews.length };
  }, [reviews]);

  useEffect(() => {
    if (typeof onAggregateChange === 'function') {
      onAggregateChange(aggregate);
    }
  }, [aggregate, onAggregateChange]);

  const resetForm = useCallback(() => {
    setRating(0);
    setTitle('');
    setComment('');
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!user) {
        toast.error(t('toast.signInRequired'));
        return;
      }
      if (rating < 1 || rating > 5) {
        toast.error(t('toast.ratingRequired'));
        return;
      }
      const trimmedComment = comment.trim();
      if (!trimmedComment) {
        toast.error(t('toast.commentRequired'));
        return;
      }
      if (trimmedComment.length > COMMENT_MAX) {
        toast.error(t('toast.commentTooLong', { max: COMMENT_MAX }));
        return;
      }
      const trimmedTitle = title.trim().slice(0, TITLE_MAX);

      setSubmitting(true);
      try {
        // Resolve reviewer_name from auth metadata, falling back to public.users.full_name.
        let reviewerName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          null;
        if (!reviewerName) {
          const { data: profile } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle();
          reviewerName = profile?.full_name || null;
        }

        // Verified purchase: any paid/processing/shipped/delivered order owned by
        // this user that contains an order_item for this product (matched either
        // via TEXT product_id, or via variant_id -> product_variants.product_id).
        let verifiedPurchase = false;
        try {
          const { data: ordersForUser } = await supabase
            .from('orders')
            .select('id, status')
            .eq('user_id', user.id)
            .in('status', PAID_STATUSES);

          const orderIds = (ordersForUser || []).map((o) => o.id);
          if (orderIds.length) {
            // Match by direct text product_id (legacy/Hostinger rows store it there).
            const { data: directMatches } = await supabase
              .from('order_items')
              .select('id')
              .in('order_id', orderIds)
              .eq('product_id', productId)
              .limit(1);

            if (directMatches && directMatches.length) {
              verifiedPurchase = true;
            } else {
              // Match via variant -> product.
              const { data: variantsForProduct } = await supabase
                .from('product_variants')
                .select('id')
                .eq('product_id', productId);
              const variantIds = (variantsForProduct || []).map((v) => v.id);
              if (variantIds.length) {
                const { data: variantMatches } = await supabase
                  .from('order_items')
                  .select('id')
                  .in('order_id', orderIds)
                  .in('variant_id', variantIds)
                  .limit(1);
                verifiedPurchase = !!(variantMatches && variantMatches.length);
              }
            }
          }
        } catch (verifyErr) {
          // Non-fatal: just leave verifiedPurchase=false.
          console.warn('ProductReviews: verified-purchase lookup failed', verifyErr);
        }

        const { error: insertError } = await supabase.from('product_reviews').insert({
          product_id: productId,
          user_id: user.id,
          reviewer_name: reviewerName,
          rating,
          title: trimmedTitle || null,
          comment: trimmedComment,
          verified_purchase: verifiedPurchase,
        });

        if (insertError) throw insertError;

        toast.success(t('toast.success'));
        resetForm();
        setFormOpen(false);
        await fetchReviews();
      } catch (err) {
        console.error('ProductReviews: submit error', err);
        toast.error(err?.message || t('toast.submitError'));
      } finally {
        setSubmitting(false);
      }
    },
    [user, rating, title, comment, productId, fetchReviews, resetForm, t]
  );

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="border-t border-stone-100 pt-12 pb-4"
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <h2 id="reviews-heading" className="text-3xl md:text-4xl font-serif text-stone-900 mb-2">
            {t('heading')}
          </h2>
          {loading ? (
            <p className="text-stone-400 text-sm flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> {t('loading')}
            </p>
          ) : aggregate.count === 0 ? (
            <p className="text-stone-500">{t('beFirst')}</p>
          ) : (
            <div className="flex items-center gap-3 text-stone-600">
              <StarRow value={aggregate.avg} size={20} ariaLabel={t('starsAria', { value: aggregate.avg, max: 5 })} />
              <span className="text-stone-900 font-medium">{aggregate.avg.toFixed(1)}</span>
              <span className="text-stone-400">·</span>
              <span>
                {t('reviewCount', { count: aggregate.count })}
              </span>
            </div>
          )}
        </div>

        <div>
          {user ? (
            <Button
              type="button"
              onClick={() => setFormOpen((v) => !v)}
              className="bg-[#D4A574] hover:bg-[#c29462] text-white rounded-full px-6"
            >
              {formOpen ? (
                <>
                  {t('cancel')} <ChevronUp className="ml-1 h-4 w-4" />
                </>
              ) : (
                <>
                  {t('writeReview')} <ChevronDown className="ml-1 h-4 w-4" />
                </>
              )}
            </Button>
          ) : (
            <Link to="/login">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-stone-300 text-stone-700 hover:border-[#D4A574] hover:text-[#D4A574]"
              >
                {t('signInToReview')}
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Inline review form (accordion-style, not a modal) */}
      {user && formOpen && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-stone-200 rounded-2xl p-6 md:p-8 shadow-sm mb-10"
        >
          <div className="mb-6">
            <Label className="block text-sm font-medium text-stone-900 mb-2">
              {t('yourRating')}
            </Label>
            <StarPicker value={rating} onChange={setRating} disabled={submitting} t={t} />
          </div>

          <div className="mb-5">
            <Label htmlFor="review-title" className="block text-sm font-medium text-stone-900 mb-2">
              {t('title')} <span className="text-stone-400 font-normal">{t('optional')}</span>
            </Label>
            <Input
              id="review-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, TITLE_MAX))}
              maxLength={TITLE_MAX}
              placeholder={t('titlePlaceholder')}
              disabled={submitting}
            />
            <p className="text-xs text-stone-400 mt-1">
              {title.length}/{TITLE_MAX}
            </p>
          </div>

          <div className="mb-6">
            <Label htmlFor="review-comment" className="block text-sm font-medium text-stone-900 mb-2">
              {t('yourReview')}
            </Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, COMMENT_MAX))}
              maxLength={COMMENT_MAX}
              rows={5}
              placeholder={t('commentPlaceholder')}
              disabled={submitting}
              required
            />
            <p className="text-xs text-stone-400 mt-1">
              {comment.length}/{COMMENT_MAX}
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                setFormOpen(false);
              }}
              disabled={submitting}
              className="rounded-full"
            >
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitting || rating < 1 || !comment.trim()}
              className="bg-[#D4A574] hover:bg-[#c29462] text-white rounded-full px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('submitting')}
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Review list */}
      {!loading && reviews.length > 0 && (
        <ul className="space-y-6">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="bg-white border border-stone-100 rounded-2xl p-5 md:p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <StarRow value={r.rating || 0} size={16} ariaLabel={t('starsAria', { value: r.rating || 0, max: 5 })} />
                {r.title && (
                  <h3 className="text-lg font-serif text-stone-900">{r.title}</h3>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500 mb-3">
                <span className="font-medium text-stone-700">
                  {r.reviewer_name?.trim() || t('anonymous')}
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatDate(r.created_at, locale)}</span>
                {r.verified_purchase && (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                    <ShieldCheck size={14} /> {t('verifiedPurchase')}
                  </span>
                )}
              </div>
              {r.comment && (
                <p className="text-stone-600 leading-relaxed whitespace-pre-line">
                  {r.comment}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}