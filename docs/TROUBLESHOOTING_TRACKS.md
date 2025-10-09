# Troubleshooting Guide: Track Generation & Playback

Этот гайд поможет диагностировать и решить типичные проблемы с генерацией и воспроизведением треков.

## 📋 Содержание

1. ["Застрявшие" треки в статусе Pending](#застрявшие-треки-в-статусе-pending)
2. [Проблемы с воспроизведением версий](#проблемы-с-воспроизведением-версий)
3. [Ошибки на мобильных устройствах](#ошибки-на-мобильных-устройствах)
4. [Ошибка CORS при вызове Supabase Functions](#ошибка-cors-при-вызове-supabase-functions)
5. [Общие рекомендации](#общие-рекомендации)

---

## 🔴 "Застрявшие" треки в статусе Pending

### Симптомы
- Трек создан в базе данных со статусом `pending`
- Трек отображается в интерфейсе как "В ожидании"
- Запрос к Edge Function `generate-suno` не был выполнен (нет в логах)
- `suno_id` трека равен `null`

### Причины
1. **Ошибка при вызове Edge Function** - запрос к `ApiService.generateMusic()` не был выполнен
2. **Неправильный provider** - не был передан параметр `provider` или передан неверно
3. **Сетевая ошибка** - проблемы с соединением при вызове Supabase Functions

### Диагностика

#### 1. Проверка треков в БД
```sql
SELECT id, title, status, created_at, provider, suno_id
FROM tracks 
WHERE status = 'pending' 
  AND suno_id IS NULL
ORDER BY created_at DESC;
```

#### 2. Проверка логов Edge Function
Откройте логи функции `generate-suno`:
- Перейдите в Backend → Edge Functions → generate-suno → Logs
- Проверьте наличие записей с `trackId` вашего трека
- Если записей нет - функция не была вызвана

#### 3. Проверка консоли браузера
Откройте Developer Tools → Console и найдите:
```
🎵 [API Service] Provider: suno
🎵 [API Service] Sending to: generate-suno
📤 [API Service] Payload: {...}
```

Если этих логов нет - `ApiService.generateMusic()` не вызывался.

### Решение

#### Автоматическое восстановление
С версии 2.3.3 реализован механизм автоматического восстановления:
- Хук `useTrackRecovery` проверяет треки в `pending` каждую минуту
- Треки старше 2 минут без `suno_id` автоматически переотправляются
- Показывается toast-уведомление о восстановлении

#### Ручное восстановление
Если автоматическое восстановление не сработало:

1. **Обновите страницу** - восстановление запустится автоматически
2. **Проверьте логи в консоли**:
   ```
   Checking for stuck tracks...
   Found N stuck track(s), attempting recovery
   Successfully recovered track: [название]
   ```
3. **Если проблема повторяется** - проверьте секреты:
   - Backend → Secrets → Проверьте `SUNO_API_KEY`

---

## 🎵 Проблемы с воспроизведением версий

### Симптомы
- Версии трека не воспроизводятся при клике на Play
- Неверное количество версий (например, показывает 0 вместо 2)
- Перемотка не работает после переключения версии
- Текущая версия неправильно подсвечивается

### Причины (исправлено в v2.3.3)
1. ~~Использовались синтетические ID вместо реальных UUID версий~~
2. ~~Проверка `track.status !== 'completed'` блокировала воспроизведение версий~~
3. ~~Не передавался `status` при вызове `playTrack` из `TrackCard`~~
4. ~~HEAD-запрос с `mode: 'no-cors'` вызывал false-negative ошибки~~

### Диагностика

#### 1. Проверка версий в БД
```sql
SELECT id, parent_track_id, version_number, is_master, audio_url, duration
FROM track_versions
WHERE parent_track_id = 'YOUR_TRACK_ID'
ORDER BY version_number;
```

#### 2. Проверка консоли при воспроизведении
Откройте Developer Tools → Console и найдите:
```
Playing version 2
Preparing to play track {trackId, versionNumber, parentTrackId}
Now playing: Версия 2
```

#### 3. Проверка AudioPlayerContext
В консоли должно быть:
```
Loaded N versions for track [id]
Set current version index: 1
```

### Решение

Проблемы исправлены в версии 2.3.3:

1. **Воспроизведение версий**:
   - Используются реальные `version.id` вместо синтетических
   - Смягчена проверка статуса - разрешено воспроизведение с `audio_url`
   - Передаются все параметры: `status`, `style_tags`, `lyrics`

2. **Счётчик версий**:
   - Исправлена формула: `Math.max(versions.length - 1, 0)`
   - Корректно показывает количество дополнительных версий

3. **Переключение версий**:
   - Правильное сравнение: `currentTrack?.id === version.id`
   - Корректная передача `parentTrackId` и `versionNumber`

---

## 📱 Ошибки на мобильных устройствах

### Симптомы
- При первом клике на карточку трека показывается ошибка "Аудио недоступно"
- После повторного клика трек воспроизводится нормально
- В логах множество "шумных" HTTP-запросов

### Причины (исправлено в v2.3.3)
1. ~~HEAD-запрос для проверки доступности URL~~
2. ~~Использование `mode: 'no-cors'` делает `response.ok` всегда `false`~~
3. ~~Ложные ошибки на мобильных из-за особенностей CORS~~

### Решение

В версии 2.3.3 убран проблемный HEAD-запрос:
- Полагаемся на встроенную обработку ошибок `<audio>` элемента
- Добавлен обработчик события `error` с детальной диагностикой
- Автоматический retry при `MEDIA_ERR_NETWORK` (1 попытка)
- Информативные сообщения для разных типов ошибок

### Коды ошибок MediaError

| Код | Константа | Описание | Действие |
|-----|-----------|----------|----------|
| 1 | MEDIA_ERR_ABORTED | Загрузка прервана | - |
| 2 | MEDIA_ERR_NETWORK | Ошибка сети | Auto retry |
| 3 | MEDIA_ERR_DECODE | Ошибка декодирования | Регенерация |
| 4 | MEDIA_ERR_SRC_NOT_SUPPORTED | Формат не поддерживается | Регенерация |

---

## 🌐 Ошибка CORS при вызове Supabase Functions

### Симптомы
- В консоли браузера: `Access to fetch at 'https://<project>.supabase.co/functions/v1/generate-suno' from origin 'https://id-preview--….lovable.app' has been blocked by CORS policy`
- Префлайт-запросы (`OPTIONS`) завершаются с `net::ERR_FAILED`
- Вызовы `get-balance` возвращают `401` без попадания в функцию (логов нет)

### Причины
1. Превью-домен Lovable (`https://id-preview--*.lovable.app`) не входит в список разрешённых `CORS_ALLOWED_ORIGINS`
2. Запросы выполняются с `Authorization: Bearer <token>`, поэтому браузер требует явного заголовка `Access-Control-Allow-Credentials`
3. Запросы без Bearer-токена получают ответ `401`, что выглядит как CORS-блокировка

### Диагностика
- Откройте вкладку **Network** → выберите `OPTIONS` запрос → убедитесь, что заголовки ответа не содержат `Access-Control-Allow-Origin`
- Выполните `supabase functions logs generate-suno --since 10m` и проверьте, доходят ли запросы до функции
- Для `get-balance` вызовите curl с токеном: `curl -H "Authorization: Bearer <access_token>" https://<project>.supabase.co/functions/v1/get-balance?provider=suno`

### Решение
1. В Supabase → **Project Settings → API** добавьте/обновите секрет `CORS_ALLOWED_ORIGINS`:
   ```
   https://lovable.dev,https://lovable.app,https://id-preview--*.lovable.app
   ```
   Секрет читается Edge-функциями во время старта, поэтому требуется деплой (`supabase functions deploy ...`).
2. После деплоя убедитесь, что ответ содержит заголовки `Access-Control-Allow-Origin: https://id-preview--…` и `Access-Control-Allow-Credentials: true`.
3. Для `get-balance` передавайте пользовательский токен Supabase (см. `createSupabaseUserClient`) — без него функция возвращает `401 Unauthorized`.

---

## ✅ Общие рекомендации

### Логирование
Все критические операции логируются в консоли:
- `useMusicGeneration`: параметры перед вызовом API
- `ApiService.generateMusic`: полный payload и response
- `AudioPlayerContext`: все смены состояния воспроизведения
- `useTrackRecovery`: все попытки восстановления

### Мониторинг
Проверяйте следующие метрики:
- Количество треков в `pending` > 2 минут
- Треки с `suno_id = null` и `status = 'pending'`
- Ошибки воспроизведения в консоли браузера
- Edge Function errors в Backend → Logs

### Превентивные меры
1. **Всегда передавайте `provider`** при вызове `ApiService.generateMusic()`
2. **Проверяйте секреты** перед генерацией (SUNO_API_KEY)
3. **Используйте автовосстановление** - включено по умолчанию
4. **Логируйте все ошибки** - используйте `logError()` и `logInfo()`

### Известные ограничения
- Автовосстановление срабатывает только для треков старше 2 минут
- Retry при ошибке сети выполняется только 1 раз
- Версии без `audio_url` не могут быть воспроизведены

---

## 🆘 Если проблема не решена

1. **Проверьте версию** - убедитесь, что используете v2.3.3+
2. **Очистите кэш** - Hard Reload (Ctrl+Shift+R)
3. **Проверьте Backend** - откройте Backend → Tables → tracks
4. **Проверьте логи** - Backend → Edge Functions → Logs
5. **Создайте issue** с подробным описанием и логами

---

*Последнее обновление: 2025-10-08 (v2.3.3)*
