import * as React from "react";
import {
  Dialog,
  DialogContent as BaseDialogContent,
  DialogDescription as BaseDialogDescription,
  DialogFooter as BaseDialogFooter,
  DialogHeader as BaseDialogHeader,
  DialogTitle as BaseDialogTitle,
  DialogTrigger as BaseDialogTrigger,
  DialogClose as BaseDialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent as BaseSheetContent,
  SheetDescription as BaseSheetDescription,
  SheetFooter as BaseSheetFooter,
  SheetHeader as BaseSheetHeader,
  SheetTitle as BaseSheetTitle,
  SheetTrigger as BaseSheetTrigger,
  SheetClose as BaseSheetClose,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks";

// Root component: switches between Dialog (desktop) and Sheet (mobile)
type ResponsiveDialogProps = React.ComponentPropsWithoutRef<typeof Dialog>;

export const ResponsiveDialog: React.FC<ResponsiveDialogProps> = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <Sheet {...props}>{children}</Sheet>;
  }
  return <Dialog {...props}>{children}</Dialog>;
};

// Trigger
export const ResponsiveDialogTrigger: React.FC<React.ComponentPropsWithoutRef<typeof BaseDialogTrigger>> = ({
  children,
  ...props
}) => {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetTrigger {...props}>{children}</BaseSheetTrigger>;
  return <BaseDialogTrigger {...props}>{children}</BaseDialogTrigger>;
};

// Content: desktop uses centered modal, mobile uses bottom sheet with safe areas
type ContentProps = React.ComponentPropsWithoutRef<typeof BaseDialogContent> & {
  side?: "top" | "bottom" | "left" | "right";
};

export const ResponsiveDialogContent = React.forwardRef<HTMLDivElement, ContentProps>(

  ({ className, side = "bottom", children, ...props }, ref) => {

    const isMobile = useIsMobile();

    if (isMobile) {

      return (

        <BaseSheetContent

          ref={ref}

          side={side}

          className={[

            "rounded-t-lg",

            "pb-[env(safe-area-inset-bottom)]",

            "max-h-[92vh] overflow-auto",

            className || "",

          ].join(" ")}

          {...props}

        >

          {children}

        </BaseSheetContent>

      );

    }

    return (

      <BaseDialogContent

        ref={ref}

        className={className}

        {...props}

      >

        {children}

      </BaseDialogContent>

    );

  },

);
ResponsiveDialogContent.displayName = "ResponsiveDialogContent";

// Header
export const ResponsiveDialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetHeader {...props}>{children}</BaseSheetHeader>;
  return <BaseDialogHeader {...props}>{children}</BaseDialogHeader>;
};

// Footer
export const ResponsiveDialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetFooter {...props}>{children}</BaseSheetFooter>;
  return <BaseDialogFooter {...props}>{children}</BaseDialogFooter>;
};

// Title
export const ResponsiveDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof BaseDialogTitle>
>(({ children, ...props }, ref) => {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetTitle ref={ref} {...props}>{children}</BaseSheetTitle>;
  return <BaseDialogTitle ref={ref} {...props}>{children}</BaseDialogTitle>;
});
ResponsiveDialogTitle.displayName = "ResponsiveDialogTitle";

// Description
export const ResponsiveDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof BaseDialogDescription>
>(({ children, ...props }, ref) => {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetDescription ref={ref} {...props}>{children}</BaseSheetDescription>;
  return <BaseDialogDescription ref={ref} {...props}>{children}</BaseDialogDescription>;
});
ResponsiveDialogDescription.displayName = "ResponsiveDialogDescription";

// Close
export const ResponsiveDialogClose: React.FC<React.ComponentPropsWithoutRef<typeof BaseDialogClose>> = ({
  children,
  ...props
}) => {
  const isMobile = useIsMobile();
  if (isMobile) return <BaseSheetClose {...props}>{children}</BaseSheetClose>;
  return <BaseDialogClose {...props}>{children}</BaseDialogClose>;
};

// Named exports for tree-shaking ease
export default ResponsiveDialog;