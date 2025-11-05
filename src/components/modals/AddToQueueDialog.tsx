/**
 * AddToQueueDialog Component
 *
 * Modal for adding tracks to the player queue
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useState, useCallback } from 'react';
import { ListPlus, PlayCircle, ListEnd, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { AddToQueueDialogProps } from '@/types/suno-ui.types';

const POSITION_OPTIONS = [
  {
    value: 'next' as const,
    icon: PlayCircle,
    label: 'Play Next',
    description: 'Add after the current track',
    shortcut: '⌘⇧N',
  },
  {
    value: 'end' as const,
    icon: ListEnd,
    label: 'Add to End',
    description: 'Add to the end of the queue',
    shortcut: '⌘⇧E',
  },
];

export const AddToQueueDialog = memo<AddToQueueDialogProps>(({
  open,
  onOpenChange,
  trackId,
  trackTitle,
  position = 'end',
  onAdd,
}) => {
  const [selectedPosition, setSelectedPosition] = useState<'next' | 'end'>(position);

  const handleAdd = useCallback(() => {
    onAdd(selectedPosition);
    toast.success(
      selectedPosition === 'next'
        ? 'Track will play next'
        : 'Track added to queue'
    );
    onOpenChange(false);
  }, [selectedPosition, onAdd, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListPlus className="w-5 h-5" />
            Add to Queue
          </DialogTitle>
          <DialogDescription>
            {trackTitle
              ? `Add "${trackTitle}" to your playback queue`
              : 'Choose where to add this track in the queue'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Position Options */}
          <div className="space-y-2">
            <Label>Queue Position</Label>
            <RadioGroup
              value={selectedPosition}
              onValueChange={(value) => setSelectedPosition(value as 'next' | 'end')}
            >
              <div className="space-y-3">
                {POSITION_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedPosition === option.value;

                  return (
                    <div
                      key={option.value}
                      className={cn(
                        'relative flex items-start gap-3 rounded-lg border-2 p-4 transition-all cursor-pointer',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30'
                      )}
                      onClick={() => setSelectedPosition(option.value)}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label
                          htmlFor={option.value}
                          className="flex items-center gap-2 font-semibold cursor-pointer"
                        >
                          <Icon className="w-4 h-4 text-primary" />
                          {option.label}
                          <kbd className="ml-auto hidden sm:inline-flex h-5 px-1.5 items-center justify-center rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">
                            {option.shortcut}
                          </kbd>
                        </Label>
                        <p className="text-sm text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </RadioGroup>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {selectedPosition === 'next'
                ? 'The track will play immediately after the current track finishes.'
                : 'The track will be added to the end of your queue. You can reorder it later.'}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleAdd}
            className={cn(
              selectedPosition === 'next' &&
                'bg-primary hover:bg-primary/90'
            )}
          >
            {selectedPosition === 'next' ? 'Play Next' : 'Add to Queue'}
          </Button>
        </DialogFooter>

        {/* Track ID */}
        <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
          <ListPlus className="w-3.5 h-3.5" />
          <span>Track ID: {trackId.slice(0, 8)}...</span>
        </div>
      </DialogContent>
    </Dialog>
  );
});

AddToQueueDialog.displayName = 'AddToQueueDialog';
