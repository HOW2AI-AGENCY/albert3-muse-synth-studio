/**
 * @fileoverview Диалог создания Suno Persona из трека
 * @version 1.1.0
 * @since 2025-11-01
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from '@/utils/iconImports';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { getAIDescription } from '@/types/track-metadata';
import type { TrackMetadata } from '@/types/track-metadata';
import { ImageUpload } from '../ui/ImageUpload';
import { useImageUpload } from '@/hooks/useImageUpload';

// ============================================================================
// TYPES
// ============================================================================

export interface CreatePersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: {
    id: string;
    title: string;
    cover_url?: string | null;
    style_tags?: string[] | null;
    lyrics?: string | null;
    prompt?: string | null;
    improved_prompt?: string | null;
    metadata?: TrackMetadata | null;
  };
  musicIndex?: number;
  onSuccess?: (persona: unknown) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CreatePersonaDialog = ({
  open,
  onOpenChange,
  track,
  musicIndex = 0,
  onSuccess,
}: CreatePersonaDialogProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const imageUpload = useImageUpload();

  const resetForm = () => {
    setName('');
    setDescription('');
    setIsPublic(false);
    setAvatarUrl(null);
    imageUpload.handleRemove();
  };

  useEffect(() => {
    if (open && track) {
      let styleDescription = '';
      const aiDesc = getAIDescription(track.metadata);
      if (aiDesc) {
        styleDescription = aiDesc;
      } else {
        styleDescription = track.improved_prompt || track.prompt || '';
      }
      setDescription(styleDescription);
      setName(track.title || '');
      setIsPublic(false);
      setAvatarUrl(track.cover_url || null); // Use track cover as default avatar
    } else {
      resetForm();
    }
  }, [open, track]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const uploadedUrl = await imageUpload.uploadImage(file);
      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
      }
    }
  };

  const boostDescription = async () => {
    // ... (omitted for brevity)
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Введите название персоны');
      return;
    }
    // ... (other validations omitted for brevity)

    setIsCreating(true);

    try {
      const { data, error } = await SupabaseFunctions.invoke('create-suno-persona', {
        body: {
          trackId: track.id,
          musicIndex,
          name: name.trim(),
          description: description.trim(),
          isPublic,
          avatarUrl: avatarUrl, // Send the new avatar URL
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Персона успешно создана!');
      onSuccess?.(data.persona);
      onOpenChange(false);
      resetForm();

    } catch (error) {
      // ... (error handling omitted for brevity)
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
            {/* ... (omitted for brevity) */}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <ImageUpload
            {...imageUpload}
            previewUrl={imageUpload.previewUrl || avatarUrl}
            handleFileChange={handleFileChange}
          />

          <div className="space-y-2">
            <Label htmlFor="persona-name">Название персоны <span className="text-destructive">*</span></Label>
            <Input
              id="persona-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Electronic Pop Singer"
              maxLength={100}
              disabled={isCreating}
            />
             {/* ... (omitted for brevity) */}
          </div>

          <div className="space-y-2">
             {/* ... (description field omitted for brevity) */}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
             {/* ... (public switch omitted for brevity) */}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Отмена
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isCreating || imageUpload.isUploading}>
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Создать персону
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

CreatePersonaDialog.displayName = 'CreatePersonaDialog';
