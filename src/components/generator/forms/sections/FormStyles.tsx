import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Plus } from '@/utils/iconImports';
import { StyleTagsInput } from '../StyleTagsInput';
import { StyleRecommendationsInline } from '@/components/generator/StyleRecommendationsInline';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';
import { Suspense } from 'react';
import type { GenerationParams } from '../../types/generator.types';
import type { AdvancedPromptResult } from '@/services/ai/advanced-prompt-generator';

const AudioDescriber = React.lazy(() => import('@/components/audio/AudioDescriber').then(m => ({ default: m.AudioDescriber })));

interface FormStylesProps {
    params: GenerationParams;
    onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
    isGenerating: boolean;
    tagsCount: number;
    debouncedPrompt: string;
    handleQuickTagAdd: (tag: string) => void;
    handleApplyTags: (newTags: string[]) => void;
    handleAdvancedPromptGenerated: (result: AdvancedPromptResult) => void;
    isMobile: boolean;
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
    isMobile,
}: FormStylesProps) => {
    return (
        <Collapsible defaultOpen={tagsCount > 0}>
            <CollapsibleTrigger className={cn(
                "flex items-center justify-between w-full hover:bg-accent/5 rounded-md transition-colors group",
                isMobile ? "p-3" : "p-2"
            )}>
                <div className="flex items-center gap-2 text-sm font-medium">
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
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
                    {tagsCount > 0 && (
                        <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                            {tagsCount}
                        </Badge>
                    )}
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
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

                <div className="flex flex-wrap gap-1.5">
                    {['creepy', 'ambient', 'acid techno', 'synthwave', 'lofi'].map((tag) => (
                        <Button
                            key={tag}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickTagAdd(tag)}
                            className="h-6 px-2 text-[10px] gap-1"
                            disabled={isGenerating}
                        >
                            <Plus className="h-3 w-3" />
                            {tag}
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
            </CollapsibleContent>
        </Collapsible>
    );
};
