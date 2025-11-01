import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";
import { Copy, Check, FileText, Loader2 } from "@/utils/iconImports";
import { CompactStructuredLyrics } from "./CompactStructuredLyrics";

interface LyricsVariant {
  id: string;
  variant_index: number;
  title: string | null;
  content: string | null;
  status: string | null;
  error_message: string | null;
}

interface LyricsVariantsPanelProps {
  jobId: string;
  onSelect?: (variant: LyricsVariant) => void;
}

export function LyricsVariantsPanel({ jobId, onSelect }: LyricsVariantsPanelProps) {
  const [variants, setVariants] = useState<LyricsVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadVariants();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`lyrics_variants_${jobId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'lyrics_variants',
        filter: `job_id=eq.${jobId}`,
      }, () => {
        loadVariants();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const loadVariants = async () => {
    try {
      const { data, error } = await supabase
        .from('lyrics_variants')
        .select('*')
        .eq('job_id', jobId)
        .order('variant_index', { ascending: true });

      if (error) throw error;

      setVariants(data || []);
      setIsLoading(false);
    } catch (error) {
      logger.error('Failed to load lyrics variants:', error instanceof Error ? error : undefined);
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Не удалось загрузить варианты текста'
      });
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast({
        title: "Скопировано",
        description: "Текст скопирован в буфер обмена"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Не удалось скопировать текст"
      });
    }
  };


  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-muted-foreground">Загрузка вариантов...</span>
        </div>
      </Card>
    );
  }

  if (variants.length === 0) {
    return (
      <Card className="p-6 text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
        <h3 className="font-semibold mb-1">Варианты не найдены</h3>
        <p className="text-sm text-muted-foreground">
          Попробуйте сгенерировать текст заново
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-3 max-h-[70vh] flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="font-medium text-sm">Варианты текста</h3>
          <Badge variant="secondary" className="h-5 text-xs">{variants.length}</Badge>
        </div>
      </div>

      <Tabs defaultValue="0" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full flex-shrink-0 h-9 mb-2" style={{ gridTemplateColumns: `repeat(${variants.length}, 1fr)` }}>
          {variants.map((variant, index) => (
            <TabsTrigger key={variant.id} value={index.toString()} className="text-xs px-2">
              #{index + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {variants.map((variant, index) => (
          <TabsContent 
            key={variant.id} 
            value={index.toString()} 
            className="flex-1 flex flex-col overflow-hidden mt-0 space-y-0"
          >
            {variant.status === 'complete' && variant.content ? (
              <>
                {variant.title && (
                  <div className="text-center pb-2 border-b mb-2 flex-shrink-0">
                    <h4 className="font-medium text-sm">{variant.title}</h4>
                  </div>
                )}
                
                <div className="flex-1 overflow-y-auto pr-2 mb-2 min-h-0">
                  <CompactStructuredLyrics lyrics={variant.content} />
                </div>

                <div className="flex gap-2 flex-shrink-0 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() => copyToClipboard(variant.content!, index)}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="mr-1 h-3 w-3" />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="mr-1 h-3 w-3" />
                        Копировать
                      </>
                    )}
                  </Button>
                  {onSelect && (
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => onSelect(variant)}
                    >
                      Применить
                    </Button>
                  )}
                </div>
              </>
            ) : variant.status === 'failed' ? (
              <div className="p-3 text-center text-destructive">
                <p className="font-medium text-sm mb-1">Ошибка генерации</p>
                <p className="text-xs">{variant.error_message || 'Неизвестная ошибка'}</p>
              </div>
            ) : (
              <div className="p-6 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">Генерация...</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
