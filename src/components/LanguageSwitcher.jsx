import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const LANGS = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
];

const LanguageSwitcher = ({ className = '', size = 'md' }) => {
  const { i18n, t } = useTranslation('common');
  const current = (i18n.resolvedLanguage || 'es').slice(0, 2);

  const setLang = (code) => {
    if (code === current) return;
    i18n.changeLanguage(code);
  };

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-1' : 'text-xs px-3 py-1.5';

  return (
    <div
      role="group"
      aria-label={t('language.label')}
      className={cn(
        'inline-flex items-center rounded-full border border-white/15 bg-white/5 backdrop-blur-sm overflow-hidden',
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
                : 'text-white/70 hover:text-white hover:bg-white/10',
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
