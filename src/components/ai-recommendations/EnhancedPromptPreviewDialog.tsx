import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromptDiffView } from "./PromptDiffView";
import { LyricsDiffView } from "./LyricsDiffView";
import { TagSelector } from "./TagSelector";

export interface EnhancedPromptData {
  original: {
    prompt: string;
    lyrics: string;
    tags: string[];
  };
  enhanced: {
    prompt: string;
    lyrics: string;
    tags: string[];
  };
  reasoning?: string;
}

interface EnhancedPromptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: EnhancedPromptData | null;
  onApplyToCurrentTrack: (editedData: EnhancedPromptData) => void;
  onUseForNewGeneration: (editedData: EnhancedPromptData) => void;
  isApplying?: boolean;
}

export function EnhancedPromptPreviewDialog({
  open,
  onOpenChange,
  data,
  onApplyToCurrentTrack,
  onUseForNewGeneration,
  isApplying = false
}: EnhancedPromptPreviewDialogProps) {
  const [editedPrompt, setEditedPrompt] = useState("");
  const [editedLyrics, setEditedLyrics] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Reset edited state when dialog opens with new data
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && data) {
      setEditedPrompt(data.enhanced.prompt);
      setEditedLyrics(data.enhanced.lyrics);
      setSelectedTags([]);
    }
    onOpenChange(newOpen);
  };

  if (!data) return null;

  const hasPromptChanges = data.enhanced.prompt !== data.original.prompt;
  const hasLyricsChanges = data.enhanced.lyrics !== data.original.lyrics;
  const hasTagsChanges = data.enhanced.tags.length > 0;
  const newTagsCount = data.enhanced.tags.filter(
    tag => !data.original.tags.includes(tag)
  ).length;

  const getEditedData = (): EnhancedPromptData => ({
    original: data.original,
    enhanced: {
      prompt: editedPrompt,
      lyrics: editedLyrics,
      tags: selectedTags.length > 0 ? selectedTags : data.enhanced.tags,
    },
    reasoning: data.reasoning,
  });

  const handleApplyToTrack = () => {
    onApplyToCurrentTrack(getEditedData());
  };

  const handleUseForGeneration = () => {
    onUseForNewGeneration(getEditedData());
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle>AI улучшенный промпт готов!</DialogTitle>
          <DialogDescription>
            Просмотрите и отредактируйте данные перед применением. Вы сможете откатить изменения позже.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="prompt" className="flex-1 flex flex-col min-h-0 px-6">
          <TabsList className="grid w-full grid-cols-3 mt-4">
            <TabsTrigger value="prompt" className="gap-2">
              Промпт
              {hasPromptChanges && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  NEW
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="lyrics" className="gap-2">
              Лирика
              {hasLyricsChanges && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  NEW
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-2">
              Теги
              {hasTagsChanges && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  +{newTagsCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-styled py-4">
            <TabsContent value="prompt" className="mt-0">
              <PromptDiffView
                originalPrompt={data.original.prompt}
                enhancedPrompt={data.enhanced.prompt}
                editedPrompt={editedPrompt}
                onEdit={setEditedPrompt}
              />
            </TabsContent>
            
            <TabsContent value="lyrics" className="mt-0">
              <LyricsDiffView
                originalLyrics={data.original.lyrics}
                formattedLyrics={data.enhanced.lyrics}
                editedLyrics={editedLyrics}
                onEdit={setEditedLyrics}
              />
            </TabsContent>
            
            <TabsContent value="tags" className="mt-0">
              <TagSelector
                recommendedTags={data.enhanced.tags}
                currentTags={data.original.tags}
                onApply={setSelectedTags}
                disabled={isApplying}
              />
            </TabsContent>
          </div>
        </Tabs>
        
        <DialogFooter className="flex-col sm:flex-row gap-2 px-6 py-4 border-t bg-muted/30">
          {/* Left aligned info */}
          <div className="flex-1 text-xs text-muted-foreground">
            <p>💡 Совет: Вы можете редактировать любое поле перед применением</p>
          </div>
          
          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isApplying}
              className="w-full sm:w-auto"
            >
              Отмена
            </Button>
            
            <Button 
              variant="secondary"
              onClick={handleApplyToTrack}
              disabled={isApplying}
              className="w-full sm:w-auto"
            >
              {isApplying ? "Применение..." : "Применить к треку"}
            </Button>
            
            <Button 
              variant="default"
              onClick={handleUseForGeneration}
              disabled={isApplying}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Использовать для генерации
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
