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
import { useImageUpload } from '@/hooks/useImageUpload'; // Import the hook
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

  const imageUpload = useImageUpload();
  
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const isPlaying = useAudioPlayerStore((state) => state.isPlaying);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const pauseTrack = useAudioPlayerStore((state) => state.pause);
  
  const isCurrentTrack = currentTrack?.id === id;

  const { data: track, isLoading, error } = useQuery({
    queryKey: ['track', id],
    queryFn: async () => {
      // Omitted for brevity...
    },
    enabled: !!id,
  });

  // Custom file change handler to get the URL
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const uploadedUrl = await imageUpload.uploadImage(file);
      if (uploadedUrl) {
        setNewCoverUrl(uploadedUrl);
      }
    }
  };

  const handleSaveCover = async () => {
    if (!id || !newCoverUrl) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ cover_url: newCoverUrl })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Обложка обновлена', description: 'Новая обложка трека сохранена.' });
      setNewCoverUrl(null); // Reset state
      imageUpload.handleRemove(); // Clear preview
      queryClient.invalidateQueries({ queryKey: ['track', id] }); // Refresh data

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error(`Failed to save new cover: ${errorMessage}`);
        toast({ variant: 'destructive', title: 'Ошибка сохранения', description: errorMessage });
    }
  };


  // Omitted for brevity: useEffect for likes, handlePlayPause, handleLike, handleDownload, handleShare...

  if (isLoading) return <FullPageSpinner />;
  if (error || !track) {
      // Omitted for brevity...
  }

  const formattedDate = format(new Date(track.created_at), 'd MMMM yyyy, HH:mm', { locale: ru });
  const hasStems = (track as any).track_stems?.length > 0;
  const displayCoverUrl = imageUpload.previewUrl || track.cover_url;

  return (
    <div className="container-padding py-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
      </motion.div>

      {/* Main Content */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {/* Cover */}
              <div className="flex-shrink-0 w-full md:w-64 space-y-2">
                <ImageUpload
                  {...imageUpload}
                  previewUrl={displayCoverUrl}
                  handleFileChange={handleFileChange}
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

              {/* Info */}
              <div className="flex-1">
                {/* Omitted for brevity... */}
              </div>
            </div>
            {/* Omitted for brevity... */}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TrackDetail;
