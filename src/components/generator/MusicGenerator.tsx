import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Music, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}

export const MusicGenerator = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<'simple' | 'custom'>('simple');
  const [provider, setProvider] = useState<'suno' | 'mureka'>('suno');

  // Simple mode
  const [prompt, setPrompt] = useState('');

  // Custom mode
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tags, setTags] = useState('');
  const [modelVersion, setModelVersion] = useState('V5');

  const handleGenerate = async () => {
    if (!prompt.trim() && !title.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните описание музыки",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const functionName = provider === 'suno' ? 'generate-suno' : 'generate-mureka';
      
      const payload = mode === 'simple' 
        ? {
            prompt: prompt.trim(),
            provider,
            modelVersion: provider === 'suno' ? modelVersion : 'mureka-o1',
          }
        : {
            prompt: prompt.trim() || title.trim(),
            title: title.trim(),
            lyrics: lyrics.trim(),
            tags: tags.trim(),
            customMode: true,
            provider,
            modelVersion: provider === 'suno' ? modelVersion : 'mureka-o1',
          };

      const { error } = await supabase.functions.invoke(functionName, {
        body: payload,
      });

      if (error) throw error;

      toast({
        title: "Генерация началась",
        description: "Ваш трек создаётся, это займёт 1-2 минуты",
      });

      // Reset form
      setPrompt('');
      setTitle('');
      setLyrics('');
      setTags('');

      if (onTrackGenerated) {
        onTrackGenerated();
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Ошибка генерации",
        description: error instanceof Error ? error.message : "Попробуйте ещё раз",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="h-full border-0">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <CardTitle>Создать музыку</CardTitle>
        </div>
        <CardDescription>
          Опишите музыку, которую хотите создать
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Provider selector */}
        <div className="space-y-2">
          <Label>Провайдер</Label>
          <Select value={provider} onValueChange={(v) => setProvider(v as 'suno' | 'mureka')}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="suno">Suno AI</SelectItem>
              <SelectItem value="mureka">Mureka AI</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mode tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as 'simple' | 'custom')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="simple">Простой</TabsTrigger>
            <TabsTrigger value="custom">Кастомный</TabsTrigger>
          </TabsList>

          <TabsContent value="simple" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Опишите музыку</Label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Энергичная электронная музыка для тренировки"
                className="min-h-[120px]"
              />
            </div>

            {provider === 'suno' && (
              <div className="space-y-2">
                <Label>Модель</Label>
                <Select value={modelVersion} onValueChange={setModelVersion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="V5">V5 (Latest)</SelectItem>
                    <SelectItem value="V4_5PLUS">V4.5 Plus</SelectItem>
                    <SelectItem value="V4_5">V4.5</SelectItem>
                    <SelectItem value="V4">V4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Моя песня"
              />
            </div>

            <div className="space-y-2">
              <Label>Текст песни</Label>
              <Textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="[Verse]&#10;Текст первого куплета...&#10;&#10;[Chorus]&#10;Текст припева..."
                className="min-h-[150px] font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label>Теги стилей</Label>
              <Input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="pop, energetic, female vocals"
              />
            </div>

            {provider === 'suno' && (
              <div className="space-y-2">
                <Label>Модель</Label>
                <Select value={modelVersion} onValueChange={setModelVersion}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="V5">V5 (Latest)</SelectItem>
                    <SelectItem value="V4_5PLUS">V4.5 Plus</SelectItem>
                    <SelectItem value="V4_5">V4.5</SelectItem>
                    <SelectItem value="V4">V4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Генерация...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Создать музыку
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
