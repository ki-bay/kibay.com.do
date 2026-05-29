// Helper for reading the language-specific column from a row that follows
// the `<field>_es` / `<field>_en` convention (products, blog posts, etc.).
//
// Resolution order, given baseKey 'title' and lang 'en':
//   1. obj.title_en      — preferred (lang-matching)
//   2. obj.title_es      — fallback if EN is missing (e.g. unpublished EN)
//   3. obj.title         — legacy single-language column (older blog rows)
//
// Returns undefined if none are present. Empty strings are treated as
// "missing" and fall through to the next option so a blank EN translation
// still shows the ES copy instead of nothing.

export function pickLocalized(obj, baseKey, lang) {
  if (!obj || !baseKey) return undefined;
  const suffix = lang === 'en' ? '_en' : '_es';
  const fallbackSuffix = lang === 'en' ? '_es' : '_en';
  const candidates = [
    obj[`${baseKey}${suffix}`],
    obj[`${baseKey}${fallbackSuffix}`],
    obj[baseKey],
  ];
  for (const v of candidates) {
    if (typeof v === 'string' && v.trim()) return v;
    if (v != null && typeof v !== 'string') return v;
  }
  return undefined;
}

// Convenience for components that read multiple fields at once. Returns an
// object with the same baseKeys, each resolved via pickLocalized.
export function pickLocalizedFields(obj, baseKeys, lang) {
  const out = {};
  for (const k of baseKeys) {
    out[k] = pickLocalized(obj, k, lang);
  }
  return out;
}

export default pickLocalized;
