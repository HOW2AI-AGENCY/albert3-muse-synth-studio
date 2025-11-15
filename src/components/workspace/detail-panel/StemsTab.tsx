import { Music4 } from "@/utils/iconImports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackStemsPanel } from "@/features/tracks";
import { EmptyStateCard } from "@/components/layout/EmptyStateCard";
import type { Track, TrackStem } from "./types";

interface StemsTabProps {
    track: Track;
    selectedVersionId?: string;
    filteredStems: TrackStem[];
    loadVersionsAndStems: () => void;
}

export const StemsTab = ({
    track,
    selectedVersionId,
    filteredStems,
    loadVersionsAndStems
}: StemsTabProps) => {
    return (
        <>
            {track.status !== 'completed' ? <EmptyStateCard icon={Music4} title="Трек еще обрабатывается" description="Стемы станут доступны после завершения генерации" /> : <Card className="border-border/70">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Стемы</CardTitle>
                    <CardDescription>Создавайте и управляйте стемами выбранной версии.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TrackStemsPanel trackId={track.id} versionId={selectedVersionId} stems={filteredStems} onStemsGenerated={loadVersionsAndStems} />
                </CardContent>
            </Card>}
        </>
    );
};
