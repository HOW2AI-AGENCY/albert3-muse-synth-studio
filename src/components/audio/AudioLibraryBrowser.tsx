import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Play, Loader2, Check, Clock } from '@/utils/iconImports';
import { logger } from '@/utils/logger';

const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

interface AudioLibraryItem {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  analysis_status: string | null;
  analysis_data: unknown;
  created_at: string | null;
  source_type: string;
}

interface AudioLibraryBrowserProps {
  onSelect?: (item: AudioLibraryItem) => void;
  className?: string;
}

export const AudioLibraryBrowser = ({ onSelect, className }: AudioLibraryBrowserProps) => {
  const [items, setItems] = useState<AudioLibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('audio_library')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setItems(data || []);
      logger.info('✅ Audio library loaded', 'AudioLibraryBrowser', { count: data?.length || 0 });
    } catch (error) {
      logger.error('Failed to load audio library', error as Error, 'AudioLibraryBrowser');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = (item: AudioLibraryItem) => {
    setSelectedId(item.id);
    onSelect?.(item);
  };

  const getAnalysisStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="gap-1"><Check className="w-3 h-3" />Готов</Badge>;
      case 'processing':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Анализ...</Badge>;
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Ожидает</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          Библиотека аудио ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Нет загруженных аудиофайлов
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedId === item.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Music className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.file_name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {item.source_type}
                        </Badge>
                        {item.file_size && (
                          <span className="text-xs text-muted-foreground">
                            {formatBytes(item.file_size)}
                          </span>
                        )}
                        {getAnalysisStatusBadge(item.analysis_status)}
                      </div>
                      {(() => {
                        if (!item.analysis_data || typeof item.analysis_data !== 'object' || item.analysis_data === null) return null;
                        const data = item.analysis_data as Record<string, string | number>;
                        const hasData = data.genre || data.mood || data.tempo_bpm;
                        if (!hasData) return null;
                        
                        return (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {data.genre && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {String(data.genre)}
                              </Badge>
                            )}
                            {data.mood && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {String(data.mood)}
                              </Badge>
                            )}
                            {data.tempo_bpm && (
                              <Badge variant="secondary" className="text-[10px] h-5">
                                {String(data.tempo_bpm)} BPM
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedId === item.id ? 'default' : 'ghost'}
                    onClick={() => handleSelect(item)}
                    className="shrink-0"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
