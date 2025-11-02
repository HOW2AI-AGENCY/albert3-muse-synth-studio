/**
 * Audio encoding/decoding utilities for PCM data
 * Handles conversion between base64 and Uint8Array for Gemini Lyria API
 */

/**
 * Кодирует Uint8Array (PCM 16-bit) в base64
 * @param pcmData - Сырые PCM данные
 * @returns Base64 строка
 */
export function encodePCM(pcmData: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  
  for (let i = 0; i < pcmData.length; i += chunkSize) {
    const chunk = pcmData.subarray(i, Math.min(i + chunkSize, pcmData.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

/**
 * Декодирует base64 в Uint8Array (PCM 16-bit)
 * @param base64String - Base64 строка с PCM данными
 * @returns Uint8Array с PCM данными
 */
export function decodePCM(base64String: string): Uint8Array {
  const binaryString = atob(base64String);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
}
