/**
 * Replace Section Dialog Component
 * UI for selecting and replacing a time segment in a track
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useReplaceSection } from '@/hooks/useReplaceSection';
import { SectionSelector } from './SectionSelector';
import { Loader2 } from 'lucide-react';

interface Track {
  id: string;
  title: string;
  duration_seconds: number;
  suno_task_id: string | null;
  style_tags: string[] | null;
}

interface ReplaceSectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track;
  onSuccess?: () => void;
}

export const ReplaceSectionDialog: React.FC<ReplaceSectionDialogProps> = ({
  open,
  onOpenChange,
  track,
  onSuccess,
}) => {
  const { replaceSection, isProcessing } = useReplaceSection();
  
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(Math.min(10, track.duration_seconds || 10));
  const [prompt, setPrompt] = useState('');
  const [tags, setTags] = useState(track.style_tags?.join(', ') || '');
  const [negativeTags, setNegativeTags] = useState('');
  const [title, setTitle] = useState(`${track.title} (Section Replaced)`);

  useEffect(() => {
    // Reset form when dialog opens
    if (open) {
      setStartTime(0);
      setEndTime(Math.min(10, track.duration_seconds || 10));
      setPrompt('');
      setTags(track.style_tags?.join(', ') || '');
      setNegativeTags('');
      setTitle(`${track.title} (Section Replaced)`);
    }
  }, [open, track]);

  const handleSelectionChange = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!track.suno_task_id) {
      return;
    }

    try {
      await replaceSection({
        trackId: track.id,
        taskId: track.suno_task_id,
        musicIndex: 0,
        prompt,
        tags,
        title,
        negativeTags: negativeTags || undefined,
        infillStartS: startTime,
        infillEndS: endTime,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled by the hook
    }
  };

  const isValid = 
    prompt.trim() !== '' &&
    tags.trim() !== '' &&
    title.trim() !== '' &&
    endTime > startTime &&
    (endTime - startTime) >= 5 &&
    (endTime - startTime) <= 30;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Replace Music Section</DialogTitle>
          <DialogDescription>
            Select a time range and describe the replacement music. The section will be generated and saved as a new version.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section Selector */}
          <div className="space-y-2">
            <Label>Select Time Range (5-30 seconds)</Label>
            <SectionSelector
              duration={track.duration_seconds}
              onSelectionChange={handleSelectionChange}
              initialStart={startTime}
              initialEnd={endTime}
            />
            <p className="text-xs text-muted-foreground">
              Selected: {startTime.toFixed(2)}s - {endTime.toFixed(2)}s 
              ({(endTime - startTime).toFixed(2)}s duration)
            </p>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter track title"
              required
            />
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="prompt">Description</Label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the music you want for this section..."
              rows={3}
              required
            />
            <p className="text-xs text-muted-foreground">
              Describe the mood, instruments, or style for the replacement section.
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Style Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., jazz, electronic, upbeat"
              required
            />
          </div>

          {/* Negative Tags */}
          <div className="space-y-2">
            <Label htmlFor="negativeTags">Negative Tags (Optional)</Label>
            <Input
              id="negativeTags"
              value={negativeTags}
              onChange={(e) => setNegativeTags(e.target.value)}
              placeholder="e.g., rock, heavy, aggressive"
            />
            <p className="text-xs text-muted-foreground">
              Styles to avoid in the replacement section.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isProcessing}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Replace Section
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
