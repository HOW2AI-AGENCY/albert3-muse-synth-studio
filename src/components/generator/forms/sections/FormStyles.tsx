import { lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Section } from '@/components/ui/section';
import { StyleTagsInput } from '../StyleTagsInput';
import { StyleRecommendationsInline } from '@/components/generator/StyleRecommendationsInline';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { GenerationParams } from '../../types/generator.types';
import type { AdvancedPromptResult } from '@/services/ai/advanced-prompt-generator';

const AudioDescriber = lazy(() => import('@/components/audio/AudioDescriber').then(m => ({ default: m.AudioDescriber })));

interface FormStylesProps {
    params: GenerationParams;
    onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
    isGenerating: boolean;
    tagsCount: number;
    debouncedPrompt: string;
    handleQuickTagAdd: (tag: string) => void;
    handleApplyTags: (newTags: string[]) => void;
    handleAdvancedPromptGenerated: (result: AdvancedPromptResult) => void;
}

export const FormStyles = ({
    params,
    onParamChange,
    isGenerating,
    tagsCount,
    debouncedPrompt,
    handleQuickTagAdd,
    handleApplyTags,
    handleAdvancedPromptGenerated,
}: FormStylesProps) => {
    return (
        <Section
            defaultOpen={tagsCount > 0}
            title={
                <>
                    <span>Styles</span>
                    <InfoTooltip
                        content={
                            <div className="space-y-1">
                                <p className="font-semibold">Теги стилей</p>
                                <p className="text-xs">Укажите жанр, настроение, темп через запятую</p>
                                <p className="text-xs mt-2">Примеры:</p>
                                <ul className="text-xs list-disc list-inside space-y-0.5">
                                    <li>pop, energetic, uplifting, 120bpm</li>
                                    <li>ambient, calm, ethereal, slow</li>
                                    <li>rock, electric guitar, drums, powerful</li>
                                </ul>
                            </div>
                        }
                    />
                </>
            }
            badge={tagsCount > 0 ? (
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                    {tagsCount}
                </Badge>
            ) : undefined}
            contentClassName="space-y-[var(--space-2)] p-[var(--space-compact-md)] sm:p-[var(--space-comfortable-sm)]"
        >
            {debouncedPrompt.length >= 10 && (
                <StyleRecommendationsInline
                    prompt={debouncedPrompt}
                    currentTags={params.tags.split(',').map(t => t.trim()).filter(Boolean)}
                    lyrics={params.lyrics}
                    onApplyTags={handleApplyTags}
                    onAdvancedPromptGenerated={handleAdvancedPromptGenerated}
                />
            )}

            <StyleTagsInput
                tags={params.tags}
                negativeTags={params.negativeTags}
                onTagsChange={(tags) => onParamChange('tags', tags)}
                onNegativeTagsChange={(tags) => onParamChange('negativeTags', tags)}
                isGenerating={isGenerating}
            />

            <div className="flex flex-wrap gap-[var(--space-2)]">
                {['creepy', 'ambient', 'acid techno', 'synthwave', 'lofi'].map((tag) => (
                    <Button
                        key={tag}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickTagAdd(tag)}
                        className="h-9 px-3 text-xs gap-1 touch-target-min"
                        disabled={isGenerating}
                        aria-label={`Add ${tag} tag`}
                    >
                        +{tag}
                    </Button>
                ))}
            </div>

            {params.referenceAudioUrl && (
                <Suspense fallback={<div className="text-xs text-muted-foreground">Загрузка анализатора...</div>}>
                    <AudioDescriber
                        audioUrl={params.referenceAudioUrl}
                        onDescriptionGenerated={(description) => onParamChange('prompt', description)}
                    />
                </Suspense>
            )}
        </Section>
    );
};
