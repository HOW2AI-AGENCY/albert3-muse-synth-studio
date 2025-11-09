import { lazy, Suspense, useEffect, useState } from "react";

// Defer loading Sonner's Toaster until after client mount to avoid React runtime mismatches
const LazyToaster = lazy(() => import("sonner").then((m) => ({ default: m.Toaster })));

type ToasterProps = React.ComponentProps<typeof LazyToaster> & {
  theme?: "light" | "dark" | "system";
};

const Toaster = ({ theme = "system", ...props }: ToasterProps) => {
  // Render only after mount to ensure hooks resolve to the active React instance
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <Suspense fallback={null}>
      <LazyToaster
        theme={theme}
        className="toaster group"
        toastOptions={{
          classNames: {
            toast:
              "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          },
        }}
        {...props}
      />
    </Suspense>
  );
};

export { Toaster };