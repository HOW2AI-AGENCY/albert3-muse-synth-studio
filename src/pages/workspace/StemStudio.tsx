// src/pages/workspace/StemStudio.tsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useStems } from '@/features/studio/hooks/useStems';
import { useStudioStore } from '@/stores/studioStore';
import StudioHeader from '@/features/studio/components/StudioHeader';
import StudioTimeline from '@/features/studio/components/StudioTimeline';
import StudioLyrics from '@/features/studio/components/StudioLyrics';
import StemTrackList from '@/features/studio/components/StemTrackList';
import StudioControls from '@/features/studio/components/StudioControls';
import { Loader2 } from 'lucide-react';

/**
 * StemStudioPage
 *
 * This is the main page for the stem studio editor.
 * It fetches the stem data for a track and initializes the studio store.
 *
 * @returns {JSX.Element} The rendered Stem Studio page.
 */
const StemStudioPage: React.FC = () => {
  const { trackId } = useParams<{ trackId: string }>();
  const { data: stems, isLoading, error } = useStems(trackId || '');
  const { setStems } = useStudioStore();

  useEffect(() => {
    if (stems) {
      const formattedStems = stems.map(stem => ({
        id: stem.id,
        name: stem.stem_type,
        type: stem.stem_type as any, // This might need more robust mapping
        volume: 85,
        isMuted: false,
        isSolo: false,
        audioUrl: stem.audio_url,
      }));
      setStems(formattedStems);
    }
  }, [stems, setStems]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading stems...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-black text-white">
        <p className="text-red-500">Error loading stems: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="bg-black text-neutral-300 h-screen w-screen flex flex-col overflow-hidden select-none">
      <StudioHeader />
      <StudioTimeline />
      <StudioLyrics />
      <StemTrackList />
      <StudioControls />
    </div>
  );
};

export default StemStudioPage;
