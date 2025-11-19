/**
 * Prompt DJ Midi Controller ("The Brain")
 * Manages the application state and orchestrates UI and LiveMusicHelper.
 *
 * @version 1.0.0
 * @since 2025-11-17
 */
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LiveMusicHelper, type WeightedPrompt, type PlaybackState, type RecordingState } from './LiveMusicHelper';

export interface Preset {
  id: string;
  name: string;
  prompts: WeightedPrompt[];
}

export class PromptDjMidi extends EventTarget {
  private liveMusicHelper: LiveMusicHelper;

  // State properties
  public prompts: WeightedPrompt[];
  public presets: Preset[] = [];
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
    if (this.liveMusicHelper.playbackState === 'idle') {
      await this.liveMusicHelper.connect(this.prompts);
    }
    this.liveMusicHelper.setPlaybackControl('PLAY');
  }

  public stop() {
    this.liveMusicHelper.setPlaybackControl('STOP');
    // Note: disconnect() is called on websocket close event in LiveMusicHelper
  }

  public updateWeight(promptId: string, weight: number) {
    const prompt = this.prompts.find(p => p.id === promptId);
    if (prompt) {
      prompt.weight = weight;
      this.liveMusicHelper.setWeightedPrompts(this.prompts);
      this.dispatchEvent(new CustomEvent('state-changed'));
    }
  }

  public updatePromptText(promptId: string, text: string) {
    const prompt = this.prompts.find(p => p.id === promptId);
    if (prompt) {
      prompt.text = text;
      // We can decide if we want to send updates on every keystroke
      // For now, let's assume it's sent on blur or with a debounce mechanism handled in the UI
      this.liveMusicHelper.setWeightedPrompts(this.prompts);
      this.dispatchEvent(new CustomEvent('state-changed'));
    }
  }

  public setVolume(volume: number) {
    this.liveMusicHelper.setVolume(volume);
    this.dispatchEvent(new CustomEvent('state-changed'));
  }

  public get volume(): number {
    return this.liveMusicHelper.volume;
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

  // --- Preset Management ---

  public async loadPresets() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to manage presets.');
      return;
    }

    const { data, error } = await supabase
      .from('prompt_dj_presets')
      .select('id, name, prompts')
      .eq('user_id', user.id)
      .order('name', { ascending: true });

    if (error) {
      toast.error('Failed to load presets.', { description: error.message });
      return;
    }

    this.presets = data || [];
    this.dispatchEvent(new CustomEvent('state-changed'));
    toast.success(`${this.presets.length} presets loaded.`);
  }

  public applyPreset(presetId: string) {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset) {
      toast.error('Preset not found.');
      return;
    }
    // Ensure we don't mutate the preset object directly
    this.prompts = JSON.parse(JSON.stringify(preset.prompts));
    this.liveMusicHelper.setWeightedPrompts(this.prompts);
    this.dispatchEvent(new CustomEvent('state-changed'));
    toast.info(`Preset "${preset.name}" applied.`);
  }

  public async savePreset(name: string) {
    if (!name.trim()) {
        toast.warning('Preset name cannot be empty.');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('You must be logged in to save presets.');
      return;
    }

    const { error } = await supabase.from('prompt_dj_presets').upsert({
      user_id: user.id,
      name,
      prompts: this.prompts,
    });

    if (error) {
      toast.error('Failed to save preset.', { description: error.message });
    } else {
      toast.success(`Preset "${name}" saved successfully!`);
      await this.loadPresets(); // Refresh the list
    }
  }

  public async deletePreset(presetId: string) {
    const { error } = await supabase
        .from('prompt_dj_presets')
        .delete()
        .eq('id', presetId);

    if (error) {
        toast.error('Failed to delete preset.', { description: error.message });
    } else {
        toast.success('Preset deleted.');
        await this.loadPresets(); // Refresh the list
    }
  }
}
