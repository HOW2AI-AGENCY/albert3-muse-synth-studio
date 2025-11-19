/**
 * Mobile Suno Panel Component
 *
 * Integrated Suno AI generation for mobile DAW:
 * - Quick generation presets
 * - Stem separation
 * - Load stems directly to DAW
 * - Mobile-optimized form
 *
 * @module components/daw/mobile/MobileSunoPanel
 */

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Wand2, Loader2, Music, Download, Layers } from 'lucide-react';
import { useDAWStore } from '@/stores/dawStore';
import { useTracks } from '@/hooks/useTracks';
import { useStemSeparation } from '@/hooks/useStemSeparation';
import { toast } from 'sonner';
import { logInfo } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { TrackStem } from '@/types/domain/track.types';

interface QuickPreset {
  name: string;
  prompt: string;
  genre: string;
  hasVocals: boolean;
}

const QUICK_PRESETS: QuickPreset[] = [
  {
    name: 'Electronic Drop',
    prompt: 'Epic electronic drop with powerful bass and energetic synths',
    genre: 'electronic',
    hasVocals: false,
  },
  {
    name: 'Ambient Pad',
    prompt: 'Dreamy ambient soundscape with lush pads and subtle melodies',
    genre: 'ambient',
    hasVocals: false,
  },
  {
    name: 'Pop Beat',
    prompt: 'Catchy pop instrumental with upbeat drums and memorable hooks',
    genre: 'pop',
    hasVocals: false,
  },
  {
    name: 'Hip Hop Loop',
    prompt: 'Smooth hip hop beat with deep bass and crisp drums',
    genre: 'hiphop',
    hasVocals: false,
  },
];

