import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const sizeClassMap = {
  narrow: "max-w-4xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
} as const;

type ContainerSize = keyof typeof sizeClassMap;

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  size?: ContainerSize;
}

export const PageContainer = ({
  children,
  className,
  size = "default",
}: PageContainerProps) => (
  <div className={cn("w-full", className)}>
    <div
      className={cn(
        "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8",
        sizeClassMap[size]
      )}
    >
      {children}
    </div>
  </div>
);

PageContainer.displayName = "PageContainer";

export default PageContainer;
