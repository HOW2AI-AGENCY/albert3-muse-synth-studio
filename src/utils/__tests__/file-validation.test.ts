import { describe, it, expect, vi } from 'vitest';
import { validateAudioFile, FileValidationError, validateFile } from '../file-validation';

describe('file-validation', () => {
  describe('validateAudioFile', () => {
    it('should preserve the original stack trace from validateFile', async () => {
      // Arrange: Create a mock File object that will fail the magic number check
      // This isolates the test from the test environment's (JSDOM) File API limitations.
      const mockFile = {
        name: 'fake.mp3',
        type: 'audio/mpeg',
        size: 1024, // A valid size
        slice: (start: number, end: number) => {
          // This buffer has an invalid magic number for an mp3
          const buffer = new Uint8Array([0x01, 0x02, 0x03, 0x04]).slice(start, end);
          return {
            arrayBuffer: () => Promise.resolve(buffer.buffer),
          };
        },
      } as File;

      let caughtError: Error | null = null;

      // Act
      try {
        // We cast our mock object to File to satisfy the function signature
        await validateAudioFile(mockFile);
      } catch (error) {
        caughtError = error as Error;
      }

      // Assert
      expect(caughtError).toBeInstanceOf(FileValidationError);
      // Now it should fail with the correct error message
      expect(caughtError?.message).toBe('Содержимое файла не соответствует формату');

      // This is the key assertion that should fail before the fix.
      // The buggy implementation creates a new error in `validateAudioFile`,
      // losing the original stack trace from `validateFile`.
      expect(caughtError?.stack).toContain('validateFile');
    });
  });
});
