# Руководство по неймингу (Workspace)

## Базовые правила

- Переменные, функции, параметры: `camelCase` (пример: `userId`, `fetchTracks`).
- Типы, интерфейсы, компоненты: `PascalCase` (пример: `TrackCard`, `WorkspaceHeader`).
- Файлы компонентов: `PascalCase.tsx` и экспорт с тем же именем.
- Хуки: `useSomething.ts` и экспорт `useSomething`.

## Примеры

```ts
// Компонент
export function WorkspaceHeader() {
  return null;
}

// Хук
export function useWorkspaceOffsets() {
  return { top: 0, bottom: 0 };
}

// Типы
export interface WorkspaceNavItem { id: string; label: string }
```

## Линтер

- В проект добавлены правила `@typescript-eslint/naming-convention` для контроля camelCase/PascalCase.