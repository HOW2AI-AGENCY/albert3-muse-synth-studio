export type EffectType = 'eq' | 'reverb' | 'delay' | 'compressor' | 'distortion';

export interface AudioEffect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, number>;
  node?: AudioNode;
}

export interface EQParameters {
  low: number;    // -12 to +12 dB
  mid: number;    // -12 to +12 dB
  high: number;   // -12 to +12 dB
}

export interface ReverbParameters {
  size: number;     // 0-100%
  decay: number;    // 0-100%
  mix: number;      // 0-100%
}

export interface DelayParameters {
  time: number;     // ms
  feedback: number; // 0-100%
  mix: number;      // 0-100%
}

export interface CompressorParameters {
  threshold: number; // -60 to 0 dB
  ratio: number;     // 1-20
  attack: number;    // ms
  release: number;   // ms
}

export class AudioEffectsEngine {
  private context: AudioContext;
  private effectsChain: Map<string, AudioEffect[]> = new Map();
  private trackNodes: Map<string, { source: MediaElementAudioSourceNode; output: GainNode }> = new Map();

  constructor(context: AudioContext) {
    this.context = context;
  }

  connectTrack(trackId: string, audioElement: HTMLAudioElement): GainNode {
    // Create source node
    const source = this.context.createMediaElementSource(audioElement);
    const output = this.context.createGain();

    // Connect through effects chain
    const effects = this.effectsChain.get(trackId) || [];
    let currentNode: AudioNode = source;

    for (const effect of effects) {
      if (effect.enabled && effect.node) {
        currentNode.connect(effect.node);
        currentNode = effect.node;
      }
    }

    // Connect to output
    currentNode.connect(output);
    output.connect(this.context.destination);

    this.trackNodes.set(trackId, { source, output });

    return output;
  }

  disconnectTrack(trackId: string) {
    const nodes = this.trackNodes.get(trackId);
    if (nodes) {
      nodes.source.disconnect();
      nodes.output.disconnect();
      this.trackNodes.delete(trackId);
    }
  }

  addEffect(trackId: string, effect: Omit<AudioEffect, 'node'>): AudioEffect {
    const node = this.createEffectNode(effect.type, effect.parameters);
    const fullEffect: AudioEffect = { ...effect, node };

    const effects = this.effectsChain.get(trackId) || [];
    effects.push(fullEffect);
    this.effectsChain.set(trackId, effects);

    // Reconnect track with new effect
    this.reconnectTrack(trackId);

    return fullEffect;
  }

  removeEffect(trackId: string, effectId: string) {
    const effects = this.effectsChain.get(trackId) || [];
    const filtered = effects.filter(e => e.id !== effectId);
    
    this.effectsChain.set(trackId, filtered);
    this.reconnectTrack(trackId);
  }

  updateEffectParameter(trackId: string, effectId: string, param: string, value: number) {
    const effects = this.effectsChain.get(trackId) || [];
    const effect = effects.find(e => e.id === effectId);
    
    if (!effect) return;

    effect.parameters[param] = value;
    this.applyEffectParameters(effect);
  }

  toggleEffect(trackId: string, effectId: string) {
    const effects = this.effectsChain.get(trackId) || [];
    const effect = effects.find(e => e.id === effectId);
    
    if (!effect) return;

    effect.enabled = !effect.enabled;
    this.reconnectTrack(trackId);
  }

  private createEffectNode(type: EffectType, parameters: Record<string, number>): AudioNode {
    switch (type) {
      case 'eq':
        return this.createEQ(parameters as any);
      case 'reverb':
        return this.createReverb(parameters as any);
      case 'delay':
        return this.createDelay(parameters as any);
      case 'compressor':
        return this.createCompressor(parameters as any);
      case 'distortion':
        return this.createDistortion(parameters as any);
      default:
        return this.context.createGain();
    }
  }

  private createEQ(params: EQParameters): BiquadFilterNode {
    const lowFilter = this.context.createBiquadFilter();
    lowFilter.type = 'lowshelf';
    lowFilter.frequency.value = 200;
    lowFilter.gain.value = params.low;

    const midFilter = this.context.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 1;
    midFilter.gain.value = params.mid;

    const highFilter = this.context.createBiquadFilter();
    highFilter.type = 'highshelf';
    highFilter.frequency.value = 3000;
    highFilter.gain.value = params.high;

    lowFilter.connect(midFilter);
    midFilter.connect(highFilter);

    return lowFilter; // Return first in chain
  }

  private createReverb(params: ReverbParameters): ConvolverNode {
    const convolver = this.context.createConvolver();
    const sampleRate = this.context.sampleRate;
    const length = sampleRate * (params.decay / 100) * 3;
    const impulse = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, params.size / 50);
      }
    }

    convolver.buffer = impulse;
    return convolver;
  }

  private createDelay(params: DelayParameters): DelayNode {
    const delay = this.context.createDelay(5);
    delay.delayTime.value = params.time / 1000;

    const feedback = this.context.createGain();
    feedback.gain.value = params.feedback / 100;

    delay.connect(feedback);
    feedback.connect(delay);

    return delay;
  }

  private createCompressor(params: CompressorParameters): DynamicsCompressorNode {
    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = params.threshold;
    compressor.ratio.value = params.ratio;
    compressor.attack.value = params.attack / 1000;
    compressor.release.value = params.release / 1000;
    
    return compressor;
  }

  private createDistortion(params: { drive: number }): WaveShaperNode {
    const distortion = this.context.createWaveShaper();
    const amount = params.drive / 100;
    const k = amount * 100;
    const samples = 44100;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20) / (Math.PI + k * Math.abs(x));
    }

    distortion.curve = curve;
    distortion.oversample = '4x';

    return distortion;
  }

  private applyEffectParameters(effect: AudioEffect) {
    if (!effect.node) return;

    // Re-create node with new parameters
    const newNode = this.createEffectNode(effect.type, effect.parameters);
    effect.node = newNode;
  }

  private reconnectTrack(trackId: string) {
    const trackData = this.trackNodes.get(trackId);
    if (!trackData) return;

    // Disconnect all
    trackData.source.disconnect();
    trackData.output.disconnect();

    // Reconnect through effects chain
    const effects = this.effectsChain.get(trackId) || [];
    let currentNode: AudioNode = trackData.source;

    for (const effect of effects) {
      if (effect.enabled && effect.node) {
        currentNode.connect(effect.node);
        currentNode = effect.node;
      }
    }

    currentNode.connect(trackData.output);
    trackData.output.connect(this.context.destination);
  }

  getEffects(trackId: string): AudioEffect[] {
    return this.effectsChain.get(trackId) || [];
  }

  clearEffects(trackId: string) {
    this.effectsChain.delete(trackId);
    this.reconnectTrack(trackId);
  }

  dispose() {
    for (const [trackId] of this.trackNodes) {
      this.disconnectTrack(trackId);
    }
    this.effectsChain.clear();
  }
}
