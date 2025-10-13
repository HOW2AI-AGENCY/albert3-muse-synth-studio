import { motion } from 'framer-motion';
import { Loader2, Music, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { scaleIn } from '@/utils/animations';

/**
 * Skeleton Card - для TrackCard с shimmer effect
 */
export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn('card-elevated p-4 space-y-3', className)}>
    <div className="flex gap-3">
      {/* Cover */}
      <div className="relative w-16 h-16 rounded-lg bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      
      {/* Content */}
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-3/4 overflow-hidden relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <div className="h-3 bg-muted rounded w-1/2 overflow-hidden relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    </div>
    
    <div className="flex gap-2">
      <div className="h-6 bg-muted rounded-full w-16 overflow-hidden relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
      <div className="h-6 bg-muted rounded-full w-20 overflow-hidden relative">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </div>
  </div>
);

/**
 * Track List Skeleton
 */
export const TrackListSkeleton = ({ count = 3 }: { count?: number }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

/**
 * Progress Indicator - circular с percentage
 */
interface ProgressIndicatorProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
}

export const ProgressIndicator = ({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  showPercentage = true
}: ProgressIndicatorProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
        
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(330 81% 60%)" />
          </linearGradient>
        </defs>
      </svg>
      
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.span
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent"
            key={progress}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {Math.round(progress)}%
          </motion.span>
        </div>
      )}
    </div>
  );
};

/**
 * Loading Overlay - full-screen с брендированным спиннером
 */
interface LoadingOverlayProps {
  message?: string;
  progress?: number;
}

export const LoadingOverlay = ({ message = 'Загрузка...', progress }: LoadingOverlayProps) => (
  <motion.div
    className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <motion.div
      className="flex flex-col items-center gap-6 p-8 rounded-xl bg-card border border-border/50 shadow-xl"
      variants={scaleIn}
      initial="initial"
      animate="animate"
    >
      {progress !== undefined ? (
        <ProgressIndicator progress={progress} />
      ) : (
        <div className="relative">
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative bg-gradient-to-br from-primary/20 to-accent-purple/20 rounded-full p-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
          </div>
        </div>
      )}
      
      <p className="text-lg font-medium text-foreground">{message}</p>
    </motion.div>
  </motion.div>
);

/**
 * Inline Loader - для кнопок и inline элементов
 */
interface InlineLoaderProps {
  text?: string;
  className?: string;
  iconClassName?: string;
}

export const InlineLoader = ({ text, className, iconClassName }: InlineLoaderProps) => (
  <span className={cn('inline-flex items-center gap-2', className)}>
    <Loader2 className={cn('w-4 h-4 animate-spin', iconClassName)} />
    {text && <span>{text}</span>}
  </span>
);

/**
 * Button Spinner - для замены контента кнопки
 */
export const ButtonSpinner = ({ text = 'Загрузка...' }: { text?: string }) => (
  <motion.span
    className="absolute inset-0 flex items-center justify-center gap-2"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <Loader2 className="w-4 h-4 animate-spin" />
    {text}
  </motion.span>
);

/**
 * Generation Progress - специальная анимация для генерации музыки
 */
interface GenerationProgressProps {
  stage?: 'preparing' | 'generating' | 'finalizing';
  className?: string;
}

export const GenerationProgress = ({ stage = 'generating', className }: GenerationProgressProps) => {
  const stageConfig = {
    preparing: { icon: Sparkles, text: 'Подготовка...', color: 'text-blue-500' },
    generating: { icon: Music, text: 'Генерация музыки...', color: 'text-primary' },
    finalizing: { icon: Loader2, text: 'Завершение...', color: 'text-green-500' }
  };

  const { icon: Icon, text, color } = stageConfig[stage];

  return (
    <motion.div
      className={cn('flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-border/50', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <motion.div 
        animate={stage === 'generating' ? { scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className={cn('w-5 h-5', color, stage === 'finalizing' && 'animate-spin')} />
      </motion.div>
      <span className="text-sm font-medium">{text}</span>
    </motion.div>
  );
};

/**
 * Centered Spinner - для центра экрана
 */
export const CenteredSpinner = ({ message }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
    {message && <p className="text-sm text-muted-foreground">{message}</p>}
  </div>
);

/**
 * Full Page Spinner - для полной страницы
 */
export const FullPageSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <motion.div
      className="flex flex-col items-center gap-6"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="relative">
        <motion.div
          className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative bg-gradient-to-br from-primary/20 to-accent-purple/20 rounded-full p-8">
          <Loader2 className="w-16 h-16 text-primary animate-spin" />
        </div>
      </div>
      <p className="text-lg font-medium">Загрузка...</p>
    </motion.div>
  </div>
);
