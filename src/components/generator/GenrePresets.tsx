import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

import {
  Music, 
  Disc3, 
  Radio, 
  Zap, 
  Headphones,
  Piano,
  Guitar,
  Drum,
  Mic2
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';
import { AnalyticsService } from '@/services/analytics.service';

interface GenrePreset {
  id: string;
  name: string;
  icon: any;
  description: string;
  styleTags: string[];
  mood?: string;
  promptSuggestion: string;
  color: string;
}

const GENRE_PRESETS: GenrePreset[] = [
  {
    id: 'rock',
    name: 'Rock',
    icon: Guitar,
    description: 'Энергичный рок с мощными гитарами',
    styleTags: ['rock', 'electric guitar', 'drums', 'energetic'],
    mood: 'energetic',
    promptSuggestion: 'Powerful rock anthem with driving guitars and strong drums',
    color: 'from-red-500/20 to-orange-500/20'
  },
  {
    id: 'pop',
    name: 'Pop',
    icon: Mic2,
    description: 'Современный поп с запоминающимся мотивом',
    styleTags: ['pop', 'catchy', 'upbeat', 'vocals'],
    mood: 'happy',
    promptSuggestion: 'Catchy pop song with memorable melody and modern production',
    color: 'from-pink-500/20 to-purple-500/20'
  },
  {
    id: 'electronic',
    name: 'Electronic',
    icon: Zap,
    description: 'Электронная музыка с синтезаторами',
    styleTags: ['electronic', 'synth', 'beats', 'edm'],
    mood: 'energetic',
    promptSuggestion: 'Electronic dance track with pulsing synths and driving beat',
    color: 'from-cyan-500/20 to-blue-500/20'
  },
  {
    id: 'hiphop',
    name: 'Hip-Hop',
    icon: Headphones,
    description: 'Hip-hop с ритмичным битом',
    styleTags: ['hip-hop', 'rap', 'beats', 'bass'],
    mood: 'confident',
    promptSuggestion: 'Hip-hop track with hard-hitting beats and deep bass',
    color: 'from-amber-500/20 to-yellow-500/20'
  },
  {
    id: 'jazz',
    name: 'Jazz',
    icon: Piano,
    description: 'Джаз с импровизацией и свингом',
    styleTags: ['jazz', 'piano', 'saxophone', 'swing'],
    mood: 'calm',
    promptSuggestion: 'Smooth jazz with improvisation and swing feel',
    color: 'from-indigo-500/20 to-violet-500/20'
  },
  {
    id: 'classical',
    name: 'Classical',
    icon: Music,
    description: 'Классическая оркестровая музыка',
    styleTags: ['classical', 'orchestral', 'strings', 'elegant'],
    mood: 'calm',
    promptSuggestion: 'Elegant classical composition with orchestral arrangement',
    color: 'from-emerald-500/20 to-teal-500/20'
  },
  {
    id: 'ambient',
    name: 'Ambient',
    icon: Radio,
    description: 'Атмосферная эмбиент-музыка',
    styleTags: ['ambient', 'atmospheric', 'pads', 'ethereal'],
    mood: 'calm',
    promptSuggestion: 'Atmospheric ambient soundscape with ethereal textures',
    color: 'from-slate-500/20 to-gray-500/20'
  },
  {
    id: 'lofi',
    name: 'Lo-Fi',
    icon: Disc3,
    description: 'Спокойный lo-fi для релакса',
    styleTags: ['lofi', 'chill', 'hip-hop', 'relaxed'],
    mood: 'calm',
    promptSuggestion: 'Chill lo-fi hip-hop beat for relaxation and focus',
    color: 'from-rose-500/20 to-pink-500/20'
  },
  {
    id: 'metal',
    name: 'Metal',
    icon: Drum,
    description: 'Тяжелый метал с агрессивным звуком',
    styleTags: ['metal', 'heavy', 'distorted guitar', 'aggressive'],
    mood: 'intense',
    promptSuggestion: 'Heavy metal track with aggressive guitars and powerful drums',
    color: 'from-zinc-500/20 to-stone-500/20'
  }
];

interface GenrePresetsProps {
  onSelect: (preset: {
    styleTags: string[];
    mood?: string;
    promptSuggestion: string;
  }) => void;
}

export function GenrePresets({ onSelect }: GenrePresetsProps) {
  const handlePresetClick = (preset: GenrePreset) => {
    onSelect({
      styleTags: preset.styleTags,
      mood: preset.mood,
      promptSuggestion: preset.promptSuggestion
    });
    
    // Track genre selection
    AnalyticsService.recordEvent({
      eventType: 'genre_selected',
      metadata: { genre: preset.name, id: preset.id }
    });
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Music className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Жанровые пресеты</h3>
      </div>
      
      <Carousel
        opts={{
          align: "start",
          loop: false,
          slidesToScroll: 1,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-0">
          {GENRE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <CarouselItem key={preset.id} className="pl-0 basis-full">
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99] hover:shadow-md border-muted/50 h-full",
                    "bg-gradient-to-br min-h-[120px] sm:min-h-[130px]",
                    preset.color
                  )}
                  onClick={() => handlePresetClick(preset)}
                >
                  <CardContent className="p-3.5 sm:p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-lg bg-background/50 shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm sm:text-base font-semibold mb-1.5 truncate leading-tight">{preset.name}</h4>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                          {preset.description}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {preset.styleTags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[11px] sm:text-xs px-2 py-0.5 h-6">
                              {tag}
                            </Badge>
                          ))}
                          {preset.styleTags.length > 2 && (
                            <Badge variant="outline" className="text-[11px] sm:text-xs px-2 py-0.5 h-6">
                              +{preset.styleTags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="absolute -left-3 sm:-left-4 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 shadow-lg border-border/50 bg-background/95 hover:bg-accent disabled:opacity-40 z-10" />
        <CarouselNext className="absolute -right-3 sm:-right-4 top-1/2 -translate-y-1/2 h-8 w-8 sm:h-9 sm:w-9 shadow-lg border-border/50 bg-background/95 hover:bg-accent disabled:opacity-40 z-10" />
      </Carousel>
    </div>
  );
}
