# Руководство по импортам (Workspace)

## Алиасы путей

- Используйте алиас `@/*` (настроен в `tsconfig.json`):

```ts
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { getWorkspaceNavItems } from '@/config/workspace-navigation';
```

## Запрещённые практики

- Глубокие относительные пути: `../../../something` — заменяйте на алиас.
- Неявные re-export’ы без явной причины.

## Проверка

- `npm run typecheck` выявляет неразрешённые импорты и проблемы типов.
- `npm run lint:workspace` помогает обнаружить избыточные относительные пути.