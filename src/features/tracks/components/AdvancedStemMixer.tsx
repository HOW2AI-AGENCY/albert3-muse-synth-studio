import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { SimpleProgress } from '@/components/ui/SimpleProgress';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { useStemMixer } from '@/contexts/StemMixerContext';
import { StemMixerTrack } from './StemMixerTrack';
import { formatDuration } from '@/utils/formatters';

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  track_id: string;
}

interface AdvancedStemMixerProps {
  stems: TrackStem[];
  trackTitle?: string;
  onUseAsReference?: (audioUrl: string, stemType: string) => void;
}

const stemTypeOrder: Record<string, number> = {
  vocals: 0,
  backing_vocals: 1,
  instrumental: 2,
  original: 3,
  drums: 10,
  bass: 20,
  guitar: 30,
  keyboard: 40,
  percussion: 50,
  strings: 60,
  brass: 70,
  woodwinds: 80,
  synth: 90,
  fx: 100,
};

const sortStems = (collection: TrackStem[]) => {
  return [...collection].sort((a, b) => {
    const orderA = stemTypeOrder[a.stem_type] ?? 999;
    const orderB = stemTypeOrder[b.stem_type] ?? 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.stem_type.localeCompare(b.stem_type);
  });
};

export const AdvancedStemMixer = ({ stems, trackTitle, onUseAsReference }: AdvancedStemMixerProps) => {
  const {
    activeStemIds,
    stemVolumes,
    stemMuted,
    soloStemId,
    isPlaying,
    currentTime,
    duration,
    masterVolume,
    loadStems,
    toggleStem,
    setStemVolume,
    toggleStemMute,
    setSolo,
    setMasterVolume,
    play,
    pause,
    resetAll,
  } = useStemMixer();

  useEffect(() => {
    loadStems(stems);
  }, [stems, loadStems]);

  const handlePlayPause = async () => {
    if (isPlaying) {
      pause();
    } else {
      await play();
    }
  };


  const sortedStems = sortStems(stems);
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Card className="p-4 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-semibold text-sm truncate flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              🎛️
            </div>
            Микшер{trackTitle ? `: ${trackTitle}` : ''}
          </h3>
          <Button
            size="sm"
            variant="outline"
            onClick={resetAll}
            className="h-8"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Сброс
          </Button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={handlePlayPause}
            className="h-9 px-4"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 mr-1.5" />
                Пауза
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1.5" />
                Играть
              </>
            )}
          </Button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDuration(Math.floor(currentTime))}
            </span>
            <SimpleProgress value={progressPercent} className="h-1.5" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatDuration(Math.floor(duration))}
            </span>
          </div>
        </div>

        {/* Master Volume */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium shrink-0 w-20">Мастер</span>
          <Slider
            value={[masterVolume * 100]}
            onValueChange={([v]) => setMasterVolume(v / 100)}
            max={100}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10 text-right tabular-nums shrink-0">
            {Math.round(masterVolume * 100)}%
          </span>
        </div>
      </div>

      <Separator />

      {/* Stems */}
      <div className="space-y-2">
        {sortedStems.map(stem => (
          <StemMixerTrack
            key={stem.id}
            stem={stem}
            isActive={activeStemIds.has(stem.id)}
            volume={stemVolumes.get(stem.id) || 0.7}
            isMuted={stemMuted.get(stem.id) || false}
            isSolo={soloStemId === stem.id}
            currentTime={currentTime}
            duration={duration}
            trackTitle={trackTitle}
            onToggleActive={() => toggleStem(stem.id)}
            onToggleSolo={() => setSolo(soloStemId === stem.id ? null : stem.id)}
            onToggleMute={() => toggleStemMute(stem.id)}
            onVolumeChange={(vol) => setStemVolume(stem.id, vol)}
            onUseAsReference={onUseAsReference}
          />
        ))}
      </div>

      {sortedStems.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">
            Стемы не найдены
          </p>
        </div>
      )}
    </Card>
  );
};
