# 🚀 PHASE 2: Advanced UX & Features - Детальный План
**Версия:** 2.0  
**Дата:** 02.11.2025  
**Начало:** Week 3-4 (после завершения Phase 1)

---

## 📋 Executive Summary

**Phase 2** фокусируется на **продвинутых UX-улучшениях** и **новых фичах**, которые повысят вовлеченность пользователей и качество взаимодействия с приложением.

### 🎯 Основные цели:
1. ✨ Снизить порог входа для новых пользователей (Onboarding)
2. 🎨 Дать возможность персонализации интерфейса
3. 📊 Визуализировать прогресс и статистику пользователя
4. 🎭 Добавить умные подсказки на основе AI

---

## 🧭 Task 2.1: Smart Onboarding Flow

### 📝 Описание
Интерактивный тур для новых пользователей с использованием `react-joyride`, который проведет через основные функции приложения.

### ✅ Acceptance Criteria
- [ ] Тур показывается только новым пользователям (проверка через `localStorage` + DB)
- [ ] 4-5 шагов: Generator → Prompt Input → Provider Selector → Library → Player
- [ ] Возможность пропустить или завершить тур в любой момент
- [ ] Progress indicator (шаг X из Y)
- [ ] Сохранение состояния прохождения в `user_preferences` таблице
- [ ] Адаптивный дизайн (работает на mobile/desktop)

### 📁 Файлы для создания/обновления

#### 1. Компонент тура
```typescript
// src/components/onboarding/OnboardingTour.tsx

import Joyride, { Step, CallBackProps } from 'react-joyride';
import { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { supabase } from '@/integrations/supabase/client';

const TOUR_STEPS: Step[] = [
  {
    target: '#generator-prompt',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-lg">👋 Добро пожаловать!</h3>
        <p>Начните с описания музыки, которую хотите создать. Например: "энергичная электронная музыка для тренировки"</p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '#generator-provider',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-lg">🎵 Выбор провайдера</h3>
        <p><strong>Suno</strong> - отлично подходит для музыки с вокалом</p>
        <p><strong>Mureka</strong> - лучше для инструментальной музыки</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '#generator-generate-btn',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-lg">✨ Создание трека</h3>
        <p>Нажмите кнопку для генерации. Процесс займет 2-3 минуты.</p>
        <p className="text-sm text-muted-foreground">Вы получите уведомление, когда трек будет готов</p>
      </div>
    ),
    placement: 'top',
  },
  {
    target: '#library-link',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-lg">📚 Ваша библиотека</h3>
        <p>Все созданные треки появятся здесь. Вы сможете:</p>
        <ul className="list-disc list-inside text-sm">
          <li>Прослушивать и скачивать</li>
          <li>Разделять на стемы</li>
          <li>Создавать кавер-версии</li>
          <li>Продлевать треки</li>
        </ul>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '#audio-player',
    content: (
      <div className="space-y-2">
        <h3 className="font-bold text-lg">🎧 Плеер</h3>
        <p>Компактный плеер появится здесь при воспроизведении трека</p>
        <p className="text-sm text-muted-foreground">Поддерживает очередь, управление версиями и регулировку громкости</p>
      </div>
    ),
    placement: 'top',
  },
];

export const OnboardingTour = () => {
  const [run, setRun] = useState(false);
  const { markCompleted, isCompleted } = useOnboardingStore();

  useEffect(() => {
    // Проверяем, нужно ли показывать тур
    const checkOnboarding = async () => {
      const completed = await isCompleted();
      if (!completed) {
        // Задержка 1 секунда перед стартом
        setTimeout(() => setRun(true), 1000);
      }
    };

    checkOnboarding();
  }, [isCompleted]);

  const handleCallback = async (data: CallBackProps) => {
    const { status, type } = data;

    if (status === 'finished' || status === 'skipped') {
      await markCompleted();
      setRun(false);
    }
  };

  return (
    <Joyride
      steps={TOUR_STEPS}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: 'hsl(var(--primary))',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
        },
        buttonNext: {
          backgroundColor: 'hsl(var(--primary))',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 1rem',
        },
        buttonSkip: {
          color: 'hsl(var(--muted-foreground))',
        },
      }}
    />
  );
};
```

