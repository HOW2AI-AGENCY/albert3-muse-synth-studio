/**
 * MoveToWorkspaceDialog Component
 *
 * Modal for moving tracks between workspaces
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useState, useCallback } from 'react';
import { FolderInput, Folder, Check, AlertCircle } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';
import type { MoveToWorkspaceDialogProps } from '@/types/suno-ui.types';

export const MoveToWorkspaceDialog = memo<MoveToWorkspaceDialogProps>(({
  open,
  onOpenChange,
  trackId,
  trackTitle,
  workspaces,
  currentWorkspaceId,
  onMove,
}) => {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | undefined>(
    currentWorkspaceId
  );
  const [isMoving, setIsMoving] = useState(false);

  const hasChanges = selectedWorkspaceId !== currentWorkspaceId;
  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

  const handleMove = useCallback(async () => {
    if (!selectedWorkspaceId || !hasChanges) {
      onOpenChange(false);
      return;
    }

    setIsMoving(true);
    try {
      await onMove(selectedWorkspaceId);
      toast.success(
        `Track moved to ${selectedWorkspace?.name || 'workspace'} successfully!`
      );
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to move track');
      logger.error('Move track error', error instanceof Error ? error : new Error(String(error)), 'MoveToWorkspaceDialog');
    } finally {
      setIsMoving(false);
    }
  }, [selectedWorkspaceId, hasChanges, selectedWorkspace, onMove, onOpenChange]);

  const handleCancel = useCallback(() => {
    setSelectedWorkspaceId(currentWorkspaceId);
    onOpenChange(false);
  }, [currentWorkspaceId, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderInput className="w-5 h-5" />
            Move to Workspace
          </DialogTitle>
          <DialogDescription>
            {trackTitle
              ? `Move "${trackTitle}" to a different workspace`
              : 'Select a workspace to move this track to'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {workspaces.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                No workspaces available. Create a workspace first.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Label>Select Workspace</Label>
              <ScrollArea className="h-[300px] rounded-lg border">
                <RadioGroup
                  value={selectedWorkspaceId}
                  onValueChange={setSelectedWorkspaceId}
                  className="p-4 space-y-2"
                >
                  {workspaces.map((workspace) => {
                    const isSelected = selectedWorkspaceId === workspace.id;
                    const isCurrent = workspace.id === currentWorkspaceId;

                    return (
                      <div
                        key={workspace.id}
                        className={cn(
                          'relative flex items-start gap-3 rounded-lg border-2 p-3 transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/30',
                          isCurrent && 'bg-muted/50'
                        )}
                      >
                        <RadioGroupItem
                          value={workspace.id}
                          id={workspace.id}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <Label
                            htmlFor={workspace.id}
                            className="flex items-center gap-2 font-semibold cursor-pointer"
                          >
                            <Folder className="w-4 h-4 text-primary shrink-0" />
                            <span className="truncate">{workspace.name}</span>
                            {isCurrent && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                Current
                              </span>
                            )}
                          </Label>
                          {workspace.trackCount !== undefined && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {workspace.trackCount}{' '}
                              {workspace.trackCount === 1 ? 'track' : 'tracks'}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-primary shrink-0 mt-1" />
                        )}
                      </div>
                    );
                  })}
                </RadioGroup>
              </ScrollArea>
            </>
          )}

          {/* Warning if moving */}
          {hasChanges && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Moving this track will update its workspace association. Workspace
                members will have access based on the new workspace's permissions.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={isMoving}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleMove}
            disabled={!hasChanges || isMoving || workspaces.length === 0}
          >
            {isMoving ? 'Moving...' : 'Move Track'}
          </Button>
        </DialogFooter>

        {/* Track ID */}
        <div className="flex items-center gap-2 pt-2 border-t text-xs text-muted-foreground">
          <FolderInput className="w-3.5 h-3.5" />
          <span>Track ID: {trackId.slice(0, 8)}...</span>
        </div>
      </DialogContent>
    </Dialog>
  );
});

MoveToWorkspaceDialog.displayName = 'MoveToWorkspaceDialog';
