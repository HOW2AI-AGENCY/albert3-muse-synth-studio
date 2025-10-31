import React from 'react';
import { Tag } from '@/types/lyrics';
import { TagBadge } from '../TagBadge';
import { Card } from '@/components/ui/card';

interface GlobalTagsBarProps {
  tags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  readOnly: boolean;
}

export const GlobalTagsBar: React.FC<GlobalTagsBarProps> = ({
  tags,
  onTagsChange,
  readOnly
}) => {
  const handleRemoveTag = (tagId: string) => {
    if (!readOnly) {
      onTagsChange(tags.filter(t => t.id !== tagId));
    }
  };

  if (tags.length === 0) return null;

  return (
    <Card className="p-3 bg-primary/5 border-primary/20">
      <div className="flex flex-wrap gap-2">
        <span className="text-xs font-medium text-muted-foreground mr-2">
          Global Tags:
        </span>
        {tags.map((tag) => (
          <TagBadge
            key={tag.id}
            tag={tag}
            onRemove={readOnly ? undefined : () => handleRemoveTag(tag.id)}
            className="shadow-sm"
          />
        ))}
      </div>
    </Card>
  );
};
