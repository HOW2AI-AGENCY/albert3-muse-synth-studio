import { CalendarClock, Star } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface TrackVersionSelectorOption {
  id: string;
  version_number: number;
  created_at?: string | null;
  is_master?: boolean;
}

interface TrackVersionSelectorProps {
  versions: TrackVersionSelectorOption[];
  selectedVersionId?: string;
  onSelect?: (versionId: string) => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return "Дата неизвестна";
  try {
    return new Date(value).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    console.error("Failed to format version date", error);
    return "Дата неизвестна";
  }
};

export const TrackVersionSelector = ({ versions, selectedVersionId, onSelect }: TrackVersionSelectorProps) => {
  if (!versions?.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <span>Выбрать версию</span>
        {versions.some((version) => version.is_master) && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Star className="h-3 w-3" />
            Главная
          </Badge>
        )}
      </div>
      <Select value={selectedVersionId ?? undefined} onValueChange={(value) => onSelect?.(value)}>
        <SelectTrigger className="h-11 justify-between text-left">
          <SelectValue placeholder="Выберите версию трека" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {versions.map((version) => (
            <SelectItem key={version.id} value={version.id} className="flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <span className="font-medium">Версия {version.version_number}</span>
                <span className="text-xs text-muted-foreground">{formatDate(version.created_at)}</span>
              </div>
              {version.is_master && (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <Star className="h-3 w-3" />
                  Главная
                </Badge>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
