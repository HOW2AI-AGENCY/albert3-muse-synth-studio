import { useSunoPersonas } from '@/hooks/useSunoPersonas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Globe, Lock, MoreVertical, Trash2, Music } from '@/utils/iconImports';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function Personas() {
  const { personas, isLoading, deletePersona, updatePersona, isDeleting } = useSunoPersonas();

  const handleTogglePublic = (personaId: string, currentState: boolean) => {
    updatePersona({
      personaId,
      updates: { is_public: !currentState },
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Мои Персоны Suno</h1>
          <p className="text-muted-foreground mt-2">
            Музыкальные персоны, созданные из ваших треков
          </p>
        </div>
        <Badge variant="secondary" className="text-lg">
          {personas.length} {personas.length === 1 ? 'персона' : 'персон'}
        </Badge>
      </div>

      {personas.length === 0 ? (
        <Card className="p-12 text-center">
          <Music className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">Нет созданных персон</h3>
          <p className="text-muted-foreground mb-4">
            Создайте персону из любого Suno трека через меню трека
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <Card 
              key={persona.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">
                      {persona.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      {persona.is_public ? (
                        <Badge variant="secondary" className="gap-1">
                          <Globe className="w-3 h-3" />
                          Публичная
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="w-3 h-3" />
                          Приватная
                        </Badge>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePublic(persona.id, persona.is_public);
                        }}
                      >
                        {persona.is_public ? (
                          <>
                            <Lock className="w-4 h-4 mr-2" />
                            Сделать приватной
                          </>
                        ) : (
                          <>
                            <Globe className="w-4 h-4 mr-2" />
                            Опубликовать
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deletePersona(persona.id);
                        }}
                        disabled={isDeleting}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent>
                {persona.cover_image_url && (
                  <div className="aspect-square rounded-lg overflow-hidden mb-3">
                    <img
                      src={persona.cover_image_url}
                      alt={persona.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                  {persona.description}
                </p>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Использована: {persona.usage_count} раз
                  </span>
                  <span>
                    {formatDistanceToNow(new Date(persona.created_at), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </span>
                </div>

                <div className="mt-2 text-xs text-muted-foreground">
                  ID: {persona.suno_persona_id}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
