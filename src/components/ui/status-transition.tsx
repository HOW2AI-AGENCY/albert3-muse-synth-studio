import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

type StatusTransitionProps = {
  status: 'loading' | 'success' | 'error' | 'idle';
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  idleMessage?: string;
};

export const StatusTransition = ({
  status,
  loadingMessage = 'Загрузка...',
  successMessage = 'Готово!',
  errorMessage = 'Ошибка',
  idleMessage,
}: StatusTransitionProps) => {
  return (
    <AnimatePresence mode="wait">
      {status === 'loading' && (
        <motion.div
          key="loading"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{loadingMessage}</span>
        </motion.div>
      )}

      {status === 'success' && (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
          className="flex items-center gap-2 text-green-600"
        >
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{successMessage}</span>
        </motion.div>
      )}

      {status === 'error' && (
        <motion.div
          key="error"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 10 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 text-destructive"
        >
          <XCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{errorMessage}</span>
        </motion.div>
      )}

      {status === 'idle' && idleMessage && (
        <motion.div
          key="idle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2"
        >
          <span className="text-sm">{idleMessage}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