#### 2. Zustand Store для onboarding
```typescript
// src/stores/useOnboardingStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingState {
  completedSteps: string[];
  isCompleted: () => Promise<boolean>;
  markCompleted: () => Promise<void>;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedSteps: [],

      isCompleted: async () => {
        // Проверяем localStorage
        const localCompleted = localStorage.getItem('onboarding_completed') === 'true';
        if (localCompleted) return true;

        // Проверяем DB
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data, error } = await supabase
          .from('user_preferences')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();

        return data?.onboarding_completed || false;
      },

      markCompleted: async () => {
        // Сохраняем в localStorage
        localStorage.setItem('onboarding_completed', 'true');

        // Сохраняем в DB
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            onboarding_completed: true,
            updated_at: new Date().toISOString(),
          });

        set({ completedSteps: ['all'] });
      },

      resetOnboarding: () => {
        localStorage.removeItem('onboarding_completed');
        set({ completedSteps: [] });
      },
    }),
    {
      name: 'onboarding-storage',
    }
  )
);
```

#### 3. Migration для user_preferences
```sql
-- Migration: 20251102000001_add_onboarding_preferences.sql

-- Добавляем колонку onboarding_completed если таблица уже существует
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Или создаем таблицу, если ее нет
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme_accent_color TEXT DEFAULT '#818cf8',
  theme_density TEXT DEFAULT 'comfortable',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);
```

#### 4. Интеграция в App.tsx
```typescript
// src/App.tsx

import { OnboardingTour } from '@/components/onboarding/OnboardingTour';

function App() {
  return (
    <>
      {/* ... existing routes */}
      
      {/* Onboarding Tour - показывается поверх всего */}
      <OnboardingTour />
    </>
  );
}
```

### 📦 Зависимости
```bash
npm install react-joyride@^2.8.2
```

### 📊 Метрики успеха
- [ ] ≥70% новых пользователей завершают тур
- [ ] ≤2 минуты на прохождение
- [ ] ≥80% пользователей генерируют трек после тура

---

## 🎨 Task 2.2: Theme Customization

### 📝 Описание
Система персонализации интерфейса: выбор акцентного цвета, плотности spacing, темной/светлой темы.

### ✅ Acceptance Criteria
- [ ] 4 предустановленных цветовых темы (Purple, Blue, Pink, Green)
- [ ] 3 режима плотности (Compact, Comfortable, Spacious)
- [ ] Live preview изменений
- [ ] Сохранение в DB + localStorage для быстрой загрузки
- [ ] Применение CSS переменных через `document.documentElement.style`
- [ ] Адаптивный UI (работает на всех устройствах)

### 📁 Файлы для создания/обновления

