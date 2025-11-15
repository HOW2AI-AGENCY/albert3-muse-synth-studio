import React, {
  useState,
  useEffect
} from 'react';
import { cn } from '@/lib/utils';
import { Info, CheckCircle, AlertCircle, X } from 'lucide-react';

/**
 * 💬 AccessibleToast - Доступное уведомление
 */
interface AccessibleToastProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
}

export const AccessibleToast: React.FC<AccessibleToastProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  autoClose = true,
  duration = 5000,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: AlertCircle,
  };

  const styles = {
    info: 'bg-info-container text-on-info-container border-info',
    success: 'bg-success-container text-on-success-container border-success',
    warning: 'bg-warning-container text-on-warning-container border-warning',
    error: 'bg-error-container text-on-error-container border-error',
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-elevation-2',
        'transition-all duration-300 ease-out',
        styles[type],
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full',
        className
      )}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />

      <div className="flex-1 min-w-0">
        <h4 className="font-medium">{title}</h4>
        {message && (
          <p className="text-sm mt-1 opacity-90">{message}</p>
        )}
      </div>

      {onClose && (
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(), 300);
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Закрыть уведомление"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
