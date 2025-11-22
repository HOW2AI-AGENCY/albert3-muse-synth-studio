import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import markdown from "eslint-plugin-markdown";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      // Сокращаем глобальный игнор, оставляя общий конфиг доступным,
      // специфичные проверки Workspace выполняются через eslint.workspace.config.js
      "node_modules/**",
      "dist/**",
      "build/**",
      "playwright-report/**",
      // Перенесено из .eslintignore.workspace (ESLint v9 рекомендует использовать поле ignores)
      "coverage/**",
      "supabase/**/node_modules/**",
      "reports/**",
      "tests/unit/hooks/useTrackState.test.ts",
      "tests/unit/hooks/useTracksMemoryLeak.test.ts",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "error", // ✅ P0: Строгий запрет console.*, используем централизованный logger
      "@typescript-eslint/no-explicit-any": "warn",
      // Базовый контроль нейминга
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "variableLike",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
          leadingUnderscore: "allow",
        },
        {
          selector: "function",
          format: ["camelCase", "PascalCase"], // Allow PascalCase for functions (e.g., React components)
          leadingUnderscore: "allow",
        },
        { selector: "typeLike", format: ["PascalCase"] },
      ],
    },
  },
  // Локальные исключения: разрешаем console.* где необходимо
  {
    files: [
      "supabase/functions/**/*.ts",
      "supabase/seed/**/*.ts",
      "tests/e2e/**/*.ts",
      "scripts/**/*.ts",
      "src/lib/logger.ts", // ✅ P0: Базовая имплементация логгера
      "src/utils/sentry/**/*.ts", // Dev mode logging
    ],
    rules: {
      "no-console": "off",
      "@typescript-eslint/naming-convention": "off",
    },
  },
  {
    files: [
      "tests/**/*.{ts,tsx}",
      "src/**/__tests__/**/*.{ts,tsx}"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-refresh/only-export-components": "off",
      "no-console": "off"
    }
  },
  // Перенос правил из .eslintignore: в flat-конфиге нельзя использовать отрицательные шаблоны (!pattern),
  // поэтому вместо "игнорировать всё, кроме конкретных файлов" мы явно настраиваем отдельный блок для нужных файлов.
  // Это сохраняет намерение: гарантировать проверку для указанных путей, не ломая общие проверки проекта.
  {
    files: [
      "src/features/tracks/api/trackVersions.ts",
      "tests/unit/hooks/useTrackVersions.test.ts",
    ],
    rules: {
      // Наследуем общие правила без ослабления
    },
  },
);
