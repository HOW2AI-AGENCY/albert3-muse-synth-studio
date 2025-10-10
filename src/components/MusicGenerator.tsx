import { memo, useCallback, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Music,
  Loader2,
  FileText,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

// --- PROPS & TYPES ---

interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}

interface FormFieldProps {
  label: string;
  children: ReactNode;
  description?: string;
  tooltip?: string;
  htmlFor?: string;
}

interface FormSectionProps {
  title: string;
  icon: React.ElementType;
  children: ReactNode;
  isOpen?: boolean;
}

type GenerationMode = 'simple' | 'advanced';
type VocalGender = 'any' | 'female' | 'male' | 'duet' | 'instrumental';

// --- CONSTANTS & HELPERS ---

const modelVersions = [
  { value: 'chirp-v3-5', label: 'Suno v5 (chirp-v3-5)' },
  { value: 'chirp-v3-0', label: 'Suno v4.5 (chirp-v3-0)' },
];

const vocalGenderOptions: { value: VocalGender; label: string }[] = [
  { value: 'any', label: 'Любой' },
  { value: 'female', label: 'Женский' },
  { value: 'male', label: 'Мужской' },
  { value: 'instrumental', label: 'Без вокала' },
];

const pickRandom = (values: string[]) => values[Math.floor(Math.random() * values.length)];

// --- REUSABLE SUB-COMPONENTS ---

const FormField: React.FC<FormFieldProps> = ({ label, children, description, tooltip, htmlFor }) => (
  <div className="grid gap-2">
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-semibold uppercase text-muted-foreground">{label}</Label>
      {tooltip && (
        <Tooltip>
          <TooltipTrigger><Info className="h-3.5 w-3.5 text-muted-foreground/80" /></TooltipTrigger>
          <TooltipContent className="max-w-xs text-sm">{tooltip}</TooltipContent>
        </Tooltip>
      )}
    </div>
    {children}
    {description && <p className="text-xs text-muted-foreground">{description}</p>}
  </div>
);

const FormSection: React.FC<FormSectionProps> = ({ title, icon: Icon, children, isOpen: defaultOpen = true }) => (
  <Accordion type="single" collapsible defaultValue={defaultOpen ? "item-1" : undefined} className="w-full">
    <AccordionItem value="item-1" className="border-b-0">
      <AccordionTrigger className="py-2 text-sm font-semibold hover:no-underline text-foreground">
        <div className="flex items-center gap-2"><Icon className="h-4 w-4" />{title}</div>
      </AccordionTrigger>
      <AccordionContent className="pt-2 pb-1 space-y-4">{children}</AccordionContent>
    </AccordionItem>
  </Accordion>
);

// --- MAIN COMPONENT ---

