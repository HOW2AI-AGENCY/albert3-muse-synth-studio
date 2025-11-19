/**
 * Prompt DJ UI Component ("The Body")
 * Renders the UI and delegates all logic to PromptDjMidi.
 *
 * @version 3.0.0
 * @since 2025-11-17
 */
import React, { useEffect, useRef, useReducer } from 'react';
import { PromptDjMidi } from '@/utils/PromptDjMidi';
import { PromptDJHeader } from './components/PromptDJHeader';
import { PromptGrid } from './components/PromptGrid';
import { WarningCard } from './components/WarningCard';
import { PromptDJToolbar } from './components/PromptDJToolbar';

const DEFAULT_PROMPTS = [
  'Epic orchestral symphony', 'Ambient electronic soundscape', 'Jazz piano improvisation', 'Heavy metal guitar riffs',
  'Tropical house beat', 'Classical string quartet', 'Hip-hop drum patterns', 'Synthwave retro vibes',
  'Blues harmonica solo', 'Techno bass drops', 'Folk acoustic guitar', 'R&B smooth vocals',
  'Rock drum fills', 'EDM synth leads', 'Reggae offbeat rhythm', 'Soul brass section'
].map((text, index) => ({ id: `prompt-${index}`, text, weight: 0, isFiltered: false }));

export const PromptDJ: React.FC = () => {
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  const midiControllerRef = useRef<PromptDjMidi | null>(null);

  useEffect(() => {
    const controller = new PromptDjMidi(DEFAULT_PROMPTS);
    midiControllerRef.current = controller;

    const onStateChanged = () => forceUpdate();
    controller.addEventListener('state-changed', onStateChanged);

    // Recording complete event handler
    const liveMusicHelper = (controller as any).liveMusicHelper;
    if (liveMusicHelper) {
      liveMusicHelper.addEventListener('recording-complete', (e: Event) => {
          const { blob } = (e as CustomEvent).detail;
          (controller as any).lastRecordingBlob = blob;
          const url = URL.createObjectURL(blob);
          (controller as any).lastRecordingUrl = url;
          forceUpdate();
      });
    }

    // Load presets on mount
    controller.loadPresets();

    return () => {
      controller.removeEventListener('state-changed', onStateChanged);
      controller.stop();
    };
  }, []);

  const controller = midiControllerRef.current;
  if (!controller) return null; // Or a loading state

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-accent/5 to-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <PromptDJHeader
          playbackState={controller.playbackState}
          volume={controller.volume}
          onPlayPause={() => (controller.playbackState === 'playing' || controller.playbackState === 'loading') ? controller.stop() : controller.play()}
          onVolumeChange={(volume: number) => controller.setVolume(volume)}
          getAnalyserData={() => (controller as any).liveMusicHelper.getAnalyserData()}
        />
        <WarningCard />
        <PromptDJToolbar
          presets={controller.presets}
          onSelectPreset={(preset: any) => controller.applyPreset(preset)}
          onSavePreset={(name) => controller.savePreset(name)}
          onDeletePreset={(id) => controller.deletePreset(id)}
          recordingState={controller.recordingState}
          onStartRecording={() => controller.startRecording()}
          onStopRecording={() => controller.stopRecording()}
          lastRecordingUrl={(controller as any).lastRecordingUrl || null}
          onUseAsReference={() => controller.useRecordingAsReference((controller as any).lastRecordingBlob)}
        />
        <PromptGrid
          prompts={controller.prompts}
          audioLevel={0} // This is a nice-to-have, can be implemented later
          onWeightChange={(id, weight) => controller.updateWeight(id, weight)}
          onTextChange={(id, text) => controller.updatePromptText(id, text)}
        />
      </div>
    </div>
  );
};
