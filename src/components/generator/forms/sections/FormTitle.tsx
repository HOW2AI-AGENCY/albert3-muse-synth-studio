import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';
import type { GenerationParams } from '../../types/generator.types';

interface FormTitleProps {
    params: GenerationParams;
    onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
    isGenerating: boolean;
    isMobile: boolean;
}

export const FormTitle = ({ params, onParamChange, isGenerating, isMobile }: FormTitleProps) => {
    return (
        <div className="space-y-1 p-2">
            <div className="flex items-center gap-1.5">
                <Label htmlFor="custom-title" className="text-xs font-medium">
                    Название
                </Label>
                <InfoTooltip content="Укажите название вашего трека" />
            </div>
            <Input
                id="custom-title"
                type="text"
                placeholder="Авто-генерация если пусто"
                value={params.title}
                onChange={(e) => onParamChange('title', e.target.value)}
                className={cn("mobile-input", isMobile ? "h-11" : "h-8")}
                disabled={isGenerating}
                maxLength={80}
            />
        </div>
    );
};
