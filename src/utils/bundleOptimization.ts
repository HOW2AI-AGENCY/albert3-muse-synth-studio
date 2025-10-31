/**
 * Bundle Optimization Utilities
 */

export const preconnectExternalResources = () => {
  if (typeof document === 'undefined') return;

  const resources = [
    'https://cdn.mureka.ai',
    'https://cdn.suno.ai',
  ];

  resources.forEach((url) => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = url;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

export const setupResourceHints = () => {
  if (typeof document === 'undefined') return;

  const hints = [
    { rel: 'dns-prefetch', href: 'https://cdn.mureka.ai' },
    { rel: 'dns-prefetch', href: 'https://cdn.suno.ai' },
  ];

  hints.forEach(({ rel, href }) => {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  });
};
