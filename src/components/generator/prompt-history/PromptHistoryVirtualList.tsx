import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { PromptHistoryItem } from './PromptHistoryItem';

import type { PromptHistoryItem as PromptHistoryItemData } from '@/hooks/usePromptHistory';

interface PromptHistoryVirtualListProps {
  items: PromptHistoryItemData[];
  onSelect: (item: PromptHistoryItemData) => void;
  onDelete: (id: string) => void;
  savingTemplateId: string | null;
  onStartSaveTemplate: (id: string) => void;
  onCancelSaveTemplate: () => void;
  templateName: string;
  onTemplateNameChange: (name: string) => void;
  onSaveAsTemplate: (id: string) => void;
}

export const PromptHistoryVirtualList = ({
  items,
  onSelect,
  onDelete,
  savingTemplateId,
  onStartSaveTemplate,
  onCancelSaveTemplate,
  templateName,
  onTemplateNameChange,
  onSaveAsTemplate,
}: PromptHistoryVirtualListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="h-full overflow-auto pr-2 sm:pr-4">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
                paddingBottom: '12px',
              }}
            >
              <PromptHistoryItem
                item={item}
                onSelect={onSelect}
                onDelete={onDelete}
                onCompare={undefined}
                savingTemplateId={savingTemplateId}
                onStartSaveTemplate={onStartSaveTemplate}
                onCancelSaveTemplate={onCancelSaveTemplate}
                templateName={templateName}
                onTemplateNameChange={onTemplateNameChange}
                onSaveAsTemplate={onSaveAsTemplate}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
