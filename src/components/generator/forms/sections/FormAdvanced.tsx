import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronDown } from '@/utils/iconImports';
import { CompactSlider } from '@/components/ui/compact-slider';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';
import type { GenerationParams } from '../../types/generator.types';
import { VOCAL_GENDER_OPTIONS } from '../../types/generator.types';

interface FormAdvancedProps {
    params: GenerationParams;
    onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
    isGenerating: boolean;
    isMobile: boolean;
}

export const FormAdvanced = ({
    params,
    onParamChange,
    isGenerating,
    isMobile
}: FormAdvancedProps) => {
    return (
        <Collapsible>
            <CollapsibleTrigger className={cn(
                "flex items-center gap-2 w-full hover:bg-accent/5 rounded-md transition-colors group",
                isMobile ? "p-3" : "p-2"
            )}>
                <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                <span className="text-sm font-medium">Advanced Options</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-3 p-2">
                <div className="space-y-4">
                    {params.referenceFileName && (
                        <CompactSlider
                            label="Влияние референса"
                            value={[params.audioWeight]}
                            onValueChange={([v]: number[]) => onParamChange('audioWeight', v)}
                            min={0}
                            max={100}
                            step={5}
                            disabled={isGenerating}
                            tooltipContent={
                                <div className="space-y-1">
                                    <p className="font-semibold text-sm">Audio Weight (0-100%)</p>
                                    <p className="text-xs text-muted-foreground">Насколько сильно сгенерированный трек будет похож на референсное аудио.</p>
                                </div>
                            }
                        />
                    )}

                    <CompactSlider
                        label="Влияние стиля"
                        value={[params.styleWeight]}
                        onValueChange={([v]: number[]) => onParamChange('styleWeight', v)}
                        min={0}
                        max={100}
                        step={5}
                        disabled={isGenerating}
                        tooltipContent={
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">Style Weight (0-100%)</p>
                                <p className="text-xs text-muted-foreground">Насколько AI следует указанным тегам стиля.</p>
                            </div>
                        }
                    />

                    <CompactSlider
                        label="Креативность"
                        value={[params.weirdnessConstraint]}
                        onValueChange={([v]: number[]) => onParamChange('weirdnessConstraint', v)}
                        min={0}
                        max={100}
                        step={5}
                        disabled={isGenerating}
                        tooltipContent={
                            <div className="space-y-1">
                                <p className="font-semibold text-sm">Weirdness Constraint</p>
                                <p className="text-xs text-muted-foreground">Уровень экспериментальности в генерации.</p>
                            </div>
                        }
                    />

                    <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5">
                            <Label className="text-xs font-medium">Тип вокала</Label>
                            <InfoTooltip
                                content={
                                    <div className="space-y-1">
                                        <p className="font-semibold">Vocal Gender</p>
                                        <p className="text-xs">Выберите предпочтительный тип вокала.</p>
                                    </div>
                                }
                            />
                        </div>
                        <ToggleGroup
                            type="single"
                            value={params.vocalGender}
                            onValueChange={(v: string) => v && onParamChange('vocalGender', v as any)}
                            disabled={isGenerating}
                            className="justify-start gap-1.5"
                        >
                            {VOCAL_GENDER_OPTIONS.map((option) => (
                                <ToggleGroupItem
                                    key={option.value}
                                    value={option.value}
                                    className="h-8 px-3 text-xs data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:border-primary/50"
                                    disabled={isGenerating}
                                >
                                    {option.label}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
};
