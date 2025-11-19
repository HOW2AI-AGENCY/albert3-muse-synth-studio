import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Activity, Clock, Loader2 } from '@/utils/iconImports';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { logger } from '@/utils/logger';

interface AudioAnalysis {
  duration?: number;
  bpm?: number;
  key?: string;
  genre?: string;
  energy?: number;
}

interface AudioAnalyzerProps {
  audioUrl: string;
}

export const AudioAnalyzer = ({ audioUrl }: AudioAnalyzerProps) => {
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const analyzeAudio = async () => {
      if (!audioUrl) {
        setIsAnalyzing(false);
        return;
      }

      try {
        logger.info('[AudioAnalyzer] Analyzing audio:', audioUrl.substring(0, 50));
        
        const { data, error: functionError } = await SupabaseFunctions.invoke('analyze-audio', {
          body: { audioUrl }
        });

        if (!isMounted) return;

        if (functionError) {
          throw functionError;
        }

        if (data) {
          logger.info('[AudioAnalyzer] Analysis complete:', data as any);
          setAnalysis(data as AudioAnalysis);
        }
      } catch (err) {
        logger.error('[AudioAnalyzer] Analysis failed:', err instanceof Error ? err : undefined);
        setError(true);
      } finally {
        if (isMounted) {
          setIsAnalyzing(false);
        }
      }
    };

    analyzeAudio();

    return () => {
      isMounted = false;
    };
  }, [audioUrl]);

  if (isAnalyzing) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span className="text-[10px]">Анализ...</span>
      </Badge>
    );
  }

  if (error || !analysis) {
    return null;
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-1 text-xs">
        {analysis.duration && (
          <Badge variant="secondary" className="gap-0.5 h-5 px-1.5 shrink-0 whitespace-nowrap">
            <Clock className="w-2.5 h-2.5" />
            <span className="text-[10px]">{Math.floor(analysis.duration)}s</span>
          </Badge>
        )}
        {analysis.bpm && (
          <Badge variant="secondary" className="gap-0.5 h-5 px-1.5 shrink-0 whitespace-nowrap">
            <Activity className="w-2.5 h-2.5" />
            <span className="text-[10px]">{Math.round(analysis.bpm)} BPM</span>
          </Badge>
        )}
        {analysis.key && (
          <Badge variant="secondary" className="gap-0.5 h-5 px-1.5 shrink-0 whitespace-nowrap">
            <Music className="w-2.5 h-2.5" />
            <span className="text-[10px]">{analysis.key}</span>
          </Badge>
        )}
        {analysis.genre && (
          <Badge variant="outline" className="h-5 px-1.5 shrink-0 whitespace-nowrap">
            <span className="text-[10px]">{analysis.genre}</span>
          </Badge>
        )}
      </div>
    </ScrollArea>
  );
};
