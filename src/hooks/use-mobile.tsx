// DEPRECATED: используйте `const { isMobile } = useBreakpoints()`
// Совместимость: реэкспорт через новый единый источник правды
import { useBreakpoints } from "@/hooks/useBreakpoints";

export function useIsMobile() {
  const { isMobile } = useBreakpoints();
  return isMobile;
}
