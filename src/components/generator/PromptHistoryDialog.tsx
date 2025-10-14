import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { History, Star, Trash2, Clock, Sparkles } from '@/utils/iconImports';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PromptHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (params: {
    prompt: string;
    lyrics?: string;
    style_tags?: string[];
    genre?: string;
    mood?: string;
  }) => void;
}

export function PromptHistoryDialog({
  open,
  onOpenChange,
  onSelect,
}: PromptHistoryDialogProps) {
  const { history, templates, isLoading, deletePrompt, saveAsTemplate } = usePromptHistory();
  const [templateName, setTemplateName] = useState('');
  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);

  const handleSelect = (item: any) => {
    onSelect({
      prompt: item.prompt,
      lyrics: item.lyrics,
      style_tags: item.style_tags,
      genre: item.genre,
      mood: item.mood,
    });
    onOpenChange(false);
  };

  const handleSaveAsTemplate = async (id: string) => {
    if (!templateName.trim()) return;
    await saveAsTemplate({ id, template_name: templateName });
    setTemplateName('');
    setSavingTemplateId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-3 sm:p-6">
        <DialogHeader className="pb-2 sm:pb-4">
          <DialogTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
            <History className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">История и шаблоны</span>
            <span className="sm:hidden">История</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-8 sm:h-10">
            <TabsTrigger value="history" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">История</span>
              <span className="xs:hidden">({history.length})</span>
              <span className="hidden xs:inline">({history.length})</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Шаблоны</span>
              <span className="xs:hidden">({templates.length})</span>
              <span className="hidden xs:inline">({templates.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-2 sm:mt-4">
            <ScrollArea className="h-[calc(85vh-180px)] sm:h-[400px] pr-2 sm:pr-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Sparkles className="w-6 h-6 animate-pulse text-primary" />
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>История пуста</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <Card
                      key={item.id}
                      className={cn(
                        'cursor-pointer hover:border-primary transition-all group',
                        item.is_template && 'border-amber-500/50'
                      )}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-2 mb-1">
                              {item.prompt}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {item.style_tags?.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {item.genre && (
                                <Badge variant="outline" className="text-xs">
                                  {item.genre}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!item.is_template && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSavingTemplateId(item.id);
                                }}
                              >
                                <Star className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePrompt(item.id);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent
                        className="pt-0 cursor-pointer"
                        onClick={() => handleSelect(item)}
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {formatDistanceToNow(new Date(item.last_used_at), {
                              addSuffix: true,
                              locale: ru,
                            })}
                          </span>
                          <span>Использован {item.usage_count}×</span>
                        </div>
                      </CardContent>

                      {savingTemplateId === item.id && (
                        <CardContent className="pt-0 pb-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Название шаблона"
                              value={templateName}
                              onChange={(e) => setTemplateName(e.target.value)}
                              className="h-8"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveAsTemplate(item.id);
                                }
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveAsTemplate(item.id)}
                              disabled={!templateName.trim()}
                            >
                              Сохранить
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSavingTemplateId(null);
                                setTemplateName('');
                              }}
                            >
                              Отмена
                            </Button>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="templates" className="mt-2 sm:mt-4">
            <ScrollArea className="h-[calc(85vh-180px)] sm:h-[400px] pr-2 sm:pr-4">
              {templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет сохраненных шаблонов</p>
                  <p className="text-xs mt-2">
                    Отметьте промпт звездочкой в истории
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templates.map((item) => (
                    <Card
                      key={item.id}
                      className="cursor-pointer hover:border-primary transition-all group border-amber-500/50"
                      onClick={() => handleSelect(item)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                              <p className="text-sm font-semibold">
                                {item.template_name}
                              </p>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {item.prompt}
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {item.style_tags?.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePrompt(item.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
