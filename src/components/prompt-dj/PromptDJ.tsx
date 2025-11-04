/**
 * Prompt DJ Component
 * Реалтайм-микширование музыки с Gemini Lyria
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, AlertCircle } from 'lucide-react';
import { logger } from '@/utils/logger';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { PromptDJHelper, type WeightedPrompt, type PlaybackState } from '@/utils/PromptDJHelper';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

const DEFAULT_PROMPTS = [
  'Epic orchestral symphony',
  'Ambient electronic soundscape',
  'Jazz piano improvisation',
  'Heavy metal guitar riffs',
  'Tropical house beat',
  'Classical string quartet',
  'Hip-hop drum patterns',
  'Synthwave retro vibes',
  'Blues harmonica solo',
  'Techno bass drops',
  'Folk acoustic guitar',
  'R&B smooth vocals',
  'Rock drum fills',
  'EDM synth leads',
  'Reggae offbeat rhythm',
  'Soul brass section'
];

export const PromptDJ: React.FC = () => {
  const [prompts, setPrompts] = useState<WeightedPrompt[]>(() =>
    DEFAULT_PROMPTS.map((text, index) => ({
      id: `prompt-${index}`,
      text,
      weight: Math.random() > 0.8 ? 1 : 0, // Random initial activation
      isFiltered: false
    }))
  );

  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
  const [volume, setVolume] = useState(0.8);
  const [audioLevel, setAudioLevel] = useState(0);
  const helperRef = useRef<PromptDJHelper | null>(null);

  useEffect(() => {
    const helper = new PromptDJHelper();
    helperRef.current = helper;

    // Subscribe to events
    helper.addEventListener('playback-state-changed', ((e: CustomEvent) => {
      setPlaybackState(e.detail.state);
    }) as EventListener);

    helper.addEventListener('audio-level', ((e: CustomEvent) => {
      setAudioLevel(e.detail.level);
    }) as EventListener);

    helper.addEventListener('filtered-prompt', ((e: CustomEvent) => {
      const { promptId, reason } = e.detail;
      setPrompts(prev => prev.map(p =>
        p.id === promptId ? { ...p, isFiltered: true } : p
      ));
      toast.error(`Промпт отфильтрован: ${reason}`);
    }) as EventListener);

    helper.addEventListener('error', ((e: CustomEvent) => {
      toast.error(e.detail.message);
    }) as EventListener);

    return () => {
      helper.disconnect();
    };
  }, []);

  const handlePlayPause = async () => {
    if (!helperRef.current) return;

    if (playbackState === 'idle') {
      try {
        await helperRef.current.connect(prompts);
        toast.success('Prompt DJ запущен');
      } catch (error) {
        toast.error('Не удалось запустить Prompt DJ');
        logger.error('Failed to start Prompt DJ', error as Error, 'PromptDJ');
      }
    } else if (playbackState === 'playing') {
      helperRef.current.disconnect();
      toast.info('Prompt DJ остановлен');
    }
  };

  const handleWeightChange = (promptId: string, newWeight: number) => {
    setPrompts(prev => {
      const updated = prev.map(p =>
        p.id === promptId ? { ...p, weight: newWeight } : p
      );

      // Update prompts in real-time
      if (playbackState === 'playing') {
        helperRef.current?.updatePrompts(updated);
      }

      return updated;
    });
  };

  const handleTextChange = (promptId: string, newText: string) => {
    setPrompts(prev =>
      prev.map(p => (p.id === promptId ? { ...p, text: newText } : p))
    );
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    helperRef.current?.setVolume(vol);
  };

  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading' || playbackState === 'connecting';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              🎛️ Prompt DJ
            </CardTitle>
            <CardDescription className="text-lg">
              Реалтайм-микширование музыки с Gemini Lyria — экспериментальная фича
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            {/* Play/Pause Button */}
            <Button
              size="lg"
              onClick={handlePlayPause}
              disabled={isLoading}
              className="relative overflow-hidden group"
            >
              {isLoading ? (
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-1" />
              )}
              <span className="ml-2">
                {isLoading ? 'Подключение...' : isPlaying ? 'Стоп' : 'Запустить'}
              </span>
            </Button>

            {/* Volume Control */}
            <div className="flex items-center gap-4 flex-1 max-w-xs">
              {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'h-3 w-3 rounded-full',
                  isPlaying && 'bg-green-500 animate-pulse',
                  isLoading && 'bg-yellow-500 animate-pulse',
                  playbackState === 'error' && 'bg-red-500',
                  playbackState === 'idle' && 'bg-muted'
                )}
              />
              <span className="text-sm text-muted-foreground">
                {playbackState === 'playing' && 'Играет'}
                {playbackState === 'loading' && 'Загрузка...'}
                {playbackState === 'connecting' && 'Подключение...'}
                {playbackState === 'error' && 'Ошибка'}
                {playbackState === 'idle' && 'Ожидание'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Warning */}
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">Экспериментальная функция</p>
              <p className="text-sm text-muted-foreground">
                Prompt DJ использует Google Gemini Lyria API (v1alpha). Функциональность может работать нестабильно.
                Для полноценной работы требуется активный API ключ Google AI.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Prompt Controllers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {prompts.map((prompt, index) => (
            <PromptController
              key={prompt.id}
              prompt={prompt}
              index={index}
              audioLevel={audioLevel}
              onWeightChange={(weight) => handleWeightChange(prompt.id, weight)}
              onTextChange={(text) => handleTextChange(prompt.id, text)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

interface PromptControllerProps {
  prompt: WeightedPrompt;
  index: number;
  audioLevel: number;
  onWeightChange: (weight: number) => void;
  onTextChange: (text: string) => void;
}

const PromptController: React.FC<PromptControllerProps> = ({
  prompt,
  index,
  audioLevel,
  onWeightChange,
  onTextChange
}) => {
  const isActive = prompt.weight > 0;
  const glowIntensity = isActive ? audioLevel * prompt.weight : 0;

  return (
    <Card
      className={cn(
        'transition-all duration-300 relative overflow-hidden',
        isActive && 'border-primary/50 shadow-lg',
        prompt.isFiltered && 'border-red-500 opacity-50'
      )}
      style={{
        boxShadow: isActive
          ? `0 0 ${20 + glowIntensity * 30}px rgba(var(--primary-rgb), ${glowIntensity * 0.5})`
          : undefined
      }}
    >
      {prompt.isFiltered && (
        <div className="absolute top-2 right-2 z-10">
          <AlertCircle className="h-4 w-4 text-red-500" />
        </div>
      )}

      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Controller {index + 1}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Text Input */}
        <Input
          value={prompt.text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Enter prompt..."
          className="text-sm"
          disabled={prompt.isFiltered}
        />

        {/* Weight Knob */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Weight</span>
            <span className="font-medium">{prompt.weight.toFixed(2)}</span>
          </div>
          <Slider
            value={[prompt.weight]}
            onValueChange={(value) => onWeightChange(value[0])}
            max={1}
            step={0.01}
            className={cn(
              'transition-all',
              isActive && 'accent-primary'
            )}
            disabled={prompt.isFiltered}
          />
        </div>

        {/* Visual Indicator */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full bg-gradient-to-r from-primary to-accent transition-all duration-100',
              !isActive && 'opacity-0'
            )}
            style={{ width: `${glowIntensity * 100}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
};
