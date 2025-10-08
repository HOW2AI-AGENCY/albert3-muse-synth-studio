import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import markdown from "eslint-plugin-markdown";
import tseslint from "typescript-eslint";

const markdownConfigs = markdown.configs.recommended.map((config) => {
  if (!config.files) {
    return config;
  }

  const files = config.files.flatMap((pattern) => {
    if (pattern.includes("**/*.{md,markdown}")) {
      return [
        pattern.replace("**/*.{md,markdown}", "docs/**/*.{md,markdown}"),
        pattern.replace("**/*.{md,markdown}", "project-management/**/*.{md,markdown}"),
      ];
    }

    if (pattern.includes("**/*.md")) {
      return [
        pattern.replace("**/*.md", "docs/**/*.md"),
        pattern.replace("**/*.md", "project-management/**/*.md"),
      ];
    }

    return [pattern];
  });

  return { ...config, files };
});

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    ignores: ["**/*.md/**"],
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
    },
  },
  ...markdownConfigs,
);
