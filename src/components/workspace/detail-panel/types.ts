import type { TrackVersionMetadata } from "@/features/tracks/components/TrackVersionMetadataPanel";

export interface Track {
    id: string;
    title: string;
    prompt: string;
    status: string;
    audio_url?: string;
    cover_url?: string;
    video_url?: string;
    suno_id?: string;
    genre?: string;
    mood?: string;
    is_public?: boolean;
    created_at?: string;
    user_id?: string;
    duration?: number;
    lyrics?: string;
    metadata?: TrackVersionMetadata | null;
    like_count?: number;
    view_count?: number;
    duration_seconds?: number;
    style_tags?: string[];
    model_name?: string;
}

export interface TrackVersion {
    id: string;
    variant_index: number;
    is_preferred_variant: boolean;
    is_primary_variant?: boolean;
    is_original?: boolean;
    source_variant_index?: number | null;
    suno_id: string;
    audio_url: string;
    video_url?: string;
    cover_url?: string;
    lyrics?: string;
    duration?: number;
    metadata?: TrackVersionMetadata | null;
    created_at?: string;
}

export interface TrackStem {
    id: string;
    stem_type: string;
    audio_url: string;
    separation_mode: string;
    track_id: string;
    version_id?: string | null;
    created_at?: string;
}
