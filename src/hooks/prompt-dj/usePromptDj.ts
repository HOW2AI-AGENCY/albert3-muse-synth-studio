/**
 * Main Prompt DJ hook
 * Manages state, session, and audio recording
 */

import { useState, useCallback } from 'react';
import { useLiveMusicSession } from './useLiveMusicSession';
import { useAudioRecorder } from './useAudioRecorder';
import type { PromptData } from '@/components/prompt-dj/types';

// Дефолтные промпты
const DEFAULT_PROMPTS = [
  'Ambient synth pads',
  'Deep bass line',
  'Rhythmic drums',
  'Melodic piano',
  'Atmospheric strings',
  'Electronic beats',
  'Vocal chops',
  'Guitar riffs',
  'Orchestral brass',
  'Ethereal vocals',
  'Funky bassline',
  'Jazz saxophone',
  'Trap hi-hats',
  'Cinematic percussion',
  'Warm analog synth',
  'Nature sounds',
];

function buildInitialPrompts(): Map<string, PromptData> {
  const prompts = new Map<string, PromptData>();
  
  DEFAULT_PROMPTS.forEach((text, index) => {
    // Активируем случайно 3 промпта
    const isActive = index < 3;
    
    prompts.set(`prompt-${index}`, {
      id: `prompt-${index}`,
      text,
      weight: isActive ? 0.7 : 0,
      isFiltered: false,
    });
  });
  
  return prompts;
}

export const usePromptDj = () => {
  const [prompts, setPrompts] = useState(() => buildInitialPrompts());
  const [audioLevels] = useState(new Map<string, number>());
  
  const {
    sessionId,
    isConnected,
    playbackState,
    audioContext,
    connect: connectSession,
    updatePrompts: updateSessionPrompts,
    disconnect: disconnectSession,
  } = useLiveMusicSession();

  const {
    isRecording,
    recordedBlob,
    startRecording,
    stopRecording,
    saveToLibrary,
  } = useAudioRecorder(audioContext);

  const connect = useCallback(async () => {
    const activePrompts = Array.from(prompts.values())
      .filter(p => p.weight > 0)
      .map(p => ({ text: p.text, weight: p.weight }));
    
    await connectSession(activePrompts);
  }, [prompts, connectSession]);

  const disconnect = useCallback(async () => {
    await disconnectSession();
  }, [disconnectSession]);

  const updatePrompts = useCallback((updatedPrompts: Map<string, PromptData>) => {
    setPrompts(updatedPrompts);
    
    if (isConnected) {
      updateSessionPrompts(updatedPrompts);
    }
  }, [isConnected, updateSessionPrompts]);

  const handleStartRecording = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    const blob = await stopRecording();
    return blob;
  }, [stopRecording]);

  const saveRecording = useCallback(async (blob: Blob, fileName: string) => {
    return await saveToLibrary(blob, fileName);
  }, [saveToLibrary]);

  return {
    prompts,
    audioLevels,
    sessionId,
    isConnected,
    playbackState,
    isRecording,
    recordedBlob,
    connect,
    disconnect,
    updatePrompts,
    startRecording: handleStartRecording,
    stopRecording: handleStopRecording,
    saveRecording,
  };
};
