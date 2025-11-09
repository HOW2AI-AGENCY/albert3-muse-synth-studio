import { useContext } from 'react';
import { StemMixerContext } from './context';

export const useStemMixer = () => {
  const context = useContext(StemMixerContext);
  if (!context) {
    throw new Error('useStemMixer must be used within StemMixerProvider');
  }
  return context;
};