#### 1. Theme Customizer Component
```typescript
// src/components/settings/ThemeCustomizer.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from '@/utils/iconImports';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/useThemeStore';

const COLOR_PRESETS = [
  { name: 'Purple', value: '#818cf8', hsl: '262 83% 58%' },
  { name: 'Blue', value: '#0ea5e9', hsl: '189 94% 43%' },
  { name: 'Pink', value: '#ec4899', hsl: '330 81% 60%' },
  { name: 'Green', value: '#10b981', hsl: '142 76% 36%' },
];

const DENSITY_OPTIONS = [
  { 
    value: 'compact', 
    label: 'Компактный', 
    description: '75% от обычного',
    spacing: '0.75' 
  },
  { 
    value: 'comfortable', 
    label: 'Комфортный', 
    description: '100% - по умолчанию',
    spacing: '1' 
  },
  { 
    value: 'spacious', 
    label: 'Просторный', 
    description: '125% от обычного',
    spacing: '1.25' 
  },
];

export const ThemeCustomizer = () => {
  const { accentColor, density, setAccentColor, setDensity, saveToDb } = useThemeStore();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Apply theme changes to CSS
  useEffect(() => {
    const selectedPreset = COLOR_PRESETS.find(p => p.value === accentColor);
    if (selectedPreset) {
      document.documentElement.style.setProperty('--color-primary', selectedPreset.hsl);
    }
  }, [accentColor]);

  useEffect(() => {
    const densityValue = DENSITY_OPTIONS.find(d => d.value === density)?.spacing || '1';
    document.documentElement.style.setProperty('--density-scale', densityValue);
    
    // Apply to spacing multiplier
    document.documentElement.setAttribute('data-density', density);
  }, [density]);

  const handleColorChange = (color: string) => {
    setAccentColor(color);
    setHasUnsavedChanges(true);
  };

  const handleDensityChange = (newDensity: string) => {
    setDensity(newDensity as 'compact' | 'comfortable' | 'spacious');
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    await saveToDb();
    setHasUnsavedChanges(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎨 Персонализация
            {hasUnsavedChanges && (
              <Badge variant="secondary" className="ml-auto">
                Не сохранено
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Color Picker */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Акцентный цвет</Label>
            <div className="grid grid-cols-4 gap-3">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => handleColorChange(preset.value)}
                  className={cn(
                    'relative h-20 rounded-lg border-2 transition-all hover:scale-105',
                    accentColor === preset.value 
                      ? 'border-foreground shadow-lg' 
                      : 'border-border hover:border-foreground/50'
                  )}
                  style={{ backgroundColor: preset.value }}
                >
                  {accentColor === preset.value && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="w-6 h-6 text-white drop-shadow-lg" />
                    </div>
                  )}
                  <div className="absolute bottom-1 left-0 right-0 text-center">
                    <span className="text-xs font-medium text-white drop-shadow">
                      {preset.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Density Toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Плотность интерфейса</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {DENSITY_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  variant={density === option.value ? 'default' : 'outline'}
                  className="h-auto py-4 flex flex-col items-start gap-1"
                  onClick={() => handleDensityChange(option.value)}
                >
                  <span className="font-semibold">{option.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Предпросмотр</Label>
            <div 
              className="p-4 rounded-lg border bg-card"
              style={{ 
                borderColor: accentColor,
                transform: `scale(${density === 'compact' ? '0.9' : density === 'spacious' ? '1.1' : '1'})`
              }}
            >
              <h3 className="font-semibold mb-2" style={{ color: accentColor }}>
                Пример карточки
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Так будут выглядеть элементы интерфейса с выбранными настройками
              </p>
              <Button size="sm" style={{ backgroundColor: accentColor }}>
                Пример кнопки
              </Button>
            </div>
          </div>

          {/* Save Button */}
          {hasUnsavedChanges && (
            <Button onClick={handleSave} className="w-full">
              💾 Сохранить настройки
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
```

#### 2. Theme Store
```typescript
// src/stores/useThemeStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface ThemeState {
  accentColor: string;
  density: 'compact' | 'comfortable' | 'spacious';
  setAccentColor: (color: string) => void;
  setDensity: (density: 'compact' | 'comfortable' | 'spacious') => void;
  loadFromDb: () => Promise<void>;
  saveToDb: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      accentColor: '#818cf8',
      density: 'comfortable',

      setAccentColor: (color) => set({ accentColor: color }),
      setDensity: (density) => set({ density }),

      loadFromDb: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('user_preferences')
          .select('theme_accent_color, theme_density')
          .eq('user_id', user.id)
          .single();

        if (data) {
          set({
            accentColor: data.theme_accent_color || '#818cf8',
            density: data.theme_density || 'comfortable',
          });
        }
      },

      saveToDb: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { accentColor, density } = get();

        await supabase
          .from('user_preferences')
          .upsert({
            user_id: user.id,
            theme_accent_color: accentColor,
            theme_density: density,
            updated_at: new Date().toISOString(),
          });
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
```

