/**
 * MiniMax Generator Component
 * UI for generating music with MiniMax Music-1.5
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Music, Upload, Download } from 'lucide-react';
import { useMinimaxGeneration } from '@/hooks/useMinimaxGeneration';
import { cn } from '@/lib/utils';

export const MinimaxGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [referenceAudio, setReferenceAudio] = useState<string>('');
  const [styleStrength, setStyleStrength] = useState(0.8);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);

  const { mutate: generate, isPending } = useMinimaxGeneration();

  const handleGenerate = () => {
    if (!prompt || !lyrics) {
      return;
    }

    generate(
      {
        prompt,
        lyrics,
        referenceAudioUrl: referenceAudio || undefined,
        styleStrength,
        sampleRate: 44100,
        bitrate: 256000,
        audioFormat: 'mp3'
      },
      {
        onSuccess: (data) => {
          setGeneratedAudio(data.audioUrl);
        }
      }
    );
  };

  const promptLength = prompt.length;
  const lyricsLength = lyrics.length;
  const isPromptValid = promptLength >= 10 && promptLength <= 300;
  const isLyricsValid = lyricsLength >= 10 && lyricsLength <= 600;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            MiniMax Music-1.5 Generator
          </CardTitle>
          <CardDescription>
            Generate full-length songs (up to 4 minutes) with natural vocals & rich instrumentation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="minimax-prompt">
              Music Prompt *
              <span className={cn(
                'ml-2 text-sm',
                isPromptValid ? 'text-green-500' : 'text-red-500'
              )}>
                ({promptLength}/300)
              </span>
            </Label>
            <Textarea
              id="minimax-prompt"
              placeholder="blues, melancholic, raw, lonely bar, heartbreak"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={300}
              rows={3}
              className={cn(
                !isPromptValid && prompt && 'border-red-500'
              )}
            />
            <p className="text-sm text-muted-foreground">
              Describe the music style, mood, genre, tempo, instruments (10-300 characters)
            </p>
          </div>

          {/* Lyrics */}
          <div className="space-y-2">
            <Label htmlFor="minimax-lyrics">
              Lyrics *
              <span className={cn(
                'ml-2 text-sm',
                isLyricsValid ? 'text-green-500' : 'text-red-500'
              )}>
                ({lyricsLength}/600)
              </span>
            </Label>
            <Textarea
              id="minimax-lyrics"
              placeholder="[verse]&#10;Dim lights on a dusty floor&#10;Another night I walk through this door&#10;[chorus]&#10;Oh these barroom blues they fill my soul"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              maxLength={600}
              rows={8}
              className={cn(
                'font-mono text-sm',
                !isLyricsValid && lyrics && 'border-red-500'
              )}
            />
            <p className="text-sm text-muted-foreground">
              Supports [intro][verse][chorus][bridge][outro] tags. Use line breaks to separate lines (10-600 characters)
            </p>
          </div>

          {/* Reference Audio (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="minimax-reference">
              Reference Audio URL (Optional)
            </Label>
            <div className="flex gap-2">
              <Input
                id="minimax-reference"
                placeholder="https://example.com/reference.mp3"
                value={referenceAudio}
                onChange={(e) => setReferenceAudio(e.target.value)}
                type="url"
              />
              <Button variant="outline" size="icon" disabled>
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Provide a reference track URL to learn and apply its style
            </p>
          </div>

          {/* Style Strength */}
          {referenceAudio && (
            <div className="space-y-2">
              <Label>
                Style Strength: {styleStrength.toFixed(2)}
              </Label>
              <Slider
                value={[styleStrength]}
                onValueChange={(value) => setStyleStrength(value[0])}
                min={0}
                max={1}
                step={0.1}
              />
              <p className="text-sm text-muted-foreground">
                Control how much the reference track influences the output (0 = minimal, 1 = maximum)
              </p>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isPending || !isPromptValid || !isLyricsValid}
            className="w-full"
            size="lg"
          >
            {isPending ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Music className="h-5 w-5 mr-2" />
                Generate Music
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Audio */}
      {generatedAudio && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Audio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <audio
              controls
              src={generatedAudio}
              className="w-full"
            />
            <Button
              variant="outline"
              className="w-full"
              asChild
            >
              <a href={generatedAudio} download="minimax-generated.mp3">
                <Download className="h-4 w-4 mr-2" />
                Download MP3
              </a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
