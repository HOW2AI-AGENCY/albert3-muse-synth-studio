/**
 * ShortcutsDialog Component
 *
 * Display keyboard shortcuts reference
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo } from 'react';
import { Keyboard, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
    global?: boolean;
  }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Playback',
    shortcuts: [
      { keys: ['Space', 'K'], description: 'Play/Pause', global: true },
      { keys: ['J'], description: 'Previous track', global: true },
      { keys: ['L'], description: 'Next track', global: true },
      { keys: ['→'], description: 'Seek forward 5s', global: true },
      { keys: ['←'], description: 'Seek backward 5s', global: true },
      { keys: ['↑'], description: 'Volume up', global: true },
      { keys: ['↓'], description: 'Volume down', global: true },
      { keys: ['S'], description: 'Toggle shuffle' },
      { keys: ['R'], description: 'Toggle repeat' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['/'], description: 'Focus search', global: true },
      { keys: ['M'], description: 'Open menu' },
      { keys: ['Ctrl', 'H'], description: 'Go to Home', global: true },
      { keys: ['Ctrl', 'W'], description: 'Go to Workspace', global: true },
      { keys: ['Esc'], description: 'Close dialog/menu', global: true },
    ],
  },
  {
    title: 'Track Actions',
    shortcuts: [
      { keys: ['F'], description: 'Like/Unlike track' },
      { keys: ['Ctrl', 'S'], description: 'Share track' },
      { keys: ['Ctrl', 'D'], description: 'Download track' },
      { keys: ['Q'], description: 'Add to queue' },
      { keys: ['Enter'], description: 'Play selected track' },
    ],
  },
  {
    title: 'Track Menu',
    shortcuts: [
      { keys: ['M'], description: 'Open track menu' },
      { keys: ['R'], description: 'Remix track' },
      { keys: ['S'], description: 'Share' },
      { keys: ['D'], description: 'Download' },
    ],
  },
];

const KeyBadge = memo<{ keyName: string }>(({ keyName }) => (
  <kbd
    className={cn(
      'inline-flex items-center justify-center',
      'min-w-[28px] h-7 px-2',
      'rounded border border-border bg-muted',
      'text-xs font-mono font-semibold',
      'shadow-sm'
    )}
  >
    {keyName}
  </kbd>
));

KeyBadge.displayName = 'KeyBadge';

export const ShortcutsDialog = memo<ShortcutsDialogProps>(({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Use these shortcuts to navigate and control the music platform
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {SHORTCUT_GROUPS.map((group, groupIdx) => (
              <div key={group.title}>
                {groupIdx > 0 && <Separator className="mb-6" />}
                <h3 className="text-sm font-semibold mb-4">{group.title}</h3>
                <div className="space-y-3">
                  {group.shortcuts.map((shortcut, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{shortcut.description}</span>
                        {shortcut.global && (
                          <span className="text-xs text-muted-foreground">
                            (global)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIdx) => (
                          <span key={keyIdx} className="flex items-center gap-1">
                            {keyIdx > 0 && (
                              <span className="text-xs text-muted-foreground">
                                +
                              </span>
                            )}
                            <KeyBadge keyName={key} />
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Press <KeyBadge keyName="?" /> anytime to view shortcuts
          </p>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

ShortcutsDialog.displayName = 'ShortcutsDialog';
