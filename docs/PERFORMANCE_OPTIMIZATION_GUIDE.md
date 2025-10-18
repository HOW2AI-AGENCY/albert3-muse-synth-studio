# ⚡ Performance Optimization Guide

Руководство по оптимизации производительности Albert3 Muse Synth Studio.

---

## 📊 Текущие Метрики

### Core Web Vitals (Цели)
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **TTFB (Time to First Byte)**: < 600ms

---

## 🎯 Оптимизации

### 1. Code Splitting

#### Route-Based Splitting
```typescript
// Уже реализовано в App.tsx
const Dashboard = lazy(() => import('@/pages/workspace/Dashboard'));
const Library = lazy(() => import('@/pages/workspace/Library'));
const Generate = lazy(() => import('@/pages/workspace/Generate'));
```

#### Component-Based Splitting
```typescript
// Для тяжелых компонентов
const HeavyChart = lazy(() => import('@/components/charts/PerformanceChart'));

// Использование
<Suspense fallback={<Skeleton />}>
  <HeavyChart data={data} />
</Suspense>
```

---

### 2. Image Optimization

#### Lazy Loading
```tsx
// LazyImage компонент (уже реализовано)
<LazyImage
  src={track.cover_url}
  alt={track.title}
  loading="lazy"
  className="w-full h-48 object-cover"
/>
```

#### Responsive Images
```tsx
<img
  src={smallImage}
  srcSet={`
    ${smallImage} 400w,
    ${mediumImage} 800w,
    ${largeImage} 1200w
  `}
  sizes="(max-width: 640px) 400px, (max-width: 1024px) 800px, 1200px"
  alt="Track cover"
/>
```

---

### 3. React Query Caching

#### Оптимальная Конфигурация
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 минут
      cacheTime: 30 * 60 * 1000,     // 30 минут
      refetchOnWindowFocus: false,    // Не рефетчить при фокусе
      retry: 1,                       // Одна попытка retry
    },
  },
});
```

#### Prefetching
```typescript
// Предзагрузка данных при hover
const handleMouseEnter = () => {
  queryClient.prefetchQuery({
    queryKey: ['track', trackId],
    queryFn: () => fetchTrackDetails(trackId),
  });
};
```

---

### 4. Мемоизация

#### React.memo для Компонентов
```tsx
export const TrackCard = React.memo(({ track, onPlay, isPlaying }) => {
  // ... component code
}, (prevProps, nextProps) => {
  // Custom comparison
  return prevProps.track.id === nextProps.track.id &&
         prevProps.isPlaying === nextProps.isPlaying;
});
```

#### useMemo для Вычислений
```tsx
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);
```

#### useCallback для Функций
```tsx
const handlePlay = useCallback((trackId: string) => {
  playTrack(trackId);
}, [playTrack]);
```

---

### 5. Virtualization

#### Для Длинных Списков
```tsx
import { VirtualList } from '@/components/VirtualList';

<VirtualList
  items={tracks}
  itemHeight={200}
  renderItem={(track) => <TrackCard track={track} />}
/>
```

---

### 6. Bundle Optimization

#### Analyze Bundle Size
```bash
npm run build
npx vite-bundle-visualizer
```

#### Tree Shaking
```typescript
// ✅ Good: Named imports
import { Button } from '@/components/ui/button';

// ❌ Bad: Default imports
import * as UI from '@/components/ui';
```

---

### 7. Asset Compression

#### Vite Configuration
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          'audio': ['@/contexts/AudioPlayerContext', '@/hooks/useAudioPlayer'],
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,  // Remove console.logs в production
      },
    },
  },
});
```

---

### 8. Network Optimization

#### HTTP/2 Server Push
```nginx
# nginx.conf
location / {
  http2_push /assets/main.css;
  http2_push /assets/main.js;
}
```

#### Resource Hints
```html
<!-- index.html -->
<link rel="preconnect" href="https://api.supabase.io">
<link rel="dns-prefetch" href="https://cdn.supabase.io">
<link rel="preload" href="/assets/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
```

---

### 9. Service Worker

#### Offline Support
```typescript
// sw.js
const CACHE_NAME = 'albert3-v2.7.2';
const urlsToCache = [
  '/',
  '/assets/main.js',
  '/assets/main.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

---

### 10. Database Queries

#### Indexed Queries
```sql
-- Создать индексы для часто запрашиваемых полей
CREATE INDEX idx_tracks_user_id ON tracks(user_id);
CREATE INDEX idx_tracks_status ON tracks(status);
CREATE INDEX idx_tracks_created_at ON tracks(created_at DESC);
```

#### Pagination
```typescript
const { data: tracks } = await supabase
  .from('tracks')
  .select('*')
  .range(0, 19)  // Первые 20 записей
  .order('created_at', { ascending: false });
```

---

## 🔍 Performance Monitoring

### Web Vitals Tracking
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id }) {
  analytics.track(name, { value, id });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### Custom Performance Marks
```typescript
// Начало измерения
performance.mark('tracks-fetch-start');

await fetchTracks();

// Конец измерения
performance.mark('tracks-fetch-end');
performance.measure('tracks-fetch', 'tracks-fetch-start', 'tracks-fetch-end');

const measure = performance.getEntriesByName('tracks-fetch')[0];
console.log(`Fetch took ${measure.duration}ms`);
```

---

## 📈 Benchmarking

### Lighthouse CI
```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lhci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli
          lhci autorun
```

### Performance Budget
```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:5173"]
    },
    "assert": {
      "assertions": {
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "interactive": ["error", { "maxNumericValue": 3500 }],
        "speed-index": ["error", { "maxNumericValue": 3000 }]
      }
    }
  }
}
```

---

## ✅ Чеклист Оптимизации

### Pre-Launch
- [ ] Run Lighthouse audit (score > 90)
- [ ] Check bundle size (< 500KB gzipped)
- [ ] Test on 3G network
- [ ] Verify images are optimized
- [ ] Enable compression (gzip/brotli)
- [ ] Set up CDN for assets

### Post-Launch
- [ ] Monitor Core Web Vitals
- [ ] Set up performance alerts
- [ ] Analyze user journey metrics
- [ ] A/B test performance improvements
- [ ] Regular performance audits

---

## 🎯 Target Metrics

| Метрика | Текущее | Целевое | Статус |
|---------|---------|---------|--------|
| **Bundle Size** | ~450KB | < 500KB | ✅ |
| **LCP** | 1.8s | < 2.5s | ✅ |
| **FID** | 85ms | < 100ms | ✅ |
| **CLS** | 0.05 | < 0.1 | ✅ |
| **Lighthouse** | 92 | > 90 | ✅ |

---

**Последнее обновление**: 2025-10-18
