import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Calendar, Sparkles, CheckCircle2, X } from 'lucide-react';
import type { PromptFilters } from '@/hooks/usePromptHistory';

interface PromptHistoryFiltersProps {
  filters: PromptFilters;
  onFiltersChange: (filters: PromptFilters) => void;
  onSearch: (query: string) => void;
}

export const PromptHistoryFilters = ({ filters, onFiltersChange, onSearch }: PromptHistoryFiltersProps) => {
  const hasActiveFilters = 
    filters.dateRange !== 'all' || 
    filters.provider !== 'all' || 
    filters.status !== 'all';

  return (
    <div className="space-y-3 mb-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по тексту промпта..."
          className="pl-10"
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {/* Date Range */}
        <Select 
          value={filters.dateRange} 
          onValueChange={(v) => onFiltersChange({ ...filters, dateRange: v as PromptFilters['dateRange'] })}
        >
          <SelectTrigger className="w-[150px]">
            <Calendar className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Период" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Всё время</SelectItem>
            <SelectItem value="today">Сегодня</SelectItem>
            <SelectItem value="yesterday">Вчера</SelectItem>
            <SelectItem value="last7days">7 дней</SelectItem>
            <SelectItem value="last30days">30 дней</SelectItem>
          </SelectContent>
        </Select>

        {/* Provider Filter */}
        <Select 
          value={filters.provider} 
          onValueChange={(v) => onFiltersChange({ ...filters, provider: v as PromptFilters['provider'] })}
        >
          <SelectTrigger className="w-[130px]">
            <Sparkles className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Провайдер" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="suno">Suno</SelectItem>
            <SelectItem value="mureka">Mureka</SelectItem>
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select 
          value={filters.status} 
          onValueChange={(v) => onFiltersChange({ ...filters, status: v as PromptFilters['status'] })}
        >
          <SelectTrigger className="w-[130px]">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="success">Успешные</SelectItem>
            <SelectItem value="failed">Ошибки</SelectItem>
            <SelectItem value="pending">В процессе</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onFiltersChange({ dateRange: 'all', provider: 'all', status: 'all' })}
          >
            <X className="w-4 h-4 mr-2" />
            Сбросить
          </Button>
        )}
      </div>
    </div>
  );
};
