# QA Monitoring Playbook: Sentry Alerts

## 🎯 Цель
Поддерживать ежедневную видимость по критическим ошибкам и деградациям качества в Albert3 Muse Synth Studio.

## 🔔 Каналы уведомлений
- **Slack**: Используется входящий вебхук `#muse-alerts`. Алёрты содержат приоритет, ссылку на issue и короткое описание.
- **Email**: Рассылка `qa-alerts@albert3.io` получает ежедневный дайджест и срочные уведомления.

## ⚙️ Настройка Sentry
1. Перейти в проект Sentry → *Alerts → Notification Integrations*.
2. Добавить/обновить Slack вебхук (`Incoming Webhook URL`).
3. Убедиться, что email-группа добавлена в список получателей.
4. Проверить, что alert rule `Daily Error Digest` активен и запускается раз в сутки в 09:00 UTC.
5. Для критических ошибок включён триггер `Issue frequency > 5 in 10m` с немедленной отправкой.

## ✅ Регулярный мониторинг
- Каждый день в 09:15 UTC QA-поочереди подтверждает получение дайджеста.
- Все новые критические алёрты должны быть заведены в Jira в течение 1 часа.
- В Slack алёрты помечаются эмодзи статуса: 👀 (просмотрено), 🛠️ (в работе), ✅ (устранено).

## 🛠️ Health Check
- GitHub Actions выполняет `npx sentry-cli info` в CI. При сбое — блокируем деплой до восстановления токена.
- QA контролирует наличие переменных `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` в секретах репозитория.

## 📚 Полезные ссылки
- [Sentry Alert Rules](https://docs.sentry.io/product/alerts/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [CI Health Check Workflow](../../../.github/workflows/ci.yml)
