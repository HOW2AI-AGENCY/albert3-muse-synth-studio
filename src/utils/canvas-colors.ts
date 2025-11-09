// Утилита получения цветов для канвас-компонентов из CSS-переменных
// Позволяет избежать хардкода и централизует выбор палитры для тем/режимов

export type CanvasColors = {
  background: string;
  gridMajor: string;
  gridMinor: string;
  playhead: string;
  selection: string;
  clip: string;
  clipMuted: string;
};

// Чтение CSS-переменной с фолбэком
function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function getCanvasColors(): CanvasColors {
  return {
    background: cssVar("--canvas-bg", "#0f0f10"),
    gridMajor: cssVar("--canvas-grid-major", "#374151"), // gray-700
    gridMinor: cssVar("--canvas-grid-minor", "#4b5563"), // gray-600
    playhead: cssVar("--canvas-playhead", "#ef4444"), // red-500
    selection: cssVar("--canvas-selection", "#60a5fa"), // blue-400
    clip: cssVar("--canvas-clip", "#22c55e"), // green-500
    clipMuted: cssVar("--canvas-clip-muted", "#9ca3af"), // gray-400
  };
}

// Опционально: экспорт предустановок для тестов/светлой темы
export const DefaultCanvasColors: CanvasColors = {
  background: "#0f0f10",
  gridMajor: "#374151",
  gridMinor: "#4b5563",
  playhead: "#ef4444",
  selection: "#60a5fa",
  clip: "#22c55e",
  clipMuted: "#9ca3af",
};