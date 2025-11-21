import type { ReactNode } from "react";
import { ResponsiveLayout } from "./ResponsiveLayout";

const sizeMap = {
  narrow: "4xl",
  default: "6xl",
  wide: "7xl",
} as const;

type ContainerSize = keyof typeof sizeMap;

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  size?: ContainerSize;
}

/**
 * PageContainer - Wrapper around ResponsiveLayout for standard page structures
 * Refactored to use the unified layout system
 */
export const PageContainer = ({
  children,
  className,
  size = "default",
}: PageContainerProps) => (
  <ResponsiveLayout
    maxWidth={sizeMap[size]}
    className={className}
    enableSafeArea={true}
    padding="md"
    centerContent={true}
  >
    {children}
  </ResponsiveLayout>
);

PageContainer.displayName = "PageContainer";

export default PageContainer;
