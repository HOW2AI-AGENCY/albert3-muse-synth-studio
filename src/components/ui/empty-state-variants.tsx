import { Music, Search, AlertTriangle, Layers, Sparkles, Plus } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  className?: string;
  onAction?: () => void;
  actionLabel?: string;
}

/**
 * Empty State: Нет треков
 */
export const NoTracksYet = ({ className, onAction, actionLabel = 'Создать первый трек' }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
    <div className="relative mb-6">
      <div className="absolute inset-0 animate-pulse-glow rounded-full bg-primary/20 blur-2xl" />
      <div className="relative bg-gradient-to-br from-primary/20 to-accent-purple/20 rounded-full p-8">
        <Music className="w-16 h-16 text-primary" />
      </div>
    </div>
    
    <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent-purple bg-clip-text text-transparent">
      Начните создавать музыку
    </h3>
    <p className="text-muted-foreground mb-6 max-w-md">
      У вас пока нет треков. Создайте свой первый трек с помощью AI и начните музыкальное путешествие!
    </p>
    
    {onAction && (
      <Button onClick={onAction} size="lg" className="gap-2">
        <Plus className="w-5 h-5" />
        {actionLabel}
      </Button>
    )}
    
    <div className="mt-8 grid grid-cols-3 gap-4 max-w-md w-full">
      {[
        { icon: Music, label: 'Генерация AI' },
        { icon: Sparkles, label: 'Улучшение промптов' },
        { icon: Layers, label: 'Разделение стемов' },
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-lg bg-muted/50">
          <item.icon className="w-5 h-5 text-primary" />
          <span className="text-xs text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  </div>
);

/**
 * Empty State: Нет результатов поиска
 */
export const NoSearchResults = ({ className, onAction, actionLabel = 'Очистить фильтры' }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
    <div className="bg-muted/50 rounded-full p-6 mb-4">
      <Search className="w-12 h-12 text-muted-foreground" />
    </div>
    
    <h3 className="text-xl font-semibold mb-2">Ничего не найдено</h3>
    <p className="text-muted-foreground mb-6 max-w-md">
      По вашему запросу не найдено треков. Попробуйте изменить фильтры или создать новый трек.
    </p>
    
    <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-6">
      <p className="flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-primary" />
        Проверьте правильность написания
      </p>
      <p className="flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-primary" />
        Используйте более общие термины
      </p>
      <p className="flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-primary" />
        Попробуйте другие ключевые слова
      </p>
    </div>
    
    {onAction && (
      <Button onClick={onAction} variant="outline">
        {actionLabel}
      </Button>
    )}
  </div>
);

/**
 * Empty State: Ошибка генерации
 */
export const GenerationFailed = ({ 
  className, 
  onAction, 
  actionLabel = 'Попробовать снова',
  error 
}: EmptyStateProps & { error?: string }) => (
  <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
    <div className="bg-destructive/10 rounded-full p-6 mb-4">
      <AlertTriangle className="w-12 h-12 text-destructive" />
    </div>
    
    <h3 className="text-xl font-semibold mb-2">Ошибка генерации</h3>
    <p className="text-muted-foreground mb-2 max-w-md">
      К сожалению, не удалось создать трек. Это может произойти по разным причинам.
    </p>
    
    {error && (
      <p className="text-sm text-destructive/80 mb-6 max-w-md font-mono bg-destructive/5 p-3 rounded-md">
        {error}
      </p>
    )}
    
    <div className="flex flex-col gap-2 text-sm text-muted-foreground mb-6">
      <p className="flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-primary" />
        Проверьте интернет-соединение
      </p>
      <p className="flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-primary" />
        Убедитесь, что промпт соответствует правилам
      </p>
      <p className="flex items-center gap-2">
        <span className="w-1 h-1 rounded-full bg-primary" />
        Попробуйте изменить параметры генерации
      </p>
    </div>
    
    {onAction && (
      <div className="flex gap-2">
        <Button onClick={onAction} variant="default">
          {actionLabel}
        </Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Обновить страницу
        </Button>
      </div>
    )}
  </div>
);

/**
 * Empty State: Нет стемов
 */
export const NoStemsAvailable = ({ className, onAction, actionLabel = 'Разделить на стемы' }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
    <div className="bg-gradient-to-br from-primary/10 to-accent-purple/10 rounded-full p-6 mb-4">
      <Layers className="w-12 h-12 text-primary" />
    </div>
    
    <h3 className="text-xl font-semibold mb-2">Стемы недоступны</h3>
    <p className="text-muted-foreground mb-6 max-w-md">
      Этот трек еще не разделен на отдельные инструментальные дорожки. Разделите трек, чтобы работать с вокалом, барабанами, басом и другими элементами отдельно.
    </p>
    
    <div className="grid grid-cols-2 gap-3 max-w-sm w-full mb-6 text-xs">
      {['Вокал', 'Барабаны', 'Бас', 'Другое'].map((label, i) => (
        <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
    
    {onAction && (
      <Button onClick={onAction} className="gap-2">
        <Layers className="w-4 h-4" />
        {actionLabel}
      </Button>
    )}
  </div>
);

/**
 * Generic Empty State with custom content
 */
export const EmptyState = ({ 
  icon: Icon = Music,
  title,
  description,
  action,
  actionLabel,
  className 
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  className?: string;
}) => (
  <div className={cn('flex flex-col items-center justify-center p-12 text-center', className)}>
    <div className="bg-muted/50 rounded-full p-6 mb-4">
      <Icon className="w-12 h-12 text-muted-foreground" />
    </div>
    
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
    
    {action && actionLabel && (
      <Button onClick={action}>
        {actionLabel}
      </Button>
    )}
  </div>
);
