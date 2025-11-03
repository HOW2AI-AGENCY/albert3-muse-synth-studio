import { CompactHeader } from '@/components/generator/CompactHeader';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { getProviderModels, type MusicProvider as ProviderType } from '@/config/provider-models';
import { useGeneratorState } from '@/components/generator/hooks';
import { useGenerateMusic } from '@/hooks/useGenerateMusic';
import { useToast } from '@/hooks/use-toast';

interface MusicGeneratorHeaderProps {
    onTrackGenerated?: () => void;
}

export const MusicGeneratorHeader = ({ onTrackGenerated }: MusicGeneratorHeaderProps) => {
    const { selectedProvider } = useMusicGenerationStore();
    const { toast } = useToast();
    const { generate, isGenerating } = useGenerateMusic({
        provider: selectedProvider as ProviderType,
        onSuccess: onTrackGenerated,
        toast
    });
    const currentModels = getProviderModels(selectedProvider as ProviderType);
    const state = useGeneratorState(selectedProvider);

    return (
        <CompactHeader
            mode={state.mode}
            onModeChange={state.setMode}
            modelVersion={state.params.modelVersion}
            onModelChange={(version) => state.setParam('modelVersion', version)}
            availableModels={[...currentModels]}
            isGenerating={isGenerating}
            hasAudio={!!state.params.referenceFileName}
            hasPersona={!!state.params.personaId}
        />
    );
};
