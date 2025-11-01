/**
 * Reference Track Selector Inline
 * Inline version for AudioSourceDialog without Dialog wrapper
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Search, Music2, Play } from 'lucide-react';
import { formatDuration } from '@/utils/formatters';
import { Badge } from '@/components/ui/badge';

interface ReferenceTrackSelectorInlineProps {
  onSelect: (trackId: string, trackTitle: string) => void;
}

export const ReferenceTrackSelectorInline = ({ onSelect }: ReferenceTrackSelectorInlineProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tracks = [], isLoading } = useQuery({
    queryKey: ['user-tracks-reference'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tracks')
        .select('*')
        .eq('status', 'completed')
        .not('audio_url', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    track.style_tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск треков..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка треков...
          </div>
        ) : filteredTracks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music2 className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Нет доступных треков</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTracks.map((track) => (
              <Card
                key={track.id}
                className="p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onSelect(track.id, track.title)}
              >
                <div className="flex items-center gap-3">
                  {track.cover_url && (
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{track.title}</div>
                    {track.style_tags && track.style_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {track.style_tags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {track.duration_seconds && (
                        <span>{formatDuration(track.duration_seconds)}</span>
                      )}
                      {track.provider && (
                        <>
                          <span>•</span>
                          <span>{track.provider}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
                    <Play className="h-4 w-4 mr-1" />
                    Выбрать
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
