import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Sparkles } from '@/utils/iconImports';
import { LyricsInput } from '@/components/lyrics/legacy/LyricsInput';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { cn } from '@/lib/utils';

interface FormLyricsProps {
    debouncedLyrics: string;
    onDebouncedLyricsChange: (value: string) => void;
    onOpenLyricsDialog: () => void;
    isGenerating: boolean;
    lyricsLineCount: number;
    isMobile: boolean;
}

export const FormLyrics = ({
    debouncedLyrics,
    onDebouncedLyricsChange,
    onOpenLyricsDialog,
    isGenerating,
    lyricsLineCount,
    isMobile
}: FormLyricsProps) => {
    return (
        <Collapsible defaultOpen={true}>
            <CollapsibleTrigger className={cn(
                "flex items-center justify-between w-full hover:bg-accent/5 rounded-md transition-colors group",
                isMobile ? "p-3" : "p-2"
            )}>
                <div className="flex items-center gap-2 text-sm font-medium">
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    <span>Lyrics</span>
                    <InfoTooltip
                        content={
                            <div className="space-y-1">
                                <p className="font-semibold">Формат текста</p>
                                <p className="text-xs">Используйте структурные теги:</p>
                                <ul className="text-xs list-disc list-inside mt-1 space-y-0.5">
                                    <li>[Verse], [Verse 1], [Verse 2]</li>
                                    <li>[Chorus], [Pre-Chorus]</li>
                                    <li>[Bridge], [Outro], [Intro]</li>
                                </ul>
                                <p className="text-xs mt-2 text-muted-foreground">💡 Если оставить пустым, AI создаст текст автоматически</p>
                            </div>
                        }
                    />
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
                    className={cn(
                        "h-6 px-2 text-[10px] gap-1 transition-opacity",
                        isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}
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
    );
};
