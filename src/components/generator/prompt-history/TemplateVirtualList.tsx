import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TemplateItem } from './TemplateItem';

interface TemplateItemData {
  id: string;
  prompt: string;
  style_tags?: string[];
  template_name?: string;
}

interface TemplateVirtualListProps {
  items: TemplateItemData[];
  onSelect: (item: any) => void;
  onDelete: (id: string) => void;
}

export const TemplateVirtualList = ({
  items,
  onSelect,
  onDelete,
}: TemplateVirtualListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
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
              <TemplateItem
                item={item}
                onSelect={onSelect}
                onDelete={onDelete}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
