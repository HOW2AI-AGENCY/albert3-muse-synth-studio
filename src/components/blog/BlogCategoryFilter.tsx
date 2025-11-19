/**
 * Blog Category Filter Component
 */
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface BlogCategory {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  color?: string;
}

interface BlogCategoryFilterProps {
  categories: BlogCategory[];
  selected: string;
  onSelect: (categorySlug: string) => void;
}

export function BlogCategoryFilter({ categories, selected, onSelect }: BlogCategoryFilterProps) {
  const getIcon = (iconName?: string) => {
    if (!iconName) return null;
    const Icon = (Icons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selected === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onSelect('all')}
        className="rounded-full"
      >
        Все
      </Button>
      
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selected === category.slug ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSelect(category.slug)}
          className={cn(
            "rounded-full gap-2",
            selected === category.slug && category.color && {
              backgroundColor: category.color,
              borderColor: category.color,
            }
          )}
        >
          {getIcon(category.icon)}
          {category.name}
        </Button>
      ))}
    </div>
  );
}
