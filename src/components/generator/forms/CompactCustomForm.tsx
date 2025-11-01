import { memo, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Upload, User, ChevronDown, Music, Sparkles, Plus } from '@/utils/iconImports';
import { LyricsInput } from '@/components/lyrics/legacy/LyricsInput';
import { StyleTagsInput } from './StyleTagsInput';
import { AdvancedControls } from './AdvancedControls';
import type { GenerationParams } from '../types/generator.types';
import type { MusicProvider } from '@/config/provider-models';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';

interface CompactCustomFormProps {
  params: GenerationParams;
  onParamChange: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  onGenerate: () => void;
  onOpenLyricsDialog: () => void;
  onAudioUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPersonaClick: () => void;
  isGenerating: boolean;
  debouncedLyrics: string;
  onDebouncedLyricsChange: (value: string) => void;
}

export const CompactCustomForm = memo(({
  params,
  onParamChange,
  onGenerate,
  onOpenLyricsDialog,
  onAudioUpload,
  onPersonaClick,
  isGenerating,
  debouncedLyrics,
  onDebouncedLyricsChange,
}: CompactCustomFormProps) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const lyricsLineCount = debouncedLyrics.split('\n').filter(l => l.trim()).length;
  const tagsCount = params.tags.split(',').filter(t => t.trim()).length;

  const handleQuickTagAdd = useCallback((tag: string) => {
    const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (!existingTags.includes(tag)) {
      const newTags = [...existingTags, tag].join(', ');
      onParamChange('tags', newTags);
      logger.info('Quick tag added', 'CompactCustomForm', { tag });
    }
  }, [params.tags, onParamChange]);

  return (
    <div className="flex flex-col h-full">
      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2 pb-20">
        {/* Quick Actions Row */}
        <div className="grid grid-cols-2 gap-2 p-2 border border-accent/40 rounded-lg bg-accent/5">
          {/* Audio Upload Button */}
          <Button
            variant={params.referenceFileName ? "default" : "outline"}
            size="sm"
            onClick={() => audioInputRef.current?.click()}
            disabled={isGenerating}
            className={cn(
              "h-9 gap-2 text-xs font-medium",
              params.referenceFileName && "bg-accent/20 border-accent"
            )}
          >
            <Upload className="h-4 w-4" />
            {params.referenceFileName ? 'Audio ✓' : '+ Audio'}
          </Button>
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={onAudioUpload}
            className="hidden"
          />

          {/* Persona Button */}
          {params.provider === 'suno' && (
            <Button
              variant={params.personaId ? "default" : "outline"}
              size="sm"
              onClick={onPersonaClick}
              disabled={isGenerating}
              className={cn(
                "h-9 gap-2 text-xs font-medium",
                params.personaId && "bg-accent/20 border-accent"
              )}
            >
              <User className="h-4 w-4" />
              {params.personaId ? 'Persona ✓' : '+ Persona'}
            </Button>
          )}
        </div>

        {/* Lyrics Section */}
        <Collapsible defaultOpen={!!debouncedLyrics}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent/5 rounded-md transition-colors group">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              <span>Lyrics</span>
              {lyricsLineCount > 0 && (
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                  {lyricsLineCount} lines
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLyricsDialog();
              }}
              className="h-6 px-2 text-[10px] gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Sparkles className="h-3 w-3" />
              Generate
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <LyricsInput
              value={debouncedLyrics}
              onChange={onDebouncedLyricsChange}
              onGenerateLyrics={onOpenLyricsDialog}
              isGenerating={isGenerating}
            />
          </CollapsibleContent>
        </Collapsible>

        {/* Styles Section */}
        <Collapsible defaultOpen={tagsCount > 0}>
          <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-accent/5 rounded-md transition-colors group">
            <div className="flex items-center gap-2 text-sm font-medium">
              <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
              <span>Styles</span>
              {tagsCount > 0 && (
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                  {tagsCount}
                </Badge>
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2">
            <StyleTagsInput
              tags={params.tags}
              negativeTags={params.negativeTags}
              onTagsChange={(tags) => onParamChange('tags', tags)}
              onNegativeTagsChange={(tags) => onParamChange('negativeTags', tags)}
              isGenerating={isGenerating}
            />
            
            {/* Quick Style Pills */}
            <div className="flex flex-wrap gap-1.5">
              {['creepy', 'ambient', 'acid techno', 'synthwave', 'lofi'].map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickTagAdd(tag)}
                  className="h-6 px-2 text-[10px] gap-1"
                  disabled={isGenerating}
                >
                  <Plus className="h-3 w-3" />
                  {tag}
                </Button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Advanced Options */}
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 hover:bg-accent/5 rounded-md transition-colors group">
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
            <span className="text-sm font-medium">Advanced Options</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-3">
            {/* Song Title */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Music className="h-3 w-3" />
                Song Title (Optional)
              </label>
              <Input
                type="text"
                placeholder="Auto-generated if empty"
                value={params.title}
                onChange={(e) => onParamChange('title', e.target.value)}
                className="h-8 text-sm"
                disabled={isGenerating}
                maxLength={80}
              />
            </div>

            {/* Advanced Controls */}
            <AdvancedControls
              provider={params.provider as MusicProvider}
              vocalGender={params.vocalGender}
              audioWeight={params.audioWeight}
              styleWeight={params.styleWeight}
              lyricsWeight={params.lyricsWeight}
              weirdness={params.weirdnessConstraint}
              hasReferenceAudio={!!params.referenceFileName}
              hasLyrics={!!debouncedLyrics.trim()}
              onVocalGenderChange={(value) => onParamChange('vocalGender', value)}
              onAudioWeightChange={(value) => onParamChange('audioWeight', value)}
              onStyleWeightChange={(value) => onParamChange('styleWeight', value)}
              onLyricsWeightChange={(value) => onParamChange('lyricsWeight', value)}
              onWeirdnessChange={(value) => onParamChange('weirdnessConstraint', value)}
              isGenerating={isGenerating}
            />
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Sticky Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {/* Save to selector (future) */}
          <div className="flex-1 text-xs text-muted-foreground">
            Save to: <span className="font-medium">My Workspace</span>
          </div>
          
          {/* Create Button */}
          <Button
            onClick={onGenerate}
            disabled={isGenerating || (!params.prompt.trim() && !debouncedLyrics.trim())}
            size="lg"
            className="h-10 px-8 gap-2 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            <Music className="h-4 w-4" />
            {isGenerating ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
});

CompactCustomForm.displayName = 'CompactCustomForm';