const MusicGeneratorComponent = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const { generateMusic, isGenerating } = useMusicGenerationStore();
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();

  const [generationMode, setGenerationMode] = useState<GenerationMode>('simple');
  const [params, setParams] = useState({
    simplePrompt: '',
    isInstrumental: false,
    title: '',
    stylePrompt: '',
    lyrics: '',
    tags: '',
    negativeTags: '',
    vocalGender: 'any' as VocalGender,
    weirdness: 10, // 0-100 scale
    styleInfluence: 75, // 0-100 scale
    modelVersion: 'chirp-v3-5',
  });

  const setParam = <K extends keyof typeof params>(key: K, value: (typeof params)[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerate = useCallback(async () => {
    vibrate('heavy');

    const isSimple = generationMode === 'simple';
    const finalPrompt = isSimple ? params.simplePrompt : params.stylePrompt;

    if (!finalPrompt.trim() && !params.lyrics.trim()) {
      toast({ title: 'Опишите трек или добавьте текст', variant: 'destructive' });
      return;
    }

    const hasVocals = isSimple ? !params.isInstrumental : params.vocalGender !== 'instrumental';
    const vocalGenderParam = (hasVocals && params.vocalGender !== 'any' && params.vocalGender !== 'instrumental') ? params.vocalGender.substring(0, 1) as 'f' | 'm' : undefined;

    const requestParams = {
      prompt: finalPrompt,
      title: params.title.trim() || undefined,
      lyrics: hasVocals && params.lyrics.trim() ? params.lyrics.trim() : undefined,
      hasVocals,
      styleTags: params.tags.split(',').map(t => t.trim()).filter(Boolean),
      negativeTags: params.negativeTags.trim() || undefined,
      weirdnessConstraint: isSimple ? undefined : params.weirdness / 100,
      styleWeight: isSimple ? undefined : params.styleInfluence / 100,
      vocalGender: vocalGenderParam,
      customMode: !isSimple,
      modelVersion: params.modelVersion,
    };

    const started = await generateMusic(requestParams, toast, onTrackGenerated);
    if (started) {
      // Keep simple prompt, reset others
      setParams(prev => ({
        ...prev,
        title: '',
        stylePrompt: '',
        lyrics: '',
        tags: '',
      }));
    }
  }, [params, generationMode, generateMusic, toast, onTrackGenerated, vibrate]);

  const lyricStats = useMemo(() => {
    const trimmed = params.lyrics.trim();
    if (!trimmed) return { lines: 0 };
    return { lines: trimmed.split(/\r?\n/).filter(line => line.trim().length > 0).length };
  }, [params.lyrics]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-card border border-border/20 rounded-lg shadow-sm">
        <div className="p-3 border-b border-border/20">
          <Tabs value={generationMode} onValueChange={(v) => setGenerationMode(v as GenerationMode)}>
            <TabsList className="grid w-full grid-cols-2 h-9">
              <TabsTrigger value="simple" className="text-xs">Простой</TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs">Продвинутый</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="flex-grow">
          <div className="p-3 space-y-4">
            {generationMode === 'simple' ? (
              <div className="space-y-3 animate-fade-in">
                <FormField label="Описание трека" htmlFor="simple-prompt">
                  <Textarea
                    id="simple-prompt"
                    placeholder="Например, энергичный рок с мощными гитарами..."
                    value={params.simplePrompt}
                    onChange={(e) => setParam('simplePrompt', e.target.value)}
                    className="min-h-[90px] text-sm"
                    disabled={isGenerating}
                    rows={4}
                  />
                </FormField>
                <div className="flex items-center justify-between">
                  <FormField label="Инструментал" htmlFor="instrumental-switch" tooltip="Создать трек без вокала">
                    <Switch id="instrumental-switch" checked={params.isInstrumental} onCheckedChange={(v) => setParam('isInstrumental', v)} disabled={isGenerating} />
                  </FormField>
                </div>
              </div>
            ) : (
              <div className="space-y-1 animate-fade-in">
                <FormSection title="Текст и Название" icon={FileText}>
                  <FormField label="Название (опционально)" htmlFor="title">
                    <Input id="title" placeholder="Название придумаем, если оставить пустым" value={params.title} onChange={(e) => setParam('title', e.target.value)} disabled={isGenerating} />
                  </FormField>
                  <FormField label="Текст песни" htmlFor="lyrics">
                    <Textarea id="lyrics" placeholder="Вставьте текст песни здесь..." value={params.lyrics} onChange={(e) => setParam('lyrics', e.target.value)} className="min-h-[120px]" disabled={isGenerating} rows={5} />
                  </FormField>
                  <div className="text-right text-xs text-muted-foreground -mt-1">{lyricStats.lines} строк</div>
                </FormSection>

                <FormSection title="Стиль и Жанр" icon={Music}>
                  <FormField label="Стилевой промт" htmlFor="style-prompt" tooltip="Опишите звучание, настроение, похожих исполнителей">
                    <Textarea id="style-prompt" placeholder="Например, dream pop, synthwave, post-rock..." value={params.stylePrompt} onChange={(e) => setParam('stylePrompt', e.target.value)} disabled={isGenerating} rows={3}/>
                  </FormField>
                  <FormField label="Жанры" htmlFor="tags" tooltip="Перечислите жанры через запятую для более точного результата">
                    <Input id="tags" placeholder="rock, indie, 80s" value={params.tags} onChange={(e) => setParam('tags', e.target.value)} disabled={isGenerating} />
                  </FormField>
                </FormSection>

                <FormSection title="Тонкая настройка" icon={SlidersHorizontal} isOpen={false}>
                   <FormField label="Пол вокала" htmlFor="vocal-gender">
                      <Select value={params.vocalGender} onValueChange={(v: VocalGender) => setParam('vocalGender', v)} disabled={isGenerating}>
                        <SelectTrigger id="vocal-gender"><SelectValue /></SelectTrigger>
                        <SelectContent>{vocalGenderOptions.map(o => <SelectItem key={o.value} value={o.value} className="text-sm">{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                    <FormField label="Исключить из стиля" htmlFor="negative-tags" tooltip="Стили, которые не должны быть в треке">
                      <Input id="negative-tags" placeholder="Например, trap, eurodance" value={params.negativeTags} onChange={(e) => setParam('negativeTags', e.target.value)} disabled={isGenerating} />
                    </FormField>
                    <FormField label={`Weirdness: ${params.weirdness}%`} htmlFor="weirdness" tooltip="Насколько креативным и необычным будет результат. 0% = строго по промпту, 100% = полная свобода ИИ.">
                      <Slider id="weirdness" value={[params.weirdness]} onValueChange={([v]) => setParam('weirdness', v)} step={5} disabled={isGenerating} />
                    </FormField>
                    <FormField label={`Style Influence: ${params.styleInfluence}%`} htmlFor="style-influence" tooltip="Насколько сильно придерживаться указанных тегов и стиля. 0% = легкое влияние, 100% = строгое следование.">
                      <Slider id="style-influence" value={[params.styleInfluence]} onValueChange={([v]) => setParam('styleInfluence', v)} step={5} disabled={isGenerating} />
                    </FormField>
                    <FormField label="Модель ИИ" htmlFor="model-version">
                      <Select value={params.modelVersion} onValueChange={(v) => setParam('modelVersion', v)}>
                          <SelectTrigger id="model-version"><SelectValue /></SelectTrigger>
                          <SelectContent>{modelVersions.map(m => <SelectItem key={m.value} value={m.value} className="text-sm">{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </FormField>
                </FormSection>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border/20 mt-auto">
          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full h-control-lg text-sm font-semibold gap-2">
            {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" />Генерация...</> : <><Music className="h-4 w-4" />Создать</>}
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};

export const MusicGenerator = memo(MusicGeneratorComponent);