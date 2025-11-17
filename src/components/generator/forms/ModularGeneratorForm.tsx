/**
 * Modular Generator Form
 * Sprint 37: Generation System Refactoring
 * 
 * Полностью модульная форма генерации, использующая секции
 * для обеспечения консистентного и профессионального интерфейса
 */

import { memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Music, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Импорт модульных секций
import { 
  PromptSection, 
  StyleSection, 
  LyricsSection, 
  AdvancedSection 
} from '@/components/generator/sections';

import type { GenerationParams } from '../types/generator.types';

interface ModularGeneratorFormProps {
  mode: 'simple' | 'custom';
  params: GenerationParams;
  onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  onGenerate: () => void;
  onBoostPrompt?: () => void;
  onOpenLyricsDialog?: () => void;
  isBoosting?: boolean;
  isGenerating: boolean;
  debouncedPrompt: string;
  debouncedLyrics: string;
  onDebouncedPromptChange: (value: string) => void;
  onDebouncedLyricsChange: (value: string) => void;
  isMobile?: boolean;
  className?: string;
}

export const ModularGeneratorForm = memo(({
  mode,
  params,
  onParamChange,
  onGenerate,
  onBoostPrompt,
  onOpenLyricsDialog,
  isBoosting = false,
  isGenerating,
  debouncedPrompt,
  debouncedLyrics,
  onDebouncedPromptChange,
  onDebouncedLyricsChange,
  className,
}: ModularGeneratorFormProps) => {
  // Валидация
  const errors = useMemo(() => {
    const errs: string[] = [];
    if (debouncedPrompt.length > 3000) {
      errs.push('Промпт слишком длинный (макс. 3000 символов)');
    }
    if (mode === 'custom' && !params.title.trim()) {
      errs.push('Введите название трека');
    }
    if (mode === 'simple' && !debouncedPrompt.trim() && !debouncedLyrics.trim()) {
      errs.push('Введите описание или текст песни');
    }
    return errs;
  }, [debouncedPrompt, debouncedLyrics, params.title, mode]);

  const canGenerate = useMemo(() => {
    return errors.length === 0 && !isGenerating && (
      (mode === 'simple' && (debouncedPrompt.trim() || debouncedLyrics.trim())) ||
      (mode === 'custom' && params.title.trim())
    );
  }, [errors, isGenerating, mode, debouncedPrompt, debouncedLyrics, params.title]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Scrollable Content */}
      <ScrollArea className="flex-1 px-2 sm:px-3 md:px-4">
        <div className="space-y-4 py-4">
          {/* Секция Промпта */}
          <PromptSection
            value={debouncedPrompt}
            onChange={onDebouncedPromptChange}
            onBoost={onBoostPrompt}
            isEnhancing={isBoosting}
            disabled={isGenerating}
          />

          {/* Секция Стилей */}
          <StyleSection
            tags={params.tags}
            onChange={(tags: string) => onParamChange('tags', tags)}
            disabled={isGenerating}
          />

          {/* Секция Текстов (только для custom mode) */}
          {mode === 'custom' && (
            <LyricsSection
              value={debouncedLyrics}
              onChange={onDebouncedLyricsChange}
              onGenerate={onOpenLyricsDialog}
              isGenerating={isGenerating}
              disabled={isGenerating}
            />
          )}

          {/* Расширенные настройки (только для custom mode) */}
          {mode === 'custom' && (
            <AdvancedSection
              modelVersion={params.modelVersion || 'V5'}
              onModelChange={(model) => onParamChange('modelVersion', model)}
              vocalGender={params.vocalGender || 'any'}
              onVocalGenderChange={(gender) => onParamChange('vocalGender', gender as any)}
              instrumental={params.vocalGender === 'instrumental'}
              onInstrumentalChange={(instrumental) => 
                onParamChange('vocalGender', instrumental ? 'instrumental' : 'any')
              }
              audioWeight={params.audioWeight}
              onAudioWeightChange={(weight) => onParamChange('audioWeight', weight)}
              styleWeight={params.styleWeight}
              onStyleWeightChange={(weight) => onParamChange('styleWeight', weight)}
              disabled={isGenerating}
            />
          )}

          {/* Errors Alert */}
          {errors.length > 0 && (
            <Alert variant="destructive" className="animate-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx} className="text-sm">{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </ScrollArea>

      {/* Sticky Footer - Generate Button */}
      <div
        className="border-t border-border/20 bg-background/95 backdrop-blur-sm"
        style={{ zIndex: 'var(--z-mini-player)' }}
      >
        <div className="p-3 sm:p-4 safe-area-bottom">
          <Button
            data-tour="generate-button"
            onClick={onGenerate}
            disabled={!canGenerate}
            size="lg"
            className={cn(
              'w-full h-12 sm:h-13 text-base font-semibold',
              'bg-gradient-to-r from-primary via-primary to-primary/90',
              'hover:from-primary/90 hover:via-primary hover:to-primary',
              'shadow-glow-primary hover:shadow-glow-primary-strong',
              'transition-all duration-300 hover:scale-[1.02]',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100'
            )}
          >
            <Music className={cn(
              'h-5 w-5 mr-2',
              isGenerating && 'animate-spin'
            )} />
            {isGenerating ? 'Генерируем...' : 'Создать музыку'}
          </Button>

          {/* Hints */}
          {mode === 'simple' && !debouncedPrompt.trim() && !debouncedLyrics.trim() && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              💡 Опишите желаемую музыку или вставьте текст песни
            </p>
          )}
        </div>
      </div>
    </div>
  );
});

ModularGeneratorForm.displayName = 'ModularGeneratorForm';
