# Security Audit (OWASP Top 10, TLS)

## Области
- XSS/CSRF/Injection, безопасность хранилища, управление сессиями, секреты.
- SSL/TLS/CSP и безопасные заголовки.

## Заголовки
- Проверить CSP/X-Frame-Options/X-Content-Type-Options/X-XSS-Protection/Referrer-Policy/Permissions-Policy.
- Источник: `vite.config.ts:62–83` — строгая CSP в продакшене.

## Suno API Callback Security
- IP Whitelist, HTTPS-only, валидация запроса, таймауты/ретраи.
- Polling fallback для критичных рабочих процессов.

## Матрица угроз и мер
| Угроза | Компонент | Риск | Мера |
|---|---|---|---|
| XSS | UI | Средний | Strict CSP, escape, Content-Security-Policy |
| CSRF | API | Средний | Токены/Origin/SameSite |
| Secrets | CI | Средний | Secret scanning, ограничение логов |

## Рекомендации (TBD)
- Внедрить SAST/DAST; усилить заголовки в dev окружении.