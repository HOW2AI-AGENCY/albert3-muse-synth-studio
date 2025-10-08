# Storage Management Guide

## Обзор

Albert3 Muse Synth Studio использует Supabase Storage для надёжного хранения всех медиафайлов. Это решает проблему истечения срока действия URL от внешних провайдеров (обычно 15 дней) и обеспечивает долгосрочное хранение.

## Storage Buckets

### 1. `tracks-audio` 🎵
**Назначение**: Хранение аудиофайлов треков

**Параметры**:
- Максимальный размер файла: 100MB
- Публичный доступ: Да
- Разрешённые типы MIME: `audio/mpeg`, `audio/wav`, `audio/mp3`
- Cache-Control: 1 год (31536000 секунд)

**Структура папок**:
```
tracks-audio/
├── {userId}/
│   ├── {trackId}/
│   │   ├── main.mp3          # Основной трек
│   │   ├── version-1.mp3     # Версия 1
│   │   ├── version-2.mp3     # Версия 2
│   │   └── ...
```

### 2. `tracks-covers` 🖼️
**Назначение**: Хранение обложек треков

**Параметры**:
- Максимальный размер файла: 10MB
- Публичный доступ: Да
- Разрешённые типы MIME: `image/jpeg`, `image/png`, `image/webp`
- Cache-Control: 1 год

**Структура папок**:
```
tracks-covers/
├── {userId}/
│   ├── {trackId}/
│   │   ├── cover.jpg              # Основная обложка
│   │   ├── version-1-cover.jpg    # Обложка версии 1
│   │   └── ...
```

### 3. `tracks-videos` 🎬
**Назначение**: Хранение видеоклипов треков

**Параметры**:
- Максимальный размер файла: 500MB
- Публичный доступ: Да
- Разрешённые типы MIME: `video/mp4`, `video/webm`
- Cache-Control: 1 год

**Структура папок**:
```
tracks-videos/
├── {userId}/
│   ├── {trackId}/
│   │   ├── video.mp4              # Основное видео
│   │   ├── version-1-video.mp4    # Видео версии 1
│   │   └── ...
```

## RLS Policies

### Безопасность доступа

Каждый bucket защищён Row Level Security (RLS) политиками:

#### INSERT (Загрузка)
- **Кто**: Только аутентифицированные пользователи
- **Что**: Могут загружать файлы в папки со своим `userId`

#### SELECT (Чтение)
- **Кто**: Все пользователи (public)
- **Что**: Могут читать/скачивать любые файлы (публичный доступ для проигрывания)

#### DELETE (Удаление)
- **Кто**: Только аутентифицированные пользователи
- **Что**: Могут удалять файлы только из своих папок

## Автоматическая загрузка

### Процесс генерации трека

1. **Запрос к Suno API** → Генерация трека
2. **Получение результата** → Временные URL на CDN Suno
3. **Автоматическая загрузка** → Скачивание и загрузка в Supabase Storage
4. **Сохранение в БД** → URL обновляется на постоянный Storage URL

### Retry механизм

При загрузке используется механизм повторных попыток:

- **Максимум попыток**: 3
- **Интервалы**: 1s, 2s, 3s (экспоненциальный backoff)
- **Fallback**: При неудаче используется оригинальный URL

### Обработка ошибок

```typescript
try {
  const storageUrl = await downloadAndUploadAudio(...);
  // Используем Storage URL
} catch (error) {
  console.error('Upload failed:', error);
  // Fallback на original URL
  return originalUrl;
}
```

## Миграция существующих треков

### Запуск миграции

Для миграции старых треков с внешних URL на Storage:

```bash
# Вызов edge function миграции
curl -X POST https://your-project.supabase.co/functions/v1/migrate-tracks-to-storage \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Процесс миграции

1. **Поиск треков** с внешними URL (cdn.suno.ai, apiboxfiles, mfile)
2. **Проверка доступности** каждого URL
3. **Скачивание и загрузка** в Storage
4. **Обновление БД** с новыми URL
5. **Пометка недоступных** как `failed` (требуют регенерации)

### Статистика миграции

После завершения вы получите отчёт:

```json
{
  "total": 100,
  "migrated": 85,
  "failed": 10,
  "skipped": 5,
  "success_rate": "85.0%"
}
```

## Производительность

### Оптимизация

- **Параллельная загрузка**: Аудио, обложка и видео загружаются одновременно
- **Кэширование**: Cache-Control установлен на 1 год
- **CDN**: Supabase Storage использует CDN для быстрой доставки
- **Компрессия**: Автоматическая компрессия для веб-доставки

### Мониторинг

Следите за использованием Storage:

1. Откройте Lovable Cloud Dashboard
2. Перейдите в раздел Storage
3. Проверьте:
   - Общий размер файлов
   - Количество файлов
   - Bandwidth использование

## Best Practices

### 1. Именование файлов

✅ **Правильно**:
```
main.mp3
version-1.mp3
cover.jpg
```

❌ **Неправильно**:
```
track_2024_10_08_final_v2.mp3
cover (1).jpg
```

### 2. Структура папок

✅ **Правильно**:
```
{userId}/{trackId}/main.mp3
```

❌ **Неправильно**:
```
tracks/{trackId}/{userId}/main.mp3
```

### 3. Обработка ошибок

Всегда проверяйте доступность URL перед воспроизведением:

```typescript
try {
  const response = await fetch(audioUrl, { method: 'HEAD' });
  // URL доступен
} catch (error) {
  // URL недоступен, показать сообщение об ошибке
}
```

## Устранение проблем

### Проблема: "Аудио недоступно"

**Причина**: URL истёк или файл не существует

**Решение**:
1. Проверьте статус трека в БД
2. Если `status = 'failed'`, регенерируйте трек
3. Если `audio_url` содержит внешний URL, запустите миграцию

### Проблема: Медленная загрузка

**Причина**: Большой размер файла или медленное соединение

**Решение**:
1. Проверьте размер файла (должен быть < 100MB)
2. Используйте CDN URL вместо прямого Storage URL
3. Включите сжатие в настройках браузера

### Проблема: "Permission denied"

**Причина**: Нарушение RLS политик

**Решение**:
1. Проверьте аутентификацию пользователя
2. Убедитесь, что пользователь загружает в свою папку
3. Проверьте RLS политики в Supabase Dashboard

## API Reference

### `downloadAndUploadAudio()`

Скачивает аудио с внешнего URL и загружает в Storage.

```typescript
async function downloadAndUploadAudio(
  audioUrl: string,      // Внешний URL
  trackId: string,       // ID трека
  userId: string,        // ID пользователя
  fileName: string,      // Имя файла (main.mp3)
  supabase: SupabaseClient
): Promise<string>       // Возвращает Storage URL
```

### `downloadAndUploadCover()`

Скачивает обложку и загружает в Storage.

```typescript
async function downloadAndUploadCover(
  coverUrl: string,
  trackId: string,
  userId: string,
  fileName: string,
  supabase: SupabaseClient
): Promise<string>
```

### `downloadAndUploadVideo()`

Скачивает видео и загружает в Storage.

```typescript
async function downloadAndUploadVideo(
  videoUrl: string,
  trackId: string,
  userId: string,
  fileName: string,
  supabase: SupabaseClient
): Promise<string>
```

## Дополнительные ресурсы

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [RLS Policies Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [CDN Configuration](https://supabase.com/docs/guides/storage/cdn)

---

**Последнее обновление**: 8 октября 2025  
**Версия**: 2.3.0
