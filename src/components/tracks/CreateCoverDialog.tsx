import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Music, Upload, Mic } from "lucide-react";
import { useCreateCover } from "@/hooks/useCreateCover";
import { AudioUploader } from "@/components/audio/AudioUploader";
import { AudioRecorder } from "@/components/audio/AudioRecorder";

interface CreateCoverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: {
    id: string;
    title: string;
  };
}

const MODELS = [
  { value: "V3_5", label: "V3.5 - Better song structure (max 4 min)" },
  { value: "V4", label: "V4 - Improved vocal quality (max 4 min)" },
  { value: "V4_5", label: "V4.5 - Smarter prompts (max 8 min)" },
  { value: "V4_5PLUS", label: "V4.5+ - Richer sound (max 8 min)" },
  { value: "V5", label: "V5 - Superior expression (fastest)" },
] as const;

export function CreateCoverDialog({ open, onOpenChange, track }: CreateCoverDialogProps) {
  const { createCover, isCreating } = useCreateCover();
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState(`${track.title} (Cover)`);
  const [tags, setTags] = useState("");
  const [makeInstrumental, setMakeInstrumental] = useState(false);
  const [model, setModel] = useState<"V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5">("V4");
  const [referenceMode, setReferenceMode] = useState<'track' | 'upload' | 'record'>('track');
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!prompt.trim()) {
      return;
    }

    try {
      await createCover({
        prompt: prompt.trim(),
        title: title.trim() || undefined,
        tags: tags ? tags.split(",").map(t => t.trim()) : undefined,
        referenceTrackId: referenceMode === 'track' ? track.id : undefined,
        referenceAudioUrl: referenceMode !== 'track' ? (referenceAudioUrl || undefined) : undefined,
        make_instrumental: makeInstrumental,
        model,
      });
      onOpenChange(false);
      // Reset form
      setPrompt("");
      setTitle(`${track.title} (Cover)`);
      setTags("");
      setMakeInstrumental(false);
      setReferenceMode('track');
      setReferenceAudioUrl(null);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Создать кавер</DialogTitle>
          <DialogDescription>
            Создайте кавер трека "{track.title}" с новым стилем
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Референс</Label>
            <Tabs value={referenceMode} onValueChange={(v) => setReferenceMode(v as typeof referenceMode)}>
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="track" className="text-xs px-1.5 gap-1">
                  <Music className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Трек</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="text-xs px-1.5 gap-1">
                  <Upload className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Файл</span>
                </TabsTrigger>
                <TabsTrigger value="record" className="text-xs px-1.5 gap-1">
                  <Mic className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Запись</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="track" className="mt-2 animate-fade-in">
                <p className="text-sm text-muted-foreground">
                  Используется оригинальный трек "{track.title}" как референс
                </p>
              </TabsContent>

              <TabsContent value="upload" className="mt-2 animate-fade-in">
                <AudioUploader
                  onUploadComplete={(url) => setReferenceAudioUrl(url)}
                  onRemove={() => setReferenceAudioUrl(null)}
                />
              </TabsContent>

              <TabsContent value="record" className="mt-2 animate-fade-in">
                <AudioRecorder
                  onRecordComplete={(url) => setReferenceAudioUrl(url)}
                  onRemove={() => setReferenceAudioUrl(null)}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="prompt">
              Промпт <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="prompt"
              placeholder="Примеры промптов:
• Acoustic indie folk с нежной гитарой
• Электронная dance-версия с синтезаторами
• Джазовая интерпретация с саксофоном и контрабасом"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="text-xs"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Название (опционально)</Label>
            <Input
              id="title"
              placeholder={`${track.title} (Cover)`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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

          <div className="flex items-center space-x-2">
            <Checkbox
              id="instrumental"
              checked={makeInstrumental}
              onCheckedChange={(checked) => setMakeInstrumental(checked === true)}
            />
            <Label htmlFor="instrumental" className="cursor-pointer">
              Инструментальная версия (без вокала)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !prompt.trim()}>
            {isCreating ? "Создаю..." : "Создать кавер"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}