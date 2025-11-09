/**
 * PermissionsDialog Component
 *
 * Modal for managing track visibility and permissions
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useState, useCallback, useEffect } from 'react';
import { Shield, Lock, Users, Globe, AlertCircle } from 'lucide-react';
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
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import type { PermissionsDialogProps, TrackVisibility } from '@/types/suno-ui.types';

const VISIBILITY_OPTIONS: Array<{
  value: TrackVisibility;
  icon: typeof Lock;
  label: string;
  description: string;
  color: string;
}> = [
  {
    value: 'private',
    icon: Lock,
    label: 'Private',
    description: 'Only you can access this track',
    color: 'text-muted-foreground',
  },
  {
    value: 'workspace',
    icon: Users,
    label: 'Workspace',
    description: 'Shared with your workspace members',
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    value: 'public',
    icon: Globe,
    label: 'Public',
    description: 'Anyone can discover and listen to this track',
    color: 'text-green-600 dark:text-green-400',
  },
];

export const PermissionsDialog = memo<PermissionsDialogProps>(({ 
  open,
  onOpenChange,
  trackId,
  currentVisibility,
  onSave,
  canPublish = true,
}) => {
  const [selectedVisibility, setSelectedVisibility] = useState<TrackVisibility>(currentVisibility);
  const [isSaving, setIsSaving] = useState(false);

  // Синхронизация выбранной видимости при каждом открытии диалога
  // и при изменении фактической видимости трека
  useEffect(() => {
    if (open) {
      setSelectedVisibility(currentVisibility);
    }
  }, [currentVisibility, open]);

  const hasChanges = selectedVisibility !== currentVisibility;
  const isPublishing = currentVisibility !== 'public' && selectedVisibility === 'public';

  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      onOpenChange(false);
      return;
    }

    if (isPublishing && !canPublish) {
      toast.error('You do not have permission to publish this track');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(selectedVisibility);
      toast.success(
        isPublishing
          ? 'Track published successfully!'
          : `Visibility updated to ${selectedVisibility}`
      );
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update permissions');
      logger.error('Permission update error', error instanceof Error ? error : new Error(String(error)), 'PermissionsDialog');
    } finally {
      setIsSaving(false);
    }
  }, [
    hasChanges,
    isPublishing,
    canPublish,
    selectedVisibility,
    onSave,
    onOpenChange,
  ]);

  const handleCancel = useCallback(() => {
    setSelectedVisibility(currentVisibility);
    onOpenChange(false);
  }, [currentVisibility, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Track Visibility & Permissions
          </DialogTitle>
          <DialogDescription>
            Control who can access and listen to this track
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Visibility Options */}
          <RadioGroup
            value={selectedVisibility}
            onValueChange={(value) => setSelectedVisibility(value as TrackVisibility)}
          >
            <div className="space-y-3">
              {VISIBILITY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedVisibility === option.value;
                const isDisabled = option.value === 'public' && !canPublish;

                return (
                  <div
                    key={option.value}
                    className={cn(
                      'relative flex items-start gap-3 rounded-lg border-2 p-4 transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/30',
                      isDisabled && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <RadioGroupItem
                      value={option.value}
                      id={option.value}
                      disabled={isDisabled}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <Label
                        htmlFor={option.value}
                        className={cn(
                          'flex items-center gap-2 font-semibold cursor-pointer',
                          isDisabled && 'cursor-not-allowed'
                        )}
                      >
                        <Icon className={cn('w-4 h-4', option.color)} />
                        {option.label}
                        {isDisabled && (
                          <span className="ml-auto text-xs text-muted-foreground">
                            No permission
                          </span>
                        )}
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

          {/* Publishing Warning */}
          {isPublishing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Once published, this track will be visible to everyone and can be
                discovered in the public feed. You can change it back to private
                anytime.
              </AlertDescription>
            </Alert>
          )}

          {/* Downgrading Warning */}
          {currentVisibility === 'public' && selectedVisibility !== 'public' && (
            <Alert variant="default" className="border-yellow-500/50 bg-yellow-500/5">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-600 dark:text-yellow-500">
                Making this track private will remove it from the public feed.
                Existing shares and embeds may stop working.
              </AlertDescription>
            </Alert>
          )}

          {/* No Publish Permission */}
          {!canPublish && (
            <Alert variant="default" className="border-muted">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                You need publish permissions to make this track public. Contact
                your workspace admin.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            variant={isPublishing ? 'default' : 'outline'}
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className={cn(isPublishing && 'bg-green-600 hover:bg-green-700')}
          >
            {isSaving
              ? 'Saving...'
              : isPublishing
              ? 'Publish Track'
              : 'Save Changes'}
          </Button>
        </DialogFooter>

        {/* Track ID */}
        <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
          <Shield className="w-3.5 h-3.5" />
          <span>Track ID: {trackId.slice(0, 8)}...</span>
        </div>
      </DialogContent>
    </Dialog>
  );
});

PermissionsDialog.displayName = 'PermissionsDialog';
