import { memo, useCallback, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Music, FileAudio, History, AlertCircle } from '@/utils/iconImports';
import { PromptInput } from './PromptInput';
import { LyricsInput } from './LyricsInput';
import { AdvancedControls } from './AdvancedControls';
import { StyleTagsInput } from './StyleTagsInput';
import { StyleRecommendationsInline } from '@/components/generator/StyleRecommendationsInline';
import { AudioReferenceSection } from '../audio/AudioReferenceSection';
import type { GenerationParams } from '../types/generator.types';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const AudioDescriber = lazy(() => import('@/components/audio/AudioDescriber').then(m => ({ default: m.AudioDescriber })));

interface CustomModeFormProps {
  params: GenerationParams;
  onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  onBoostPrompt: () => void;
  onGenerate: () => void;
  onOpenLyricsDialog: () => void;
  onOpenHistory: () => void;
  onAudioFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAudio: () => void;
  onSelectReferenceTrack?: (track: { id: string; audio_url: string; title: string }) => void;
  onRecordComplete?: (url: string) => void;
  /** ✅ НОВОЕ: Callback при завершении анализа референса */
  onAnalysisComplete?: (result: { recognition: any; description: any }) => void;
  isBoosting: boolean;
  isGenerating: boolean;
  isUploading: boolean;
  debouncedPrompt: string;
  debouncedLyrics: string;
  onDebouncedPromptChange: (value: string) => void;
  onDebouncedLyricsChange: (value: string) => void;
}

