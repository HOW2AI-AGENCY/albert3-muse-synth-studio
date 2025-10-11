import { parseLyrics } from "@/utils/lyricsParser";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StructuredLyricsProps {
  lyrics: string;
}

export const StructuredLyrics = ({ lyrics }: StructuredLyricsProps) => {
  if (!lyrics || lyrics.trim().length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Текст песни отсутствует</p>
        </CardContent>
      </Card>
    );
  }

  const sections = parseLyrics(lyrics);

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <Card key={idx} className="bg-muted/30 border-border/50">
          <CardContent className="p-4 space-y-2">
            {/* Section Title */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold">
                {section.title}
              </Badge>
              {section.tags && section.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {section.tags.slice(0, 3).map((tag, tagIdx) => (
                    <Badge
                      key={tagIdx}
                      variant="secondary"
                      className="text-[10px] h-5"
                      style={{
                        backgroundColor: `hsl(var(--${tag.color || 'muted'}))`,
                        color: "hsl(var(--${tag.color || 'muted'}-foreground))",
                      }}
                    >
                      {tag.icon && <span className="mr-1">{tag.icon}</span>}
                      {tag.value}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Lyrics Lines */}
            <div className="space-y-1 text-sm leading-relaxed">
              {section.lines.map((line, lineIdx) => (
                <p
                  key={lineIdx}
                  className={typeof line === 'string' && line.trim().length === 0 ? "h-3" : "text-foreground/90"}
                >
                  {typeof line === 'string' ? line : (line || "\u00A0")}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
