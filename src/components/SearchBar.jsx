import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { m, AnimatePresence } from 'framer-motion';
import { Search, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import supabase from '@/lib/customSupabaseClient';

// Escape characters that have meaning in PostgREST .or() filters.
// Commas and parentheses break the filter string; % is the wildcard we already
// add ourselves. Quotes can also confuse the parser.
function sanitizeTerm(raw) {
  return String(raw || '')
    .trim()
    .replace(/[,()"%]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SUGGESTIONS = {
  en: ['wine tour', 'espumante', 'passion fruit'],
  es: ['tour de vino', 'espumante', 'maracuyá'],
};

const SearchBar = ({ mobile = false }) => {
  const { t, i18n } = useTranslation('nav');
  const navigate = useNavigate();
  const lang = (i18n.resolvedLanguage || i18n.language || 'es').slice(0, 2) === 'en' ? 'en' : 'es';

  const [open, setOpen] = useState(mobile); // in mobile mode the input is always visible
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [products, setProducts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);

  const suggestions = SUGGESTIONS[lang] || SUGGESTIONS.es;

  // Build a flat list of items for keyboard navigation.
  const flatResults = useMemo(() => {
    return [
      ...products.map(p => ({
        kind: 'product',
        id: p.id,
        to: `/product/${p.slug}`,
        title: lang === 'en' ? (p.title_en || p.title_es) : (p.title_es || p.title_en),
        subtitle: lang === 'en' ? (p.subtitle_en || p.subtitle_es) : (p.subtitle_es || p.subtitle_en),
        image: p.thumbnail_url,
      })),
      ...posts.map(b => ({
        kind: 'blog',
        id: b.id,
        to: `/blog/${b.slug || b.id}`,
        title: b.title,
        subtitle: b.description,
        image: b.featured_image_url,
      })),
    ];
  }, [products, posts, lang]);

  // Debounce the query (250ms).
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  // Run the two parallel Supabase queries when debounced changes.
  useEffect(() => {
    const term = sanitizeTerm(debounced);
    if (!term) {
      setProducts([]);
      setPosts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const like = `%${term}%`;
    const productsP = supabase
      .from('products')
      .select('id, slug, title_es, title_en, subtitle_es, subtitle_en, thumbnail_url')
      .eq('status', 'published')
      .or(`title_es.ilike.${like},title_en.ilike.${like},subtitle_es.ilike.${like},subtitle_en.ilike.${like}`)
      .limit(6);
    const postsP = supabase
      .from('blog_posts')
      .select('id, slug, title, description, featured_image_url')
      .eq('published', true)
      .or(`title.ilike.${like},description.ilike.${like}`)
      .limit(4);

    Promise.all([productsP, postsP]).then(([prodRes, postRes]) => {
      if (cancelled) return;
      setProducts(prodRes.data || []);
      setPosts(postRes.data || []);
      setLoading(false);
      setHighlight(-1);
    }).catch(() => {
      if (cancelled) return;
      setProducts([]);
      setPosts([]);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [debounced]);

  const closeOverlay = useCallback(() => {
    if (mobile) return; // mobile mode is always visible
    setOpen(false);
    setHighlight(-1);
  }, [mobile]);

  // Esc to close + outside-click handling for the desktop overlay.
  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeOverlay();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight(h => (flatResults.length ? (h + 1) % flatResults.length : -1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(h => (flatResults.length ? (h - 1 + flatResults.length) % flatResults.length : -1));
      } else if (e.key === 'Enter') {
        if (highlight >= 0 && flatResults[highlight]) {
          e.preventDefault();
          const target = flatResults[highlight];
          navigate(target.to);
          closeOverlay();
          if (!mobile) setQuery('');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, flatResults, highlight, navigate, closeOverlay, mobile]);

  // Focus input when opening the desktop overlay.
  useEffect(() => {
    if (open && !mobile) {
      // small timeout so framer's mount finishes before focus
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [open, mobile]);

  const handleResultClick = () => {
    closeOverlay();
    if (!mobile) setQuery('');
  };

  const term = sanitizeTerm(debounced);
  const hasResults = products.length > 0 || posts.length > 0;
  const showEmpty = term && !loading && !hasResults;
  const showSuggestions = !term && !loading;

  // ------------------------------ Render -------------------------------------

  // Inner panel — the result list / suggestions / empty state.
  const renderPanel = () => (
    <div
      role="listbox"
      aria-label={t('search.label', { defaultValue: 'Search' })}
      className="max-h-[60vh] overflow-y-auto"
    >
      {loading && (
        <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin mr-2" aria-hidden="true" />
          ...
        </div>
      )}

      {showEmpty && (
        <div className="px-4 py-6 text-sm text-muted-foreground">
          {t('search.noResults', { defaultValue: 'No results for' })} &ldquo;{term}&rdquo; &mdash;{' '}
          {lang === 'en' ? 'try a different search.' : 'prueba con otra búsqueda.'}
        </div>
      )}

      {showSuggestions && (
        <div className="px-4 py-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2 font-light">
            {t('search.trySearches', { defaultValue: 'Try searching' })}
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(s => (
              <button
                type="button"
                key={s}
                onClick={() => { setQuery(s); inputRef.current?.focus(); }}
                className="px-3 py-1.5 text-xs rounded-full border border-border text-foreground hover:bg-foreground/5 hover:text-[#D4A574] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!loading && hasResults && (
        <>
          {products.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground font-light">
                {t('search.products', { defaultValue: 'Products' })}
              </div>
              <ul>
                {products.map((p, idx) => {
                  const i = idx;
                  const isOn = highlight === i;
                  const title = lang === 'en' ? (p.title_en || p.title_es) : (p.title_es || p.title_en);
                  const subtitle = lang === 'en' ? (p.subtitle_en || p.subtitle_es) : (p.subtitle_es || p.subtitle_en);
                  return (
                    <li key={`p-${p.id}`} role="option" aria-selected={isOn}>
                      <Link
                        to={`/product/${p.slug}`}
                        onClick={handleResultClick}
                        onMouseEnter={() => setHighlight(i)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 transition-colors',
                          isOn && 'bg-foreground/5'
                        )}
                      >
                        {p.thumbnail_url ? (
                          <img
                            src={p.thumbnail_url}
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-foreground/5 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-foreground/5 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-light text-foreground truncate">{title}</div>
                          {subtitle && (
                            <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {posts.length > 0 && (
            <div>
              <div className="px-4 pt-3 pb-1 text-[10px] uppercase tracking-widest text-muted-foreground font-light">
                {t('search.blog', { defaultValue: 'Blog' })}
              </div>
              <ul>
                {posts.map((b, idx) => {
                  const i = products.length + idx;
                  const isOn = highlight === i;
                  return (
                    <li key={`b-${b.id}`} role="option" aria-selected={isOn}>
                      <Link
                        to={`/blog/${b.slug || b.id}`}
                        onClick={handleResultClick}
                        onMouseEnter={() => setHighlight(i)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 transition-colors',
                          isOn && 'bg-foreground/5'
                        )}
                      >
                        {b.featured_image_url ? (
                          <img
                            src={b.featured_image_url}
                            alt=""
                            className="w-10 h-10 rounded object-cover bg-foreground/5 flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded bg-foreground/5 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-light text-foreground truncate">{b.title}</div>
                          {b.description && (
                            <div className="text-xs text-muted-foreground truncate">{b.description}</div>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );

  // ---------- Mobile: full-width input rendered inline ----------
  if (mobile) {
    return (
      <div className="w-full" ref={containerRef}>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            type="search"
            role="searchbox"
            aria-label={t('search.label', { defaultValue: 'Search Kibay' })}
            placeholder={t('search.placeholder', { defaultValue: 'Search wines, tours, blog...' })}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 pr-9 h-11 bg-background"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label={t('search.label', { defaultValue: 'Search' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground rounded-full"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>
        {(query || loading) && (
          <div className="mt-3 rounded-lg border border-border bg-card overflow-hidden">
            {renderPanel()}
          </div>
        )}
      </div>
    );
  }

  // ---------- Desktop: trigger button + overlay panel ----------
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('search.label', { defaultValue: 'Search' })}
        className="transition-colors cursor-pointer hover:text-[#D4A574] p-1 text-foreground"
      >
        <Search className="w-5 h-5" strokeWidth={1.5} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm flex items-start justify-center px-4 pt-24"
            onMouseDown={(e) => {
              // close when clicking outside the panel
              if (e.target === overlayRef.current) closeOverlay();
            }}
          >
            <m.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="relative border-b border-border">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  type="search"
                  role="searchbox"
                  aria-label={t('search.label', { defaultValue: 'Search Kibay' })}
                  placeholder={t('search.placeholder', { defaultValue: 'Search wines, tours, blog...' })}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none px-12 py-4 text-base text-foreground placeholder:text-muted-foreground focus:ring-0"
                />
                <button
                  type="button"
                  onClick={closeOverlay}
                  aria-label={t('close', { defaultValue: 'Close' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-foreground/5"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
              {renderPanel()}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SearchBar;
