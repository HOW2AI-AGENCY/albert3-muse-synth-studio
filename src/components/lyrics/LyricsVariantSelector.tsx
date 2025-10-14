import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Music, Check, FileText, Sparkles } from "@/utils/iconImports";
import { logger } from "@/utils/logger";
import { cn } from "@/lib/utils";

interface LyricsVariant {
  id: string;
  variant_index: number;
  title: string | null;
  content: string | null;
  status: string | null;
  error_message: string | null;
}

interface LyricsVariantSelectorProps {
  jobId: string;
  onSelect: (lyrics: string) => void;
  onClose?: () => void;
}

// Wrapper to make component work with Dialog
export const LyricsVariantSelectorDialog = ({
  open,
  onOpenChange,
  jobId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  onSelect: (lyrics: string) => void;
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            Выберите вариант текста
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1.5">
            AI создал несколько версий — выберите наиболее подходящий вариант
          </DialogDescription>
        </DialogHeader>
        <LyricsVariantSelector
          jobId={jobId}
          onSelect={onSelect}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export const LyricsVariantSelector = ({
  jobId,
  onSelect,
  onClose,
}: LyricsVariantSelectorProps) => {
  const [variants, setVariants] = useState<LyricsVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    const loadVariants = async () => {
      try {
        const { data, error } = await supabase
          .from("lyrics_variants")
          .select("*")
          .eq("job_id", jobId)
          .order("variant_index");

        if (error) throw error;
        setVariants(data || []);
      } catch (error) {
        logger.error("Failed to load lyrics variants", error instanceof Error ? error : new Error(String(error)), "LyricsVariantSelector", { jobId });
      } finally {
        setLoading(false);
      }
    };

    loadVariants();
  }, [jobId]);

  const completeVariants = variants.filter(
    (v) => v.status === "complete" && v.content
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Загрузка вариантов...</p>
      </div>
    );
  }

  if (completeVariants.length === 0) {
    return (
      <div className="p-8">
        <Card className="p-8 border-dashed">
          <div className="text-center text-muted-foreground space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Music className="h-8 w-8 opacity-50" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">Варианты не найдены</p>
              <p className="text-xs">
                Генерация может быть в процессе или завершилась с ошибкой
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const currentVariant = completeVariants[selectedIndex];
  const stats = currentVariant.content ? {
    lines: currentVariant.content.split('\n').length,
    words: currentVariant.content.trim().split(/\s+/).length,
    chars: currentVariant.content.length,
  } : { lines: 0, words: 0, chars: 0 };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs Navigation */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <Tabs
          value={selectedIndex.toString()}
          onValueChange={(val) => setSelectedIndex(parseInt(val))}
          className="w-full"
        >
          <TabsList className={cn(
            "grid w-full h-auto p-1",
            completeVariants.length <= 3 && "max-w-md mx-auto"
          )} style={{ gridTemplateColumns: `repeat(${Math.min(completeVariants.length, 4)}, 1fr)` }}>
            {completeVariants.slice(0, 4).map((_, index) => (
              <TabsTrigger 
                key={index} 
                value={index.toString()}
                className="text-xs py-2 data-[state=active]:bg-primary/10"
              >
                <FileText className="h-3 w-3 mr-1.5" />
                Вариант {index + 1}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        
        {completeVariants.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Badge variant="secondary" className="text-[10px] h-5">
              {completeVariants.length} {completeVariants.length === 1 ? 'вариант' : 'варианта'}
            </Badge>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-[10px] text-muted-foreground">
              Выбран: Вариант {selectedIndex + 1}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4 pb-4">
          {/* Title if exists */}
          {currentVariant.title && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-1 flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Название песни</p>
                <h4 className="font-semibold text-base truncate">{currentVariant.title}</h4>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px] h-6 font-mono">
              {stats.lines} строк
            </Badge>
            <Badge variant="outline" className="text-[10px] h-6 font-mono">
              {stats.words} слов
            </Badge>
            <Badge variant="outline" className="text-[10px] h-6 font-mono">
              {stats.chars} символов
            </Badge>
          </div>

          {/* Lyrics Content */}
          <Card className="relative">
            <ScrollArea className="h-[320px] w-full">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed p-4 font-sans">
                {currentVariant.content}
              </pre>
            </ScrollArea>
          </Card>
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="px-6 py-4 border-t bg-background flex gap-2 sm:gap-3">
        {onClose && (
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 sm:flex-none sm:min-w-[100px]"
          >
            Отмена
          </Button>
        )}
        <Button
          onClick={() => onSelect(currentVariant.content || "")}
          className="flex-1 gap-2"
        >
          <Check className="h-4 w-4" />
          <span>Использовать этот вариант</span>
        </Button>
      </div>
    </div>
  );
};
