import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FullPageSpinner } from '@/components/ui/loading-states';
import { 
  ArrowLeft, Play, Pause, Download, Heart, Share2, Music, Mic, Clock, Calendar, Split, Eye, ThumbsUp, Save
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { useImageUpload } from '@/hooks/useImageUpload';
import { formatDuration } from '@/utils/formatters';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Track } from '@/types/domain/track.types';
import { logger } from '@/utils/logger';

const TrackDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLiked, setIsLiked] = useState(false);
  const [newCoverUrl, setNewCoverUrl] = useState<string | null>(null);

  // Initialize the hook with the success callback
  const imageUpload = useImageUpload({
    onUploadSuccess: (url) => {
      setNewCoverUrl(url);
    },
  });
  
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const isPlaying = useAudioPlayerStore((state) => state.isPlaying);
  // ... other state and query logic ...

  const { data: track, isLoading, error } = useQuery<Track>({
    queryKey: ['track', id],
    queryFn: async () => {
       if (!id) throw new Error('Track ID is required');
      const { data, error } = await supabase
        .from('tracks')
        .select(`*, track_versions (*), track_stems (*)`)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Track;
    },
    enabled: !!id,
  });

  const handleSaveCover = async () => {
    if (!id || !newCoverUrl) return;

    try {
      // ... save logic ...
      toast({ title: 'Обложка обновлена' });
      setNewCoverUrl(null);
      imageUpload.handleRemove();
      await queryClient.invalidateQueries({ queryKey: ['track', id] });

    } catch (error) {
        // ... error logic ...
    }
  };

  // ... other handlers ...

  if (isLoading) return <FullPageSpinner />;
  if (error || !track) return <div>Error loading track.</div>;

  const displayCoverUrl = imageUpload.previewUrl || track.cover_url;

  return (
    <div className="container-padding py-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        {/* ... header ... */}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              <div className="flex-shrink-0 w-full md:w-64 space-y-2">
                <ImageUpload
                  {...imageUpload}
                  previewUrl={displayCoverUrl}
                />
                <Button
                    onClick={handleSaveCover}
                    disabled={!newCoverUrl || imageUpload.isUploading}
                    className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить обложку
                </Button>
              </div>

              <div className="flex-1">
                {/* ... track info ... */}
              </div>
            </div>
            {/* ... other content ... */}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TrackDetail;
