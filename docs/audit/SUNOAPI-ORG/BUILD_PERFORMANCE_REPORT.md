# Build Performance Report (Vite/Rollup)

## Конфиг-аудит
- `vite.config.ts`:
  - manualChunks: vendor разбиение (`:88–105`).
  - CSP, env-мердж, tsconfigPaths, Sentry, visualizer.
  - dedupe/alias: `:135–152`.

## Замеры
- Cold/Warm build time; размеры чанков; sourcemaps; минификация.

## Оптимизации (TBD)
- Lazy-loading split points; уменьшение vendor чанков; prefetch/preload.

## Графики
- Вставить визуализацию размеров чанков и времени сборки.