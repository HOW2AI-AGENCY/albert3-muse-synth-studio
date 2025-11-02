import { memo, useCallback, useState } from 'react';
import { PromptDjMidi } from '@/components/prompt-dj/PromptDjMidi';
import { RecordingControls } from '@/components/prompt-dj/RecordingControls';
import { usePromptDj } from '@/hooks/prompt-dj/usePromptDj';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

const PromptDj = memo(() => {
  const [savedSamples, setSavedSamples] = useState<Array<{ url: string; fileName: string }>>([]);
  
  const { 
    prompts, 
    audioLevels, 
    updatePrompts,
    connect,
    disconnect,
    isConnected,
    playbackState,
    isRecording,
    startRecording,
    stopRecording,
    saveRecording,
  } = usePromptDj();

  const handleSave = useCallback(async () => {
    const blob = await stopRecording();
    if (!blob) return;

    const fileName = `prompt-dj-${Date.now()}.webm`;
    const url = await saveRecording(blob, fileName);

    if (url) {
      setSavedSamples(prev => [...prev, { url, fileName }]);
      toast.success('💾 Сэмпл сохранен в библиотеку', {
        description: 'Теперь вы можете использовать его как референсное аудио'
      });
    }
  }, [stopRecording, saveRecording]);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-gradient-to-r from-surface to-surface-variant">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-primary bg-clip-text text-transparent">
                🎛️ Prompt DJ
              </h1>
              <p className="text-sm text-muted-foreground">
                Создавайте уникальные музыкальные сэмплы в реальном времени
              </p>
            </div>

            <Badge 
              variant={
                playbackState === 'playing' ? 'default' :
                playbackState === 'loading' ? 'secondary' :
                'outline'
              }
              className="text-sm px-4 py-2"
            >
              {playbackState === 'playing' ? '🎵 Играет' :
               playbackState === 'loading' ? '⏳ Загрузка' :
               '⏸️ Остановлено'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full flex flex-col lg:flex-row gap-4 p-4">
          {/* Prompt Controls */}
          <Card className="flex-1 overflow-hidden border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="text-xl">Контроллеры промптов</CardTitle>
              <CardDescription>
                Управляйте 16 промптами для создания уникального звучания
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-5rem)]">
              <ScrollArea className="h-full">
                <div className="p-4">
                  <PromptDjMidi
                    initialPrompts={prompts}
                    audioLevels={audioLevels}
                    onPromptsChange={updatePrompts}
                  />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Saved Samples Sidebar (Desktop) */}
          <Card className="hidden lg:block w-80 border-border/40 bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="text-lg">Сохраненные сэмплы</CardTitle>
              <CardDescription className="text-xs">
                {savedSamples.length} сэмплов
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {savedSamples.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground px-4 text-center">
                    <p className="text-sm">Пока нет сохраненных сэмплов</p>
                    <p className="text-xs mt-1">Создайте и сохраните первый сэмпл</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/40">
                    {savedSamples.map((sample, idx) => (
                      <div key={idx} className="p-3 hover:bg-accent/5 transition-colors">
                        <p className="text-sm font-medium truncate">{sample.fileName}</p>
                        <audio 
                          controls 
                          src={sample.url} 
                          className="w-full mt-2"
                          style={{ height: '32px' }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recording Controls Footer */}
      <div className="border-t border-border/40 bg-surface/80 backdrop-blur-sm">
        <div className="container mx-auto">
          <RecordingControls
            isConnected={isConnected}
            isRecording={isRecording}
            playbackState={playbackState}
            onConnect={connect}
            onDisconnect={disconnect}
            onStartRecording={startRecording}
            onStopRecording={handleSave}
          />
        </div>
      </div>
    </div>
  );
});

PromptDj.displayName = 'PromptDj';

export default PromptDj;
