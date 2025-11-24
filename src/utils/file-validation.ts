/**
 * File Upload Validation Utilities
 * Refactored to support multiple file types (audio, image, documents).
 */

export class FileValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'FileValidationError';
  }
}

const SHARED_CONFIG = {
  MAX_AUDIO_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_DOC_SIZE: 5 * 1024 * 1024,    // 5MB
};

const FILE_TYPES = {
  audio: {
    mimes: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp3'],
    extensions: ['mp3', 'wav', 'ogg', 'flac'],
    maxSize: SHARED_CONFIG.MAX_AUDIO_SIZE,
    magicNumbers: {
      mp3: [0xFF, 0xFB],
      mp3_id3: [0x49, 0x44, 0x33],
      wav: [0x52, 0x49, 0x46, 0x46],
      ogg: [0x4F, 0x67, 0x67, 0x53],
      flac: [0x66, 0x4C, 0x61, 0x43],
    },
  },
  image: {
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    maxSize: SHARED_CONFIG.MAX_IMAGE_SIZE,
    magicNumbers: {
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46, 0x38],
      webp: [0x52, 0x49, 0x46, 0x46], // Shares RIFF header with WAV
    },
  },
  document: {
    mimes: ['text/plain', 'application/pdf'],
    extensions: ['txt', 'pdf'],
    maxSize: SHARED_CONFIG.MAX_DOC_SIZE,
    magicNumbers: {
      pdf: [0x25, 0x50, 0x44, 0x46],
      // TXT files don't have a reliable magic number, will rely on other checks
    },
  },
};

type FileType = keyof typeof FILE_TYPES;

export const validateFile = async (file: File, type: FileType): Promise<void> => {
  const config = FILE_TYPES[type];

  // 1. MIME type check (optional if browser doesn't provide it)
  if (file.type && !config.mimes.includes(file.type)) {
    throw new FileValidationError(
      `Неподдерживаемый формат. Разрешены: ${config.extensions.join(', ')}`,
      'INVALID_MIME_TYPE'
    );
  }

  // 2. Extension check
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!config.extensions.includes(ext || '')) {
    throw new FileValidationError('Неподдерживаемое расширение файла', 'INVALID_EXTENSION');
  }

  // 3. Size check
  if (file.size > config.maxSize) {
    throw new FileValidationError(
      `Файл слишком большой. Макс. размер: ${formatFileSize(config.maxSize)}`,
      'FILE_TOO_LARGE'
    );
  }

  // 4. Magic number validation
  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    const isValid = Object.values(config.magicNumbers).some(magic =>
      magic.every((byte, i) => bytes[i] === byte)
    );

    // Skip magic number check for types without reliable signatures (e.g., txt)
    if (Object.keys(config.magicNumbers).length > 0 && !isValid) {
      throw new FileValidationError(
        'Содержимое файла не соответствует формату',
        'MAGIC_NUMBER_MISMATCH'
      );
    }
  } catch (error) {
    if (error instanceof FileValidationError) throw error;
    throw new FileValidationError('Не удалось прочитать файл для валидации', 'READ_ERROR');
  }
};

/**
 * @deprecated Use `validateFile(file, 'audio')` instead.
 * Kept for backward compatibility.
 */
export const validateAudioFile = async (file: File): Promise<void> => {
  try {
    await validateFile(file, 'audio');
  } catch (error) {
    // Re-throw the original error to preserve the stack trace.
    throw error;
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export const isAudioFile = (file: File): boolean => {
    return FILE_TYPES.audio.mimes.includes(file.type) || FILE_TYPES.audio.extensions.some(ext => file.name.toLowerCase().endsWith(`.${ext}`));
};

export const isImageFile = (file: File): boolean => {
    return FILE_TYPES.image.mimes.includes(file.type) || FILE_TYPES.image.extensions.some(ext => file.name.toLowerCase().endsWith(`.${ext}`));
};
