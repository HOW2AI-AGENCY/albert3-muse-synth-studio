/**
 * Bulk Operation Progress Modal
 * Shows progress for bulk operations
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import type { BulkOperationProgress as ProgressType } from '@/utils/bulkOperations';

interface BulkOperationProgressProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  progress: ProgressType | null;
  isCompleted: boolean;
  result?: { success: number; failed: number };
}

export const BulkOperationProgress: React.FC<BulkOperationProgressProps> = ({
  open,
  onOpenChange,
  title,
  description,
  progress,
  isCompleted,
  result,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress Bar */}
          {progress && !isCompleted && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {progress.current} / {progress.total}
                </span>
                <span className="font-medium">{progress.percentage}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
            </div>
          )}

          {/* Loading State */}
          {!isCompleted && (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Обработка...</span>
            </div>
          )}

          {/* Completed State */}
          {isCompleted && result && (
            <div className="space-y-3 py-4">
              {result.success > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span>
                    Успешно обработано: <strong>{result.success}</strong>
                  </span>
                </div>
              )}

              {result.failed > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-5 w-5 text-destructive" />
                  <span>
                    Ошибок: <strong>{result.failed}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Close Button */}
          {isCompleted && (
            <Button
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Закрыть
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
