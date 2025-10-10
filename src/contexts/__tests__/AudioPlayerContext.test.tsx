import { describe, it, expect } from 'vitest';
import { hasKnownAudioExtension } from '../AudioPlayerContext';

describe('hasKnownAudioExtension', () => {
  it('returns false when URL has no extension', () => {
    expect(hasKnownAudioExtension('https://example.com/audio')).toBe(false);
    expect(hasKnownAudioExtension('https://example.com/audio/track')).toBe(false);
  });

  it('detects known extensions regardless of casing', () => {
    expect(hasKnownAudioExtension('https://example.com/audio.mp3')).toBe(true);
    expect(hasKnownAudioExtension('https://example.com/audio.WAV')).toBe(true);
    expect(hasKnownAudioExtension('https://example.com/path/to/audio.ogg')).toBe(true);
  });

  it('ignores query parameters when checking the extension', () => {
    expect(hasKnownAudioExtension('https://example.com/audio.m4a?token=123')).toBe(true);
    expect(hasKnownAudioExtension('https://example.com/audio?format=mp3')).toBe(false);
  });

  it('handles malformed URLs gracefully', () => {
    expect(hasKnownAudioExtension('audio-file.mp3')).toBe(true);
    expect(hasKnownAudioExtension('audio-file')).toBe(false);
  });
});
