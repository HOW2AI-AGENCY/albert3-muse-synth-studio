/**
 * Utility to get computed CSS variables for Canvas rendering.
 * Ensures that canvas drawings respect the application's theme.
 */

interface CanvasColors {
  background: string;
  foreground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  destructive: string;
  muted: string;
  mutedForeground: string;
  border: string;
  [key: string]: string; // Allow dynamic keys for flexibility
}

// Cache the colors object to avoid repeated DOM lookups
let cachedColors: CanvasColors | null = null;

export const getCanvasColors = (): CanvasColors => {
  if (cachedColors) {
    return cachedColors;
  }

  if (typeof window === 'undefined') {
    // Return fallback colors for SSR or non-browser environments
    return {
      background: '#ffffff',
      foreground: '#000000',
      primary: '#000000',
      primaryForeground: '#ffffff',
      secondary: '#f1f5f9',
      secondaryForeground: '#0f172a',
      accent: '#000000',
      destructive: '#ef4444',
      muted: '#f1f5f9',
      mutedForeground: '#64748b',
      border: '#e2e8f0',
    };
  }

  const style = getComputedStyle(document.documentElement);

  cachedColors = {
    background: style.getPropertyValue('--background').trim(),
    foreground: style.getPropertyValue('--foreground').trim(),
    primary: style.getPropertyValue('--primary').trim(),
    primaryForeground: style.getPropertyValue('--primary-foreground').trim(),
    secondary: style.getPropertyValue('--secondary').trim(),
    secondaryForeground: style.getPropertyValue('--secondary-foreground').trim(),
    accent: style.getPropertyValue('--accent').trim(),
    destructive: style.getPropertyValue('--destructive').trim(),
    muted: style.getPropertyValue('--muted').trim(),
    mutedForeground: style.getPropertyValue('--muted-foreground').trim(),
    border: style.getPropertyValue('--border').trim(),
  };

  return cachedColors;
};

// Function to invalidate the cache, e.g., on theme change
export const invalidateColorCache = () => {
  cachedColors = null;
};
