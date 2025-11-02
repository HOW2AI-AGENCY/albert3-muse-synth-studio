/**
 * Reference Audio Library Inline
 * Inline version for AudioSourceDialog without Dialog wrapper
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Search, Music, Star } from 'lucide-react';
import { formatDuration } from '@/utils/formatters';

interface ReferenceAudioLibraryInlineProps {
  onSelect: (url: string, fileName: string) => void;
}

export const ReferenceAudioLibraryInline = ({ onSelect }: ReferenceAudioLibraryInlineProps) => {
  const [searchQuery, setSearchQuery] = useState('');

  const { data: audioLibrary = [], isLoading } = useQuery({
    queryKey: ['audio-library'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return [];
      
      const { data, error } = await supabase
        .from('audio_library')
        .select('*')
        .eq('user_id', user.user.id)
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    }
  });

  const filteredAudios = audioLibrary.filter(audio =>
    audio.file_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    audio.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск в библиотеке..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <ScrollArea className="h-[400px]">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Загрузка библиотеки...
          </div>
        ) : filteredAudios.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Music className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Нет аудио в библиотеке</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAudios.map((audio) => (
              <Card
                key={audio.id}
                className="p-3 hover:bg-accent cursor-pointer transition-colors"
                onClick={() => onSelect(audio.file_url, audio.file_name)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      <span className="font-medium">{audio.file_name}</span>
                      {audio.is_favorite && (
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      )}
                    </div>
                    {audio.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {audio.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      {audio.duration_seconds && (
                        <span>{formatDuration(audio.duration_seconds)}</span>
                      )}
                      <span>•</span>
                      <span>Использовано: {audio.usage_count}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost">
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
