# ⚡ Краткий справочник Albert3 Muse Synth Studio

*Быстрый доступ к основным командам, процессам и ссылкам для ежедневной работы.*

## 🔗 Быстрые ссылки

| Ресурс | Ссылка | Описание |
|--------|--------|----------|
| 📋 **Kanban Board** | [GitHub Projects](https://github.com/your-org/albert3-muse-synth-studio/projects) | Текущие задачи и прогресс |
| 🐛 **Создать Bug Report** | [New Bug](https://github.com/your-org/albert3-muse-synth-studio/issues/new?template=bug_report.yml) | Сообщить о баге |
| ✨ **Создать Feature Request** | [New Feature](https://github.com/your-org/albert3-muse-synth-studio/issues/new?template=feature_request.yml) | Предложить новую функцию |
| 📊 **Team Dashboard** | [Dashboard](reports/team-dashboard.md) | Метрики команды |
| 🚀 **Current Sprint** | [Sprint](tasks/current-sprint.md) | Текущий спринт |
| 📝 **Backlog** | [Backlog](tasks/backlog.md) | Список задач |

## 🎯 Ежедневные команды

### Git Workflow

```bash
# Начать работу над новой задачей
git checkout develop
git pull origin develop
git checkout -b feature/ISSUE-123-short-description

# Коммит изменений
git add .
git commit -m "feat(component): add new functionality"

# Отправить изменения
git push origin feature/ISSUE-123-short-description

# Создать Pull Request
gh pr create --title "feat: Add new functionality" --body "Closes #123"
```

### Тестирование

```bash
# Запустить все тесты
npm test

# Запустить тесты с покрытием
npm run test:coverage

# Запустить линтер
npm run lint

# Исправить проблемы линтера
npm run lint:fix

# Форматирование кода
npm run format
```

### Сборка и деплой

```bash
# Локальная разработка
npm run dev

# Сборка для продакшена
npm run build

# Проверка сборки
npm run preview

# Запуск в Docker
docker-compose up -d
```

## 📋 Чек-листы

### ✅ Перед началом работы над задачей

- [ ] Задача назначена на меня
- [ ] Критерии приемки понятны
- [ ] Зависимости проверены
- [ ] Ветка создана по соглашению
- [ ] Задача перемещена в "In Progress"

### ✅ Перед созданием Pull Request

- [ ] Все тесты проходят
- [ ] Линтер не выдает ошибок
- [ ] Код отформатирован
- [ ] Коммиты следуют Conventional Commits
- [ ] Описание PR заполнено
- [ ] Связанная задача указана

### ✅ Перед завершением задачи

- [ ] Code Review пройден
- [ ] CI/CD pipeline успешен
- [ ] Критерии приемки выполнены
- [ ] Документация обновлена
- [ ] Задача перемещена в "Done"

## 🏷️ Система меток GitHub

### Типы задач
- `bug` 🐛 - Исправление бага
- `feature` ✨ - Новая функциональность
- `enhancement` 🚀 - Улучшение существующей функции
- `documentation` 📚 - Обновление документации
- `refactor` 🔧 - Рефакторинг кода
- `test` 🧪 - Добавление тестов

### Приоритеты
- `critical` 🔥 - Критический (исправить немедленно)
- `high` 🔴 - Высокий (в текущем спринте)
- `medium` 🟡 - Средний (в следующем спринте)
- `low` 🟢 - Низкий (в бэклоге)

### Статусы
- `backlog` 📋 - В бэклоге
- `ready` ✅ - Готово к работе
- `in-progress` 🔄 - В работе
- `review` 👀 - На ревью
- `testing` 🧪 - На тестировании
- `blocked` 🚫 - Заблокировано

### Компоненты
- `frontend` 🎨 - Фронтенд
- `backend` ⚙️ - Бэкенд
- `api` 🔌 - API
- `database` 🗄️ - База данных
- `ui/ux` 🎭 - Пользовательский интерфейс
- `security` 🔒 - Безопасность
- `performance` ⚡ - Производительность

## 📊 Ключевые метрики

### Цели команды (еженедельно)
- **Velocity**: 40-50 Story Points
- **Lead Time**: ≤ 3 дня
- **Cycle Time**: ≤ 2 дня
- **Code Coverage**: ≥ 80%
- **Bug Escape Rate**: ≤ 5%

### Индивидуальные цели
- **Commits per day**: 3-5
- **Code Review Time**: ≤ 4 часа
- **PR Size**: ≤ 400 строк
- **Test Coverage**: ≥ 85%

## 🔄 Процессы спринта

### Понедельник - Sprint Planning (9:00 UTC)
1. **Ретроспектива** прошлого спринта (15 мин)
2. **Планирование** нового спринта (45 мин)
3. **Распределение** задач (15 мин)

### Ежедневно - Daily Standup (10:00 UTC)
**Формат**: Что сделал? / Что планирую? / Блокеры?
**Время**: 15 минут максимум

### Пятница - Sprint Review & Retrospective (15:00 UTC)
1. **Demo** завершенных задач (30 мин)
2. **Ретроспектива** (30 мин)
3. **Планирование** следующего спринта (30 мин)

## 🛠️ Полезные команды GitHub CLI

```bash
# Просмотр задач
gh issue list --assignee @me
gh issue list --label "high"
gh issue list --state open

# Работа с PR
gh pr list
gh pr view 123
gh pr checkout 123
gh pr merge 123

# Создание задач
gh issue create --title "Bug: Description" --label bug,high
gh issue create --template bug_report.yml

# Проекты
gh project list
gh project item-list 1
```

## 🔍 Поиск и навигация

### Поиск в коде
```bash
# Поиск по содержимому
gh search code "function searchTerm"

# Поиск по файлам
find . -name "*.ts" -type f

# Поиск в истории Git
git log --grep="search term"
git log -S "code search"
```

### Полезные алиасы Git
```bash
# Добавить в ~/.gitconfig
[alias]
    st = status
    co = checkout
    br = branch
    ci = commit
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = !gitk
    lg = log --oneline --graph --decorate --all
```

## 📞 Экстренные контакты

### Проблемы с продакшеном
```bash
# Slack каналы
#albert3-alerts      # Автоматические уведомления
#albert3-incidents   # Инциденты продакшена
#albert3-development # Общие вопросы разработки
```

### Быстрые действия при инцидентах
1. **Сообщить** в #albert3-incidents
2. **Создать** hotfix ветку: `hotfix/ISSUE-XXX-critical-fix`
3. **Уведомить** @tech-lead и @devops-engineer
4. **Задокументировать** в post-mortem

## 🎨 Соглашения по коду

### TypeScript/JavaScript
```typescript
// Именование переменных - camelCase
const userName = 'john_doe';
const isAuthenticated = true;

// Именование функций - camelCase
function getUserData() { }
async function fetchUserProfile() { }

// Именование компонентов - PascalCase
const UserProfile = () => { };
class AuthService { }

// Именование констант - UPPER_SNAKE_CASE
const API_BASE_URL = 'https://api.example.com';
const MAX_RETRY_ATTEMPTS = 3;
```

### CSS/Tailwind
```css
/* BEM методология для кастомных стилей */
.user-profile { }
.user-profile__avatar { }
.user-profile__avatar--large { }

/* Tailwind классы - группировка по типу */
className="flex items-center justify-between p-4 bg-white rounded-lg shadow-md"
```

### Файлы и папки
```
components/
  UserProfile/
    UserProfile.tsx
    UserProfile.test.tsx
    UserProfile.stories.tsx
    index.ts
```

## 📚 Документация

### Обязательные комментарии JSDoc
```typescript
/**
 * Получает профиль пользователя по ID
 * @param userId - Уникальный идентификатор пользователя
 * @param includePrivate - Включать ли приватные данные
 * @returns Promise с данными пользователя
 * @throws {UserNotFoundError} Когда пользователь не найден
 */
async function getUserProfile(
  userId: string, 
  includePrivate: boolean = false
): Promise<UserProfile> {
  // implementation
}
```

### README для компонентов
```markdown
# UserProfile Component

## Usage
\`\`\`tsx
<UserProfile userId="123" showAvatar={true} />
\`\`\`

## Props
- `userId` (string) - User ID
- `showAvatar` (boolean) - Show user avatar

## Examples
See `UserProfile.stories.tsx`
```

---

*Этот справочник обновляется регулярно. Последнее обновление: Декабрь 2024*

**💡 Совет**: Добавьте эту страницу в закладки для быстрого доступа к командам и процессам!