# 🔐 Руководство по Аутентификации в Edge Functions

> **Дата создания:** 2025-10-15  
> **Версия:** 1.0.0  
> **Статус:** ✅ Обязательно к применению

---

## 🎯 Основное Правило

### ❌ НЕ ДУБЛИРОВАТЬ JWT валидацию!

Если Edge Function использует middleware `withRateLimit` из `_shared/security.ts`, **НЕ выполняйте повторную JWT валидацию в handler**.

Middleware **уже проверил токен** и передал валидированный `userId` через HTTP header `X-User-Id`.

---

## ✅ ПРАВИЛЬНЫЙ Подход

### С Middleware (`withRateLimit`):

```typescript
import { withRateLimit } from "../_shared/security.ts";

const mainHandler = async (req: Request): Promise<Response> => {
  // ✅ Используем X-User-Id из middleware
  const userId = req.headers.get('X-User-Id');
  
  if (!userId) {
    logger.error('[MY-FUNCTION] Missing X-User-Id from middleware');
    return new Response(
      JSON.stringify({ error: 'Unauthorized - missing user context' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  logger.info(`[MY-FUNCTION] ✅ User: ${userId.substring(0, 8)}...`);
  
  // Работаем с userId...
  const supabaseAdmin = createSupabaseAdminClient();
  const { data } = await supabaseAdmin
    .from('my_table')
    .select('*')
    .eq('user_id', userId);
  
  // ...
};

// ✅ Оборачиваем в middleware
const handler = withRateLimit(mainHandler, {
  maxRequests: 10,
  windowMinutes: 1,
  endpoint: 'my-function'
});

serve(handler);
```

---

## ❌ НЕПРАВИЛЬНЫЙ Подход

### НЕ делать повторную валидацию:

```typescript
const mainHandler = async (req: Request): Promise<Response> => {
  // ❌ НЕ ДЕЛАТЬ ЭТО - middleware уже проверил!
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  const supabase = createSupabaseUserClient(token);
  const { data: { user } } = await supabase.auth.getUser();
  // ^^^ Это вызовет AuthSessionMissingError!
  
  // ...
};
```

**Причина:** Когда middleware читает `req.body` для валидации JWT, body stream закрывается. Повторная попытка валидации токена приводит к ошибке `AuthSessionMissingError`.

---

## 🔍 Как Работает Middleware

```typescript
// _shared/security.ts: withRateLimit
export const withRateLimit = (handler, options) => {
  return async (req: Request) => {
    // 1️⃣ Извлекает токен из Authorization header
    const token = req.headers.get('Authorization')?.slice(7);
    
    // 2️⃣ Валидирует токен через Supabase Auth
    const { data: { user } } = await authClient.auth.getUser(token);
    
    // 3️⃣ Проверяет rate limit
    await rateLimiter.checkRateLimit(user.id, endpoint);
    
    // 4️⃣ Инжектит X-User-Id в клонированный запрос
    const clonedHeaders = new Headers(req.headers);
    clonedHeaders.set('X-User-Id', user.id);
    
    const clonedRequest = new Request(req.url, {
      method: req.method,
      headers: clonedHeaders,
      body: req.body
    });
    
    // 5️⃣ Передает в handler
    return await handler(clonedRequest);
  };
};
```

---

## 📝 Checklist для Review

При code review Edge Function проверьте:

- [ ] Использует ли функция `withRateLimit` middleware?
- [ ] Если ДА, handler извлекает `userId` из `X-User-Id` header?
- [ ] Handler **НЕ** вызывает `supabase.auth.getUser()`?
- [ ] Handler **НЕ** создает `createSupabaseUserClient(token)`?
- [ ] Все `user.id` заменены на `userId`?

---

## 🛠️ Исправленные Функции

| Функция | Дата | Статус |
|---------|------|--------|
| `analyze-reference-audio` | 2025-10-15 | ✅ |
| `separate-stems` | 2025-10-15 | ✅ |
| `generate-lyrics` | 2025-10-15 | ✅ |

---

## 📚 Дополнительные Ресурсы

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Deno Deploy Request Limits](https://deno.com/deploy/docs/runtime-request-limits)
- `_shared/security.ts` - Исходный код middleware

---

*Создано: 2025-10-15 | Автор: AI Assistant | Версия: 1.0.0*