export const MobileSunoPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'stems'>('generate');

  // Generation state
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('electronic');
  const [hasVocals, setHasVocals] = useState(false);
  const [duration, setDuration] = useState('30');
  const [isGenerating, setIsGenerating] = useState(false);

  // Stem state
  const [selectedTrackForStems, setSelectedTrackForStems] = useState<string>('');

  const loadStemsAsMultitrack = useDAWStore((state) => state.loadStemsAsMultitrack);

  // Load user tracks
  const { tracks: userTracks } = useTracks();

  // Stem separation
  const { generateStems, isGenerating: isSeparatingStems } = useStemSeparation({
    trackId: selectedTrackForStems,
    onSuccess: () => {
      toast.success('Stems ready! Loading into DAW...');
      handleLoadStems(selectedTrackForStems);
    },
    onStemsReady: () => {
      handleLoadStems(selectedTrackForStems);
    },
  });

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt');
      return;
    }

    try {
      setIsGenerating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to generate music');
        return;
      }

      logInfo('Generating music from mobile DAW', 'MobileSunoPanel', {
        prompt,
        genre,
        hasVocals,
      });

      const response = await SupabaseFunctions.invoke('generate-suno', {
        body: {
          prompt,
          genre,
          has_vocals: hasVocals,
          duration: parseInt(duration),
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('🎵 Generation started! Track will appear in your library soon.');
      setPrompt('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, genre, hasVocals, duration]);

  const handleQuickPreset = useCallback((preset: QuickPreset) => {
    setPrompt(preset.prompt);
    setGenre(preset.genre);
    setHasVocals(preset.hasVocals);
  }, []);

  const handleLoadStems = useCallback(
    async (trackId: string) => {
      try {
        const track = userTracks?.find((t) => t.id === trackId);
        if (!track) return;

        const { data: stems, error } = await supabase
          .from('track_stems')
          .select('*')
          .eq('track_id', trackId);

        if (error || !stems || stems.length === 0) {
          toast.error('No stems found for this track');
          return;
        }

        loadStemsAsMultitrack(stems as TrackStem[], track.title);
        toast.success(`Loaded ${stems.length} stems as multitrack!`);
        setActiveTab('generate'); // Switch back to generation tab
      } catch (error) {
        toast.error('Failed to load stems');
      }
    },
    [userTracks, loadStemsAsMultitrack]
  );

  const handleSeparateStems = useCallback(() => {
    if (!selectedTrackForStems) {
      toast.error('Please select a track');
      return;
    }

    generateStems('split_stem');
  }, [selectedTrackForStems, generateStems]);

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="h-full">
        <div className="px-4 pt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">
              <Wand2 className="h-4 w-4 mr-2" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="stems">
              <Layers className="h-4 w-4 mr-2" />
              Stems
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Generate Tab */}
        <TabsContent value="generate" className="m-0 h-[calc(100%-60px)]">
          <ScrollArea className="h-full px-4 pb-4">
            <div className="space-y-4 pt-4">
              {/* Quick Presets */}
              <div className="space-y-2">
                <Label>Quick Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      variant="outline"
                      size="sm"
                      className="h-auto flex-col items-start p-2 text-left"
                      onClick={() => handleQuickPreset(preset)}
                    >
                      <span className="font-medium text-xs">{preset.name}</span>
                      <span className="text-xs text-muted-foreground line-clamp-2">
                        {preset.prompt}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt">Describe your music</Label>
                <Textarea
                  id="prompt"
                  placeholder="Epic electronic drop with powerful bass..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  disabled={isGenerating}
                />
              </div>

              {/* Genre */}
              <div className="space-y-2">
                <Label htmlFor="genre">Genre</Label>
                <Select value={genre} onValueChange={setGenre} disabled={isGenerating}>
                  <SelectTrigger id="genre">
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
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  min={10}
                  max={180}
                  disabled={isGenerating}
                />
              </div>

              {/* Has Vocals */}
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="vocals">Include Vocals</Label>
                  <p className="text-xs text-muted-foreground">
                    Generate with vocal melody
                  </p>
                </div>
                <Switch
                  id="vocals"
                  checked={hasVocals}
                  onCheckedChange={setHasVocals}
                  disabled={isGenerating}
                />
              </div>

              {/* Generate Button */}
              <Button
                className="w-full h-12"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 mr-2" />
                    Generate Music
                  </>
                )}
              </Button>

              {/* Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">💡 Tips</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  <p>• Be specific about instruments and mood</p>
                  <p>• Generation takes 30-60 seconds</p>
                  <p>• Track will appear in your Library</p>
                  <p>• Use Stems tab to load into DAW</p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Stems Tab */}
        <TabsContent value="stems" className="m-0 h-[calc(100%-60px)]">
          <ScrollArea className="h-full px-4 pb-4">
            <div className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Load Stems into DAW</CardTitle>
                  <CardDescription className="text-xs">
                    Select a track with stems to load as multitrack
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select
                    value={selectedTrackForStems}
                    onValueChange={setSelectedTrackForStems}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a track..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userTracks
                        ?.filter((t) => t.has_stems)
                        .map((track) => (
                          <SelectItem key={track.id} value={track.id}>
                            <div className="flex items-center gap-2">
                              <Music className="h-3 w-3" />
                              <span className="truncate">{track.title}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Button
                    className="w-full"
                    onClick={() => handleLoadStems(selectedTrackForStems)}
                    disabled={!selectedTrackForStems}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Load Stems to DAW
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Separate Stems</CardTitle>
                  <CardDescription className="text-xs">
                    Extract stems from any track
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select
                    value={selectedTrackForStems}
                    onValueChange={setSelectedTrackForStems}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a track..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userTracks?.map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          <div className="flex items-center gap-2">
                            <Music className="h-3 w-3" />
                            <span className="truncate">{track.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    className="w-full"
                    onClick={handleSeparateStems}
                    disabled={!selectedTrackForStems || isSeparatingStems}
                  >
                    {isSeparatingStems ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Separating...
                      </>
                    ) : (
                      <>
                        <Layers className="h-4 w-4 mr-2" />
                        Separate Stems
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground">
                    ⏱️ Stem separation takes 30-180 seconds
                  </p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};
