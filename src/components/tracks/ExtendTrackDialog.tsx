import { useState } from "react";
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
import { useExtendTrack } from "@/hooks/useExtendTrack";

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

export function ExtendTrackDialog({ open, onOpenChange, track }: ExtendTrackDialogProps) {
  const { extendTrack, isExtending } = useExtendTrack();
  const [continueAt, setContinueAt] = useState(track.duration ? Math.floor(track.duration * 0.7) : 60);
  const [prompt, setPrompt] = useState("");
  const [tags, setTags] = useState(track.style_tags?.join(", ") || "");
  const [model, setModel] = useState<"V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5">("V4");

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
            <Label htmlFor="continueAt">
              Начать расширение с {continueAt}с / {track.duration || 0}с
            </Label>
            <Slider
              id="continueAt"
              min={0}
              max={track.duration || 120}
              step={1}
              value={[continueAt]}
              onValueChange={([value]) => setContinueAt(value)}
              className="w-full"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prompt">Новый промпт (опционально)</Label>
            <Textarea
              id="prompt"
              placeholder="Оставьте пустым, чтобы использовать оригинальный промпт"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
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