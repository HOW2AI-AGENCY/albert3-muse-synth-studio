/**
 * AudioBuffer creation utilities
 */

export const createAudioBufferFromPCM = (
  pcmData: Uint8Array,
  audioContext: AudioContext
): AudioBuffer => {
  // Конвертируем PCM (16-bit) в Float32Array
  const float32Array = new Float32Array(pcmData.length / 2);
  
  for (let i = 0; i < float32Array.length; i++) {
    const int16 = (pcmData[i * 2 + 1] << 8) | pcmData[i * 2];
    float32Array[i] = int16 / 32768.0; // Normalize to -1.0 to 1.0
  }

  // Создаем AudioBuffer
  const audioBuffer = audioContext.createBuffer(
    1, // mono
    float32Array.length,
    audioContext.sampleRate
  );

  audioBuffer.copyToChannel(float32Array, 0);

  return audioBuffer;
};
