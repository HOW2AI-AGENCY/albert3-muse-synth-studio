import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sparkles, User, Loader2 } from 'lucide-react';
import { useSunoPersonas } from '@/hooks/useSunoPersonas';
import { cn } from '@/lib/utils';

interface PersonaSelectorProps {
  value: string | null;
  onChange: (personaId: string | null) => void;
  className?: string;
  disabled?: boolean;
}

export const PersonaSelector = memo<PersonaSelectorProps>(({ 
  value, 
  onChange, 
  className,
  disabled = false 
}) => {
  const { personas, isLoading } = useSunoPersonas();

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue === 'none' ? null : newValue);
  }, [onChange]);

  const selectedPersona = personas.find(p => p.id === value);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Музыкальная персона
        </Label>
        {isLoading && (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        )}
      </div>

      <Select 
        value={value || 'none'} 
        onValueChange={handleChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={cn(
          "w-full",
          value && "border-primary/50"
        )}>
          <SelectValue placeholder="Выберите персону или оставьте по умолчанию">
            {selectedPersona ? (
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="truncate">{selectedPersona.name}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">Без персоны</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <div className="flex items-center gap-2">
              <span>Без персоны (стандартная генерация)</span>
            </div>
          </SelectItem>

          {personas.length > 0 && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                Ваши персоны
              </div>
              {personas.map((persona) => (
                <SelectItem key={persona.id} value={persona.id}>
                  <div className="flex items-center gap-3 py-1">
                    {persona.cover_image_url ? (
                      <img 
                        src={persona.cover_image_url} 
                        alt={persona.name}
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{persona.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {persona.description.substring(0, 50)}
                        {persona.description.length > 50 && '...'}
                      </p>
                    </div>
                    {persona.usage_count > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {persona.usage_count} раз
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </>
          )}

          {personas.length === 0 && !isLoading && (
            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
              У вас пока нет созданных персон
            </div>
          )}
        </SelectContent>
      </Select>

      {selectedPersona && (
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex items-start gap-3">
            {selectedPersona.cover_image_url && (
              <img 
                src={selectedPersona.cover_image_url} 
                alt={selectedPersona.name}
                className="h-12 w-12 rounded object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium">{selectedPersona.name}</p>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {selectedPersona.description}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onChange(null)}
          >
            Убрать персону
          </Button>
        </div>
      )}

      {!selectedPersona && personas.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground">
          💡 Создайте персону из готового трека, чтобы генерировать музыку в похожем стиле
        </p>
      )}
    </div>
  );
});

PersonaSelector.displayName = 'PersonaSelector';
