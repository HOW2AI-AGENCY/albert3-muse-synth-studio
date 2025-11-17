import { useMemo } from 'react';
import { startOfDay, subDays } from 'date-fns';
import { Clock } from 'lucide-react';
import type { PromptHistoryItem } from '@/hooks/usePromptHistory';
import { PromptHistoryItem as PromptHistoryItemComponent } from './PromptHistoryItem';

interface GroupedPromptHistoryProps {
  items: PromptHistoryItem[];
  onSelect: (item: PromptHistoryItem) => void;
  onDelete: (id: string) => void;
  onCompare?: (item: PromptHistoryItem) => void;
  savingTemplateId: string | null;
  onStartSaveTemplate: (id: string) => void;
  onCancelSaveTemplate: () => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onSaveAsTemplate: (id: string) => void;
}

export const GroupedPromptHistory = ({ 
  items, 
  onSelect, 
  onDelete,
  onCompare,
  savingTemplateId,
  onStartSaveTemplate,
  onCancelSaveTemplate,
  templateName,
  onTemplateNameChange,
  onSaveAsTemplate,
}: GroupedPromptHistoryProps) => {
  const groupedItems = useMemo(() => {
    const groups: Record<string, PromptHistoryItem[]> = {
      today: [],
      yesterday: [],
      last7days: [],
      older: [],
    };

    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterdayStart = startOfDay(subDays(now, 1));
    const last7daysStart = subDays(now, 7);

    items.forEach((item) => {
      const itemDate = new Date(item.created_at);

      if (itemDate >= todayStart) {
        groups.today.push(item);
      } else if (itemDate >= yesterdayStart) {
        groups.yesterday.push(item);
      } else if (itemDate >= last7daysStart) {
        groups.last7days.push(item);
      } else {
        groups.older.push(item);
      }
    });

    return groups;
  }, [items]);

  return (
    <div className="space-y-6">
      {groupedItems.today.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Сегодня ({groupedItems.today.length})
          </h3>
          <div className="space-y-2">
            {groupedItems.today.map((item) => (
              <PromptHistoryItemComponent
                key={item.id}
                item={item}
                onSelect={onSelect}
                onDelete={onDelete}
                onCompare={onCompare}
                savingTemplateId={savingTemplateId}
                onStartSaveTemplate={onStartSaveTemplate}
                onCancelSaveTemplate={onCancelSaveTemplate}
                templateName={templateName}
                onTemplateNameChange={onTemplateNameChange}
                onSaveAsTemplate={onSaveAsTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {groupedItems.yesterday.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Вчера ({groupedItems.yesterday.length})</h3>
          <div className="space-y-2">
            {groupedItems.yesterday.map((item) => (
              <PromptHistoryItemComponent
                key={item.id}
                item={item}
                onSelect={onSelect}
                onDelete={onDelete}
                onCompare={onCompare}
                savingTemplateId={savingTemplateId}
                onStartSaveTemplate={onStartSaveTemplate}
                onCancelSaveTemplate={onCancelSaveTemplate}
                templateName={templateName}
                onTemplateNameChange={onTemplateNameChange}
                onSaveAsTemplate={onSaveAsTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {groupedItems.last7days.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Последние 7 дней ({groupedItems.last7days.length})</h3>
          <div className="space-y-2">
            {groupedItems.last7days.map((item) => (
              <PromptHistoryItemComponent
                key={item.id}
                item={item}
                onSelect={onSelect}
                onDelete={onDelete}
                onCompare={onCompare}
                savingTemplateId={savingTemplateId}
                onStartSaveTemplate={onStartSaveTemplate}
                onCancelSaveTemplate={onCancelSaveTemplate}
                templateName={templateName}
                onTemplateNameChange={onTemplateNameChange}
                onSaveAsTemplate={onSaveAsTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {groupedItems.older.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2">Ранее ({groupedItems.older.length})</h3>
          <div className="space-y-2">
            {groupedItems.older.map((item) => (
              <PromptHistoryItemComponent
                key={item.id}
                item={item}
                onSelect={onSelect}
                onDelete={onDelete}
                onCompare={onCompare}
                savingTemplateId={savingTemplateId}
                onStartSaveTemplate={onStartSaveTemplate}
                onCancelSaveTemplate={onCancelSaveTemplate}
                templateName={templateName}
                onTemplateNameChange={onTemplateNameChange}
                onSaveAsTemplate={onSaveAsTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          Нет записей в истории
        </div>
      )}
    </div>
  );
};
