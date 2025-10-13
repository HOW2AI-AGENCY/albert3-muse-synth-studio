import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Download, AlertCircle, CheckCircle } from '@/utils/iconImports';
import { useConvertToWav } from '@/hooks/useConvertToWav';
import { logger } from '@/utils/logger';

interface WavConversionStatusProps {
  trackId: string;
  trackTitle: string;
}

export const WavConversionStatus: React.FC<WavConversionStatusProps> = ({
  trackId,
  trackTitle,
}) => {
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { downloadWav } = useConvertToWav();

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const { data, error } = await supabase
          .from('wav_jobs')
          .select('*')
          .eq('track_id', trackId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setJob(data);
      } catch (error) {
        logger.error('Failed to fetch wav_job', error instanceof Error ? error : new Error(String(error)), 'WavConversionStatus', { trackId });
      } finally {
        setLoading(false);
      }
    };

    fetchJob();

    const channel = supabase
      .channel(`wav-job-${trackId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wav_jobs',
          filter: `track_id=eq.${trackId}`,
        },
        (payload) => {
          logger.info('WAV job updated', 'WavConversionStatus', { payload });
          setJob(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trackId]);

  if (loading || !job) {
    return null;
  }

  const getStatusIcon = () => {
    switch (job.status) {
      case 'pending':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (job.status) {
      case 'pending':
        return 'Ожидание конвертации...';
      case 'processing':
        return 'Конвертация в WAV...';
      case 'completed':
        return 'Готов к скачиванию';
      case 'failed':
        return `Ошибка: ${job.error_message || 'Unknown error'}`;
      default:
        return '';
    }
  };

  return (
    <Card className="border-l-4 border-l-primary bg-primary/5">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            {getStatusIcon()}
            <div className="flex-1 space-y-1">
              {(job.status === 'pending' || job.status === 'processing') && (
                <Progress value={job.status === 'pending' ? 10 : 70} className="h-1.5" />
              )}
              <p className="text-xs text-muted-foreground">{getStatusText()}</p>
            </div>
          </div>

          {job.status === 'completed' && job.wav_url && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => downloadWav(job.wav_url, trackTitle)}
            >
              <Download className="h-3.5 w-3.5 mr-2" />
              WAV
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