### 📊 Метрики успеха
- [ ] ≥40% пользователей кастомизируют тему
- [ ] ≤5 секунд на применение изменений
- [ ] 100% сохранения между сессиями

---

## 📊 Task 2.3: User Analytics Dashboard

### 📝 Описание
Визуализация статистики пользователя: количество треков, прослушивания, любимые жанры, активность по дням.

### ✅ Acceptance Criteria
- [ ] 4 KPI карточки: Total Tracks, Total Likes, Total Plays, Total Downloads
- [ ] 3 графика: Generation Trend (area chart), Top Genres (pie chart), Provider Usage (bar chart)
- [ ] Insights блок с AI-подсказками
- [ ] Фильтрация по периоду (Last 7 days, Last 30 days, All time)
- [ ] Адаптивная grid layout (responsive)

### 📁 Файлы для создания/обновления

#### 1. Analytics Page
```typescript
// src/pages/workspace/Analytics.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Music, 
  Heart, 
  PlayCircle, 
  Download,
  TrendingUp,
  TrendingDown
} from '@/utils/iconImports';
import { 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { useUserStats } from '@/hooks/useUserStats';

type Period = '7d' | '30d' | 'all';

export const Analytics = () => {
  const [period, setPeriod] = useState<Period>('30d');
  const { data: stats, isLoading } = useUserStats(period);

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">📊 Аналитика</h1>
          <p className="text-muted-foreground mt-1">
            Обзор вашей музыкальной активности
          </p>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="7d">7 дней</TabsTrigger>
            <TabsTrigger value="30d">30 дней</TabsTrigger>
            <TabsTrigger value="all">Все время</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Music />}
          label="Всего треков"
          value={stats.totalTracks}
          trend={stats.tracksTrend}
          trendLabel="+12% за месяц"
        />
        <MetricCard
          icon={<Heart />}
          label="Всего лайков"
          value={stats.totalLikes}
          trend={stats.likesTrend}
          trendLabel="+5% за месяц"
        />
        <MetricCard
          icon={<PlayCircle />}
          label="Прослушиваний"
          value={stats.totalPlays}
          trend={stats.playsTrend}
          trendLabel="+18% за месяц"
        />
        <MetricCard
          icon={<Download />}
          label="Скачиваний"
          value={stats.totalDownloads}
          trend={stats.downloadsTrend}
          trendLabel="+8% за месяц"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generation Trend */}
        <Card>
          <CardHeader>
            <CardTitle>📈 Динамика генерации</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.generationsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="count" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary) / 0.2)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Genres */}
        <Card>
          <CardHeader>
            <CardTitle>🎵 Топ жанры</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.genreDistribution}
                  dataKey="count"
                  nameKey="genre"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {stats.genreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Provider Usage */}
        <Card>
          <CardHeader>
            <CardTitle>⚡ Использование провайдеров</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.providerStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="provider" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle>💡 Инсайты</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.insights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span>{insight.icon}</span>
                  <p className="text-sm">{insight.text}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MetricCard = ({ icon, label, value, trend, trendLabel }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        {trend > 0 ? (
          <TrendingUp className="w-4 h-4 text-green-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-red-500" />
        )}
      </div>
      <div className="mt-3">
        <p className="text-3xl font-bold">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1">{trendLabel}</p>
      </div>
    </CardContent>
  </Card>
);
```

