import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useDescribeSong, useTrackDescriptions } from '@/hooks/useDescribeSong';
import { Loader2, Sparkles, Music2, TrendingUp, Clock } from '@/utils/iconImports';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TrackDescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle?: string;
}

export const TrackDescriptionDialog = ({ open, onOpenChange, trackId, trackTitle }: TrackDescriptionDialogProps) => {
  const { mutateAsync: describe, isPending } = useDescribeSong();
  const { data: descriptions } = useTrackDescriptions(trackId);

  const latestDescription = descriptions?.[0];
  const hasCompleted = latestDescription?.status === 'completed';

  const handleAnalyze = async () => {
    await describe({ trackId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Анализ трека
          </DialogTitle>
          <DialogDescription>
            {trackTitle || 'Получите детальное описание музыкальных характеристик'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 py-4">
            {!latestDescription && (
              <div className="text-center py-8">
                <Music2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-4">
                  Нажмите кнопку для начала AI анализа трека
                </p>
                <Button onClick={handleAnalyze} disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Анализировать трек
                </Button>
              </div>
            )}

            {latestDescription?.status === 'processing' && (
              <div className="text-center py-8">
                <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-sm text-muted-foreground">
                  AI анализирует трек... Это может занять несколько минут
                </p>
              </div>
            )}

            {latestDescription?.status === 'failed' && (
              <div className="text-center py-8">
                <p className="text-sm text-destructive mb-4">
                  {latestDescription.error_message || 'Ошибка анализа'}
                </p>
                <Button onClick={handleAnalyze} disabled={isPending} variant="outline">
                  Попробовать снова
                </Button>
              </div>
            )}

            {hasCompleted && (
              <div className="space-y-4">
                {/* AI Description */}
                {latestDescription.ai_description && (
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <h3 className="text-sm font-semibold mb-2">Описание</h3>
                    <p className="text-sm text-muted-foreground">
                      {latestDescription.ai_description}
                    </p>
                  </div>
                )}

                {/* Musical Characteristics */}
                <div className="grid grid-cols-2 gap-3">
                  {latestDescription.detected_genre && (
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Жанр</div>
                      <Badge variant="secondary">{latestDescription.detected_genre}</Badge>
                    </div>
                  )}

                  {latestDescription.detected_mood && (
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Настроение</div>
                      <Badge variant="secondary">{latestDescription.detected_mood}</Badge>
                    </div>
                  )}

                  {latestDescription.tempo_bpm && (
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Clock className="h-3 w-3" />
                        Темп
                      </div>
                      <div className="text-sm font-semibold">{latestDescription.tempo_bpm} BPM</div>
                    </div>
                  )}

                  {latestDescription.key_signature && (
                    <div className="p-3 rounded-lg bg-card border border-border">
                      <div className="text-xs text-muted-foreground mb-1">Тональность</div>
                      <div className="text-sm font-semibold">{latestDescription.key_signature}</div>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                {(latestDescription.energy_level || latestDescription.danceability || latestDescription.valence) && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      Характеристики
                    </h3>
                    {latestDescription.energy_level && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Энергичность</span>
                          <span className="text-muted-foreground">{latestDescription.energy_level}/100</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${latestDescription.energy_level}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {latestDescription.danceability && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Танцевальность</span>
                          <span className="text-muted-foreground">{latestDescription.danceability}/100</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${latestDescription.danceability}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {latestDescription.valence && (
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span>Позитивность</span>
                          <span className="text-muted-foreground">{latestDescription.valence}/100</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all" 
                            style={{ width: `${latestDescription.valence}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Instruments */}
                {latestDescription.detected_instruments && latestDescription.detected_instruments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Инструменты</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {latestDescription.detected_instruments.map((instrument, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {instrument}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Regenerate button */}
                <Button 
                  onClick={handleAnalyze} 
                  disabled={isPending}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  {isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Повторить анализ
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
