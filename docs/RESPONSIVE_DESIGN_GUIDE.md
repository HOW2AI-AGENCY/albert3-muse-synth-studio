# 📱 Responsive Design Guide

Руководство по адаптивному дизайну в Albert3 Muse Synth Studio.

---

## 🎯 Mobile-First Философия

Мы следуем **mobile-first подходу**: сначала проектируем для мобильных устройств, затем расширяем для планшетов и десктопов.

---

## 📐 Breakpoints

### Tailwind Breakpoints
```typescript
const breakpoints = {
  'xs': '475px',    // Extra small phones
  'sm': '640px',    // Small phones
  'md': '768px',    // Tablets
  'lg': '1024px',   // Small desktops
  'xl': '1280px',   // Desktops
  '2xl': '1536px',  // Large desktops
  '3xl': '1920px',  // Ultra-wide
};
```

### Использование в CSS
```css
@media (min-width: 640px) {
  /* Стили для sm и выше */
}

@media (min-width: 768px) and (max-width: 1023px) {
  /* Стили только для tablet */
}
```

---

## 🎨 Responsive Utilities

### 1. Spacing

#### Mobile Spacing System
```css
:root {
  --mobile-spacing-xs: 0.25rem;  /* 4px */
  --mobile-spacing-sm: 0.5rem;   /* 8px */
  --mobile-spacing-md: 0.75rem;  /* 12px */
  --mobile-spacing-lg: 1rem;     /* 16px */
  --mobile-spacing-xl: 1.5rem;   /* 24px */
}
```

#### Responsive Padding/Margin
```tsx
<div className="p-2 sm:p-4 md:p-6 lg:p-8">
  Content
</div>
```

---

### 2. Typography

#### Font Size Scale
```css
:root {
  --mobile-font-xs: 0.625rem;   /* 10px */
  --mobile-font-sm: 0.75rem;    /* 12px */
  --mobile-font-base: 1rem;     /* 16px */
  --mobile-font-lg: 1.125rem;   /* 18px */
}
```

#### Responsive Text
```tsx
<h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl">
  Заголовок
</h1>
```

---

### 3. Grid System

#### Responsive Grid
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 3xl:grid-cols-8 gap-3">
  {tracks.map(track => <TrackCard key={track.id} track={track} />)}
</div>
```

#### Responsive Flex
```tsx
<div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
  <div className="flex-1">Left</div>
  <div className="flex-1">Right</div>
</div>
```

---

### 4. Visibility

#### Show/Hide Elements
```tsx
{/* Показать только на mobile */}
<div className="block sm:hidden">
  Mobile Only
</div>

{/* Показать только на desktop */}
<div className="hidden lg:block">
  Desktop Only
</div>

{/* Показать на tablet и выше */}
<div className="hidden md:block">
  Tablet & Desktop
</div>
```

#### Adaptive Icons
```tsx
<Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
```

---

## 📱 Touch Targets

### Минимальные Размеры
```css
:root {
  --mobile-touch-min: 44px;      /* Apple HIG минимум */
  --mobile-touch-optimal: 48px;  /* Material Design рекомендация */
}
```

### Примеры
```tsx
{/* Button с минимальным touch target */}
<Button className="min-h-[44px] sm:min-h-[40px]">
  Действие
</Button>

{/* Icon button */}
<Button size="icon" className="h-12 w-12 sm:h-10 sm:w-10">
  <Icon className="h-5 w-5" />
</Button>
```

---

## 🏗️ Layout Patterns

### 1. Adaptive Navigation

#### Desktop: Sidebar
```tsx
<MinimalSidebar
  isExpanded={isSidebarExpanded}
  onMouseEnter={() => setIsSidebarExpanded(true)}
  onMouseLeave={() => setIsSidebarExpanded(false)}
  className="hidden lg:block"
/>
```

#### Mobile: Bottom Tab Bar
```tsx
<BottomTabBar
  items={navigationItems}
  className="lg:hidden"
