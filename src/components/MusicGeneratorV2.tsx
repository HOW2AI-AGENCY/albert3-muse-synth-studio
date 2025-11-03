import { memo } from 'react';
import { motion } from 'framer-motion';
import { useBreakpoints } from '@/hooks/useBreakpoints';
import { cn } from '@/lib/utils';
import { MusicGeneratorHeader } from '@/features/music-generation/MusicGeneratorHeader';
import { MusicGeneratorForm } from '@/features/music-generation/MusicGeneratorForm';
import { MusicGeneratorDialogs } from '@/features/music-generation/MusicGeneratorDialogs';
import { useMusicGenerator } from '@/features/music-generation/useMusicGenerator';
import { QuickActionsBar } from '@/components/generator/QuickActionsBar';
import { useToast } from '@/hooks/use-toast';

interface MusicGeneratorV2Props {
  onTrackGenerated?: () => void;
}

const MusicGeneratorV2Component = ({ onTrackGenerated }: MusicGeneratorV2Props) => {
  const { isMobile } = useBreakpoints();
  const { toast } = useToast();
  const {
    state,
    isGenerating,
    personaDialogOpen,
    setPersonaDialogOpen,
    projectDialogOpen,
    setProjectDialogOpen,
    audioSourceDialogOpen,
    setAudioSourceDialogOpen,
    audioUpload,
    tempAudioUrl,
  } = useMusicGenerator(onTrackGenerated);

  return (
    <motion.div 
      className={cn(
        "flex flex-col h-full card-elevated",
        isMobile && "rounded-none"
      )}
      data-testid="music-generator"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <MusicGeneratorHeader onTrackGenerated={onTrackGenerated} />
      <QuickActionsBar
          hasAudio={!!state.params.referenceFileName}
          hasPersona={!!state.params.personaId}
          hasProject={!!state.params.activeProjectId}
          onAudioClick={() => setAudioSourceDialogOpen(true)}
          onPersonaClick={() => setPersonaDialogOpen(true)}
          onProjectClick={() => {
            setProjectDialogOpen(true);
            if (state.mode === 'simple') {
              state.setMode('custom');
              toast({
                title: 'Переключено на Custom Mode',
                description: 'Выбор проекта и трека доступен в продвинутом режиме',
                duration: 3000,
              });
            }
          }}
          isGenerating={isGenerating}
        />
      <MusicGeneratorForm onTrackGenerated={onTrackGenerated} />
      <MusicGeneratorDialogs
        state={state}
        audioUpload={audioUpload}
        personaDialogOpen={personaDialogOpen}
        setPersonaDialogOpen={setPersonaDialogOpen}
        projectDialogOpen={projectDialogOpen}
        setProjectDialogOpen={setProjectDialogOpen}
        audioSourceDialogOpen={audioSourceDialogOpen}
        setAudioSourceDialogOpen={setAudioSourceDialogOpen}
        tempAudioUrl={tempAudioUrl}
      />
    </motion.div>
  );
};

export const MusicGeneratorV2 = memo(MusicGeneratorV2Component);