export const CustomModeForm = memo(({
  params,
  onParamChange,
  onBoostPrompt,
  onGenerate,
  onOpenLyricsDialog,
  onOpenHistory,
  onAudioFileSelect,
  onRemoveAudio,
  onSelectReferenceTrack,
  onRecordComplete,
  onAnalysisComplete,
  isBoosting,
  isGenerating,
  isUploading,
  debouncedPrompt,
  debouncedLyrics,
  onDebouncedPromptChange,
  onDebouncedLyricsChange,
}: CustomModeFormProps) => {
  const isMobile = useIsMobile();
  
  const handleGenerate = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    onGenerate();
  }, [onGenerate]);

  const handleApplyTags = useCallback((newTags: string[]) => {
    const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    const uniqueTags = Array.from(new Set([...existingTags, ...newTags]));
    onParamChange('tags', uniqueTags.join(', '));
  }, [params.tags, onParamChange]);

  return (
    <>
      {/* Prompt with Boost & History */}
      <div className="space-y-1">
        <div className="flex items-center justify-end mb-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenHistory}
            disabled={isGenerating}
            className="h-6 px-2 text-[10px] gap-1"
          >
            <History className="h-3 w-3" />
            История
          </Button>
        </div>
        <PromptInput
          value={debouncedPrompt}
          onChange={onDebouncedPromptChange}
          onBoost={onBoostPrompt}
          isBoosting={isBoosting}
          isGenerating={isGenerating}
          isRequired={!params.lyrics.trim()}
          hasLyrics={!!params.lyrics.trim()}
          label="Описание стиля"
          placeholder="Опишите стиль, жанр, настроение..."
          rows={isMobile ? 2 : 3}
          minHeight={isMobile ? "60px" : "80px"}
        />
      </div>

      {/* Title */}
      <div className="space-y-1">
        <Label htmlFor="custom-title" className="text-xs font-medium">
          Название
        </Label>
        <Input
          id="custom-title"
          type="text"
          placeholder="Авто-генерация если пусто"
          value={params.title}
          onChange={(e) => onParamChange('title', e.target.value)}
          className={cn(
            "text-sm",
            isMobile ? "h-10 text-base" : "h-8"
          )}
          disabled={isGenerating}
          maxLength={80}
        />
      </div>

      {/* Collapsible Sections */}
      {isMobile ? (
        <Accordion type="single" collapsible className="w-full">
          {/* Lyrics Section */}
          <AccordionItem value="lyrics" className="border-border/30">
          <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
            Текст песни {params.lyrics && `(${params.lyrics.split('\n').filter(l => l.trim()).length} строк)`}
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-3">
            <LyricsInput
              value={debouncedLyrics}
              onChange={onDebouncedLyricsChange}
              onGenerateLyrics={onOpenLyricsDialog}
              isGenerating={isGenerating}
            />
          </AccordionContent>
        </AccordionItem>

          {/* Style Tags Section */}
          <AccordionItem value="tags" className="border-border/30">
            <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
              Теги стиля {params.tags && `(${params.tags.split(',').filter(t => t.trim()).length})`}
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* AI Recommendations */}
              {params.prompt.length >= 10 && (
                <StyleRecommendationsInline
                  prompt={params.prompt}
                  currentTags={params.tags.split(',').map(t => t.trim()).filter(Boolean)}
                  onApplyTags={handleApplyTags}
                />
              )}
              
              <StyleTagsInput
                tags={params.tags}
                negativeTags={params.negativeTags}
                onTagsChange={(tags) => onParamChange('tags', tags)}
                onNegativeTagsChange={(tags) => onParamChange('negativeTags', tags)}
                isGenerating={isGenerating}
              />
            </AccordionContent>
          </AccordionItem>

        {/* Audio Reference Section */}
        <AccordionItem value="audio" className="border-border/30">
          <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
            <div className="flex items-center gap-2">
              <FileAudio className="h-3.5 w-3.5" />
              <span>Референсное аудио {params.referenceFileName && '(загружено)'}</span>
              {params.provider === 'mureka' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                  <AlertCircle className="h-2.5 w-2.5 mr-1" />
                  Недоступно
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-3">
            {params.provider === 'mureka' ? (
              <Alert variant="default" className="border-warning/50 bg-warning/5">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-sm font-medium">Функция недоступна для Mureka</AlertTitle>
                <AlertDescription className="text-xs text-muted-foreground mt-1">
                  Mureka не поддерживает референсное аудио. Переключитесь на Suno, чтобы использовать эту функцию.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <AudioReferenceSection
                  referenceFileName={params.referenceFileName}
                  referenceAudioUrl={params.referenceAudioUrl}
                  onFileSelect={onAudioFileSelect}
                  onRemove={onRemoveAudio}
                  onSelectTrack={onSelectReferenceTrack}
                  onRecordComplete={onRecordComplete}
                  autoAnalyze={true}
                  onAnalysisComplete={onAnalysisComplete}
                  isUploading={isUploading}
                  isGenerating={isGenerating}
                />
                {params.referenceAudioUrl && (
                  <Suspense fallback={<div className="text-xs text-muted-foreground mt-2">Загрузка анализатора...</div>}>
                    <div className="mt-2">
                      <AudioDescriber 
                        audioUrl={params.referenceAudioUrl} 
                        onDescriptionGenerated={(description) => onParamChange('prompt', description)}
                      />
                    </div>
                  </Suspense>
                )}
              </>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* Advanced Settings */}
        <AccordionItem value="advanced" className="border-border/30">
          <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
            Расширенные настройки
          </AccordionTrigger>
          <AccordionContent className="pt-2 pb-3">
            <AdvancedControls
              vocalGender={params.vocalGender}
              audioWeight={params.audioWeight}
              styleWeight={params.styleWeight}
              lyricsWeight={params.lyricsWeight}
              weirdness={params.weirdness}
              hasReferenceAudio={!!params.referenceAudioUrl}
              hasLyrics={!!params.lyrics.trim()}
              onVocalGenderChange={(value) => onParamChange('vocalGender', value)}
              onAudioWeightChange={(value) => onParamChange('audioWeight', value)}
              onStyleWeightChange={(value) => onParamChange('styleWeight', value)}
              onLyricsWeightChange={(value) => onParamChange('lyricsWeight', value)}
              onWeirdnessChange={(value) => onParamChange('weirdness', value)}
              isGenerating={isGenerating}
            />
          </AccordionContent>
        </AccordionItem>
        </Accordion>
      ) : (
        <Accordion type="multiple" defaultValue={["lyrics"]} className="w-full">
          {/* Lyrics Section */}
          <AccordionItem value="lyrics" className="border-border/30">
            <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
              Текст песни {params.lyrics && `(${params.lyrics.split('\n').filter(l => l.trim()).length} строк)`}
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3">
              <LyricsInput
                value={debouncedLyrics}
                onChange={onDebouncedLyricsChange}
                onGenerateLyrics={onOpenLyricsDialog}
                isGenerating={isGenerating}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Style Tags Section */}
          <AccordionItem value="tags" className="border-border/30">
            <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
              Теги стиля {params.tags && `(${params.tags.split(',').filter(t => t.trim()).length})`}
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3 space-y-3 max-h-[60vh] overflow-y-auto">
              {/* AI Recommendations */}
              {params.prompt.length >= 10 && (
                <StyleRecommendationsInline
                  prompt={params.prompt}
                  currentTags={params.tags.split(',').map(t => t.trim()).filter(Boolean)}
                  onApplyTags={handleApplyTags}
                />
              )}
              
              <StyleTagsInput
                tags={params.tags}
                negativeTags={params.negativeTags}
                onTagsChange={(tags) => onParamChange('tags', tags)}
                onNegativeTagsChange={(tags) => onParamChange('negativeTags', tags)}
                isGenerating={isGenerating}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Audio Reference Section */}
          <AccordionItem value="audio" className="border-border/30">
            <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
              <div className="flex items-center gap-1.5">
                <FileAudio className="h-3.5 w-3.5" />
                Референсное аудио {params.referenceFileName && '(загружено)'}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3">
              <AudioReferenceSection
                referenceFileName={params.referenceFileName}
                referenceAudioUrl={params.referenceAudioUrl}
                onFileSelect={onAudioFileSelect}
                onRemove={onRemoveAudio}
                autoAnalyze={true}
                onAnalysisComplete={onAnalysisComplete}
                isUploading={isUploading}
                isGenerating={isGenerating}
              />
              {params.referenceAudioUrl && (
                <Suspense fallback={<div className="text-xs text-muted-foreground">Загрузка анализатора...</div>}>
                  <AudioDescriber 
                    audioUrl={params.referenceAudioUrl} 
                    onDescriptionGenerated={(description) => onParamChange('prompt', description)}
                  />
                </Suspense>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Advanced Settings */}
          <AccordionItem value="advanced" className="border-border/30">
            <AccordionTrigger className="text-xs font-medium py-2 hover:no-underline">
              Расширенные настройки
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-3">
              <AdvancedControls
                vocalGender={params.vocalGender}
                audioWeight={params.audioWeight}
                styleWeight={params.styleWeight}
                lyricsWeight={params.lyricsWeight}
                weirdness={params.weirdness}
                hasReferenceAudio={!!params.referenceAudioUrl}
                hasLyrics={!!params.lyrics.trim()}
                onVocalGenderChange={(value) => onParamChange('vocalGender', value)}
                onAudioWeightChange={(value) => onParamChange('audioWeight', value)}
                onStyleWeightChange={(value) => onParamChange('styleWeight', value)}
                onLyricsWeightChange={(value) => onParamChange('lyricsWeight', value)}
                onWeirdnessChange={(value) => onParamChange('weirdness', value)}
                isGenerating={isGenerating}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || (!params.prompt.trim() && !params.lyrics.trim())}
        className="w-full h-10 text-sm font-medium gap-2 mt-3"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Music className="h-4 w-4 animate-spin" />
            Генерация...
          </>
        ) : (
          <>
            <Music className="h-4 w-4" />
            Создать музыку
          </>
        )}
      </Button>
    </>
  );
});

CustomModeForm.displayName = 'CustomModeForm';
