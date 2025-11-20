import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type VariantProps } from "class-variance-authority";
import { Check, X, Loader2 } from "@/utils/iconImports";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/utils/ui/buttonVariants";

export type ButtonStatus = "idle" | "loading" | "success" | "error";

export interface StatusButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants> {
  /**
   * Current status of the button
   * @default "idle"
   */
  status?: ButtonStatus;

  /**
   * Content to display in idle state
   */
  children: React.ReactNode;

  /**
   * Optional content for loading state
   * @default "Загрузка..."
   */
  loadingText?: React.ReactNode;

  /**
   * Optional content for success state
   * @default "Готово"
   */
  successText?: React.ReactNode;

  /**
   * Optional content for error state
   * @default "Ошибка"
   */
  errorText?: React.ReactNode;

  /**
   * Duration in milliseconds to auto-reset from success/error to idle
   * Set to 0 to disable auto-reset
   * @default 2000
   */
  autoResetDuration?: number;

  /**
   * Callback when auto-reset occurs
   */
  onAutoReset?: () => void;

  /**
   * Show icon in status states
   * @default true
   */
  showStatusIcon?: boolean;
}

/**
 * StatusButton component with visual states for process visualization
 *
 * States:
 * - idle: Default state
 * - loading: Shows spinner animation
 * - success: Shows checkmark with success animation
 * - error: Shows X icon with shake animation
 *
 * @component
 * @example
 * ```tsx
 * const [status, setStatus] = useState<ButtonStatus>("idle");
 *
 * const handleClick = async () => {
 *   setStatus("loading");
 *   try {
 *     await performAction();
 *     setStatus("success");
 *   } catch (error) {
 *     setStatus("error");
 *   }
 * };
 *
 * <StatusButton status={status} onClick={handleClick}>
 *   Сохранить
 * </StatusButton>
 * ```
 */
const StatusButton = React.forwardRef<HTMLButtonElement, StatusButtonProps>(
  (
    {
      className,
      variant,
      size,
      status = "idle",
      children,
      loadingText = "Загрузка...",
      successText = "Готово",
      errorText = "Ошибка",
      autoResetDuration = 2000,
      onAutoReset,
      showStatusIcon = true,
      disabled,
      ...props
    },
    ref
  ) => {
    const timeoutRef = React.useRef<NodeJS.Timeout>();

    // Auto-reset from success/error to idle
    React.useEffect(() => {
      if (autoResetDuration > 0 && (status === "success" || status === "error")) {
        timeoutRef.current = setTimeout(() => {
          onAutoReset?.();
        }, autoResetDuration);
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [status, autoResetDuration, onAutoReset]);

    // Determine button content and variant based on status
    const getContent = () => {
      switch (status) {
        case "loading":
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              {showStatusIcon && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{loadingText}</span>
            </motion.div>
          );
        case "success":
          return (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="flex items-center gap-2"
            >
              {showStatusIcon && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ duration: 0.4, times: [0, 0.6, 1] }}
                >
                  <Check className="h-4 w-4" />
                </motion.div>
              )}
              <span>{successText}</span>
            </motion.div>
          );
        case "error":
          return (
            <motion.div
              initial={{ opacity: 0, x: 0 }}
              animate={{
                opacity: 1,
                x: [0, -4, 4, -4, 4, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                x: {
                  duration: 0.4,
                  times: [0, 0.2, 0.4, 0.6, 0.8, 1],
                },
                opacity: { duration: 0.2 },
              }}
              className="flex items-center gap-2"
            >
              {showStatusIcon && <X className="h-4 w-4" />}
              <span>{errorText}</span>
            </motion.div>
          );
        default:
          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {children}
            </motion.div>
          );
      }
    };

    // Determine variant based on status
    const effectiveVariant = React.useMemo(() => {
      if (status === "success") return "default";
      if (status === "error") return "destructive";
      return variant;
    }, [status, variant]);

    const isDisabled = disabled || status === "loading";

    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({ variant: effectiveVariant, size, className }),
          "relative overflow-hidden transition-all duration-200",
          status === "success" && "bg-green-600 hover:bg-green-700 text-white",
          status === "loading" && "cursor-wait"
        )}
        disabled={isDisabled}
        {...props}
      >
        {getContent()}
      </button>
        {/* Success ripple effect */}
        {status === "success" && (
          <motion.div
            className="absolute inset-0 bg-white/20 rounded-md"
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6 }}
          />
        )}
      </motion.button>
    );
  }
);

StatusButton.displayName = "StatusButton";

export { StatusButton };
