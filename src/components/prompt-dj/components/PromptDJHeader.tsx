import React from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import type { PlaybackState } from '@/utils/PromptDJHelper';
import { SpectrumAnalyzer } from './SpectrumAnalyzer';

interface PromptDJHeaderProps {
  playbackState: PlaybackState;
  volume: number;
  onPlayPause: () => void;
  onVolumeChange: (value: number[]) => void;
  getAnalyserData: () => { frequencyData: Uint8Array, waveformData: Uint8Array } | null;
}

export const PromptDJHeader: React.FC<PromptDJHeaderProps> = ({
  playbackState,
  volume,
  onPlayPause,
  onVolumeChange,
  getAnalyserData,
}) => {
  const isPlaying = playbackState === 'playing';
  const isLoading = playbackState === 'loading' || playbackState === 'connecting';

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              🎛️ Prompt DJ
            </CardTitle>
            <CardDescription className="text-lg">
              Реалтайм-микширование музыки с Gemini Lyria
            </CardDescription>
          </div>
          <SpectrumAnalyzer getAnalyserData={getAnalyserData} isPlaying={isPlaying} className="w-1/2" />
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <Button
          size="lg"
          onClick={onPlayPause}
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

        <div className="flex items-center gap-4 flex-1 max-w-xs">
          {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          <Slider
            value={[volume]}
            onValueChange={onVolumeChange}
            max={1}
            step={0.01}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground w-12 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

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
  );
};