#### 2. useUserStats Hook
```typescript
// src/hooks/useUserStats.ts

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';

export const useUserStats = (period: '7d' | '30d' | 'all') => {
  return useQuery({
    queryKey: ['user-stats', period],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const startDate = period === 'all' 
        ? new Date(0) 
        : subDays(new Date(), period === '7d' ? 7 : 30);

      // Fetch tracks
      const { data: tracks } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      // Aggregate stats
      const totalTracks = tracks?.length || 0;
      const totalLikes = tracks?.reduce((sum, t) => sum + (t.like_count || 0), 0) || 0;
      const totalPlays = tracks?.reduce((sum, t) => sum + (t.play_count || 0), 0) || 0;
      const totalDownloads = tracks?.reduce((sum, t) => sum + (t.download_count || 0), 0) || 0;

      // Generation trend (group by day)
      const generationsByDay = tracks?.reduce((acc, track) => {
        const date = format(new Date(track.created_at), 'dd MMM');
        const existing = acc.find(d => d.date === date);
        if (existing) {
          existing.count++;
        } else {
          acc.push({ date, count: 1 });
        }
        return acc;
      }, [] as Array<{ date: string; count: number }>);

      // Genre distribution
      const genreMap = new Map<string, number>();
      tracks?.forEach(track => {
        const genre = track.style_tags?.[0] || 'Unknown';
        genreMap.set(genre, (genreMap.get(genre) || 0) + 1);
      });
      const genreDistribution = Array.from(genreMap.entries())
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Provider stats
      const providerStats = [
        { provider: 'Suno', count: tracks?.filter(t => t.provider === 'suno').length || 0 },
        { provider: 'Mureka', count: tracks?.filter(t => t.provider === 'mureka').length || 0 },
      ];

      // AI Insights
      const insights = [
        { icon: '🎤', text: `Вы чаще генерируете треки с вокалом (${Math.round((tracks?.filter(t => t.has_vocals).length || 0) / totalTracks * 100)}%)` },
        { icon: '🎵', text: `Самый популярный жанр: ${genreDistribution[0]?.genre || 'N/A'} (${genreDistribution[0]?.count || 0} треков)` },
        { icon: '⏰', text: `Лучшее время для генерации: вечер (18-22)` },
      ];

      return {
        totalTracks,
        totalLikes,
        totalPlays,
        totalDownloads,
        tracksTrend: 12,
        likesTrend: 5,
        playsTrend: 18,
        downloadsTrend: 8,
        generationsByDay: generationsByDay || [],
        genreDistribution,
        providerStats,
        insights,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 минут
  });
};
```

### 📊 Метрики успеха
- [ ] ≥30% пользователей открывают Analytics
- [ ] ≥10 секунд среднее время на странице
- [ ] ≥60% кликают на insights

---

## 📦 Общие зависимости Phase 2

```json
{
  "react-joyride": "^2.8.2",
  "recharts": "^2.15.4",
  "date-fns": "^3.0.0"
}
```

---

## 📈 Roadmap Phase 2

### Week 3 (Sprint 33)
- [ ] Day 1-2: Task 2.1 (Onboarding Tour) - компонент + store + DB migration
- [ ] Day 3-4: Task 2.2 (Theme Customizer) - компонент + store + CSS integration
- [ ] Day 5: Testing & Bug fixes

### Week 4 (Sprint 34)
- [ ] Day 1-3: Task 2.3 (Analytics Dashboard) - page + hook + charts
- [ ] Day 4: Integration testing всех фич
- [ ] Day 5: Документация + Deployment

---

## ✅ Acceptance Criteria (Overall Phase 2)

- [ ] Onboarding Tour работает для новых пользователей
- [ ] Theme Customization сохраняется между сессиями
- [ ] Analytics Dashboard показывает корректные данные
- [ ] Все фичи адаптивны (mobile + desktop)
- [ ] Unit tests coverage ≥70% для новых компонентов
- [ ] Lighthouse score ≥90
- [ ] Нет performance regression (TTI ≤2s)

---

**Статус:** ✅ Готов к реализации  
**Приоритет:** P1 (High)  
**Зависимости:** Phase 1 должна быть завершена
