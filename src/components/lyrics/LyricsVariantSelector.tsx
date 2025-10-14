import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Music } from "@/utils/iconImports";
import { logger } from "@/utils/logger";

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
      <DialogContent className="max-w-3xl">
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
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (completeVariants.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <Music className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No lyrics variants available</p>
          <p className="text-sm mt-2">
            The lyrics generation may still be in progress or failed.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Choose Lyrics Variant ({completeVariants.length}{" "}
          {completeVariants.length === 1 ? "option" : "options"})
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        )}
      </div>

      <Tabs
        value={selectedIndex.toString()}
        onValueChange={(val) => setSelectedIndex(parseInt(val))}
      >
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${completeVariants.length}, 1fr)` }}>
          {completeVariants.map((_, index) => (
            <TabsTrigger key={index} value={index.toString()}>
              Variant {index + 1}
            </TabsTrigger>
          ))}
        </TabsList>

        {completeVariants.map((variant, index) => (
          <TabsContent key={index} value={index.toString()}>
            <Card className="p-4">
              {variant.title && (
                <h4 className="font-semibold mb-3 text-lg">{variant.title}</h4>
              )}
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg max-h-96 overflow-y-auto font-sans">
                {variant.content}
              </pre>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={() => onSelect(variant.content || "")}
                  className="flex-1"
                >
                  Use This Variant
                </Button>
                {onClose && (
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};
