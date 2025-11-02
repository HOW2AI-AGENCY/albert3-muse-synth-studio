/**
 * AudioBuffer creation utilities
 * Converts PCM data to Web Audio API AudioBuffer
 */

/**
 * Создает AudioBuffer из сырых PCM данных (16-bit, 48000 Hz, 2 channels)
 * @param pcmData - Uint8Array с PCM данными
 * @param audioContext - Web Audio API AudioContext
 * @param sampleRate - Частота дискретизации (по умолчанию 48000 Hz)
 * @param numChannels - Количество каналов (по умолчанию 2 для stereo)
 * @returns AudioBuffer готовый для воспроизведения
 */
export function createAudioBufferFromPCM(
  pcmData: Uint8Array,
  audioContext: AudioContext,
  sampleRate = 48000,
  numChannels = 2
): AudioBuffer {
  const numSamples = pcmData.length / 2; // 16-bit = 2 bytes per sample
  const int16Array = new Int16Array(pcmData.buffer);
  
  const audioBuffer = audioContext.createBuffer(
    numChannels,
    numSamples / numChannels,
    sampleRate
  );

  // Конвертация 16-bit int → float32 (-1.0 to 1.0)
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    
    for (let i = 0; i < channelData.length; i++) {
      const index = i * numChannels + channel;
      const int16Value = int16Array[index];
      
      // Нормализация 16-bit signed int в float [-1.0, 1.0]
      channelData[i] = int16Value / (int16Value < 0 ? 0x8000 : 0x7FFF);
    }
  }

  return audioBuffer;
}
