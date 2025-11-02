import { ReactNode, useEffect } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Корневой layout приложения с интеграцией персонализации
 */
export const AppLayout = ({ children }: AppLayoutProps) => {
  const { applyPreferences } = useUserPreferences();

  // Применяем пользовательские настройки при монтировании
  useEffect(() => {
    applyPreferences();
  }, [applyPreferences]);

  return <>{children}</>;
};
