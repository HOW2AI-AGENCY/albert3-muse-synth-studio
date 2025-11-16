/**
 * Network Status Alert Component
 * 
 * Shows alert when user goes offline
 * Auto-dismisses when connection is restored
 * 
 * @priority P1
 */

import { useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useToast } from '@/hooks/use-toast';
import { AnimatePresence, motion } from 'framer-motion';

export const NetworkAlert: React.FC = () => {
  const isOnline = useOnlineStatus();
  const { toast } = useToast();

  useEffect(() => {
    if (!isOnline) {
      toast({
        title: '❌ Нет подключения',
        description: 'Проверьте интернет-соединение',
        variant: 'destructive',
        duration: Infinity,
      });
    } else {
      toast({
        title: '✅ Подключение восстановлено',
        description: 'Вы снова онлайн',
        duration: 3000,
      });
    }
  }, [isOnline, toast]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertTitle>Нет подключения к интернету</AlertTitle>
            <AlertDescription>
              Некоторые функции могут быть недоступны. Проверьте подключение.
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Inline network status indicator (for specific components)
 */
export const InlineNetworkStatus: React.FC<{ className?: string }> = ({ className }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className={className}>
      <Alert variant="destructive">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>Нет подключения</AlertTitle>
        <AlertDescription>
          Проверьте интернет-соединение для использования этой функции.
        </AlertDescription>
      </Alert>
    </div>
  );
};
