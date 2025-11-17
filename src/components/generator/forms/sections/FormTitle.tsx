import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { AIFieldImprovement } from '@/components/generator/ui/AIFieldImprovement';
import { cn } from '@/lib/utils';
import type { GenerationParams } from '../../types/generator.types';

interface FormTitleProps {
    params: GenerationParams;
    onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
    isGenerating: boolean;
    isMobile: boolean;
    projectContext?: string;
}

export const FormTitle = ({ params, onParamChange, isGenerating, isMobile, projectContext }: FormTitleProps) => {
    return (
        <div className="space-y-[var(--space-1)] p-[var(--space-compact-md)] sm:p-[var(--space-comfortable-sm)]">
            <div className="flex items-center justify-between gap-[var(--space-2)]">
                <div className="flex items-center gap-[var(--space-2)]">
                    <Label htmlFor="custom-title" className="text-xs font-medium">
                        Название
                    </Label>
                    <InfoTooltip content="Укажите название вашего трека" />
                </div>
                <AIFieldImprovement
                    field="title"
                    value={params.title}
                    context={projectContext}
                    onResult={(value) => onParamChange('title', value)}
                    disabled={isGenerating}
                    size="sm"
                    variant="ghost"
                />
            </div>
            <Input
                id="custom-title"
                type="text"
                placeholder="Авто-генерация если пусто"
                value={params.title}
                onChange={(e) => onParamChange('title', e.target.value)}
                className={cn("mobile-input touch-target-min", isMobile ? "h-11" : "h-9")}
                disabled={isGenerating}
                maxLength={80}
                aria-label="Название трека"
            />
        </div>
    );
};
