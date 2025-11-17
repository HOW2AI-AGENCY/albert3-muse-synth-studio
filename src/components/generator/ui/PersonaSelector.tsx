import { memo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { UserPlus, User } from 'lucide-react';
import { usePersonas } from '@/hooks/usePersonas';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PersonaSelectorProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  onCreateNew?: () => void;
  disabled?: boolean;
  className?: string;
}

export const PersonaSelector = memo(({
  value,
  onValueChange,
  onCreateNew,
  disabled = false,
  className,
}: PersonaSelectorProps) => {
  const { data: personas, isLoading } = usePersonas();

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  return (
    <div className={cn('flex gap-2', className)}>
      <Select
        value={value || undefined}
        onValueChange={(val) => onValueChange(val === 'none' ? null : val)}
        disabled={disabled}
      >
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="Выберите персону">
            {value && personas?.find(p => p.suno_persona_id === value) ? (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{personas.find(p => p.suno_persona_id === value)?.name}</span>
              </div>
            ) : (
              'Без персоны'
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-muted-foreground">Без персоны</span>
          </SelectItem>
          {personas?.map((persona) => (
            <SelectItem key={persona.id} value={persona.suno_persona_id}>
              <div className="flex flex-col gap-1">
                <span className="font-medium">{persona.name}</span>
                {persona.description && (
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {persona.description}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {onCreateNew && (
        <Button
          variant="outline"
          size="icon"
          onClick={onCreateNew}
          disabled={disabled}
          title="Создать новую персону"
        >
          <UserPlus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
});

PersonaSelector.displayName = 'PersonaSelector';
