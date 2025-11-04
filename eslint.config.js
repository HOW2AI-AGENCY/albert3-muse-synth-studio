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
      "playwright-report/**"
    ]
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
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "warn", // Полный запрет console.*, используем logger
      "@typescript-eslint/no-explicit-any": "off",
      // Базовый контроль нейминга
      "@typescript-eslint/naming-convention": [
        "error",
        { selector: "variableLike", format: ["camelCase", "UPPER_CASE", "PascalCase"], leadingUnderscore: "allow" },
        { selector: "function", format: ["camelCase"], leadingUnderscore: "allow" },
        { selector: "typeLike", format: ["PascalCase"] }
      ],
    },
  }
);
