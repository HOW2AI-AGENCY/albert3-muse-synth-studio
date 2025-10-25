# Lyrics & Audio Library - User Guide

## 📚 Обзор

Система управления лирикой и аудио позволяет:
- Сохранять и организовывать тексты песен
- Управлять библиотекой аудио-файлов
- Использовать сохраненные материалы в генерации

---

## 🎵 Библиотека лирики

### Доступ
Перейдите в **Workspace → Лирика** (`/workspace/lyrics-library`)

### Основные функции

#### 1. Просмотр библиотеки
- **Все** - показать всю лирику
- **Избранное** ⭐ - только избранные тексты
- **Папки** 📁 - группировка по папкам

#### 2. Поиск
```
Используйте строку поиска для:
- Поиск по тексту песни
- Поиск по названию
- Поиск по тегам
```

#### 3. Карточка лирики
Каждая карточка показывает:
- Название
- Превью текста (4 строки)
- Теги
- Количество использований
- Дату создания

#### 4. Детальный просмотр
Нажмите на карточку для просмотра:
- Полный текст
- Все метаданные (жанр, настроение)
- Промпт (если есть)
- Статистика использования

#### 5. Действия
- **Копировать** 📋 - скопировать текст
- **Избранное** ⭐ - добавить/удалить из избранного
- **Удалить** 🗑️ - удалить из библиотеки

### Как сохранить лирику

#### Из генерации:
1. Сгенерируйте лирику в разделе "Генерация"
2. После получения результата нажмите "Сохранить"
3. Выберите папку и теги (опционально)

#### Программно:
```typescript
import { useSavedLyrics } from '@/hooks/useSavedLyrics';

const { saveLyrics } = useSavedLyrics();

await saveLyrics.mutateAsync({
  title: 'Название песни',
  content: 'Текст песни...',
  tags: ['рок', 'энергичная'],
  folder: 'Альбом 2024',
  jobId: 'optional-job-id',
  variantId: 'optional-variant-id'
});
```

---

## 🎧 Библиотека аудио

### Доступ
Перейдите в **Workspace → Аудио** (`/workspace/audio-library`)

### Основные функции

#### 1. Фильтры
- **Все** - вся библиотека
- **Избранное** ⭐ - избранные файлы
- **Загруженные** 📤 - загруженные файлы
- **Записи** 🎙️ - аудио записи
- **Сгенерированные** ✨ - AI-generated треки
- **Папки** 📁 - группировка

#### 2. Загрузка файлов
1. Нажмите кнопку "Upload" ➕
2. Выберите аудио файл
3. Добавьте описание, теги, папку (опционально)
4. Нажмите "Загрузить"

**Поддерживаемые форматы:**
- MP3, WAV, OGG, FLAC
- Максимальный размер: 50 MB

#### 3. Карточка аудио
Показывает:
- Название файла
- Тип источника
- Длительность
- Размер файла
- Теги
- Статистика использования

#### 4. Детальный просмотр
- **Аудио плеер** 🎵 - прослушивание
- **Метаданные** - все детали файла
- **Анализ** - tempo, key, genre (если доступен)
- **Описание** и теги
- **Статистика** использования

#### 5. Действия
- **Скачать** 💾 - скачать файл
- **Избранное** ⭐ - в избранное
- **Удалить** 🗑️ - удалить

### Типы источников

#### Upload (Загружено)
```typescript
// Через UI или программно:
const { saveAudio } = useAudioLibrary();

await saveAudio.mutateAsync({
  fileName: 'demo.mp3',
  fileUrl: 'https://...',
  fileSize: 5242880,
  durationSeconds: 180,
  sourceType: 'upload',
  tags: ['вокал', 'демо'],
  folder: 'Demos 2024'
});
```

#### Recording (Запись)
Для аудио, записанных в приложении

#### Generated (Сгенерировано)
Для AI-generated треков из системы генерации

---

## 🔍 Поиск и фильтрация

