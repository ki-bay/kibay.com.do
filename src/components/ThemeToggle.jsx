import React from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const ThemeToggle = ({ className = '', size = 'md' }) => {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useTranslation('common');
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted ? resolvedTheme === 'dark' : true;
  const next = isDark ? 'light' : 'dark';
  const label = isDark ? t('theme.toggleToLight') : t('theme.toggleToDark');

  const sizeClasses = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      onClick={() => setTheme(next)}
      className={cn(
        // Stronger contrast: full-opacity foreground text, /25 border + /10 bg
        // base, /20 on hover. Works on both light and dark theme cards
        // because foreground is the theme-aware token. Override-friendly via
        // the className prop (Navigation passes brand-gold styling when the
        // header is over the transparent homepage hero).
        'inline-flex items-center justify-center rounded-full border border-foreground/25 bg-foreground/10 backdrop-blur-sm text-foreground hover:bg-foreground/20 transition-colors',
        sizeClasses,
        className,
      )}
    >
      {isDark ? <Sun className={iconSize} strokeWidth={2} /> : <Moon className={iconSize} strokeWidth={2} />}
    </button>
  );
};

export default ThemeToggle;
