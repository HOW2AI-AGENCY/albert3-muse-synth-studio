/**
 * AI Generation Panel for DAW
 *
 * Provides AI-powered tools for music generation:
 * - Generate new clips from prompts
 * - Auto-complete sections
 * - Style recommendations
 * - AI mastering
 *
 * @module components/daw/AIGenerationPanel
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, Wand2, Music, Loader2 } from 'lucide-react';
import { useGenerateMusic } from '@/hooks/useGenerateMusic';
import { toast } from 'sonner';
import { logInfo } from '@/utils/logger';

interface AIGenerationPanelProps {
  onClipGenerated?: (audioUrl: string, title: string) => void;
}

export const AIGenerationPanel: React.FC<AIGenerationPanelProps> = ({
  onClipGenerated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('electronic');
  const [duration, setDuration] = useState('30');

  const { generateMusic, isGenerating } = useGenerateMusic();

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      logInfo('Generating AI clip from DAW', 'AIGenerationPanel', { prompt, genre });

      const result = await generateMusic({
        prompt,
        genre,
        has_vocals: false,
        duration: parseInt(duration),
      });

      if (result?.audio_url) {
        toast.success('AI clip generated successfully!');
        onClipGenerated?.(result.audio_url, result.title || 'AI Generated');
      }
    } catch (error) {
      toast.error('Failed to generate clip');
    }
  }, [prompt, genre, duration, generateMusic, onClipGenerated]);

  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Generation
        </CardTitle>
        <CardDescription>
          Generate new audio clips using AI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt */}
        <div className="space-y-2">
          <Label htmlFor="ai-prompt">Prompt</Label>
          <Textarea
            id="ai-prompt"
            placeholder="Describe the music you want to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            disabled={isGenerating}
          />
        </div>

        {/* Genre */}
        <div className="space-y-2">
          <Label htmlFor="ai-genre">Genre</Label>
          <Select value={genre} onValueChange={setGenre} disabled={isGenerating}>
            <SelectTrigger id="ai-genre">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="electronic">Electronic</SelectItem>
              <SelectItem value="rock">Rock</SelectItem>
              <SelectItem value="pop">Pop</SelectItem>
              <SelectItem value="jazz">Jazz</SelectItem>
              <SelectItem value="classical">Classical</SelectItem>
              <SelectItem value="hiphop">Hip Hop</SelectItem>
              <SelectItem value="ambient">Ambient</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Duration */}
        <div className="space-y-2">
          <Label htmlFor="ai-duration">Duration (seconds)</Label>
          <Input
            id="ai-duration"
            type="number"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min={10}
            max={180}
            disabled={isGenerating}
          />
        </div>

        {/* Generate Button */}
        <Button
          className="w-full"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Clip
            </>
          )}
        </Button>

        {/* Quick Actions */}
        <div className="pt-4 border-t space-y-2">
          <p className="text-sm font-medium">Quick Actions</p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Coming soon"
            >
              <Music className="h-3.5 w-3.5 mr-1" />
              Auto Fill
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled
              title="Coming soon"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Enhance
            </Button>
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          Generated clips will be added to your library and can be dragged into tracks
        </p>
      </CardContent>
    </Card>
  );
};
