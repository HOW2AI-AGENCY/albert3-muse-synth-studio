import { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

/**
 * Корневой layout приложения
 */
export const AppLayout = ({ children }: AppLayoutProps) => {
  return <>{children}</>;
};
