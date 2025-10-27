/**
 * File Upload Validation Utilities
 * Sprint 31 - Week 1: Task 1.2 - Add file upload validation
 * 
 * Implements 3-layer validation:
 * 1. MIME type check
 * 2. File extension check
 * 3. Magic number validation (prevents MIME spoofing)
 */

const ALLOWED_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp3'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Magic numbers for audio file formats
const MAGIC_NUMBERS = {
  mp3: [0xFF, 0xFB],            // MP3 frame sync
  mp3_id3: [0x49, 0x44, 0x33],  // MP3 with ID3 tag
  wav: [0x52, 0x49, 0x46, 0x46], // RIFF header
  ogg: [0x4F, 0x67, 0x67, 0x53], // OggS
  flac: [0x66, 0x4C, 0x61, 0x43], // fLaC
};

export class AudioValidationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AudioValidationError';
  }
}

/**
 * Validate audio file using multiple security checks
 * @throws {AudioValidationError} If validation fails
 */
export const validateAudioFile = async (file: File): Promise<void> => {
  // 1. MIME type check
  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== '') {
    throw new AudioValidationError(
      'Неподдерживаемый формат аудио. Разрешены: MP3, WAV, OGG, FLAC',
      'INVALID_MIME_TYPE'
    );
  }

  // 2. Extension check
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!['mp3', 'wav', 'ogg', 'flac'].includes(ext || '')) {
    throw new AudioValidationError(
      'Неподдерживаемое расширение файла',
      'INVALID_EXTENSION'
    );
  }

  // 3. Size check
  if (file.size > MAX_FILE_SIZE) {
    throw new AudioValidationError(
      `Файл слишком большой. Максимальный размер: ${MAX_FILE_SIZE / (1024 * 1024)} МБ`,
      'FILE_TOO_LARGE'
    );
  }

  // 4. Magic number validation (prevents MIME spoofing attacks)
  try {
    const buffer = await file.slice(0, 4).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    const isValid = Object.values(MAGIC_NUMBERS).some(magic =>
      magic.every((byte, i) => bytes[i] === byte)
    );

    if (!isValid) {
      throw new AudioValidationError(
        'Содержимое файла не соответствует заявленному формату',
        'MAGIC_NUMBER_MISMATCH'
      );
    }
  } catch (error) {
    if (error instanceof AudioValidationError) {
      throw error;
    }
    throw new AudioValidationError(
      'Не удалось прочитать файл для валидации',
      'READ_ERROR'
    );
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Check if file type is audio
 */
export const isAudioFile = (file: File): boolean => {
  return file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac)$/i.test(file.name);
};
