import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from '@/utils/iconImports';
import { Section } from '@/components/ui/section';
import { LyricsInput } from '@/components/lyrics/legacy/LyricsInput';
import { InfoTooltip } from '@/components/ui/info-tooltip';
import { AIFieldImprovement } from '@/components/generator/ui/AIFieldImprovement';
import { cn } from '@/lib/utils';

interface FormLyricsProps {
    debouncedLyrics: string;
    onDebouncedLyricsChange: (value: string) => void;
    onOpenLyricsDialog: () => void;
    isGenerating: boolean;
    lyricsLineCount: number;
    isMobile: boolean;
    projectContext?: string;
}

export const FormLyrics = ({
    debouncedLyrics,
    onDebouncedLyricsChange,
    onOpenLyricsDialog,
    isGenerating,
    lyricsLineCount,
    isMobile,
    projectContext
}: FormLyricsProps) => {
    return (
        <Section
            defaultOpen={true}
            title={
                <>
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
                </>
            }
            badge={lyricsLineCount > 0 ? (
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                    {lyricsLineCount} lines
                </Badge>
            ) : undefined}
            action={
                <div className="flex items-center gap-1">
                    <AIFieldImprovement
                        field="lyrics"
                        value={debouncedLyrics}
                        context={projectContext}
                        onResult={onDebouncedLyricsChange}
                        disabled={isGenerating}
                        size="sm"
                        variant="ghost"
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onOpenLyricsDialog();
                        }}
                        className={cn(
                            "h-9 px-2 text-[10px] gap-1 transition-opacity touch-target-min",
                            isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                        aria-label="Сгенерировать текст"
                    >
                        <Sparkles className="h-3 w-3" aria-hidden="true" />
                        Generate
                    </Button>
                </div>
            }
        >
            <LyricsInput
                value={debouncedLyrics}
                onChange={onDebouncedLyricsChange}
                onGenerateLyrics={onOpenLyricsDialog}
                isGenerating={isGenerating}
            />
        </Section>
    );
};
