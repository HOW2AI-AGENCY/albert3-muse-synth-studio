import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";
import { Copy, Check, FileText, Loader2 } from "@/utils/iconImports";
import { StructuredLyrics } from "./StructuredLyrics";

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
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Варианты текста</h3>
          <Badge variant="secondary">{variants.length}</Badge>
        </div>
      </div>

      <Tabs defaultValue="0" className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${variants.length}, 1fr)` }}>
          {variants.map((variant, index) => (
            <TabsTrigger key={variant.id} value={index.toString()}>
              Вариант {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {variants.map((variant, index) => (
          <TabsContent key={variant.id} value={index.toString()} className="space-y-3">
            {variant.status === 'complete' && variant.content ? (
              <>
                {variant.title && (
                  <div className="text-center pb-2 border-b mb-3">
                    <h4 className="font-semibold text-lg">{variant.title}</h4>
                  </div>
                )}
                
                <StructuredLyrics lyrics={variant.content} />

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => copyToClipboard(variant.content!, index)}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Скопировано
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Копировать
                      </>
                    )}
                  </Button>
                  {onSelect && (
                    <Button
                      className="flex-1"
                      onClick={() => onSelect(variant)}
                    >
                      Применить к треку
                    </Button>
                  )}
                </div>
              </>
            ) : variant.status === 'failed' ? (
              <div className="p-4 text-center text-destructive">
                <p className="font-semibold mb-1">Ошибка генерации</p>
                <p className="text-sm">{variant.error_message || 'Неизвестная ошибка'}</p>
              </div>
            ) : (
              <div className="p-8 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">Генерация...</p>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
}
