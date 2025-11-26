import React, { useCallback } from 'react';
import { TrackCard } from '@/features/tracks';
import type { DisplayTrack } from '@/types/track';
import { Loader2 } from "@/utils/iconImports";

interface LibraryTrackCardProps {
    track: DisplayTrack;
    domain: any;
    loadingTrackId: string | null;
    handleTrackPlay: (track: DisplayTrack) => void;
    handleShare: (trackId: string) => void;
    handleSeparateStems: (trackId: string) => void;
    handleExtend: (trackId: string) => void;
    handleCover: (trackId: string) => void;
    handleAddVocal: (trackId: string) => void;
    handleCreatePersona: (trackId: string) => void;
    handleUpscaleAudio: (trackId: string) => void;
    handleGenerateCover: (trackId: string) => void;
    handleRetry: (trackId: string) => void;
    handleDelete: (trackId: string) => void;
    enableAITools?: boolean;
    handleSwitchVersion?: (trackId: string) => void;
    handleDescribeTrack?: (trackId: string) => void;
}

export const LibraryTrackCard = React.memo(({
    track,
    domain,
    loadingTrackId,
    handleTrackPlay,
    handleShare,
    handleSeparateStems,
    handleExtend,
    handleCover,
    handleAddVocal,
    handleCreatePersona,
    handleUpscaleAudio,
    handleGenerateCover,
    handleRetry,
    handleDelete,
    enableAITools,
    handleSwitchVersion,
    handleDescribeTrack,
}: LibraryTrackCardProps) => {
    const memoizedOnClick = useCallback(() => handleTrackPlay(track), [handleTrackPlay, track]);
    const memoizedOnShare = useCallback(() => handleShare(track.id), [handleShare, track.id]);
    const memoizedOnSeparateStems = useCallback(() => handleSeparateStems(track.id), [handleSeparateStems, track.id]);
    const memoizedOnSwitchVersion = useCallback(() => handleSwitchVersion?.(track.id), [handleSwitchVersion, track.id]);
    const memoizedOnDescribeTrack = useCallback(() => handleDescribeTrack?.(track.id), [handleDescribeTrack, track.id]);
    const memoizedOnExtend = useCallback(() => handleExtend(track.id), [handleExtend, track.id]);
    const memoizedOnCover = useCallback(() => handleCover(track.id), [handleCover, track.id]);
    const memoizedOnAddVocal = useCallback(() => handleAddVocal(track.id), [handleAddVocal, track.id]);
    const memoizedOnCreatePersona = useCallback(() => handleCreatePersona(track.id), [handleCreatePersona, track.id]);
    const memoizedOnUpscaleAudio = useCallback(() => handleUpscaleAudio(track.id), [handleUpscaleAudio, track.id]);
    const memoizedOnGenerateCover = useCallback(() => handleGenerateCover(track.id), [handleGenerateCover, track.id]);
    const memoizedOnRetry = useCallback(() => handleRetry(track.id), [handleRetry, track.id]);
    const memoizedOnDelete = useCallback(() => handleDelete(track.id), [handleDelete, track.id]);

    return (
        <div key={track.id} className="relative w-full" aria-busy={loadingTrackId === track.id}>
            <TrackCard
                track={domain}
                onClick={memoizedOnClick}
                onShare={memoizedOnShare}
                onSeparateStems={memoizedOnSeparateStems}
                onExtend={memoizedOnExtend}
                onCover={memoizedOnCover}
                onAddVocal={memoizedOnAddVocal}
                onCreatePersona={memoizedOnCreatePersona}
                onUpscaleAudio={memoizedOnUpscaleAudio}
                onGenerateCover={memoizedOnGenerateCover}
                onRetry={memoizedOnRetry}
                onDelete={memoizedOnDelete}
                enableAITools={enableAITools}
                onSwitchVersion={memoizedOnSwitchVersion}
                onDescribeTrack={memoizedOnDescribeTrack}
            />
            {loadingTrackId === track.id && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-3xl bg-background/80 backdrop-blur-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Загрузка версий…</span>
                </div>
            )}
        </div>
    );
});
