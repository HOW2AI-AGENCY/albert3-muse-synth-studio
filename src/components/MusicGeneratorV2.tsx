import { memo, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Loader2, Plus, FileAudio, FileText, SlidersHorizontal } from 'lucide-react';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { AudioPreviewDialog } from '@/components/audio/AudioPreviewDialog';
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog';

interface MusicGeneratorV2Props {
  onTrackGenerated?: () => void;
}

type VocalGender = 'any' | 'female' | 'male' | 'instrumental';

const modelVersions = [
  { value: 'V5', label: 'v5' },
  { value: 'V4_5PLUS', label: 'v4.5+' },
  { value: 'V4_5', label: 'v4.5' },
  { value: 'V4', label: 'v4' },
  { value: 'V3_5', label: 'v3.5' },
];

const vocalGenderOptions: { value: VocalGender; label: string }[] = [
  { value: 'any', label: 'Любой' },
  { value: 'female', label: 'Женский' },
  { value: 'male', label: 'Мужской' },
  { value: 'instrumental', label: 'Без вокала' },
];

const MusicGeneratorV2Component = ({ onTrackGenerated }: MusicGeneratorV2Props) => {
  const { generateMusic, isGenerating } = useMusicGenerationStore();
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  const { uploadAudio, isUploading } = useAudioUpload();

  const [audioPreviewOpen, setAudioPreviewOpen] = useState(false);
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [params, setParams] = useState({
    prompt: '',
    title: '',
    lyrics: '',
    tags: '',
    negativeTags: '',
    vocalGender: 'any' as VocalGender,
    modelVersion: 'V5',
    referenceAudioUrl: null as string | null,
    referenceFileName: null as string | null,
    audioWeight: 50,
    styleWeight: 75,
    lyricsWeight: 70,
    weirdness: 10,
  });

  const setParam = <K extends keyof typeof params>(key: K, value: (typeof params)[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingAudioFile(file);
      setAudioPreviewOpen(true);
    }
    e.target.value = ''; // Reset input
  };

  const handleAudioConfirm = async () => {
    if (!pendingAudioFile) return;

    const url = await uploadAudio(pendingAudioFile);
    if (url) {
      setParam('referenceAudioUrl', url);
      setParam('referenceFileName', pendingAudioFile.name);
      setPendingAudioFile(null);
      // Auto-expand advanced settings when audio is added
      setAdvancedOpen(true);
      toast({
        title: 'Референс добавлен',
        description: 'Расширенные настройки открыты для контроля веса аудио',
      });
    }
  };

  const handleRemoveAudio = () => {
    setParam('referenceAudioUrl', null);
    setParam('referenceFileName', null);
    setPendingAudioFile(null);
  };

  const handleGenerate = useCallback(async () => {
    vibrate('heavy');

    if (!params.prompt.trim() && !params.lyrics.trim()) {
      toast({ title: 'Опишите трек или добавьте текст', variant: 'destructive' });
      return;
    }

    const hasVocals = params.vocalGender !== 'instrumental';
    const vocalGenderParam = (hasVocals && params.vocalGender !== 'any') 
      ? params.vocalGender.substring(0, 1) as 'f' | 'm' 
      : undefined;

    const requestParams = {
      prompt: params.prompt.trim(),
      title: params.title.trim() || undefined,
      lyrics: hasVocals && params.lyrics.trim() ? params.lyrics.trim() : undefined,
      hasVocals,
      styleTags: params.tags.split(',').map(t => t.trim()).filter(Boolean),
      negativeTags: params.negativeTags.trim() || undefined,
      weirdnessConstraint: params.weirdness / 100,
      styleWeight: params.styleWeight / 100,
      audioWeight: params.referenceAudioUrl ? params.audioWeight / 100 : undefined,
      vocalGender: vocalGenderParam,
      customMode: true,
      modelVersion: params.modelVersion,
      referenceAudioUrl: params.referenceAudioUrl || undefined,
    };

    const started = await generateMusic(requestParams, toast, onTrackGenerated);
    if (started) {
      setParams(prev => ({
        ...prev,
        title: '',
        prompt: '',
        lyrics: '',
        tags: '',
      }));
    }
  }, [params, generateMusic, toast, onTrackGenerated, vibrate]);

  const tempAudioUrl = pendingAudioFile ? URL.createObjectURL(pendingAudioFile) : '';

  return (
    <div className="flex flex-col h-full bg-card border border-border/20 rounded-lg shadow-sm" data-testid="music-generator">
      {/* Compact Header */}
      <div className="p-3 border-b border-border/20 space-y-2">
        <div className="flex items-center gap-2">
          <Select value={params.modelVersion} onValueChange={(v) => setParam('modelVersion', v)}>
            <SelectTrigger className="h-9 w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelVersions.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2 ml-auto">
            <Button
              variant={params.referenceAudioUrl ? 'default' : 'outline'}
              size="sm"
              className="h-9 gap-1.5"
              disabled={isGenerating || isUploading}
              onClick={() => document.getElementById('audio-upload-input')?.click()}
            >
              {params.referenceAudioUrl ? (
                <FileAudio className="h-4 w-4" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span className="text-xs">Audio</span>
            </Button>
            <input
              id="audio-upload-input"
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioFileSelect}
            />

            <Button
              variant={params.lyrics ? 'default' : 'outline'}
              size="sm"
              className="h-9 gap-1.5"
              disabled={isGenerating}
              onClick={() => setLyricsDialogOpen(true)}
            >
              {params.lyrics ? (
                <FileText className="h-4 w-4" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              <span className="text-xs">Lyrics</span>
            </Button>
          </div>
        </div>

        {params.referenceFileName && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-md">
            <FileAudio className="h-3.5 w-3.5" />
            <span className="flex-1 truncate">{params.referenceFileName}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setAudioPreviewOpen(true)}
            >
              <FileAudio className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-3 space-y-3">
          {/* Main Prompt */}
          <div className="space-y-1.5">
            <Label htmlFor="prompt" className="text-xs font-medium">Описание стиля и настроения</Label>
            <Textarea
              id="prompt"
              placeholder="Например: энергичный рок с мощными гитарами, dream pop с синтезаторами..."
              value={params.prompt}
              onChange={(e) => setParam('prompt', e.target.value)}
              className="min-h-[80px] text-sm resize-none"
              disabled={isGenerating}
              rows={3}
            />
          </div>

          {/* Title (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-medium text-muted-foreground">
              Название <span className="text-xs opacity-60">(опционально)</span>
            </Label>
            <Input
              id="title"
              placeholder="AI придумает название, если оставить пустым"
              value={params.title}
              onChange={(e) => setParam('title', e.target.value)}
              className="h-9 text-sm"
              disabled={isGenerating}
            />
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label htmlFor="tags" className="text-xs font-medium">Жанры</Label>
            <Input
              id="tags"
              placeholder="rock, indie, synthwave"
              value={params.tags}
              onChange={(e) => setParam('tags', e.target.value)}
              className="h-9 text-sm"
              disabled={isGenerating}
            />
          </div>

          {/* Advanced Settings */}
          <Accordion 
            type="single" 
            collapsible 
            value={advancedOpen ? "advanced" : ""}
            onValueChange={(v) => setAdvancedOpen(v === "advanced")}
          >
            <AccordionItem value="advanced" className="border-b-0">
              <AccordionTrigger className="py-2 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span>Расширенные настройки</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 space-y-3">
                {/* Audio Weight - показываем только если есть референс */}
                {params.referenceAudioUrl && (
                  <div className="space-y-2 p-2 bg-primary/5 rounded-md border border-primary/10">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Вес аудио</Label>
                      <span className="text-xs text-muted-foreground">{params.audioWeight}%</span>
                    </div>
                    <Slider
                      value={[params.audioWeight]}
                      onValueChange={([v]) => setParam('audioWeight', v)}
                      max={100}
                      step={5}
                      disabled={isGenerating}
                    />
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Контролирует влияние референсного аудио на результат
                    </p>
                  </div>
                )}

                {/* Style Weight */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Вес стиля</Label>
                    <span className="text-xs text-muted-foreground">{params.styleWeight}%</span>
                  </div>
                  <Slider
                    value={[params.styleWeight]}
                    onValueChange={([v]) => setParam('styleWeight', v)}
                    max={100}
                    step={5}
                    disabled={isGenerating}
                  />
                </div>

                {/* Lyrics Weight */}
                {params.lyrics && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Вес текста</Label>
                      <span className="text-xs text-muted-foreground">{params.lyricsWeight}%</span>
                    </div>
                    <Slider
                      value={[params.lyricsWeight]}
                      onValueChange={([v]) => setParam('lyricsWeight', v)}
                      max={100}
                      step={5}
                      disabled={isGenerating}
                    />
                  </div>
                )}

                {/* Vocal Gender */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Пол вокала</Label>
                  <Select 
                    value={params.vocalGender} 
                    onValueChange={(v: VocalGender) => setParam('vocalGender', v)}
                    disabled={isGenerating}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vocalGenderOptions.map(o => (
                        <SelectItem key={o.value} value={o.value} className="text-sm">
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Negative Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Исключить стили</Label>
                  <Input
                    placeholder="trap, eurodance"
                    value={params.negativeTags}
                    onChange={(e) => setParam('negativeTags', e.target.value)}
                    className="h-9 text-sm"
                    disabled={isGenerating}
                  />
                </div>

                {/* Weirdness */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Креативность</Label>
                    <span className="text-xs text-muted-foreground">{params.weirdness}%</span>
                  </div>
                  <Slider
                    value={[params.weirdness]}
                    onValueChange={([v]) => setParam('weirdness', v)}
                    max={100}
                    step={5}
                    disabled={isGenerating}
                  />
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    0% = строго по промпту, 100% = полная свобода AI
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>

      {/* Generate Button */}
      <div className="p-3 border-t border-border/20 mt-auto">
        <Button 
          onClick={handleGenerate} 
          disabled={isGenerating || isUploading} 
          className="w-full h-11 text-sm font-semibold gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <Music className="h-4 w-4" />
              Создать трек
            </>
          )}
        </Button>
      </div>

      {/* Audio Preview Dialog */}
      {pendingAudioFile && (
        <AudioPreviewDialog
          open={audioPreviewOpen}
          onOpenChange={setAudioPreviewOpen}
          audioUrl={tempAudioUrl}
          fileName={pendingAudioFile.name}
          onConfirm={handleAudioConfirm}
          onRemove={handleRemoveAudio}
        />
      )}

      {/* Existing Audio Preview */}
      {params.referenceAudioUrl && !pendingAudioFile && (
        <AudioPreviewDialog
          open={audioPreviewOpen}
          onOpenChange={setAudioPreviewOpen}
          audioUrl={params.referenceAudioUrl}
          fileName={params.referenceFileName || 'audio.mp3'}
          onConfirm={() => setAudioPreviewOpen(false)}
          onRemove={handleRemoveAudio}
        />
      )}

      {/* Lyrics Generator Dialog */}
      <LyricsGeneratorDialog
        open={lyricsDialogOpen}
        onOpenChange={setLyricsDialogOpen}
        onGenerated={(lyrics: string) => {
          setParam('lyrics', lyrics);
          setLyricsDialogOpen(false);
        }}
      />
    </div>
  );
};

export const MusicGeneratorV2 = memo(MusicGeneratorV2Component);
