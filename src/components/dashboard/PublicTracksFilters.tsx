import { memo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, X } from "@/utils/iconImports";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { BREAKPOINTS } from "@/config/breakpoints.config";
import type { SortOption } from "@/hooks/usePublicTracks";
import { cn } from "@/lib/utils";

interface PublicTracksFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  genreFilter: string;
  onGenreChange: (value: string) => void;
  sortBy: SortOption;
  onSortChange: (value: SortOption) => void;
  availableGenres: string[];
  className?: string;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "newest", label: "Новые" },
  { value: "popular", label: "Популярные" },
  { value: "trending", label: "В тренде" },
  { value: "most_liked", label: "Понравившиеся" },
];

export const PublicTracksFilters = memo(({
  searchQuery,
  onSearchChange,
  genreFilter,
  onGenreChange,
  sortBy,
  onSortChange,
  availableGenres,
  className,
}: PublicTracksFiltersProps) => {
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.md - 1}px)`);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const activeFiltersCount = [searchQuery, genreFilter].filter(Boolean).length;

  const handleClearFilters = () => {
    onSearchChange("");
    onGenreChange("");
    onSortChange("newest");
  };

  // Mobile: Compact filters in bottom sheet
  if (isMobile) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {/* Search input - always visible */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск треков..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9 h-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={() => onSearchChange("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters sheet trigger */}
        <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative h-10 w-10 flex-shrink-0"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh]">
            <SheetHeader>
              <SheetTitle>Фильтры и сортировка</SheetTitle>
              <SheetDescription>
                Настройте отображение публичных треков
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6 pb-6">
              {/* Sort */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Сортировка</label>
                <Select value={sortBy} onValueChange={onSortChange}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Genre filter */}
              {availableGenres.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Жанр</label>
                  <Select value={genreFilter} onValueChange={onGenreChange}>
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Все жанры" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Все жанры</SelectItem>
                      {availableGenres.map((genre) => (
                        <SelectItem key={genre} value={genre}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Clear filters */}
              {activeFiltersCount > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    handleClearFilters();
                    setIsFilterSheetOpen(false);
                  }}
                  className="w-full"
                >
                  Сбросить фильтры
                </Button>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Desktop: Horizontal filters
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Search */}
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск треков и авторов..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => onSearchChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Sort */}
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Genre filter */}
      {availableGenres.length > 0 && (
        <Select value={genreFilter} onValueChange={onGenreChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Все жанры" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Все жанры</SelectItem>
            {availableGenres.map((genre) => (
              <SelectItem key={genre} value={genre}>
                {genre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear filters */}
      {activeFiltersCount > 0 && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="mr-1 h-4 w-4" />
          Сбросить
        </Button>
      )}
    </div>
  );
});

PublicTracksFilters.displayName = "PublicTracksFilters";
