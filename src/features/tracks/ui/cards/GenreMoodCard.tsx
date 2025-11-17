/**
 * Genre & Mood Card
 * Display genre, mood, and style tags
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Music2, Sparkles } from 'lucide-react';

interface GenreMoodCardProps {
  genre?: string | null;
  mood?: string | null;
  tags: string[];
}

export const GenreMoodCard = ({ genre, mood, tags }: GenreMoodCardProps) => {
  return (
    <Card className="bg-muted/30 border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Music2 className="h-4 w-4 text-primary" />
          Стиль и настроение
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {(genre || mood) && (
          <div className="flex flex-wrap gap-2">
            {genre && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {genre}
              </Badge>
            )}
            {mood && (
              <Badge variant="secondary" className="bg-secondary/10 text-secondary-foreground border-secondary/20">
                {mood}
              </Badge>
            )}
          </div>
        )}

        {tags.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Теги
            </p>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
