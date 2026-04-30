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
      title={label}
      onClick={() => setTheme(next)}
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-foreground/15 bg-foreground/5 backdrop-blur-sm text-foreground/80 hover:text-foreground hover:bg-foreground/10 transition-colors',
        sizeClasses,
        className,
      )}
    >
      {isDark ? <Sun className={iconSize} strokeWidth={1.5} /> : <Moon className={iconSize} strokeWidth={1.5} />}
    </button>
  );
};

export default ThemeToggle;
