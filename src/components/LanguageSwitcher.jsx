import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const LANGS = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
];

// Two display modes:
//   default (desktop): ES/EN pill, both visible, active one highlighted.
//   variant="toggle" (mobile, compact): single circular button showing
//     the OTHER language — click to switch to it.
const LanguageSwitcher = ({ className = '', size = 'md', variant = 'pill' }) => {
  const { i18n, t } = useTranslation('common');
  const current = (i18n.resolvedLanguage || 'es').slice(0, 2);

  const setLang = (code) => {
    if (code === current) return;
    i18n.changeLanguage(code);
  };

  if (variant === 'toggle') {
    const other = current === 'es' ? 'en' : 'es';
    const otherLabel = other.toUpperCase();
    const sizeClasses = size === 'sm' ? 'w-7 h-7 text-[11px]' : 'w-8 h-8 text-xs';
    return (
      <button
        type="button"
        aria-label={t('language.switchTo', { lang: otherLabel })}
        title={t('language.switchTo', { lang: otherLabel })}
        onClick={() => setLang(other)}
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-foreground/25 bg-foreground/10 backdrop-blur-sm text-foreground font-medium tracking-wider hover:bg-foreground/20 transition-colors',
          sizeClasses,
          className,
        )}
      >
        {otherLabel}
      </button>
    );
  }

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-1.5';

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={cn(
        'inline-flex items-center rounded-full border border-foreground/15 bg-foreground/5 backdrop-blur-sm overflow-hidden',
        className,
      )}
    >
      {LANGS.map((lang, i) => {
        const active = current === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLang(lang.code)}
            aria-pressed={active}
            className={cn(
              'font-light tracking-wider uppercase transition-colors',
              sizeClasses,
              i === 0 ? 'rounded-l-full' : 'rounded-r-full',
              active
                ? 'bg-[#D4A574] text-stone-950'
                : 'text-foreground/70 hover:text-foreground hover:bg-foreground/10',
            )}
          >
            {lang.label}
          </button>
        );
      })}
    </div>
  );
};

export default LanguageSwitcher;
