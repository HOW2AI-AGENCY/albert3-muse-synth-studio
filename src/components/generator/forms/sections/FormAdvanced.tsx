import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Section } from '@/components/ui/section';
import { CompactSlider } from '@/components/ui/compact-slider';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import type { GenerationParams } from '../../types/generator.types';
import { VOCAL_GENDER_OPTIONS } from '../../types/generator.types';

interface FormAdvancedProps {
    params: GenerationParams;
    onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
    isGenerating: boolean;
}

export const FormAdvanced = ({
    params,
    onParamChange,
    isGenerating,
}: FormAdvancedProps) => {
    return (
        <Section
            defaultOpen={false}
            title="Advanced Options"
            contentClassName="space-y-[var(--space-4)] p-[var(--space-compact-md)] sm:p-[var(--space-comfortable-sm)]"
        >
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

            <div className="space-y-[var(--space-2)]">
                <div className="flex items-center gap-[var(--space-2)]">
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
                    className="justify-start gap-[var(--space-2)]"
                >
                    {VOCAL_GENDER_OPTIONS.map((option) => (
                        <ToggleGroupItem
                            key={option.value}
                            value={option.value}
                            className="h-9 px-3 text-xs data-[state=on]:bg-primary/20 data-[state=on]:text-primary data-[state=on]:border-primary/50 touch-target-min"
                            disabled={isGenerating}
                            aria-label={`Vocal gender: ${option.label}`}
                        >
                            {option.label}
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>
            </div>
        </Section>
    );
};
