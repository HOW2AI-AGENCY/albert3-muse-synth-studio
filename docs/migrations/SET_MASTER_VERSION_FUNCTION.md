# Миграция: атомарная установка мастер‑версии

Цель: сделать операцию переключения мастер‑версии атомарной и быстрой, убрав гонки между двумя последовательными запросами.

## Что добавлено
- SQL‑функция `public.set_master_version(parent_track_id uuid, version_id uuid)`
- Индексы на `parent_track_id`, `is_preferred_variant`, `variant_index`

## SQL
Файл миграции: `supabase/migrations/20251109090000_set_master_version_function.sql`

Ключевые части:
```sql
CREATE OR REPLACE FUNCTION public.set_master_version(
  parent_track_id uuid,
  version_id uuid
)
RETURNS SETOF public.track_versions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.track_versions tv
    WHERE tv.id = version_id AND tv.parent_track_id = parent_track_id
  ) THEN
    RAISE EXCEPTION 'Version % does not belong to track %', version_id, parent_track_id
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.track_versions
  SET is_preferred_variant = false
  WHERE parent_track_id = parent_track_id;

  RETURN QUERY
  UPDATE public.track_versions
  SET is_preferred_variant = true
  WHERE id = version_id
  RETURNING *;
END;
$$;
```

## Как применить (Windows, Supabase CLI)
1. Установите Supabase CLI, если не установлен
```powershell
npm i -g supabase
```
2. Примените миграции локально
```powershell
supabase db reset            # полный ресет и применение всех миграций
# или только новую миграцию
supabase migration up --file .\supabase\migrations\20251109090000_set_master_version_function.sql
```
3. Деплой на прод через Supabase Dashboard
- Откройте SQL Editor проекта
- Вставьте содержимое миграции и выполните

## Использование из кода
В API заменён двойной апдейт на RPC‑вызов:
```ts
const { data, error } = await supabase.rpc('set_master_version', {
  parent_track_id: parentTrackId,
  version_id: versionId,
});
```
RPC возвращает массив с обновлённой строкой версии.

## Верификация
- Проверьте, что только одна версия имеет `is_preferred_variant=true` для каждого трека
```sql
SELECT parent_track_id, COUNT(*) FILTER (WHERE is_preferred_variant)
FROM public.track_versions
GROUP BY parent_track_id;
```
Ожидаемо: счётчик равен 1 (или 0, если не установлена мастер‑версия).

## Rollback
Удалите функцию и индексы при необходимости:
```sql
DROP FUNCTION IF EXISTS public.set_master_version(uuid, uuid);
DROP INDEX IF EXISTS idx_track_versions_parent;
DROP INDEX IF EXISTS idx_track_versions_preferred;
DROP INDEX IF EXISTS idx_track_versions_variant_index;
```