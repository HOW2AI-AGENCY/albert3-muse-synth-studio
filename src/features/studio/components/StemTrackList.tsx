// src/features/studio/components/StemTrackList.tsx
import React from 'react';
import StemTrack from './StemTrack';
import { useStudioStore } from '@/stores/studioStore';
import { useStemPlayer } from '../hooks/useStemPlayer';
import { useStemExporter } from '../hooks/useStemExporter';

/**
 * StemTrackList
 *
 * Renders a list of all stem tracks for the current project from the studio store.
 * It uses the StemTrack component to display each individual stem and connects
 * UI interactions to the studio's state management.
 *
 * @returns {JSX.Element} The rendered list of stem tracks.
 */
const StemTrackList: React.FC = () => {
  const { stems } = useStudioStore();
  const { updateStemVolume, toggleMute, toggleSolo } = useStemPlayer();
  const { downloadStem } = useStemExporter();

  const handleUseAsReference = (stemId: string) => {
    const stem = stems.find(s => s.id === stemId);
    console.log(`Using ${stem?.name} as a reference for a new track.`);
    // Here you would typically navigate to the generation page
    // with the stem's audioUrl as a parameter.
  };

  if (stems.length === 0) {
    return (
      <main className="flex-1 flex items-center justify-center text-neutral-500">
        <p>No stems found for this track.</p>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-3 pb-24">
      {stems.map((stem) => (
        <StemTrack
          key={stem.id}
          id={stem.id}
          name={stem.name}
          type={stem.type}
          volume={stem.volume}
          isMuted={stem.isMuted}
          isSolo={stem.isSolo}
          onVolumeChange={(volume) => updateStemVolume(stem.id, volume)}
          onMuteToggle={() => toggleMute(stem.id)}
          onSoloToggle={() => toggleSolo(stem.id)}
          onRegenerate={() => console.log(`Regenerate ${stem.name}`)}
          onDownload={() => downloadStem(stem.id)}
          onUseAsReference={() => handleUseAsReference(stem.id)}
        />
      ))}
    </main>
  );
};

export default StemTrackList;
