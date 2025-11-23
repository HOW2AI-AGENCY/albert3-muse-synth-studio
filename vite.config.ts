import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tsconfigPaths from "vite-tsconfig-paths";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // Load .env.production as fallback for all modes
  // This ensures Lovable Cloud preview builds have access to production env vars
  const env = loadEnv(mode, process.cwd(), '');
  const productionEnv = loadEnv('production', process.cwd(), '');

  // Merge envs. Note: production values will overwrite mode-specific values.
  const mergedEnv = { ...env, ...productionEnv };

  // Expose merged env vars to the app
  process.env = { ...process.env, ...mergedEnv };
  // Опционально подключаем visualizer только в production и если пакет установлен
  let visualizerPlugin: PluginOption | null = null;
  if (mode === 'production') {
    try {
      const { visualizer } = await import('rollup-plugin-visualizer');
      visualizerPlugin = visualizer({
        filename: 'stats.html',
        open: false, // Установите true, чтобы авто-открывать в браузере
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // 'treemap' | 'sunburst' | 'network'
      });
    } catch (e) {
      // Visualizer не установлен - пропускаем анализ бандла
      // eslint-disable-next-line no-console
      console.warn('[vite] rollup-plugin-visualizer не установлен — пропускаю анализ бандла');
    }
  }

  return ({
    // Define env vars for client-side code
    // Use production values as fallback for preview/dev builds in Lovable Cloud
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(mergedEnv.VITE_SUPABASE_URL),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(mergedEnv.VITE_SUPABASE_PUBLISHABLE_KEY),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(mergedEnv.VITE_SUPABASE_PROJECT_ID),
      'import.meta.env.VITE_SENTRY_DSN': JSON.stringify(mergedEnv.VITE_SENTRY_DSN),
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(mergedEnv.VITE_APP_VERSION),
    },
    // Разрешаем встраивание только в продакшене; в dev убираем блокировки iframe
    // чтобы корректно работать в редакторах, использующих iframe (например, Lovable)
    server: {
      host: "0.0.0.0", // Разрешаем доступ через все интерфейсы для Lovable preview
      port: 8080,
      // Добавляем заголовки безопасности для dev-сервера
      headers: mode === 'development'
        ? {
          // В dev-режиме: минимальные ограничения для Lovable preview
          // CSP отключаем в dev, чтобы не блокировать Lovable iframe
          // 'Content-Security-Policy' намеренно не устанавливаем
        }
        : {
          // Production CSP: строгие правила безопасности
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' https://cdn.sentry.com",
            "style-src 'self' 'unsafe-inline'",
            "worker-src 'self' blob:",
            "img-src 'self' https: data: blob:",
            "connect-src 'self' https://qycfsepwguaiwcquwwbw.supabase.co wss://qycfsepwguaiwcquwwbw.supabase.co https://*.sentry.io https://sentry.io",
            "font-src 'self' data:",
            "media-src 'self' https: blob:",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
            'upgrade-insecure-requests'
          ].join('; '),
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'X-XSS-Protection': '1; mode=block',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        }
    },
    optimizeDeps: {},
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
        output: {
          manualChunks: {
            // ❌ УДАЛЕНО 'vendor-react' - конфликтует с dedupe
            // React должен управляться через dedupe, не через manualChunks
            'vendor-ui': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-toast',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-slider',
              '@radix-ui/react-scroll-area',
            ],
            'vendor-charts': ['recharts'],
            'vendor-motion': ['framer-motion'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-query': ['@tanstack/react-query', '@tanstack/react-virtual'],
          },
        },
      },
      chunkSizeWarningLimit: 800,
      sourcemap: true,
      commonjsOptions: {
        include: [/node_modules/],
      },
    },
    plugins: [
      react(),
      // mode === 'development' && componentTagger(),
      tsconfigPaths(),
      // ✅ Анализатор бандла — добавляется только при наличии пакета и в production
      visualizerPlugin,
      mode !== "development" && process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
        ? sentryVitePlugin({
          org: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
          authToken: process.env.SENTRY_AUTH_TOKEN,
          release: {
            name: process.env.SENTRY_RELEASE,
          },
          sourcemaps: {
            assets: "./dist/**",
          },
        })
        : null,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "react-is": path.resolve(__dirname, "./src/vendor/react-is/index.js"),
        "react-remove-scroll": path.resolve(__dirname, "./src/vendor/react-remove-scroll/index.tsx"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-router",
        "react-router-dom",
      ],
    },
  });
});
