import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { usePromptHistory, type PromptFilters } from '@/hooks/usePromptHistory';
import { PromptHistoryFilters } from './PromptHistoryFilters';
import { GroupedPromptHistory } from './GroupedPromptHistory';
import { useDebounce } from 'use-debounce';

interface PromptHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: any) => void;
}

export const PromptHistoryDialog = ({ open, onOpenChange, onSelect }: PromptHistoryDialogProps) => {
  const [filters, setFilters] = useState<PromptFilters>({
    dateRange: 'all',
    provider: 'all',
    status: 'all',
    searchQuery: '',
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch] = useDebounce(searchQuery, 300);

  const filtersWithSearch = useMemo(() => ({
    ...filters,
    searchQuery: debouncedSearch,
  }), [filters, debouncedSearch]);

  const { history, isLoading, deletePrompt, exportHistory } = usePromptHistory(filtersWithSearch);

  const [savingTemplateId, setSavingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');

  const handleSelect = (item: any) => {
    onSelect(item);
    onOpenChange(false);
  };

  const handleDelete = (id: string) => {
    deletePrompt.mutate(id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>История промптов</DialogTitle>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Экспорт
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => exportHistory('json')}>
                  <FileJson className="w-4 h-4 mr-2" />
                  JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportHistory('csv')}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </DialogHeader>

        <PromptHistoryFilters
          filters={filters}
          onFiltersChange={setFilters}
          onSearch={setSearchQuery}
        />

        <div className="flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Загрузка...</div>
          ) : (
            <GroupedPromptHistory
              items={history}
              onSelect={handleSelect}
              onDelete={handleDelete}
              savingTemplateId={savingTemplateId}
              onStartSaveTemplate={setSavingTemplateId}
              onCancelSaveTemplate={() => setSavingTemplateId(null)}
              templateName={templateName}
              onTemplateNameChange={setTemplateName}
              onSaveAsTemplate={() => {}}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
