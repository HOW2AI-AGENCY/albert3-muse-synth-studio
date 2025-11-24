import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { AnimatePresence, motion } from 'framer-motion';

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground p-3 text-center text-sm font-medium z-offline-banner"
          role="alert"
        >
          <div className="container mx-auto flex items-center justify-center gap-2">
            <WifiOff className="h-4 w-4" />
            <span>You are currently offline. Please check your internet connection.</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
