import {
  ResponsiveDialog as Dialog,
  ResponsiveDialogContent as DialogContent,
  ResponsiveDialogHeader as DialogHeader,
  ResponsiveDialogTitle as DialogTitle,
} from '@/components/ui/responsive-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Star, Clock, Sparkles } from '@/utils/iconImports';
import {
  PromptHistoryVirtualList,
  TemplateVirtualList,
  usePromptHistoryState,
} from './prompt-history';

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

export const PromptHistoryDialog = ({
  open,
  onOpenChange,
  onSelect,
}: PromptHistoryDialogProps): JSX.Element => {
  const state = usePromptHistoryState();

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
              <span className="xs:hidden">({state.history.length})</span>
              <span className="hidden xs:inline">({state.history.length})</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-1 sm:gap-2 text-xs sm:text-sm">
              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Шаблоны</span>
              <span className="xs:hidden">({state.templates.length})</span>
              <span className="hidden xs:inline">({state.templates.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-2 sm:mt-4">
            <div className="h-[calc(85vh-180px)] sm:h-[400px]">
              {state.isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Sparkles className="w-6 h-6 animate-pulse text-primary" />
                </div>
              ) : state.history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>История пуста</p>
                </div>
              ) : (
                <PromptHistoryVirtualList
                  items={state.history}
                  onSelect={handleSelect}
                  onDelete={state.deletePrompt}
                  savingTemplateId={state.savingTemplateId}
                  onStartSaveTemplate={state.handleStartSaveTemplate}
                  onCancelSaveTemplate={state.handleCancelSaveTemplate}
                  templateName={state.templateName}
                  onTemplateNameChange={state.setTemplateName}
                  onSaveAsTemplate={state.handleSaveAsTemplate}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="templates" className="mt-2 sm:mt-4">
            <div className="h-[calc(85vh-180px)] sm:h-[400px]">
              {state.templates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Нет сохраненных шаблонов</p>
                  <p className="text-xs mt-2">
                    Отметьте промпт звездочкой в истории
                  </p>
                </div>
              ) : (
                <TemplateVirtualList
                  items={state.templates}
                  onSelect={handleSelect}
                  onDelete={state.deletePrompt}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