/>
```

---

### 2. Responsive Card

```tsx
const TrackCard = ({ track }) => {
  return (
    <Card className="p-2 sm:p-3 md:p-4">
      {/* Cover Image */}
      <div className="aspect-square mb-2 sm:mb-3">
        <img src={track.cover_url} alt={track.title} />
      </div>
      
      {/* Title */}
      <h3 className="text-sm sm:text-base font-semibold truncate">
        {track.title}
      </h3>
      
      {/* Actions */}
      <div className="flex gap-1 sm:gap-2 mt-2">
        <Button size="sm" className="flex-1">
          <Play className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
          <span className="hidden sm:inline">Play</span>
        </Button>
      </div>
    </Card>
  );
};
```

---

### 3. Responsive Dialog

```tsx
<Dialog>
  <DialogContent className="max-w-lg sm:max-w-xl md:max-w-2xl p-4 sm:p-6">
    <DialogHeader>
      <DialogTitle className="text-base sm:text-lg md:text-xl">
        Заголовок
      </DialogTitle>
    </DialogHeader>
    
    {/* Content */}
    <div className="mt-4 sm:mt-6">
      Content
    </div>
    
    {/* Footer */}
    <DialogFooter className="gap-2 sm:gap-0">
      <Button>Отмена</Button>
      <Button>Подтвердить</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 🎬 Responsive Animations

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Conditional Animations
```tsx
const isMobile = useIsMobile();

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: isMobile ? 0.2 : 0.3 }}
>
  Content
</motion.div>
```

---

## 📊 Responsive Tables

### Card Layout on Mobile
```tsx
const ResponsiveTable = ({ data }) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="space-y-2">
        {data.map(item => (
          <Card key={item.id} className="p-4">
            <div className="font-semibold">{item.name}</div>
            <div className="text-sm text-muted-foreground">{item.description}</div>
          </Card>
        ))}
      </div>
    );
  }
  
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(item => (
          <TableRow key={item.id}>
            <TableCell>{item.name}</TableCell>
            <TableCell>{item.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
```

---

## 🔧 Custom Hooks

### useIsMobile
```typescript
import { useState, useEffect } from 'react';

export const useIsMobile = (breakpoint = 768) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);
  
  return isMobile;
};
```

### useMediaQuery
```typescript
export const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  
  return matches;
};

// Usage
const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
```

---

## 📐 Safe Areas

### iOS Notch Support
```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top);
  --safe-area-inset-bottom: env(safe-area-inset-bottom);
}

.safe-area-inset {
  padding-top: var(--safe-area-inset-top);
  padding-bottom: var(--safe-area-inset-bottom);
}
```

### Dynamic Island Support
```tsx
<div 
  className="safe-area-inset"
  style={{
    paddingTop: 'max(env(safe-area-inset-top), 20px)'
  }}
>
  Content
</div>
```

---

## 🎯 Testing Checklist

### Devices to Test
- [ ] iPhone SE (375x667)
- [ ] iPhone 14 Pro (393x852)
- [ ] iPad (768x1024)
- [ ] iPad Pro (1024x1366)
- [ ] Desktop 1920x1080
- [ ] Ultra-wide 2560x1440

### Scenarios
- [ ] Portrait orientation
- [ ] Landscape orientation
- [ ] Touch interactions
- [ ] Keyboard navigation
- [ ] Zoom to 200%
- [ ] Dark/Light mode

---

## 🛠️ Debug Tools

### Responsive Preview
```tsx
// DevTools component
const ResponsiveDebug = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs">
      {windowSize.width} x {windowSize.height}
    </div>
  );
};
```

---

## 📚 Best Practices

### 1. Content First
✅ **Do**: Проектируйте контент для мобильных, затем расширяйте  
❌ **Don't**: Скрывайте важный контент на мобильных

### 2. Progressive Enhancement
✅ **Do**: Базовый функционал работает везде  
❌ **Don't**: Полагайтесь только на новые CSS/JS фичи

### 3. Touch-Friendly
✅ **Do**: Минимум 44px touch targets  
❌ **Don't**: Мелкие кликабельные элементы

### 4. Performance
✅ **Do**: Оптимизируйте для медленных соединений  
❌ **Don't**: Большие images/videos без оптимизации

### 5. Accessibility
✅ **Do**: Поддерживайте zoom до 200%  
❌ **Don't**: Фиксированные размеры шрифтов

---

## 🎨 Examples

### Responsive Form
```tsx
<form className="space-y-4 sm:space-y-6">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Input label="First Name" />
    <Input label="Last Name" />
  </div>
  
  <Input label="Email" className="w-full" />
  
  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
    <Button variant="outline" className="w-full sm:w-auto">
      Cancel
    </Button>
    <Button className="w-full sm:w-auto">
      Submit
    </Button>
  </div>
</form>
```

---

**Последнее обновление**: 2025-10-18
