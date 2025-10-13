import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Info } from "@/utils/iconImports";
import { useExtendTrack } from "@/hooks/useExtendTrack";
import { cn } from "@/lib/utils";

interface ExtendTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: {
    id: string;
    title: string;
    duration?: number;
    prompt?: string;
    style_tags?: string[];
  };
}

const MODELS = [
  { value: "V3_5", label: "V3.5 - Better song structure (max 4 min)" },
  { value: "V4", label: "V4 - Improved vocal quality (max 4 min)" },
  { value: "V4_5", label: "V4.5 - Smarter prompts (max 8 min)" },
  { value: "V4_5PLUS", label: "V4.5+ - Richer sound (max 8 min)" },
  { value: "V5", label: "V5 - Superior expression (fastest)" },
] as const;

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export function ExtendTrackDialog({ open, onOpenChange, track }: ExtendTrackDialogProps) {
  const { extendTrack, isExtending } = useExtendTrack();
  const [continueAt, setContinueAt] = useState(track.duration ? Math.floor(track.duration * 0.7) : 60);
  const [prompt, setPrompt] = useState("");
  const [tags, setTags] = useState(track.style_tags?.join(", ") || "");
  const [model, setModel] = useState<"V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5">("V4");

  const trackDuration = track.duration || 120;
  const recommendedPosition = Math.floor(trackDuration * 0.7);
  const progressPercent = useMemo(() => (continueAt / trackDuration) * 100, [continueAt, trackDuration]);

  const handleExtend = async () => {
    try {
      await extendTrack({
        trackId: track.id,
        continueAt,
        prompt: prompt || undefined,
        tags: tags ? tags.split(",").map(t => t.trim()) : undefined,
        model,
      });
      onOpenChange(false);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Расширить трек</DialogTitle>
          <DialogDescription>
            Создайте расширенную версию трека "{track.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Начать расширение с позиции</Label>
            
            {/* Визуальный индикатор */}
            <div className="relative h-12 bg-muted rounded-lg overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-primary/20 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
              
              <div 
                className={cn(
                  "absolute inset-y-0 w-1 bg-primary shadow-[0_0_8px_hsl(var(--primary))] transition-all",
                )}
                style={{ left: `${progressPercent}%` }}
              />
              
              <div className="absolute inset-0 flex items-center justify-between px-2 text-xs text-muted-foreground">
                <span>0:00</span>
                <span className="font-medium text-foreground">
                  {formatDuration(continueAt)}
                </span>
                <span>{formatDuration(trackDuration)}</span>
              </div>
            </div>
            
            <Slider
              id="continueAt"
              min={0}
              max={trackDuration}
              step={1}
              value={[continueAt]}
              onValueChange={([value]) => setContinueAt(value)}
              className="w-full"
            />
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5" />
              Рекомендуется: {formatDuration(recommendedPosition)} (70% трека)
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prompt">Новый промпт (опционально)</Label>
            <Textarea
              id="prompt"
              placeholder="Примеры:
• Добавить энергичное соло на гитаре
• Сделать более медленный и меланхоличный финал
• Добавить оркестровую секцию с струнными
Оставьте пустым для продолжения в том же стиле"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="text-xs"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tags">Теги стиля (через запятую, опционально)</Label>
            <Input
              id="tags"
              placeholder="rock, energetic, guitar"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="model">Модель</Label>
            <Select value={model} onValueChange={(value: any) => setModel(value)}>
              <SelectTrigger id="model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleExtend} disabled={isExtending}>
            {isExtending ? "Расширяю..." : "Расширить трек"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}