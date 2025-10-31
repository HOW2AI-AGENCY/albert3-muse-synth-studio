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
    <div className="space-y-2 sm:space-y-3">
      <div className="flex items-center gap-1.5 sm:gap-2 px-1">
        <Music className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
        <h3 className="text-xs sm:text-sm font-medium">Жанровые пресеты</h3>
      </div>
      
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-3">
          {GENRE_PRESETS.map((preset) => {
            const Icon = preset.icon;
            return (
              <CarouselItem key={preset.id} className="pl-2 md:pl-3 basis-[85%] sm:basis-[60%] md:basis-1/2 lg:basis-1/3">
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] hover:shadow-md border-muted/50 h-full",
                    "bg-gradient-to-br",
                    preset.color
                  )}
                  onClick={() => handlePresetClick(preset)}
                >
                  <CardContent className="p-2.5 sm:p-3">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 sm:p-2 rounded-lg bg-background/50 shrink-0">
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-semibold mb-1">{preset.name}</h4>
                        <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 mb-1.5 sm:mb-2">
                          {preset.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {preset.styleTags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0 h-4 sm:h-auto">
                              {tag}
                            </Badge>
                          ))}
                          {preset.styleTags.length > 2 && (
                            <Badge variant="outline" className="text-[9px] sm:text-xs px-1 sm:px-1.5 py-0 h-4 sm:h-auto">
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
        <CarouselPrevious className="hidden sm:flex -left-4 lg:-left-12" />
        <CarouselNext className="hidden sm:flex -right-4 lg:-right-12" />
      </Carousel>
    </div>
  );
}
