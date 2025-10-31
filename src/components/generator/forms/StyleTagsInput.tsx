import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TagsCarousel } from '@/components/generator/TagsCarousel';

interface StyleTagsInputProps {
  tags: string;
  negativeTags: string;
  onTagsChange: (tags: string) => void;
  onNegativeTagsChange: (tags: string) => void;
  isGenerating: boolean;
}

export const StyleTagsInput = memo(({
  tags,
  negativeTags,
  onTagsChange,
  onNegativeTagsChange,
  isGenerating,
}: StyleTagsInputProps) => {
  return (
    <div className="space-y-3">
      {/* Inspiration Tags Carousel */}
      <TagsCarousel 
        onTagClick={(tag: string) => {
          const currentTags = tags.split(',').map(t => t.trim()).filter(Boolean);
          if (!currentTags.includes(tag)) {
            onTagsChange([...currentTags, tag].join(', '));
          }
        }} 
        disabled={isGenerating}
      />

      {/* Positive Tags */}
      <div className="space-y-1">
        <Label htmlFor="tags" className="text-xs font-medium">
          Теги стиля (через запятую) {tags.length > 0 && `(${tags.length}/200)`}
        </Label>
        <Input
          id="tags"
          type="text"
          placeholder="rock, energetic, guitar"
          value={tags}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue.length <= 200) {
              onTagsChange(newValue);
            }
          }}
          className="h-8 text-sm"
          disabled={isGenerating}
          maxLength={200}
        />
      </div>

      {/* Negative Tags */}
      <div className="space-y-1">
        <Label htmlFor="negative-tags" className="text-xs font-medium">
          Исключить стили (опционально) {negativeTags.length > 0 && `(${negativeTags.length}/200)`}
        </Label>
        <Input
          id="negative-tags"
          type="text"
          placeholder="slow, acoustic"
          value={negativeTags}
          onChange={(e) => {
            const newValue = e.target.value;
            if (newValue.length <= 200) {
              onNegativeTagsChange(newValue);
            }
          }}
          className="h-8 text-sm"
          disabled={isGenerating}
          maxLength={200}
        />
      </div>
    </div>
  );
});

StyleTagsInput.displayName = 'StyleTagsInput';
