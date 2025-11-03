import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AudioPreviewDialog } from '@/components/audio/AudioPreviewDialog';
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog';
import { MurekaLyricsVariantDialog } from '@/components/lyrics/MurekaLyricsVariantDialog';
import { PromptHistoryDialog } from '@/components/generator/PromptHistoryDialog';
import { PersonaPickerDialog } from '@/components/generator/PersonaPickerDialog';
import { ProjectSelectorDialog } from '@/components/generator/ProjectSelectorDialog';
import { GeneratorTour } from '@/components/onboarding/GeneratorTour';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { logger } from '@/utils/logger';
import { AudioSourceDialog } from '@/components/generator/audio/AudioSourceDialog';

interface MusicGeneratorDialogsProps {
    state: any;
    audioUpload: any;
    personaDialogOpen: boolean;
    setPersonaDialogOpen: (open: boolean) => void;
    projectDialogOpen: boolean;
    setProjectDialogOpen: (open: boolean) => void;
    audioSourceDialogOpen: boolean;
    setAudioSourceDialogOpen: (open: boolean) => void;
    tempAudioUrl: string;
}

export const MusicGeneratorDialogs = ({
    state,
    audioUpload,
    personaDialogOpen,
    setPersonaDialogOpen,
    projectDialogOpen,
    setProjectDialogOpen,
    audioSourceDialogOpen,
    setAudioSourceDialogOpen,
    tempAudioUrl,
}: MusicGeneratorDialogsProps) => {
    const { toast } = useToast();

    const handleMurekaLyricsSelect = useCallback(async (lyrics: string, variantId: string) => {
        if (!state.murekaLyricsDialog.trackId) return;

        try {
          logger.info('User selected Mureka lyrics variant', undefined, {
            trackId: state.murekaLyricsDialog.trackId,
            variantId
          });

          const { error } = await supabase
            .from('tracks')
            .update({
              lyrics: lyrics,
              metadata: {
                selected_lyrics_variant_id: variantId,
                stage: 'composing_music',
                stage_description: 'Создание музыки...'
              }
            })
            .eq('id', state.murekaLyricsDialog.trackId);

          if (error) throw error;

          sonnerToast.success('Текст выбран! Продолжаем создание музыки...', {
            duration: 3000
          });

          state.setParam('lyrics', lyrics);

        } catch (error) {
          logger.error('Failed to apply lyrics variant', error as Error);
          sonnerToast.error('Ошибка применения текста');
        }
      }, [state.murekaLyricsDialog.trackId, state.setParam]);

    return (
        <>
            <AudioSourceDialog
                open={audioSourceDialogOpen}
                onOpenChange={setAudioSourceDialogOpen}
                onAudioSelect={(url: string, fileName: string) => {
                state.setParam('referenceAudioUrl', url);
                state.setParam('referenceFileName', fileName);
                }}
                onRecordComplete={() => {
                // Optional: handle recording completion
                }}
                onTrackSelect={(track: any) => {
                // Optional: handle track selection metadata
                if (track.style_tags?.length > 0) {
                    const existingTags = state.params.tags || '';
                    const newTags = existingTags
                    ? `${existingTags}, ${track.style_tags.join(', ')}`
                    : track.style_tags.join(', ');
                    state.setParam('tags', newTags);
                }
                }}
            />

            <AudioPreviewDialog
                open={state.audioPreviewOpen}
                onOpenChange={(open) => {
                state.setAudioPreviewOpen(open);
                if (!open) state.setPendingAudioFile(null);
                }}
                onConfirm={audioUpload.handleAudioConfirm}
                onRemove={audioUpload.handleRemoveAudio}
                audioUrl={tempAudioUrl}
                fileName={state.pendingAudioFile?.name || ''}
            />

            <LyricsGeneratorDialog
                open={state.lyricsDialogOpen}
                onOpenChange={state.setLyricsDialogOpen}
                trackId={state.params.trackId}
                onGenerated={(lyrics: string) => {
                state.setParam('lyrics', lyrics);
                state.setDebouncedLyrics(lyrics);
                state.setLyricsDialogOpen(false);
                }}
            />

            <MurekaLyricsVariantDialog
                open={state.murekaLyricsDialog.open}
                onOpenChange={(open) => state.setMurekaLyricsDialog({ ...state.murekaLyricsDialog, open })}
                trackId={state.murekaLyricsDialog.trackId}
                jobId={state.murekaLyricsDialog.jobId}
                onSelectVariant={handleMurekaLyricsSelect}
            />

            <PromptHistoryDialog
                open={state.historyDialogOpen}
                onOpenChange={state.setHistoryDialogOpen}
                onSelect={(historyItem: {
                prompt: string;
                lyrics?: string;
                style_tags?: string[];
                }) => {
                state.setParam('prompt', historyItem.prompt);
                state.setDebouncedPrompt(historyItem.prompt);
                if (historyItem.lyrics) {
                    state.setParam('lyrics', historyItem.lyrics);
                    state.setDebouncedLyrics(historyItem.lyrics);
                }
                if (historyItem.style_tags?.length) {
                    state.setParam('tags', historyItem.style_tags.join(', '));
                }
                state.setHistoryDialogOpen(false);
                }}
            />

            <PersonaPickerDialog
                open={personaDialogOpen}
                onOpenChange={setPersonaDialogOpen}
                selectedPersonaId={state.params.personaId ?? null}
                onSelectPersona={(personaId) => {
                state.setParam('personaId', personaId);
                setPersonaDialogOpen(false);
                if (personaId) {
                    toast({
                    title: "Персона выбрана",
                    description: "Музыкальная персона будет применена к генерации",
                    });
                }
                }}
            />

            <ProjectSelectorDialog
                open={projectDialogOpen}
                onOpenChange={setProjectDialogOpen}
                selectedProjectId={state.params.activeProjectId ?? null}
                onProjectSelect={(projectId) => {
                state.setParam('activeProjectId', projectId);
                setProjectDialogOpen(false);

                if (projectId && state.mode === 'simple') {
                    state.setMode('custom');
                }

                if (projectId) {
                    toast({
                    title: "Проект выбран",
                    description: "Проект будет использован для генерации",
                    });
                }
                }}
                showTrackSelection={false}
            />

            <GeneratorTour />
        </>
    );
};
