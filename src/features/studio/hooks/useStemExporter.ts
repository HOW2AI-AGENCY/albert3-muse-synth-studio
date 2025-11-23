// src/features/studio/hooks/useStemExporter.ts
import { useCallback } from 'react';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useStudioStore } from '@/stores/studioStore';

/**
 * A hook that provides functions to export stems.
 */
export const useStemExporter = () => {
  const { stems } = useStudioStore.getState();

  const downloadStem = useCallback(async (stemId: string) => {
    const stem = stems.find((s) => s.id === stemId);
    if (!stem) return;

    // In a real scenario, we would fetch the audio data.
    // For now, we'll simulate it with a dummy blob.
    const response = await fetch(stem.audioUrl).catch(() => null);
    if (response) {
      const blob = await response.blob();
      saveAs(blob, `${stem.name}.mp3`);
    } else {
      alert('Could not download the stem file.');
    }
  }, [stems]);

  const downloadAllStems = useCallback(async () => {
    const zip = new JSZip();
    const promises = stems.map(async (stem) => {
      const response = await fetch(stem.audioUrl).catch(() => null);
      if (response) {
        const blob = await response.blob();
        zip.file(`${stem.name}.mp3`, blob);
      }
    });

    await Promise.all(promises);

    zip.generateAsync({ type: 'blob' }).then((content) => {
      saveAs(content, 'stems.zip');
    });
  }, [stems]);

  return { downloadStem, downloadAllStems };
};
