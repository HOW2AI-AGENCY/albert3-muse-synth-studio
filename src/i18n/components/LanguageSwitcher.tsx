/**
 * Language Switcher Component
 * UI component for changing application language
 * Phase 3 improvement from 2025-11-05 audit
 */

import { memo } from 'react';
import { Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '../LanguageContext';
import { Language } from '../config';
import { hapticFeedback } from '@/utils/haptic';
import { cn } from '@/lib/utils';

/**
 * Language switcher props
 */
interface LanguageSwitcherProps {
  /**
   * Display variant
   * - default: Icon + text
   * - icon-only: Only icon (for mobile)
   * - text-only: Only text
   */
  variant?: 'default' | 'icon-only' | 'text-only';

  /**
   * Button size
   */
  size?: 'sm' | 'default' | 'lg';

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Language switcher component
 * Dropdown menu for selecting application language
 */
export const LanguageSwitcher = memo<LanguageSwitcherProps>(({
  variant = 'default',
  size = 'default',
  className,
}) => {
  const { language, setLanguage, getLanguageName, availableLanguages } = useLanguage();

  /**
   * Handle language change
   */
  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    hapticFeedback.selection();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
          className={cn(
            'gap-2',
            variant === 'icon-only' && 'px-2',
            className
          )}
          aria-label="Change language"
        >
          <Languages className={cn(
            'h-4 w-4',
            size === 'sm' && 'h-3 w-3',
            size === 'lg' && 'h-5 w-5'
          )} />
          {variant !== 'icon-only' && (
            <span className="uppercase">{language}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={cn(
              'cursor-pointer',
              language === lang && 'bg-accent'
            )}
          >
            <div className="flex items-center justify-between w-full">
              <span>{getLanguageName(lang, 'native')}</span>
              {language === lang && (
                <span className="ml-2 text-xs text-muted-foreground">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

LanguageSwitcher.displayName = 'LanguageSwitcher';
