import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";
import tsconfigPaths from "vite-tsconfig-paths";
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core dependencies
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI framework (Radix UI components)
          'ui-vendor': [
            '@radix-ui/react-dialog', 
            '@radix-ui/react-dropdown-menu', 
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover'
          ],
          
          // Data fetching
          'query-vendor': ['@tanstack/react-query'],
          
          // Heavy visualization libraries (lazy loaded on demand)
          'animation-vendor': ['framer-motion'],
          'chart-vendor': ['recharts'],
          
          // Supabase
          'supabase-vendor': ['@supabase/supabase-js'],
          
          // Icons (tree-shaken via iconImports.ts)
          'icons-vendor': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 800, // Снижен с 1000
    sourcemap: false, // Отключаем sourcemaps в production для уменьшения размера
  },
  optimizeDeps: {
    force: true,
    include: [
      'react',
      'react-dom',
      '@radix-ui/react-checkbox',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-tooltip',
      '@radix-ui/react-select',
      'framer-motion',
      '@tanstack/react-query',
      'sonner',
    ],
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    tsconfigPaths(),
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
    },
    dedupe: [
      "react", 
      "react-dom",
      "react/jsx-runtime",
      "react-router-dom",
      "react-router",
      "scheduler",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "@radix-ui/react-popover",
      "@radix-ui/react-slot",
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
}));
