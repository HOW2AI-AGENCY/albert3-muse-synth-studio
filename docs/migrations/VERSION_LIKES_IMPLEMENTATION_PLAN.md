# 📋 План реализации системы лайков для версий

**Статус:** В процессе  
**Приоритет:** Высокий  
**Оценка времени:** 2-3 дня

---

## ✅ Выполнено

- [x] Создана SQL-миграция `supabase/migrations/20251104000000_add_track_version_likes.sql`
- [x] Создана документация по миграции
- [x] Проведен аудит текущей системы лайков

---

## 🔄 Следующие шаги

### Шаг 1: Применить миграцию в БД ⏳

**Важно:** Эту операцию должен выполнить пользователь вручную.

**Инструкция:**
1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Перейдите в SQL Editor
3. Скопируйте содержимое `supabase/migrations/20251104000000_add_track_version_likes.sql`
4. Вставьте и выполните

**Проверка:**
```sql
SELECT COUNT(*) FROM track_version_likes; -- Должно вернуть 0
SELECT like_count FROM track_versions LIMIT 1; -- Должно вернуть 0
```

---

### Шаг 2: Регенерировать типы TypeScript ⏳

После применения миграции необходимо обновить типы:

```bash
npx supabase gen types typescript --project-id <YOUR_PROJECT_ID> > src/integrations/supabase/types.ts
```

Это добавит `track_version_likes` в TypeScript-типы Supabase.

---

### Шаг 3: Расширить LikesService 📝

Добавить методы для работы с версиями в `src/services/likes.service.ts`:

```typescript
/**
 * Toggle like for a specific track version
 */
static async toggleVersionLike(versionId: string, userId: string): Promise<boolean> {
  try {
    const { data: existing } = await supabase
      .from('track_version_likes')
      .select('id')
      .eq('version_id', versionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('track_version_likes')
        .delete()
        .eq('id', existing.id);
      return false;
    } else {
      await supabase
        .from('track_version_likes')
        .insert({ version_id: versionId, user_id: userId });
      return true;
    }
  } catch (error) {
    logger.error('Error toggling version like', error as Error);
    throw error;
  }
}

/**
 * Check if version is liked
 */
static async isVersionLiked(versionId: string, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('track_version_likes')
    .select('id')
    .eq('version_id', versionId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

/**
 * Get version like count
 */
static async getVersionLikeCount(versionId: string): Promise<number> {
  const { data } = await supabase
    .from('track_versions')
    .select('like_count')
    .eq('id', versionId)
    .maybeSingle();
  return data?.like_count || 0;
}
```

---

### Шаг 4: Создать хук useTrackVersionLike 📝

Создать файл `src/features/tracks/hooks/useTrackVersionLike.ts`:

```typescript
import { useState, useEffect } from 'react';
import { LikesService } from '@/services/likes.service';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

export const useTrackVersionLike = (versionId: string | undefined, initialLikeCount: number = 0) => {
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  // Check if version is liked on mount
  useEffect(() => {
    if (!versionId) return;
    
    const checkLikeStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const liked = await LikesService.isVersionLiked(versionId, user.id);
      setIsLiked(liked);
    };

    checkLikeStatus();
  }, [versionId]);

  // Subscribe to version changes
  useEffect(() => {
    if (!versionId) return;
    
    const channel = supabase
      .channel(`version-likes-${versionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'track_versions',
          filter: `id=eq.${versionId}`,
        },
        (payload) => {
          if (payload.new && 'like_count' in payload.new) {
            setLikeCount(payload.new.like_count as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [versionId]);

  const toggleLike = async () => {
    if (isLoading || !versionId) return;

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Войдите в систему', {
          description: 'Необходимо войти, чтобы ставить лайки',
        });
        return;
      }

      // Optimistic update
      const wasLiked = isLiked;
      setIsLiked(!wasLiked);
      setLikeCount(prev => wasLiked ? prev - 1 : prev + 1);

      // Perform toggle
      const nowLiked = await LikesService.toggleVersionLike(versionId, user.id);

      // Verify optimistic update
      if (nowLiked !== !wasLiked) {
        setIsLiked(nowLiked);
        const actualCount = await LikesService.getVersionLikeCount(versionId);
        setLikeCount(actualCount);
      }

      toast.success(nowLiked ? 'Версия добавлена в избранное' : 'Версия удалена из избранного');
    } catch (error) {
      logger.error('Error toggling version like', error as Error);
      
      // Revert on error
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : prev - 1);
      
      toast.error('Ошибка обновления лайка');
    } finally {
      setIsLoading(false);
    }
  };

  return { isLiked, likeCount, toggleLike, isLoading };
};
```

---

### Шаг 5: Обновить useTrackCardState 📝

В файле `src/features/tracks/components/card/useTrackCardState.ts`:

**Изменить:**
```typescript
// БЫЛО:
const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);

// СТАЛО:
const currentVersionId = displayedVersion.id; // Получить ID активной версии
const { isLiked, toggleLike, likeCount } = useTrackVersionLike(
  currentVersionId, 
  displayedVersion.like_count || 0
);
```

---

### Шаг 6: Обновить экспорты в hooks/index.ts 📝

```typescript
export { useTrackVersionLike } from '../features/tracks/hooks/useTrackVersionLike';
```

---

### Шаг 7: Тестирование 🧪

**Ручное тестирование:**
1. Создать трек с несколькими версиями
2. Поставить лайк на версию 1
3. Переключиться на версию 2
4. Убедиться, что лайк НЕ активен
5. Поставить лайк на версию 2
6. Переключиться обратно на версию 1
7. Убедиться, что лайк на версии 1 сохранился

**Проверить:**
- ✅ Счетчики обновляются корректно
- ✅ Realtime обновления работают
- ✅ Оптимистичные обновления корректны
- ✅ Откат при ошибках работает

---

## 🎯 Критерии готовности

- [ ] Миграция применена в production БД
- [ ] Типы TypeScript регенерированы
- [ ] LikesService расширен новыми методами
- [ ] Хук useTrackVersionLike создан и протестирован
- [ ] useTrackCardState использует версионные лайки
- [ ] Ручное тестирование пройдено
- [ ] Документация обновлена

---

## 📚 Связанные файлы

- `supabase/migrations/20251104000000_add_track_version_likes.sql`
- `docs/migrations/TRACK_VERSION_LIKES_MIGRATION.md`
- `src/services/likes.service.ts`
- `src/features/tracks/hooks/useTrackLike.ts`
- `src/features/tracks/components/card/useTrackCardState.ts`

---

## 💡 Дополнительные улучшения (опционально)

1. **Миграция старых лайков:**
   ```sql
   -- Перенести лайки треков на их master-версии
   INSERT INTO track_version_likes (user_id, version_id)
   SELECT tl.user_id, tv.id
   FROM track_likes tl
   JOIN track_versions tv ON tv.parent_track_id = tl.track_id
   WHERE tv.is_master = true
   ON CONFLICT DO NOTHING;
   ```

2. **Аналитика по лайкам версий:**
   - Какие версии популярнее (extend vs cover)
   - Корреляция между типом версии и лайками

3. **UI улучшения:**
   - Показывать иконку лайка для каждой версии в селекторе
   - Анимация при переключении между лайкнутыми версиями

---

**Статус:** Ожидание применения миграции пользователем