### Поиск в лирике
```typescript
const { lyrics } = useSavedLyrics({
  search: 'любовь', // Full-text search
  favorite: true,   // Только избранное
  folder: 'Альбом 2024'
});
```

### Поиск в аудио
```typescript
const { items } = useAudioLibrary({
  sourceType: 'upload',
  favorite: true,
  folder: 'Demos 2024'
});
```

---

## 📊 Статистика использования

Система автоматически отслеживает:
- **usage_count** - количество использований
- **last_used_at** - последнее использование

```typescript
const { trackUsage } = useSavedLyrics();

// При использовании лирики:
await trackUsage.mutateAsync(lyricsId);
```

---

## 🔒 Безопасность

### Row Level Security (RLS)
Все данные защищены RLS policies:
- Пользователи видят только свои данные
- CRUD только для собственных записей
- Security Definer триггеры

### Данные
- Лирика хранится в БД
- Аудио файлы в Supabase Storage (bucket: reference-audio)
- Метаданные в БД для быстрого поиска

---

## 💡 Best Practices

### Организация лирики
1. ✅ Используйте понятные названия
2. ✅ Добавляйте релевантные теги
3. ✅ Группируйте по папкам (альбом, проект)
4. ✅ Добавляйте в избранное лучшие варианты

### Организация аудио
1. ✅ Указывайте описание для uploaded файлов
2. ✅ Используйте теги для быстрого поиска
3. ✅ Группируйте по типу (demo, reference, final)
4. ✅ Проверяйте размер файлов (max 50MB)

### Производительность
1. ✅ Используйте фильтры вместо прокрутки
2. ✅ Поиск оптимизирован для русского языка
3. ✅ Lazy loading компонентов
4. ✅ Кэширование через React Query

---

## 🛠️ API Reference

### useSavedLyrics Hook

```typescript
interface SaveLyricsParams {
  jobId?: string;
  variantId?: string;
  title: string;
  content?: string;
  tags?: string[];
  folder?: string;
}

const {
  lyrics,           // SavedLyrics[]
  isLoading,        // boolean
  error,            // Error | null
  saveLyrics,       // Mutation
  updateLyrics,     // Mutation
  deleteLyrics,     // Mutation
  toggleFavorite,   // Mutation
  trackUsage,       // Mutation
} = useSavedLyrics({
  search?: string;
  folder?: string;
  favorite?: boolean;
});
```

### useAudioLibrary Hook

```typescript
interface SaveAudioParams {
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  durationSeconds?: number;
  sourceType: 'upload' | 'recording' | 'generated';
  sourceMetadata?: Record<string, any>;
  tags?: string[];
  folder?: string;
  description?: string;
}

const {
  items,            // AudioLibraryItem[]
  count,            // number
  isLoading,        // boolean
  error,            // Error | null
  saveAudio,        // Mutation
  updateAudio,      // Mutation
  deleteAudio,      // Mutation
  toggleFavorite,   // Mutation
  trackUsage,       // Mutation
} = useAudioLibrary({
  sourceType?: string;
  folder?: string;
  favorite?: boolean;
  limit?: number;
  offset?: number;
});
```

---

## 🔧 Troubleshooting

### Лирика не сохраняется
1. Проверьте авторизацию
2. Проверьте обязательные поля (title, content)
3. Проверьте консоль на ошибки

### Файл не загружается
1. Проверьте формат (MP3, WAV, OGG, FLAC)
2. Проверьте размер (max 50MB)
3. Проверьте соединение с интернетом

### Поиск не работает
1. Поиск поддерживает русский язык
2. Используйте минимум 3 символа
3. Проверьте фильтры (folder, favorite)

---

## 📞 Support

При возникновении проблем:
1. Проверьте консоль браузера
2. Проверьте Network tab
3. Свяжитесь с поддержкой

---

*Версия: 1.0.0*  
*Обновлено: 2025-01-24*
