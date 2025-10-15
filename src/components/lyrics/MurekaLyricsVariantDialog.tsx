/**
 * Диалог выбора варианта лирики от Mureka AI
 * Показывается когда Mureka генерирует несколько вариантов текста
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from '@/utils/iconImports';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

interface LyricsVariant {
  id: string;
  variant_index: number;
  content: string;
  title?: string;
  status?: string;
}

interface MurekaLyricsVariantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  jobId: string;
  onSelectVariant: (lyrics: string, variantId: string) => void;
}

export const MurekaLyricsVariantDialog = ({
  open,
  onOpenChange,
  trackId,
  jobId,
  onSelectVariant
}: MurekaLyricsVariantDialogProps) => {
  const [variants, setVariants] = useState<LyricsVariant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && jobId) {
      loadVariants();
    }
  }, [open, jobId]);

  const loadVariants = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lyrics_variants')
        .select('*')
        .eq('job_id', jobId)
        .order('variant_index');

      if (error) throw error;

      if (data && data.length > 0) {
        setVariants(data as LyricsVariant[]);
        setSelectedVariant(data[0].id);
        
        logger.info('Loaded Mureka lyrics variants', undefined, {
          trackId,
          jobId,
          variantsCount: data.length
        });
      }
    } catch (error) {
      logger.error('Failed to load lyrics variants', error as Error, 'MurekaLyricsVariantDialog');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = () => {
    const variant = variants.find(v => v.id === selectedVariant);
    if (variant) {
      logger.info('Lyrics variant selected', undefined, {
        variantId: variant.id,
        variantIndex: variant.variant_index
      });
      onSelectVariant(variant.content, variant.id);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🎼 Выберите вариант текста песни
            <Badge variant="secondary" className="ml-2">
              {variants.length} {variants.length === 1 ? 'вариант' : 'варианта'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Загружаем варианты...</p>
          </div>
        ) : variants.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Варианты не найдены
          </div>
        ) : (
          <>
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-3">
                {variants.map((variant, idx) => (
                  <Card
                    key={variant.id}
                    className={`p-4 cursor-pointer transition-all hover:border-primary hover:shadow-sm ${
                      selectedVariant === variant.id 
                        ? 'border-primary bg-primary/5 shadow-sm' 
                        : 'border-border'
                    }`}
                    onClick={() => setSelectedVariant(variant.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedVariant === variant.id ? "default" : "outline"}>
                          Вариант {idx + 1}
                        </Badge>
                        {variant.title && (
                          <span className="text-sm font-medium text-foreground">
                            {variant.title}
                          </span>
                        )}
                      </div>
                      {selectedVariant === variant.id && (
                        <Check className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                    <pre className="text-xs whitespace-pre-wrap text-muted-foreground font-mono leading-relaxed max-h-64 overflow-y-auto">
                      {variant.content}
                    </pre>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="px-6"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleConfirm} 
                disabled={!selectedVariant}
                className="px-6"
              >
                Использовать выбранный
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
