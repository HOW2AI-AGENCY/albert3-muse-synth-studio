/**
 * Audio encoding/decoding utilities
 */

export const decodePCM = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes;
};

export const encodePCM = (data: Uint8Array): string => {
  let binary = '';
  const len = data.byteLength;
  
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(data[i]);
  }
  
  return btoa(binary);
};
