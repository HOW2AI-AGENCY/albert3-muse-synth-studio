import { GitBranch } from "@/utils/iconImports";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackVersions, TrackVersionComparison } from "@/features/tracks";
import { TrackVersionSelector } from "@/features/tracks/ui/TrackVersionSelector";
import { EmptyStateCard } from "@/components/layout/EmptyStateCard";
import type { Track, TrackVersion } from "./types";

interface VersionsTabProps {
    track: Track;
    versions: TrackVersion[];
    selectedVersionId?: string;
    comparisonLeftId?: string;
    comparisonRightId?: string;
    handleVersionSelect: (versionId: string) => void;
    handleComparisonLeftChange: (versionId: string) => void;
    handleComparisonRightChange: (versionId: string) => void;
    handleComparisonSwap: (leftId: string, rightId: string) => void;
    loadVersionsAndStems: () => void;
}

export const VersionsTab = ({
    track,
    versions,
    selectedVersionId,
    comparisonLeftId,
    comparisonRightId,
    handleVersionSelect,
    handleComparisonLeftChange,
    handleComparisonRightChange,
    handleComparisonSwap,
    loadVersionsAndStems
}: VersionsTabProps) => {
    return (
        <>
            {versions.length === 0 ? <EmptyStateCard icon={GitBranch} title="Нет версий" description="Создайте новую версию через действия трека" /> : <>
                <Card className="border-border/70">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Версии трека</CardTitle>
                        <CardDescription>Переключайтесь между версиями и управляйте статусом.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <TrackVersionSelector versions={versions.map(version => ({
                            id: version.id,
                            variant_index: version.variant_index,
                            created_at: version.created_at,
                            is_preferred_variant: version.is_preferred_variant,
                            is_primary_variant: version.is_primary_variant,
                            is_original: version.is_original
                        }))} selectedVersionId={selectedVersionId} onSelect={handleVersionSelect} />
                        {versions.length >= 2 && <TrackVersionComparison trackId={track.id} versions={versions} trackMetadata={track.metadata ?? null} leftVersionId={comparisonLeftId} rightVersionId={comparisonRightId} onLeftVersionChange={handleComparisonLeftChange} onRightVersionChange={handleComparisonRightChange} onSwapSides={handleComparisonSwap} />}
                        <TrackVersions trackId={track.id} versions={versions} trackMetadata={track.metadata ?? null} onVersionUpdate={loadVersionsAndStems} />
                    </CardContent>
                </Card>
            </>}
        </>
    );
};
