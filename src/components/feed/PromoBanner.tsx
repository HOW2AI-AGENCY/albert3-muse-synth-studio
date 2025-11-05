/**
 * PromoBanner Component
 *
 * Promotional banner for Home/Feed page
 * Supports default, gradient, and video variants
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useCallback } from 'react';
import { X, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PromoBannerProps } from '@/types/suno-ui.types';

export const PromoBanner = memo<PromoBannerProps>(({
  title,
  description,
  ctaPrimary,
  ctaSecondary,
  imageUrl,
  variant = 'default',
  onDismiss,
}) => {
  const handlePrimaryCTA = useCallback(() => {
    if (ctaPrimary?.onClick) {
      ctaPrimary.onClick();
    } else if (ctaPrimary?.href) {
      window.location.href = ctaPrimary.href;
    }
  }, [ctaPrimary]);

  const handleSecondaryCTA = useCallback(() => {
    if (ctaSecondary?.onClick) {
      ctaSecondary.onClick();
    } else if (ctaSecondary?.href) {
      window.location.href = ctaSecondary.href;
    }
  }, [ctaSecondary]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-6 md:p-8',
        'transition-all duration-300 hover:shadow-lg',
        variant === 'gradient' &&
          'bg-gradient-to-br from-primary/90 via-primary to-primary/80',
        variant === 'default' &&
          'bg-gradient-to-br from-accent/50 to-accent/30 border border-border',
        variant === 'video' && 'bg-black'
      )}
    >
      {/* Background Image/Video */}
      {variant === 'default' && imageUrl && (
        <div className="absolute inset-0 opacity-20">
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
      )}

      {variant === 'video' && imageUrl && (
        <div className="absolute inset-0">
          <video
            src={imageUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
        </div>
      )}

      {/* Decorative Elements */}
      {variant === 'gradient' && (
        <>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 backdrop-blur-sm mb-2">
            <Sparkles
              className={cn(
                'w-5 h-5',
                variant === 'gradient' ? 'text-white' : 'text-primary'
              )}
            />
          </div>

          {/* Title */}
          <h2
            className={cn(
              'text-2xl md:text-3xl font-bold tracking-tight',
              variant === 'gradient' || variant === 'video'
                ? 'text-white'
                : 'text-foreground'
            )}
          >
            {title}
          </h2>

          {/* Description */}
          <p
            className={cn(
              'text-sm md:text-base max-w-2xl',
              variant === 'gradient' || variant === 'video'
                ? 'text-white/90'
                : 'text-muted-foreground'
            )}
          >
            {description}
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          {ctaPrimary && (
            <Button
              size="lg"
              onClick={handlePrimaryCTA}
              className={cn(
                'font-semibold gap-2',
                variant === 'gradient' &&
                  'bg-white text-primary hover:bg-white/90',
                variant === 'video' &&
                  'bg-white text-black hover:bg-white/90'
              )}
            >
              {ctaPrimary.label}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}

          {ctaSecondary && (
            <Button
              size="lg"
              variant="outline"
              onClick={handleSecondaryCTA}
              className={cn(
                'font-semibold',
                variant === 'gradient' &&
                  'border-white/30 text-white hover:bg-white/10',
                variant === 'video' &&
                  'border-white/30 text-white hover:bg-white/10'
              )}
            >
              {ctaSecondary.label}
            </Button>
          )}
        </div>
      </div>

      {/* Dismiss Button */}
      {onDismiss && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className={cn(
            'absolute top-2 right-2 z-20',
            variant === 'gradient' || variant === 'video'
              ? 'text-white/70 hover:text-white hover:bg-white/10'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

PromoBanner.displayName = 'PromoBanner';
