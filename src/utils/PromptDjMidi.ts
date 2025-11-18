/**
 * Prompt DJ Midi Controller ("The Brain")
 * Manages the application state and orchestrates UI and LiveMusicHelper.
 *
 * @version 1.0.0
 * @since 2025-11-17
 */
import { LiveMusicHelper, type WeightedPrompt, type PlaybackState, type RecordingState } from './LiveMusicHelper';

export class PromptDjMidi extends EventTarget {
  private liveMusicHelper: LiveMusicHelper;

  // State properties
  public prompts: WeightedPrompt[];
  public playbackState: PlaybackState = 'idle';
  public recordingState: RecordingState = 'idle';

  constructor(initialPrompts: WeightedPrompt[]) {
    super();
    this.prompts = initialPrompts;
    this.liveMusicHelper = new LiveMusicHelper();

    // Forward events from the helper
    this.liveMusicHelper.addEventListener('playback-state-changed', (e) => {
      this.playbackState = (e as CustomEvent).detail.state;
      this.dispatchEvent(new CustomEvent('state-changed'));
    });
    this.liveMusicHelper.addEventListener('recording-state-changed', (e) => {
      this.recordingState = (e as CustomEvent).detail.state;
      this.dispatchEvent(new CustomEvent('state-changed'));
    });
    // ... forward other events like audio-level, error, etc.
  }

  // --- Public methods to be called by UI ---

  public async play() {
    await this.liveMusicHelper.connect(this.prompts);
  }

  public stop() {
    this.liveMusicHelper.disconnect();
  }

  public updateWeight(promptId: string, weight: number) {
    const prompt = this.prompts.find(p => p.id === promptId);
    if (prompt) {
      prompt.weight = weight;
      this.liveMusicHelper.setWeightedPrompts(this.prompts);
      this.dispatchEvent(new CustomEvent('state-changed'));
    }
  }

  public startRecording() {
    this.liveMusicHelper.startRecording();
  }

  public stopRecording() {
    this.liveMusicHelper.stopRecording();
  }

  public useRecordingAsReference(blob: Blob) {
    this.liveMusicHelper.setReferenceAudio(blob, 1.0);
  }

  // ... other methods to manage state
}
